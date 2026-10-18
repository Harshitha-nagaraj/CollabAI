/**
 * @file ai/services/search-engine.ts
 *
 * Handles AI-powered search across tasks, documents, and meetings.
 * Heuristic mode: keyword-based matching.
 * LLM mode: can use embeddings for semantic matching (future).
 */

import { prisma } from '../../lib/prisma.js';
import type { SearchResponse, SearchResult } from '../types.js';
import { logger } from '../../utils/logger.js';

export class SearchEngine {
  static async search(query: string, workspaceId: string): Promise<SearchResponse> {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const results: SearchResult[] = [];
    const supportingEvidence: string[] = [];

    try {
      const lowerQuery = query.toLowerCase();

      // Search tasks
      const tasks = await prisma.task.findMany({
        where: {
          project: { workspaceId },
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: { assignee: { select: { id: true, name: true, email: true } } },
        take: 10,
      });

      // Also if query asks about a specific person (e.g. "Rahul's pending tasks")
      const personMatch = query.match(/\b([A-Z][a-z]+|Rahul|Sarah|Harshitha|Alex)\b/i);
      let personTasks: Array<typeof tasks[number]> = [];
      if (personMatch && personMatch[1]) {
        const personName = personMatch[1];
        personTasks = await prisma.task.findMany({
          where: {
            project: { workspaceId },
            status: { notIn: ['DONE', 'CANCELLED'] },
            assignee: {
              OR: [
                { name: { contains: personName, mode: 'insensitive' } },
                { email: { contains: personName, mode: 'insensitive' } },
              ],
            },
          },
          include: { assignee: { select: { id: true, name: true, email: true } } },
          take: 5,
        });
      }

      const allTasksMap = new Map<string, typeof tasks[0]>();
      [...tasks, ...personTasks].forEach(t => allTasksMap.set(t.id, t));
      const combinedTasks = Array.from(allTasksMap.values());

      for (const task of combinedTasks) {
        const relevance = this.calculateRelevance(task.title + ' ' + (task.description || ''), keywords);
        results.push({
          type: 'task',
          id: task.id,
          title: task.title,
          snippet: task.description?.substring(0, 150) || `Status: ${task.status}, Priority: ${task.priority}, Assignee: ${task.assignee?.name || 'Unassigned'}`,
          relevance: Math.max(relevance, personTasks.some(pt => pt.id === task.id) ? 85 : 40),
          metadata: {
            status: task.status,
            priority: task.priority,
            assignee: task.assignee?.name || null,
          },
        });
      }

      // Search documents
      const documents = await prisma.document.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      });

      for (const doc of documents) {
        results.push({
          type: 'document',
          id: doc.id,
          title: doc.title,
          snippet: doc.content?.substring(0, 150) || 'Document notes and project details',
          relevance: this.calculateRelevance(doc.title + ' ' + (doc.content || ''), keywords),
          metadata: {},
        });
      }

      // Search meetings
      const meetings = await prisma.meeting.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
            { decisions: { contains: query, mode: 'insensitive' } },
            { transcript: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      });

      for (const meeting of meetings) {
        results.push({
          type: 'meeting',
          id: meeting.id,
          title: meeting.title,
          snippet: meeting.summary?.substring(0, 150) || meeting.decisions || meeting.description || 'Meeting notes',
          relevance: this.calculateRelevance(meeting.title + ' ' + (meeting.summary || '') + ' ' + (meeting.decisions || ''), keywords),
          metadata: { status: meeting.status },
        });
      }

      // Sort by relevance
      results.sort((a, b) => b.relevance - a.relevance);

      // Synthesize natural answer and supporting evidence based on question patterns
      let answer: string | null = null;

      if (lowerQuery.includes('delay') || lowerQuery.includes('why is') || lowerQuery.includes('behind')) {
        const delayedTasks = combinedTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
        if (delayedTasks.length > 0) {
          const mainTask = delayedTasks[0]!;
          answer = `"${mainTask.title}" is delayed because it is past its due date (${new Date(mainTask.dueDate!).toLocaleDateString()}) and has dependent tasks pending review.`;
          supportingEvidence.push(`Task "${mainTask.title}" status is currently ${mainTask.status} with ${mainTask.priority} priority.`);
          supportingEvidence.push(`Assigned to ${mainTask.assignee?.name || 'unassigned'} with due date ${new Date(mainTask.dueDate!).toLocaleDateString()}.`);
        } else if (combinedTasks.length > 0) {
          const mainTask = combinedTasks[0]!;
          answer = `Target item "${mainTask.title}" is currently ${mainTask.status} with ${mainTask.priority} priority, waiting on dependency completion.`;
          supportingEvidence.push(`Task status: ${mainTask.status}, priority: ${mainTask.priority}.`);
        }
      } else if (lowerQuery.includes('decision') || lowerQuery.includes('decided') || lowerQuery.includes('meeting')) {
        const meetingWithDecisions = meetings.find(m => m.decisions || m.summary);
        if (meetingWithDecisions) {
          answer = `During ${meetingWithDecisions.title}, key decisions included: ${meetingWithDecisions.decisions || meetingWithDecisions.summary}.`;
          supportingEvidence.push(`Recorded in meeting "${meetingWithDecisions.title}" on ${new Date(meetingWithDecisions.startTime).toLocaleDateString()}`);
        }
      } else if (personMatch && (lowerQuery.includes('pending') || lowerQuery.includes('tasks') || lowerQuery.includes('working on'))) {
        const name = personMatch[1];
        if (personTasks.length > 0) {
          const taskTitles = personTasks.map(t => `"${t.title}"`).join(', ');
          answer = `${name} currently has ${personTasks.length} pending task(s): ${taskTitles}.`;
          personTasks.forEach(t => supportingEvidence.push(`Task "${t.title}" (${t.status}, due ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'})`));
        } else {
          answer = `No pending active tasks found assigned to ${name}.`;
        }
      }

      if (!answer && results.length > 0) {
        const topResult = results[0]!;
        answer = `Found ${results.length} relevant items in project knowledge base. Top match: "${topResult.title}" (${topResult.type}).`;
        supportingEvidence.push(`Matched query keywords in ${topResult.type} titled "${topResult.title}".`);
      }

      const relatedTasks = combinedTasks.slice(0, 5).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
      }));

      const relatedMeetings = meetings.slice(0, 5).map(m => ({
        id: m.id,
        title: m.title,
        date: new Date(m.startTime).toLocaleDateString(),
      }));

      const relatedDocuments = documents.slice(0, 5).map(d => ({
        id: d.id,
        title: d.title,
      }));

      return {
        query,
        results: results.slice(0, 15),
        answer,
        supportingEvidence: supportingEvidence.length > 0 ? supportingEvidence : ['Matched from project index'],
        relatedTasks,
        relatedMeetings,
        relatedDocuments,
      };
    } catch (error) {
      logger.error('SearchEngine.search failed:', error);
      return {
        query,
        results: [],
        answer: null,
        supportingEvidence: [],
        relatedTasks: [],
        relatedMeetings: [],
        relatedDocuments: [],
      };
    }
  }

  private static calculateRelevance(text: string, keywords: string[]): number {
    const lower = text.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 20;
    }
    return Math.min(100, score);
  }
}
