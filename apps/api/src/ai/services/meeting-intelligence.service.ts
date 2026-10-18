/**
 * @file ai/services/meeting-intelligence.service.ts
 *
 * Core AI Meeting Intelligence Engine for CollabAI.
 * Processes meeting content (transcripts, chat, notes, participants)
 * and generates comprehensive structured intelligence.
 */

import { getAIProvider } from '../provider-factory.js';
import { HeuristicProvider } from '../providers/heuristic.provider.js';
import type {
  MeetingSummary,
  MeetingSentimentAnalysis,
  DeadlineMention,
  ActionItem,
  AITaskProposal,
  FullSprintPlan,
} from '../types.js';
import { logger } from '../../utils/logger.js';

export interface ComprehensiveMeetingAnalysis {
  source?: string;
  overview?: string;
  keyDiscussionPoints?: string[];
  executiveSummary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  risks: string[];
  pendingQuestions: string[];
  deadlinesMentioned: DeadlineMention[];
  suggestedFollowUps: string[];
  sentiment: MeetingSentimentAnalysis;
  sprintPlan: FullSprintPlan;
  generatedDocs: {
    meetingNotes: string;
    sprintNotes: string;
    decisionLog: string;
    releaseNotes?: string;
  };
  notifications: Array<{
    targetUserId?: string;
    targetUserName?: string;
    title: string;
    message: string;
    type: 'TASK_ASSIGNED' | 'MEETING_SUMMARY_READY' | 'SPRINT_RISK' | 'DEADLINE_APPROACHING';
  }>;
}

export class MeetingIntelligenceService {
  /**
   * Helper adapter method for generating meeting intelligence
   */
  static async generateMeetingIntelligence(input: {
    meetingId?: string;
    workspaceId?: string;
    title?: string;
    transcript?: string;
    notes?: string;
    sharedNotes?: string;
    chatMessages?: Array<{ sender: string; message: string }>;
    workspaceMembers?: Array<{ id: string; name: string; email?: string; role?: string }>;
    participants?: Array<{ id: string; name: string; email?: string; role?: string }>;
  }): Promise<ComprehensiveMeetingAnalysis> {
    const rawMembers = input.workspaceMembers || input.participants || [];
    const participants = rawMembers.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email || '',
      role: m.role || 'MEMBER',
    }));

    return this.analyzeMeeting({
      title: input.title || 'Meeting',
      transcript: input.transcript,
      chatMessages: input.chatMessages,
      sharedNotes: input.notes !== undefined ? input.notes : input.sharedNotes,
      participants,
    });
  }

  /**
   * Process a completed meeting transcript/notes and generate full intelligence payload
   */
  static async analyzeMeeting(payload: {
    title: string;
    transcript?: string | undefined;
    chatMessages?: Array<{ sender: string; message: string }> | undefined;
    sharedNotes?: string | undefined;
    participants: Array<{ id: string; name: string; email: string; role?: string | undefined }>;
  }): Promise<ComprehensiveMeetingAnalysis> {
    const hasNotes = Boolean(payload.sharedNotes && payload.sharedNotes.trim().length > 0);
    const hasTranscript = Boolean(payload.transcript && payload.transcript.trim().length > 0);
    const hasChat = Boolean(payload.chatMessages && payload.chatMessages.length > 0);

    // Identify source accurately based on actual content
    let source = 'Meeting Notes';
    if (hasTranscript && hasNotes) {
      source = 'Meeting Transcript & Notes';
    } else if (hasTranscript && !hasNotes) {
      source = 'Meeting Transcript';
    } else if (!hasTranscript && hasNotes && hasChat) {
      source = 'Meeting Notes & In-Call Chat';
    } else if (!hasTranscript && hasNotes && !hasChat) {
      source = 'Meeting Notes';
    } else if (!hasTranscript && !hasNotes && hasChat) {
      source = 'In-Call Chat Log';
    } else {
      source = 'No content recorded';
    }

    // Gracefully handle completely empty meetings without calling LLM or inventing fake data
    if (!hasNotes && !hasTranscript && !hasChat) {
      return {
        source,
        overview: `No meeting notes or transcript recorded for "${payload.title}".`,
        keyDiscussionPoints: [],
        executiveSummary: `[Source: No content recorded]\n\nNo notes, transcript, or chat messages were recorded for "${payload.title}". Add notes during the meeting to generate intelligence.`,
        keyDecisions: [],
        actionItems: [],
        risks: [],
        pendingQuestions: [],
        deadlinesMentioned: [],
        suggestedFollowUps: [],
        sentiment: {
          label: 'NEUTRAL',
          score: 50,
          summary: 'No content available to analyze sentiment.',
          keyMoments: [],
        },
        sprintPlan: {
          sprintGoal: `No actionable items recorded for ${payload.title}`,
          sprintNumber: 1,
          currentSprintTasks: [],
          nextSprintTasks: [],
          backlogTasks: [],
          estimatedDurationDays: 0,
          predictedCompletionDate: new Date().toISOString().split('T')[0]!,
          capacityUtilization: 0,
          risks: [],
        },
        generatedDocs: {
          meetingNotes: `# Meeting Notes: ${payload.title}\n\n*No meeting notes or transcript recorded.*`,
          sprintNotes: `# Sprint Plan: ${payload.title}\n\n*No action items extracted.*`,
          decisionLog: `# Decision Log: ${payload.title}\n\n*No decisions recorded.*`,
        },
        notifications: [],
      };
    }

    const provider = getAIProvider();

    const systemPrompt = `You are the CollabAI Lead AI Meeting Intelligence Engine (meeting_summary, task_extraction).
Your task is to analyze actual meeting content (transcripts, in-call chat, and shared notes) into structured execution intelligence.

CRITICAL INSTRUCTIONS:
1. Base your summary, decisions, and action items ONLY on the content provided.
2. If only meeting notes are available, summarize the notes and clearly label the source as "Meeting Notes". Do not invent a transcript or pretend live audio was transcribed.
3. For action items:
   - Only assign a team member if they are explicitly mentioned in the notes or chat and match a provided workspace member.
   - If no team member is explicitly named for an action, leave assignee and suggestedAssigneeId as null.
   - Only specify a deadline (dueDate) if explicitly mentioned in the notes or chat. Otherwise set dueDate to null. Do not invent dates.
4. Extract open/unresolved questions into pendingQuestions.
5. Return a single, valid JSON object with the following structure:
{
  "source": "${source}",
  "overview": "Concise 2-3 sentence overview of what was discussed based strictly on the provided content.",
  "keyDiscussionPoints": ["Point 1", "Point 2"],
  "executiveSummary": "[Source: ${source}]\\n\\nConcise summary...",
  "keyDecisions": ["Decision 1"],
  "actionItems": [
    {
      "title": "Clear task title",
      "description": "Context from notes",
      "assignee": "Name of member or null",
      "suggestedAssigneeId": "UUID if identifiable or null",
      "assignmentJustification": "Reasoning based on notes",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "dueDate": "YYYY-MM-DD or null",
      "estimatedEffort": "e.g. 3 pts",
      "labels": ["General"],
      "dependencies": [],
      "confidence": 85
    }
  ],
  "risks": ["Risk or blocker 1"],
  "pendingQuestions": ["Unresolved question 1"],
  "deadlinesMentioned": [
    {
      "topic": "Topic",
      "date": "YYYY-MM-DD",
      "urgency": "MEDIUM",
      "context": "Context"
    }
  ],
  "suggestedFollowUps": ["Follow up action 1"],
  "sentiment": {
    "label": "POSITIVE" | "NEUTRAL" | "HIGH_TENSION" | "CONSTRUCTIVE",
    "score": 80,
    "summary": "Meeting mood overview",
    "keyMoments": []
  }
}`;

    const userPrompt = JSON.stringify({
      meetingTitle: payload.title,
      transcript: payload.transcript || '',
      chatMessages: payload.chatMessages || [],
      sharedNotes: payload.sharedNotes || '',
      workspaceMembers: payload.participants,
    });

    try {
      const responseText = await provider.complete(
        { system: systemPrompt, user: userPrompt },
        { jsonMode: true, temperature: 0.2 }
      );

      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        logger.warn('AI provider returned non-JSON response, using heuristic fallback parser');
        return this.generateDeterministicIntelligence(payload, source);
      }

      if (!parsed || parsed.result === 'No matching heuristic handler found.') {
        return this.generateDeterministicIntelligence(payload, source);
      }

      // Match suggested assignees strictly to participant IDs
      const enrichedActionItems = (parsed.actionItems || []).map((item: any) => {
        let assigneeId = item.suggestedAssigneeId || null;
        let assigneeName = item.assignee || null;

        if (assigneeName) {
          const match = payload.participants.find(
            (p) =>
              p.name.toLowerCase().includes(assigneeName.toLowerCase()) ||
              p.email.toLowerCase().includes(assigneeName.toLowerCase())
          );
          if (match) {
            assigneeId = match.id;
            assigneeName = match.name;
          } else {
            // Do not invent people: if assignee name does not match any member, keep as unassigned or raw name
            assigneeId = null;
          }
        }

        return {
          ...item,
          assignee: assigneeName,
          suggestedAssigneeId: assigneeId,
          assignmentJustification:
            item.assignmentJustification ||
            (assigneeName
              ? `Assigned to ${assigneeName} based on meeting context.`
              : 'Unassigned — review and assign to a team member.'),
          priority: item.priority || 'MEDIUM',
          dueDate: item.dueDate || null,
          confidence: item.confidence || 85,
          estimatedEffort: item.estimatedEffort || '3 pts',
          labels: item.labels || ['Meeting-Action'],
          dependencies: item.dependencies || [],
        };
      });

      // Prepare sprint tasks from enriched action items
      const proposals: AITaskProposal[] = enrichedActionItems.map((item: any, idx: number) => ({
        id: item.id || `prop-${Date.now()}-${idx}`,
        title: item.title,
        description: item.description,
        priority: item.priority,
        status: idx < 3 ? 'TODO' : 'BACKLOG',
        assigneeName: item.assignee,
        assigneeId: item.suggestedAssigneeId,
        assignmentJustification: item.assignmentJustification,
        dueDate: item.dueDate,
        estimatedEffort: item.estimatedEffort,
        labels: item.labels,
        dependencies: item.dependencies,
        confidence: item.confidence,
      }));

      const currentTasks = proposals.slice(0, 3);
      const nextTasks = proposals.slice(3, 5);
      const backlogTasks = proposals.slice(5);

      const sprintPlan: FullSprintPlan = {
        sprintGoal: parsed.sprintPlan?.sprintGoal || `Deliver action items from ${payload.title}`,
        sprintNumber: parsed.sprintPlan?.sprintNumber || 1,
        currentSprintTasks: parsed.sprintPlan?.currentSprintTasks?.length ? parsed.sprintPlan.currentSprintTasks : currentTasks,
        nextSprintTasks: parsed.sprintPlan?.nextSprintTasks?.length ? parsed.sprintPlan.nextSprintTasks : nextTasks,
        backlogTasks: parsed.sprintPlan?.backlogTasks?.length ? parsed.sprintPlan.backlogTasks : backlogTasks,
        estimatedDurationDays: proposals.length > 0 ? 14 : 0,
        predictedCompletionDate:
          parsed.sprintPlan?.predictedCompletionDate ||
          new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
        capacityUtilization: Math.min(100, proposals.length * 15),
        risks: parsed.risks || [],
      };

      const overviewText = parsed.overview || (parsed.executiveSummary ? parsed.executiveSummary.replace(/^\[Source: [^\]]+\]\s*/, '') : `Reviewed content for ${payload.title}.`);
      const keyDiscussionPoints = Array.isArray(parsed.keyDiscussionPoints) ? parsed.keyDiscussionPoints : [];

      const formattedExecSummary = parsed.executiveSummary?.startsWith('[Source:')
        ? parsed.executiveSummary
        : `[Source: ${source}]\n\n${overviewText}${keyDiscussionPoints.length > 0 ? `\n\nKey Discussion Points:\n${keyDiscussionPoints.map((p: string) => `• ${p}`).join('\n')}` : ''}`;

      const markdownMeetingNotes =
        parsed.generatedDocs?.meetingNotes ||
        `# Meeting Notes: ${payload.title}\n\n**Source:** ${source}\n\n## Overview\n${overviewText}\n\n## Key Discussion Points\n${keyDiscussionPoints.map((p: string) => `- ${p}`).join('\n')}\n\n## Key Decisions\n${(parsed.keyDecisions || []).map((d: string) => `- ${d}`).join('\n')}\n\n## Action Items\n${enrichedActionItems.map((a: any) => `- [ ] **${a.title}** (${a.assignee || 'Unassigned'}) - ${a.description}`).join('\n')}`;

      const markdownDecisionLog =
        parsed.generatedDocs?.decisionLog ||
        `# Decision Log\n\nMeeting: ${payload.title}\nDate: ${new Date().toLocaleDateString()}\n\n${(parsed.keyDecisions || []).map((d: string, i: number) => `### Decision ${i + 1}\n${d}`).join('\n\n')}`;

      const notificationsList = payload.participants.map((p) => {
        const assignedCount = enrichedActionItems.filter(
          (a: any) => a.suggestedAssigneeId === p.id || (a.assignee && a.assignee.toLowerCase() === p.name.toLowerCase())
        ).length;

        return {
          targetUserId: p.id,
          targetUserName: p.name,
          title: assignedCount > 0 ? `You have ${assignedCount} new task(s) assigned` : 'Meeting Summary Ready',
          message:
            assignedCount > 0
              ? `AI extracted ${assignedCount} task(s) for you from "${payload.title}". Review and approve.`
              : `The AI Meeting Summary for "${payload.title}" is ready for review.`,
          type: (assignedCount > 0 ? 'TASK_ASSIGNED' : 'MEETING_SUMMARY_READY') as any,
        };
      });

      return {
        source,
        overview: overviewText,
        keyDiscussionPoints,
        executiveSummary: formattedExecSummary,
        keyDecisions: parsed.keyDecisions || [],
        actionItems: enrichedActionItems,
        risks: parsed.risks || [],
        pendingQuestions: parsed.pendingQuestions || [],
        deadlinesMentioned: parsed.deadlinesMentioned || [],
        suggestedFollowUps: parsed.suggestedFollowUps || [],
        sentiment: parsed.sentiment || {
          label: 'CONSTRUCTIVE',
          score: 82,
          summary: `Constructive alignment session based on ${source.toLowerCase()}.`,
          keyMoments: [],
        },
        sprintPlan,
        generatedDocs: {
          meetingNotes: markdownMeetingNotes,
          sprintNotes: `# Sprint Plan derived from ${payload.title}\n\n**Sprint Goal:** ${sprintPlan.sprintGoal}\n**Tasks:** ${proposals.length}`,
          decisionLog: markdownDecisionLog,
        },
        notifications: notificationsList,
      };
    } catch (error) {
      logger.error('MeetingIntelligenceService.analyzeMeeting error:', error);
      return this.generateDeterministicIntelligence(payload, source);
    }
  }

  /**
   * Deterministic NLP extractor that runs directly on actual content without inventing mock data
   */
  private static generateDeterministicIntelligence(
    payload: {
      title: string;
      transcript?: string | undefined;
      chatMessages?: Array<{ sender: string; message: string }> | undefined;
      sharedNotes?: string | undefined;
      participants: Array<{ id: string; name: string; email: string; role?: string | undefined }>;
    },
    source: string
  ): ComprehensiveMeetingAnalysis {
    const heuristic = new HeuristicProvider();
    const rawJson = (heuristic as any).processMeetingSummary(
      JSON.stringify({
        meetingTitle: payload.title,
        sharedNotes: payload.sharedNotes || '',
        transcript: payload.transcript || '',
        chatMessages: payload.chatMessages || [],
        workspaceMembers: payload.participants,
      })
    );

    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      parsed = {};
    }

    const actionItems: ActionItem[] = (parsed.actionItems || []).map((item: any) => ({
      title: item.title,
      description: item.description,
      assignee: item.assignee || null,
      suggestedAssigneeId: item.suggestedAssigneeId || null,
      assignmentJustification: item.assignee
        ? `Assigned to ${item.assignee} based on explicit mention in ${source.toLowerCase()}.`
        : 'Unassigned — review and assign to a team member.',
      priority: item.priority || 'MEDIUM',
      dueDate: item.dueDate || null,
      confidence: item.confidence || 80,
      labels: ['Meeting-Action'],
      dependencies: [],
    }));

    const sprintProposals: AITaskProposal[] = actionItems.map((item, idx) => ({
      id: `task-prop-${idx}`,
      title: item.title,
      description: item.description,
      priority: item.priority,
      status: 'TODO',
      assigneeName: item.assignee,
      assigneeId: item.suggestedAssigneeId || null,
      assignmentJustification: item.assignmentJustification || '',
      dueDate: item.dueDate,
      estimatedEffort: '3 pts',
      labels: item.labels || [],
      dependencies: [],
      confidence: item.confidence,
    }));

    const overview = parsed.overview || `Meeting summary for ${payload.title} from ${source.toLowerCase()}.`;
    const keyDiscussionPoints = parsed.keyDiscussionPoints || [];
    const keyDecisions = parsed.keyDecisions || [];
    const pendingQuestions = parsed.pendingQuestions || [];
    const risks = parsed.risks || [];
    const deadlinesMentioned = parsed.deadlinesMentioned || [];

    const executiveSummary = `[Source: ${source}]\n\n${overview}${
      keyDiscussionPoints.length > 0 ? `\n\nKey Discussion Points:\n${keyDiscussionPoints.map((p: string) => `• ${p}`).join('\n')}` : ''
    }`;

    return {
      source,
      overview,
      keyDiscussionPoints,
      executiveSummary,
      keyDecisions,
      actionItems,
      risks,
      pendingQuestions,
      deadlinesMentioned,
      suggestedFollowUps: parsed.suggestedFollowUps || [],
      sentiment: {
        label: 'CONSTRUCTIVE',
        score: 80,
        summary: `Productive discussion derived from ${source.toLowerCase()}.`,
        keyMoments: [],
      },
      sprintPlan: {
        sprintGoal: actionItems.length > 0 ? `Deliver ${actionItems.length} task(s) from ${payload.title}` : `Review deliverables from ${payload.title}`,
        sprintNumber: 1,
        currentSprintTasks: sprintProposals.slice(0, 3),
        nextSprintTasks: sprintProposals.slice(3, 5),
        backlogTasks: sprintProposals.slice(5),
        estimatedDurationDays: actionItems.length > 0 ? 14 : 0,
        predictedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
        capacityUtilization: Math.min(100, actionItems.length * 15),
        risks: risks,
      },
      generatedDocs: {
        meetingNotes: `# Meeting Notes: ${payload.title}\n\n**Source:** ${source}\n\n## Overview\n${overview}\n\n## Key Discussion Points\n${keyDiscussionPoints.map((p: string) => `- ${p}`).join('\n')}\n\n## Key Decisions\n${keyDecisions.map((d: string) => `- ${d}`).join('\n')}\n\n## Action Items\n${actionItems.map((a) => `- [ ] **${a.title}** (${a.assignee || 'Unassigned'}) - ${a.description}`).join('\n')}`,
        sprintNotes: `# Sprint Plan: ${payload.title}\n\nTotal Deliverables: ${actionItems.length}`,
        decisionLog: `# Decision Log: ${payload.title}\n\n${keyDecisions.map((d: string, i: number) => `### Decision ${i + 1}\n${d}`).join('\n\n')}`,
      },
      notifications: payload.participants.map((p) => ({
        targetUserId: p.id,
        targetUserName: p.name,
        title: 'Meeting Summary Ready',
        message: `Meeting intelligence for "${payload.title}" has been processed and is ready for review.`,
        type: 'MEETING_SUMMARY_READY',
      })),
    };
  }
}
