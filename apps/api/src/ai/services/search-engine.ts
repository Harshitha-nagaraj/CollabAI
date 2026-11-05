/**
 * @file ai/services/search-engine.ts
 *
 * Handles unified workspace search and grounded Q&A retrieval across:
 * - Tasks
 * - Task Comments
 * - Projects
 * - Meetings (summaries, decisions, and windowed transcript snippets)
 * - Dedicated Decision records
 * - Documents
 * - Project Activities
 *
 * Strictly scoped to the user's authorized workspace.
 * Distinguishes exact keyword queries from natural-language intent questions.
 * Grounded answers distinguish retrieved facts from inferences.
 */

import { prisma } from '../../lib/prisma.js';
import type { SearchResponse, SearchResult, SourceCitation } from '../types.js';
import { logger } from '../../utils/logger.js';

export const INSUFFICIENT_INFORMATION_MESSAGE =
  'The available records in this workspace do not contain enough information to answer this question.';

const STOP_AND_FILLER_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'what', 'when', 'where', 'which', 'who', 'why', 'how', 'can',
  'could', 'should', 'would', 'about', 'tell', 'show', 'give', 'any', 'some',
  'do', 'does', 'did', 'have', 'had', 'we', 'our', 'my', 'me', 'us', 'i', 'you',
  'your', 'please', 'find', 'search', 'get', 'check', 'info', 'information',
  'there', 'their', 'they', 'this', 'these', 'those', 'or', 'if', 'so', 'such',
  'all', 'still', 'currently', 'also', 'just', 'more', 'am', 'been', 'being',
  'see', 'look', 'into', 'out', 'up', 'down', 'here', 'made', 'tell',
]);

const INTENT_MARKER_WORDS = new Set([
  'overdue', 'delayed', 'delay', 'delays', 'behind', 'schedule', 'past', 'due', 'late',
  'incomplete', 'unfinished', 'remaining', 'open', 'pending', 'active', 'todo',
  'blocker', 'blockers', 'blocked', 'blocking', 'impediment', 'impediments', 'stuck',
  'decision', 'decisions', 'decided', 'meeting', 'meetings', 'latest', 'recent', 'yesterday',
  'discussion', 'discussions', 'comment', 'comments', 'feedback', 'thread', 'threads',
  'responsible', 'assigned', 'working', 'owns', 'owner', 'handles', 'assignee',
  'happening', 'going', 'project', 'projects', 'task', 'tasks', 'item', 'items',
]);

interface ParsedQueryIntents {
  isOverdueOrDelayed: boolean;
  isIncompleteTasks: boolean;
  isBlockersOrHealth: boolean;
  isMeetingDecisions: boolean;
  isDiscussions: boolean;
  isResponsibility: boolean;
  isProjectActivity: boolean;
  topicKeywords: string[];
  searchKeywords: string[];
}

export class SearchEngine {
  /**
   * Classify user query and extract topical keywords vs. structural intent markers.
   */
  private static parseQueryIntents(rawQuery: string): ParsedQueryIntents {
    const cleanLower = rawQuery.toLowerCase().replace(/[?!.,;:"]+/g, ' ').replace(/\s+/g, ' ').trim();
    const tokens = cleanLower.split(/\s+/).filter(Boolean);

    const isOverdueOrDelayed =
      /\b(overdue|delayed|delay|delays|behind schedule|past due|late)\b/i.test(cleanLower) ||
      (cleanLower.includes('why is') && (cleanLower.includes('delay') || cleanLower.includes('behind') || cleanLower.includes('overdue')));

    const isIncompleteTasks =
      !isOverdueOrDelayed &&
      (/\b(incomplete|unfinished|remaining|still open|not done)\b/i.test(cleanLower) ||
        (/\b(tasks|items)\b/i.test(cleanLower) && /\b(open|pending|active|todo|in progress)\b/i.test(cleanLower)) ||
        cleanLower.includes('tasks that are still') ||
        cleanLower.includes('tasks that are incomplete'));

    const isBlockersOrHealth =
      /\b(blocker|blockers|blocked|blocking|impediment|impediments|stuck)\b/i.test(cleanLower) ||
      cleanLower.includes('which projects have') ||
      cleanLower.includes('project health') ||
      cleanLower.includes('at risk');

    const isMeetingDecisions =
      /\b(decision|decisions|decided)\b/i.test(cleanLower) ||
      (/\b(meeting|meetings)\b/i.test(cleanLower) &&
        /\b(conclusions?|agreed|summary|notes|latest|recent|yesterday)\b/i.test(cleanLower));

    const isDiscussions =
      /\b(discussion|discussions|comment|comments|feedback|thread|threads)\b/i.test(cleanLower) ||
      cleanLower.includes('what did') ||
      cleanLower.includes('what was said');

    const isResponsibility =
      /\b(who is responsible|who is assigned|who owns|who is working on|who handles|responsible for|assigned to)\b/i.test(
        cleanLower
      ) ||
      (/\bwho\b/i.test(cleanLower) && /\b(responsible|assigned|owns|working)\b/i.test(cleanLower));

    const isProjectActivity =
      cleanLower.includes('what is happening') ||
      cleanLower.includes("what's happening") ||
      cleanLower.includes('what is going on') ||
      cleanLower.includes('recent activity') ||
      cleanLower.includes('project activity');

    const searchKeywords = tokens.filter((w) => w.length > 1 && !STOP_AND_FILLER_WORDS.has(w));
    const topicKeywords = tokens.filter(
      (w) => w.length > 1 && !STOP_AND_FILLER_WORDS.has(w) && !INTENT_MARKER_WORDS.has(w)
    );

    return {
      isOverdueOrDelayed,
      isIncompleteTasks,
      isBlockersOrHealth,
      isMeetingDecisions,
      isDiscussions,
      isResponsibility,
      isProjectActivity,
      topicKeywords,
      searchKeywords,
    };
  }

  /**
   * Search across all workspace records and synthesize a strictly grounded answer.
   */
  static async search(query: string, workspaceId: string): Promise<SearchResponse> {
    const rawTrimmed = query.trim();
    if (!rawTrimmed) {
      return this.emptyResponse(query);
    }

    const {
      isOverdueOrDelayed,
      isIncompleteTasks,
      isBlockersOrHealth,
      isMeetingDecisions,
      isDiscussions,
      isResponsibility,
      isProjectActivity,
      topicKeywords,
      searchKeywords,
    } = this.parseQueryIntents(rawTrimmed);

    const results: SearchResult[] = [];
    const sources: SourceCitation[] = [];
    const facts: string[] = [];
    const inferences: string[] = [];
    const supportingEvidence: string[] = [];

    const now = new Date();

    try {
      // Helper for keyword filters
      const keywordFilter = (fields: string[], kws: string[]) => {
        if (kws.length === 0) return [];
        return kws.map((kw) => ({
          OR: fields.map((field) => ({ [field]: { contains: kw, mode: 'insensitive' as const } })),
        }));
      };

      // ─── 1. Search Tasks (Strictly scoped to workspace) ─────────────────────────
      const taskWhereConditions: any[] = [];

      // A. Overdue / Delayed Intent
      if (isOverdueOrDelayed) {
        taskWhereConditions.push({
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { lt: now },
        });
      }

      // B. Incomplete Tasks Intent
      if (isIncompleteTasks) {
        taskWhereConditions.push({
          status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BACKLOG'] },
        });
      }

      // C. Blocker / Risk Intent
      if (isBlockersOrHealth) {
        taskWhereConditions.push(
          { priority: 'URGENT' as any },
          { description: { contains: 'block', mode: 'insensitive' as const } },
          { title: { contains: 'block', mode: 'insensitive' as const } }
        );
      }

      // D. Topic keywords match
      const kwsToMatch = topicKeywords.length > 0 ? topicKeywords : searchKeywords;
      if (kwsToMatch.length > 0) {
        taskWhereConditions.push({
          OR: [
            { title: { contains: rawTrimmed, mode: 'insensitive' } },
            { description: { contains: rawTrimmed, mode: 'insensitive' } },
            ...keywordFilter(['title', 'description'], kwsToMatch),
          ],
        });
      }

      const tasks = await prisma.task.findMany({
        where: {
          AND: [
            {
              OR: [{ workspaceId }, { project: { workspaceId } }],
            },
            ...(taskWhereConditions.length > 0 ? [{ OR: taskWhereConditions }] : []),
          ],
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 15,
      });

      // Name-based task assignment search
      const personMatch = rawTrimmed.match(/\b([A-Z][a-z]+)\b/);
      let personTasks: typeof tasks = [];
      if (personMatch && personMatch[1] && !STOP_AND_FILLER_WORDS.has(personMatch[1].toLowerCase())) {
        const personName = personMatch[1];
        personTasks = await prisma.task.findMany({
          where: {
            AND: [
              {
                OR: [{ workspaceId }, { project: { workspaceId } }],
              },
              {
                status: { notIn: ['DONE', 'CANCELLED'] },
                assignee: {
                  OR: [
                    { name: { contains: personName, mode: 'insensitive' } },
                    { email: { contains: personName, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            project: { select: { id: true, name: true } },
          },
          take: 5,
        });
      }

      const allTasksMap = new Map<string, (typeof tasks)[number]>();
      [...tasks, ...personTasks].forEach((t) => allTasksMap.set(t.id, t));
      const combinedTasks = Array.from(allTasksMap.values());

      for (const task of combinedTasks) {
        const textToMatch = `${task.title} ${task.description || ''} ${task.status} ${task.priority} ${task.assignee?.name || ''} ${task.project?.name || ''}`;

        let relevance = 0;
        if (isOverdueOrDelayed && task.dueDate && new Date(task.dueDate) < now && task.status !== 'DONE' && task.status !== 'CANCELLED') {
          relevance = 95;
        } else if (isIncompleteTasks && task.status !== 'DONE' && task.status !== 'CANCELLED') {
          relevance = 90;
        } else if (isResponsibility && (topicKeywords.length === 0 || topicKeywords.some(kw => textToMatch.toLowerCase().includes(kw)))) {
          relevance = 92;
        } else if (isBlockersOrHealth && (task.priority === 'URGENT' || textToMatch.toLowerCase().includes('block'))) {
          relevance = 92;
        } else if (isProjectActivity) {
          relevance = 85;
        } else {
          relevance = this.calculateRelevance(textToMatch, rawTrimmed, searchKeywords);
        }

        const link = `/dashboard/kanban?task=${task.id}`;
        const snippet =
          task.description?.substring(0, 160) ||
          `Task status: ${task.status}, priority: ${task.priority}, assignee: ${task.assignee?.name || 'Unassigned'}${
            task.dueDate ? `, due: ${new Date(task.dueDate).toLocaleDateString()}` : ''
          }`;

        const item: SearchResult = {
          type: 'task',
          id: task.id,
          title: task.title,
          snippet,
          relevance,
          link,
          metadata: {
            status: task.status,
            priority: task.priority,
            assignee: task.assignee?.name || null,
            dueDate: task.dueDate?.toISOString() || null,
            projectId: task.projectId,
            projectName: task.project?.name || null,
          },
        };

        results.push(item);
        sources.push({
          id: item.id,
          title: item.title,
          type: 'task',
          snippet: item.snippet,
          link: item.link,
          relevanceScore: item.relevance,
          metadata: item.metadata,
        });
      }

      // ─── 2. Search Task Comments ────────────────────────────────────────────────
      const commentKws = topicKeywords.length > 0 ? topicKeywords : searchKeywords;
      const commentConditions: any[] = [];
      if (commentKws.length > 0 && !isDiscussions) {
        commentConditions.push(
          { content: { contains: rawTrimmed, mode: 'insensitive' } },
          ...commentKws.map((kw) => ({ content: { contains: kw, mode: 'insensitive' as const } })),
          ...commentKws.map((kw) => ({ task: { title: { contains: kw, mode: 'insensitive' as const } } })),
          { author: { name: { contains: rawTrimmed, mode: 'insensitive' } } }
        );
      }

      let comments: any[] = [];
      if (isDiscussions || commentConditions.length > 0) {
        comments = await prisma.taskComment.findMany({
          where: {
            task: {
              OR: [{ workspaceId }, { project: { workspaceId } }],
            },
            ...(commentConditions.length > 0 ? { OR: commentConditions } : {}),
          },
          include: {
            author: { select: { id: true, name: true, email: true } },
            task: { select: { id: true, title: true, projectId: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        });
      }

      for (const comment of comments) {
        const authorName = comment.author?.name || comment.author?.email || 'Team Member';
        const textToMatch = `${comment.content} ${authorName} ${comment.task.title}`;

        let relevance = 0;
        if (isDiscussions) {
          relevance = 90;
        } else {
          relevance = this.calculateRelevance(textToMatch, rawTrimmed, searchKeywords);
        }

        const link = `/dashboard/kanban?task=${comment.taskId}&comment=${comment.id}`;
        const title = `Comment on "${comment.task.title}" by ${authorName}`;
        const snippet = comment.content.substring(0, 160);

        const item: SearchResult = {
          type: 'task_comment',
          id: comment.id,
          title,
          snippet,
          relevance,
          link,
          metadata: {
            taskId: comment.taskId,
            taskTitle: comment.task.title,
            author: authorName,
            createdAt: comment.createdAt.toISOString(),
          },
        };

        results.push(item);
        sources.push({
          id: item.id,
          title: item.title,
          type: 'task_comment',
          snippet: item.snippet,
          link: item.link,
          relevanceScore: item.relevance,
          metadata: item.metadata,
        });
      }

      // ─── 3. Search Projects ─────────────────────────────────────────────────────
      const projectKws = topicKeywords.length > 0 ? topicKeywords : searchKeywords;
      const projectConditions: any[] = [];

      if (projectKws.length > 0 && !isBlockersOrHealth && !isProjectActivity) {
        projectConditions.push(
          { name: { contains: rawTrimmed, mode: 'insensitive' } },
          { description: { contains: rawTrimmed, mode: 'insensitive' } },
          ...keywordFilter(['name', 'description'], projectKws)
        );
      }

      let projects: any[] = [];
      if (isBlockersOrHealth || isProjectActivity || projectConditions.length > 0) {
        projects = await prisma.project.findMany({
          where: {
            workspaceId,
            ...(projectConditions.length > 0 ? { OR: projectConditions } : {}),
          },
          include: {
            creator: { select: { id: true, name: true, email: true } },
            tasks: {
              where: { status: { notIn: ['DONE', 'CANCELLED'] } },
              select: { id: true, title: true, status: true, priority: true, dueDate: true },
            },
          },
          take: 8,
        });
      }

      for (const project of projects) {
        const textToMatch = `${project.name} ${project.description || ''} ${project.status}`;

        let relevance = 0;
        if (isBlockersOrHealth) {
          const hasBlockedTasks = project.tasks.some(
            (t: any) => (t.dueDate && new Date(t.dueDate) < now) || t.priority === 'URGENT' || t.priority === 'HIGH' || t.status === 'BLOCKED'
          );
          relevance = hasBlockedTasks ? 92 : 75;
        } else if (isProjectActivity) {
          relevance = 88;
        } else {
          relevance = this.calculateRelevance(textToMatch, rawTrimmed, searchKeywords);
        }

        const link = `/dashboard/projects/${project.id}`;
        const snippet = project.description?.substring(0, 160) || `Project status: ${project.status}`;

        const item: SearchResult = {
          type: 'project',
          id: project.id,
          title: project.name,
          snippet,
          relevance,
          link,
          metadata: {
            status: project.status,
            creator: project.creator?.name || project.creator?.email || null,
            openTasksCount: project.tasks?.length || 0,
          },
        };

        results.push(item);
        sources.push({
          id: item.id,
          title: item.title,
          type: 'project',
          snippet: item.snippet,
          link: item.link,
          relevanceScore: item.relevance,
          metadata: item.metadata,
        });
      }

      // ─── 4. Search Meetings ─────────────────────────────────────────────────────
      const meetingKws = topicKeywords.length > 0 ? topicKeywords : searchKeywords;
      const meetingConditions: any[] = [];

      if (meetingKws.length > 0 && !isMeetingDecisions && !isProjectActivity) {
        meetingConditions.push(
          { title: { contains: rawTrimmed, mode: 'insensitive' } },
          { summary: { contains: rawTrimmed, mode: 'insensitive' } },
          { decisions: { contains: rawTrimmed, mode: 'insensitive' } },
          { description: { contains: rawTrimmed, mode: 'insensitive' } },
          { transcript: { contains: rawTrimmed, mode: 'insensitive' } },
          ...keywordFilter(['title', 'summary', 'decisions', 'transcript'], meetingKws)
        );
      }

      let meetings: any[] = [];
      if (isMeetingDecisions || isProjectActivity || meetingConditions.length > 0) {
        meetings = await prisma.meeting.findMany({
          where: {
            workspaceId,
            ...(meetingConditions.length > 0 ? { OR: meetingConditions } : {}),
          },
          select: {
            id: true,
            title: true,
            description: true,
            summary: true,
            decisions: true,
            transcript: true,
            startTime: true,
            status: true,
          },
          orderBy: { startTime: 'desc' },
          take: 8,
        });
      }

      for (const meeting of meetings) {
        const textToMatch = `${meeting.title} ${meeting.summary || ''} ${meeting.decisions || ''} ${meeting.transcript || ''}`;

        let relevance = 0;
        if (isMeetingDecisions && (meeting.decisions || meeting.summary)) {
          relevance = 95;
        } else if (isProjectActivity) {
          relevance = 86;
        } else {
          relevance = this.calculateRelevance(textToMatch, rawTrimmed, searchKeywords);
        }

        const link = `/dashboard/meetings?meetingId=${meeting.id}`;

        let snippet = '';
        const lowerTranscript = meeting.transcript ? meeting.transcript.toLowerCase() : '';
        const lowerQ = rawTrimmed.toLowerCase();
        const inSummary =
          meeting.summary &&
          (meeting.summary.toLowerCase().includes(lowerQ) ||
            searchKeywords.some((k) => meeting.summary!.toLowerCase().includes(k)));
        const inDecisions =
          meeting.decisions &&
          (meeting.decisions.toLowerCase().includes(lowerQ) ||
            searchKeywords.some((k) => meeting.decisions!.toLowerCase().includes(k)));

        if (inDecisions) {
          snippet = `Decisions: ${meeting.decisions!.substring(0, 150)}`;
        } else if (inSummary) {
          snippet = meeting.summary!.substring(0, 160);
        } else if (
          lowerTranscript &&
          (lowerTranscript.includes(lowerQ) || searchKeywords.some((k) => lowerTranscript.includes(k)))
        ) {
          let matchIdx = lowerTranscript.indexOf(lowerQ);
          if (matchIdx === -1) {
            for (const kw of searchKeywords) {
              matchIdx = lowerTranscript.indexOf(kw);
              if (matchIdx !== -1) break;
            }
          }
          if (matchIdx !== -1) {
            const start = Math.max(0, matchIdx - 40);
            const end = Math.min(meeting.transcript!.length, matchIdx + 120);
            snippet =
              (start > 0 ? '...' : '') +
              meeting.transcript!.substring(start, end).trim() +
              (end < meeting.transcript!.length ? '...' : '');
          } else {
            snippet = meeting.transcript!.substring(0, 150) + '...';
          }
        } else {
          snippet =
            meeting.decisions?.substring(0, 150) ||
            meeting.summary?.substring(0, 150) ||
            meeting.description?.substring(0, 150) ||
            'Meeting recorded session';
        }

        const item: SearchResult = {
          type: 'meeting',
          id: meeting.id,
          title: meeting.title,
          snippet,
          relevance,
          link,
          metadata: {
            status: meeting.status,
            startTime: meeting.startTime.toISOString(),
          },
        };

        results.push(item);
        sources.push({
          id: item.id,
          title: item.title,
          type: 'meeting',
          snippet: item.snippet,
          link: item.link,
          relevanceScore: item.relevance,
          metadata: item.metadata,
        });
      }

      // ─── 5. Search Dedicated Decisions ──────────────────────────────────────────
      const decisionKws = topicKeywords.length > 0 ? topicKeywords : searchKeywords;
      const decisionConditions: any[] = [];

      if (decisionKws.length > 0 && !isMeetingDecisions) {
        decisionConditions.push(
          { title: { contains: rawTrimmed, mode: 'insensitive' } },
          { description: { contains: rawTrimmed, mode: 'insensitive' } },
          { category: { contains: rawTrimmed, mode: 'insensitive' } },
          { type: { contains: rawTrimmed, mode: 'insensitive' } },
          { decision: { contains: rawTrimmed, mode: 'insensitive' } },
          ...keywordFilter(['title', 'description', 'decision'], decisionKws)
        );
      }

      let decisions: any[] = [];
      if (isMeetingDecisions || decisionConditions.length > 0) {
        decisions = await prisma.decision.findMany({
          where: {
            workspaceId,
            ...(decisionConditions.length > 0 ? { OR: decisionConditions } : {}),
          },
          include: {
            decidedBy: { select: { id: true, name: true, email: true } },
            meeting: { select: { id: true, title: true } },
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        });
      }

      for (const dec of decisions) {
        const textToMatch = `${dec.title} ${dec.description || ''} ${dec.decision || ''} ${dec.category || ''} ${dec.type || ''}`;

        let relevance = 0;
        if (isMeetingDecisions) {
          relevance = 95;
        } else {
          relevance = this.calculateRelevance(textToMatch, rawTrimmed, searchKeywords);
        }

        const link = '/dashboard/decisions';
        const snippet =
          dec.description?.substring(0, 160) ||
          dec.decision?.substring(0, 160) ||
          `Decision type: ${dec.type || 'DECISION'}, status: ${dec.status}`;

        const item: SearchResult = {
          type: 'decision',
          id: dec.id,
          title: dec.title,
          snippet,
          relevance,
          link,
          metadata: {
            category: dec.category,
            type: dec.type,
            status: dec.status,
            decidedBy: dec.decidedBy?.name || dec.decidedBy?.email || null,
            projectName: dec.project?.name || null,
            meetingTitle: dec.meeting?.title || null,
          },
        };

        results.push(item);
        sources.push({
          id: item.id,
          title: item.title,
          type: 'decision',
          snippet: item.snippet,
          link: item.link,
          relevanceScore: item.relevance,
          metadata: item.metadata,
        });
      }

      // ─── 6. Search Documents ────────────────────────────────────────────────────
      const docKws = topicKeywords.length > 0 ? topicKeywords : searchKeywords;
      let documents: any[] = [];

      if (docKws.length > 0) {
        documents = await prisma.document.findMany({
          where: {
            AND: [
              { workspaceId },
              {
                OR: [
                  { title: { contains: rawTrimmed, mode: 'insensitive' } },
                  { content: { contains: rawTrimmed, mode: 'insensitive' } },
                  { type: { contains: rawTrimmed, mode: 'insensitive' } },
                  ...keywordFilter(['title', 'content'], docKws),
                ],
              },
            ],
          },
          include: {
            creator: { select: { id: true, name: true, email: true } },
            project: { select: { id: true, name: true } },
          },
          take: 8,
        });
      }

      for (const doc of documents) {
        const textToMatch = `${doc.title} ${doc.content || ''} ${doc.type || ''}`;
        const relevance = this.calculateRelevance(textToMatch, rawTrimmed, searchKeywords);
        const link = `/dashboard/documents?id=${doc.id}`;
        const snippet = doc.content?.substring(0, 160) || 'Workspace documentation notes';

        const item: SearchResult = {
          type: 'document',
          id: doc.id,
          title: doc.title,
          snippet,
          relevance,
          link,
          metadata: {
            type: doc.type,
            projectName: doc.project?.name || null,
          },
        };

        results.push(item);
        sources.push({
          id: item.id,
          title: item.title,
          type: 'document',
          snippet: item.snippet,
          link: item.link,
          relevanceScore: item.relevance,
          metadata: item.metadata,
        });
      }

      // ─── 7. Project Activities (for Project Activity Intent) ─────────────────────
      let recentActivities: any[] = [];
      if (isProjectActivity) {
        recentActivities = await prisma.projectActivity.findMany({
          where: { workspaceId },
          include: {
            project: { select: { id: true, name: true } },
            actor: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
      }

      // Sort results by relevance descending
      results.sort((a, b) => b.relevance - a.relevance);
      sources.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      // ─── Filter out zero-relevance noise ────────────────────────────────────────
      const relevantResults = results.filter((r) => r.relevance >= 25);
      let relevantSources = sources.filter((s) => (s.relevanceScore || 0) >= 25);

      if (relevantResults.length > 0 && relevantSources.length === 0) {
        relevantSources = relevantResults.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          snippet: r.snippet,
          link: r.link,
          relevanceScore: r.relevance,
          metadata: r.metadata,
        }));
      }

      // ─── 8. Grounded Answer Synthesis ───────────────────────────────────────────
      if (relevantResults.length === 0) {
        return this.emptyResponse(query);
      }

      let synthesizedAnswer: string = '';
      const topResult = relevantResults[0]!;

      // ── Case 1: Overdue or Delayed Tasks Intent ─────────────────────────────────
      if (isOverdueOrDelayed) {
        const overdueTasks = combinedTasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE' && t.status !== 'CANCELLED'
        );

        if (overdueTasks.length > 0) {
          const mainTask = overdueTasks[0]!;
          const dueDateStr = new Date(mainTask.dueDate!).toLocaleDateString();
          facts.push(
            `Task "${mainTask.title}" has status ${mainTask.status} and priority ${mainTask.priority}.`,
            `Task due date was ${dueDateStr}, assigned to ${mainTask.assignee?.name || 'Unassigned'}.`
          );
          inferences.push(
            `Because "${mainTask.title}" is in ${mainTask.status} status past its due date (${dueDateStr}), it is overdue and contributing to schedule delay.`
          );

          if (overdueTasks.length === 1) {
            synthesizedAnswer = `Task "${mainTask.title}" is delayed: its due date was ${dueDateStr} and its current status remains ${mainTask.status}. It is assigned to ${
              mainTask.assignee?.name || 'Unassigned'
            }.`;
          } else {
            const list = overdueTasks
              .map((t) => `"${t.title}" (due ${new Date(t.dueDate!).toLocaleDateString()}, status: ${t.status})`)
              .join(', ');
            synthesizedAnswer = `There are ${overdueTasks.length} overdue task(s) currently delayed in this workspace: ${list}. The highest priority delayed item is "${mainTask.title}".`;
          }

          supportingEvidence.push(`Recorded in task "${mainTask.title}" with due date ${dueDateStr}.`);
        } else if (combinedTasks.length > 0) {
          const mainTask = combinedTasks[0]!;
          facts.push(
            `Task "${mainTask.title}" is currently in ${mainTask.status} status (${mainTask.priority} priority).`,
            mainTask.dueDate
              ? `Due date is scheduled for ${new Date(mainTask.dueDate).toLocaleDateString()}.`
              : 'No due date is logged in the task record.'
          );
          synthesizedAnswer = `Task "${mainTask.title}" is currently in ${mainTask.status} status. The available workspace records do not log an overdue deadline or explicit blocker for this item.`;
          supportingEvidence.push(`Checked task status: ${mainTask.status}.`);
        } else {
          synthesizedAnswer =
            'There are currently no overdue tasks in this workspace. All active tasks are within their scheduled deadlines.';
          supportingEvidence.push('Checked workspace task records for overdue deadlines.');
        }
      }

      // ── Case 2: Incomplete Tasks Intent ─────────────────────────────────────────
      if (!synthesizedAnswer && isIncompleteTasks) {
        const incompleteTasks = combinedTasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED');

        if (incompleteTasks.length > 0) {
          const list = incompleteTasks
            .slice(0, 5)
            .map(
              (t) =>
                `"${t.title}" (${t.status}, ${t.priority} priority${t.assignee ? `, assigned to ${t.assignee.name}` : ''})`
            )
            .join('; ');

          facts.push(
            `Found ${incompleteTasks.length} incomplete task(s) in this workspace.`,
            ...incompleteTasks
              .slice(0, 3)
              .map((t) => `Task "${t.title}" status is ${t.status} (priority: ${t.priority}).`)
          );
          inferences.push('These incomplete tasks require progress updates to reach project milestones.');
          synthesizedAnswer = `There are currently ${incompleteTasks.length} incomplete task(s) in this workspace: ${list}.`;
          supportingEvidence.push(...incompleteTasks.slice(0, 3).map((t) => `Task record "${t.title}"`));
        } else {
          synthesizedAnswer =
            'All tasks in this workspace are currently completed or cancelled. There are no incomplete tasks.';
          supportingEvidence.push('Verified task statuses across workspace projects.');
        }
      }

      // ── Case 3: Blockers or Project Health Intent ────────────────────────────────
      if (!synthesizedAnswer && isBlockersOrHealth) {
        const projectsWithIssues = projects.filter((p: any) =>
          p.tasks?.some(
            (t: any) => (t.dueDate && new Date(t.dueDate) < now) || t.priority === 'URGENT' || t.priority === 'HIGH'
          )
        );

        if (projectsWithIssues.length > 0) {
          const summaries = projectsWithIssues
            .map((p: any) => {
              const overdueCount = p.tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < now).length;
              return `Project "${p.name}" (${p.tasks.length} open tasks, ${overdueCount} overdue)`;
            })
            .join(', ');

          facts.push(
            ...projectsWithIssues.map((p: any) => `Project "${p.name}" has ${p.tasks.length} unresolved tasks.`)
          );
          inferences.push('Projects with overdue or high-priority unresolved tasks represent critical delivery blockers.');
          synthesizedAnswer = `The following project(s) have blockers or overdue tasks in this workspace: ${summaries}.`;
          supportingEvidence.push(
            ...projectsWithIssues.map((p: any) => `Project record "${p.name}" with active task list`)
          );
        } else if (projects.length > 0) {
          synthesizedAnswer =
            'No projects in this workspace currently report active blockers or overdue critical path tasks.';
          supportingEvidence.push('Checked project task schedules across workspace.');
        }
      }

      // ── Case 4: Meeting Decisions Intent ────────────────────────────────────────
      if (!synthesizedAnswer && isMeetingDecisions) {
        if (decisions.length > 0) {
          const d = decisions[0]!;
          facts.push(
            `Decision record "${d.title}" (${d.type || 'DECISION'}) has status ${d.status}.`,
            d.description ? `Description: "${d.description}"` : `Details: ${d.decision || 'No description'}`
          );
          synthesizedAnswer = `Workspace decision "${d.title}": ${d.description || d.decision || d.status} (Category: ${
            d.category || 'General'
          }).`;
          supportingEvidence.push(`Retrieved from decision record "${d.title}".`);
        } else if (meetings.some((m) => m.decisions || m.summary)) {
          const m = meetings.find((m) => m.decisions || m.summary)!;
          facts.push(
            `Meeting "${m.title}" held on ${new Date(m.startTime).toLocaleDateString()} status is ${m.status}.`,
            m.decisions ? `Recorded decisions: ${m.decisions}` : `Summary: ${m.summary}`
          );
          synthesizedAnswer = `During meeting "${m.title}" (${new Date(m.startTime).toLocaleDateString()}), key decisions recorded: ${
            m.decisions || m.summary
          }.`;
          supportingEvidence.push(`Recorded in meeting "${m.title}".`);
        }
      }

      // ── Case 5: Discussions / Comments Intent ────────────────────────────────────
      if (!synthesizedAnswer && isDiscussions && comments.length > 0) {
        const c = comments[0]!;
        const author = c.author?.name || c.author?.email || 'Team member';
        facts.push(`Comment on task "${c.task.title}" by ${author}: "${c.content}"`);
        synthesizedAnswer = `Found discussions on task "${c.task.title}": ${author} commented: "${c.content}".`;
        supportingEvidence.push(`Comment by ${author} on task "${c.task.title}".`);
      }

      // ── Case 6: Responsibility / Assignee Intent ────────────────────────────────
      if (!synthesizedAnswer && isResponsibility && combinedTasks.length > 0) {
        const matchedTask = combinedTasks[0]!;
        const assigneeName = matchedTask.assignee?.name || matchedTask.assignee?.email;
        if (assigneeName) {
          facts.push(
            `Task "${matchedTask.title}" is assigned to ${assigneeName} (status: ${matchedTask.status}, priority: ${matchedTask.priority}).`
          );
          synthesizedAnswer = `${assigneeName} is responsible for "${matchedTask.title}" (status: ${matchedTask.status}, project: ${
            matchedTask.project?.name || 'Workspace Project'
          }).`;
          supportingEvidence.push(`Assignee logged in task "${matchedTask.title}".`);
        } else {
          facts.push(`Task "${matchedTask.title}" has status ${matchedTask.status} and is currently unassigned.`);
          synthesizedAnswer = `Task "${matchedTask.title}" in project "${
            matchedTask.project?.name || 'Workspace Project'
          }" is currently unassigned (status: ${matchedTask.status}).`;
          supportingEvidence.push(`Checked assignee in task "${matchedTask.title}".`);
        }
      }

      // ── Case 7: Project Activity Intent ─────────────────────────────────────────
      if (!synthesizedAnswer && isProjectActivity) {
        if (recentActivities.length > 0) {
          const summaryList = recentActivities
            .slice(0, 4)
            .map((a: any) => `${a.actor?.name || 'Member'} performed ${a.action} on ${a.entityTitle}`)
            .join('; ');
          facts.push(
            `Retrieved ${recentActivities.length} recent project activities in this workspace.`,
            ...recentActivities.slice(0, 2).map((a: any) => `${a.actor?.name || 'Member'}: ${a.action} on ${a.entityTitle}`)
          );
          synthesizedAnswer = `Recent workspace activity: ${summaryList}.`;
          supportingEvidence.push('Logged in ProjectActivity audit feed.');
        } else if (projects.length > 0) {
          const p = projects[0]!;
          facts.push(
            `Project "${p.name}" has status ${p.status} with ${p.tasks.length} open task(s).`
          );
          synthesizedAnswer = `In project "${p.name}", current status is ${p.status} with ${p.tasks.length} open task(s).`;
          supportingEvidence.push(`Project overview from "${p.name}".`);
        }
      }

      // ── Case 8: Person's Pending Tasks ──────────────────────────────────────────
      if (
        !synthesizedAnswer &&
        personMatch &&
        personMatch[1] &&
        (cleanLowerIncludes(rawTrimmed, ['pending', 'task', 'working', 'assigned']))
      ) {
        const name = personMatch[1];
        if (personTasks.length > 0) {
          const taskTitles = personTasks.map((t) => `"${t.title}" (${t.status})`).join(', ');
          facts.push(
            ...personTasks.map(
              (t) =>
                `Task "${t.title}" assigned to ${name}: status ${t.status}, priority ${t.priority}${
                  t.dueDate ? `, due ${new Date(t.dueDate).toLocaleDateString()}` : ''
                }.`
            )
          );
          synthesizedAnswer = `${name} currently has ${personTasks.length} pending task(s) in this workspace: ${taskTitles}.`;
          supportingEvidence.push(...personTasks.map((t) => `Assigned task "${t.title}" (${t.status})`));
        } else {
          facts.push(`Query checked tasks in workspace for assignee matching "${name}".`);
          synthesizedAnswer = `No pending active tasks found assigned to ${name} in this workspace.`;
        }
      }

      // ── Case 9: General Grounded Synthesis from Top Matched Record ──────────────
      if (!synthesizedAnswer && relevantResults.length > 0) {
        facts.push(`Top match in workspace is ${topResult.type} titled "${topResult.title}".`);
        synthesizedAnswer = `According to ${topResult.type} "${topResult.title}": ${topResult.snippet}`;
        supportingEvidence.push(`Matched query keywords in ${topResult.type} "${topResult.title}".`);
      }

      const relatedTasks = combinedTasks.slice(0, 5).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        link: `/dashboard/kanban?task=${t.id}`,
      }));

      const relatedMeetings = meetings.slice(0, 5).map((m) => ({
        id: m.id,
        title: m.title,
        date: new Date(m.startTime).toLocaleDateString(),
        link: `/dashboard/meetings?meetingId=${m.id}`,
      }));

      const relatedDocuments = documents.slice(0, 5).map((d) => ({
        id: d.id,
        title: d.title,
        link: `/dashboard/documents?id=${d.id}`,
      }));

      const relatedProjects = projects.slice(0, 5).map((p) => ({
        id: p.id,
        title: p.name,
        status: p.status,
        link: `/dashboard/projects/${p.id}`,
      }));

      const relatedDecisions = decisions.slice(0, 5).map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category || null,
        link: '/dashboard/decisions',
      }));

      return {
        query,
        results: relevantResults.slice(0, 15),
        sources: relevantSources.slice(0, 15),
        answer: synthesizedAnswer,
        isGrounded: true,
        facts,
        inferences,
        supportingEvidence:
          supportingEvidence.length > 0 ? supportingEvidence : ['Matched from verified workspace records'],
        relatedTasks,
        relatedMeetings,
        relatedDocuments,
        relatedProjects,
        relatedDecisions,
      };
    } catch (error) {
      logger.error('SearchEngine.search failed:', error);
      return this.emptyResponse(query);
    }
  }

  private static emptyResponse(query: string): SearchResponse {
    return {
      query,
      results: [],
      sources: [],
      answer: INSUFFICIENT_INFORMATION_MESSAGE,
      isGrounded: false,
      facts: [],
      inferences: [],
      supportingEvidence: [],
      relatedTasks: [],
      relatedMeetings: [],
      relatedDocuments: [],
      relatedProjects: [],
      relatedDecisions: [],
    };
  }

  /**
   * Lexical term-frequency relevance calculation (0 - 100).
   * Proportional to query content match without punitive single-keyword drop.
   */
  private static calculateRelevance(text: string, rawQuery: string, keywords: string[]): number {
    if (!text) return 0;
    const lowerText = text.toLowerCase();
    const lowerQuery = rawQuery.toLowerCase();
    const cleanQuery = lowerQuery.replace(/[?!.,;:"]+/g, ' ').replace(/\s+/g, ' ').trim();

    // Exact query phrase match provides highest relevance
    if (cleanQuery.length > 2 && lowerText.includes(cleanQuery)) {
      return 95;
    }

    if (keywords.length === 0) return 0;

    let matchCount = 0;
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        matchCount++;
      }
    }

    if (matchCount === 0) return 0;

    const ratio = matchCount / keywords.length;

    // If query has 4 or more keywords and only 1 matches (ratio <= 0.25), it is weak accidental noise
    if (keywords.length >= 4 && matchCount < 2) {
      return Math.round(ratio * 50); // e.g. 1/6 * 50 = 8, 1/4 * 50 = 12
    }

    // Score proportional to matched keywords (preserving meaningful 1-of-2 or 1-of-3 topic matches)
    const baseScore = Math.round(ratio * 70);
    const bonus = matchCount >= 2 ? 25 : 15;
    return Math.min(100, Math.max(0, baseScore + bonus));
  }
}

function cleanLowerIncludes(target: string, words: string[]): boolean {
  const lower = target.toLowerCase();
  return words.some((w) => lower.includes(w));
}
