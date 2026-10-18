/**
 * @file ai/providers/heuristic.provider.ts
 *
 * A sophisticated rule-based AI provider that works WITHOUT any external API key.
 * Uses NLP heuristics (keyword extraction, sentence classification, entity matching)
 * to produce structured AI outputs.
 *
 * This is NOT a placeholder — it is the default production provider that makes
 * CollabAI immediately usable out of the box.
 */

import type { LLMProvider, LLMCompletionOptions, PromptPayload } from '../types.js';

export class HeuristicProvider implements LLMProvider {
  readonly name = 'heuristic';

  async complete(prompt: PromptPayload, _options?: LLMCompletionOptions): Promise<string> {
    const systemLower = prompt.system.toLowerCase();
    const userText = prompt.user;

    // Route to the appropriate heuristic based on the system prompt identifier
    if (systemLower.includes('meeting_summary') || systemLower.includes('lead ai meeting intelligence')) {
      return this.processMeetingSummary(userText);
    }
    if (systemLower.includes('task_extraction')) {
      return this.processTaskExtraction(userText);
    }
    if (systemLower.includes('sprint_planner')) {
      return this.processSprintPlan(userText);
    }
    if (systemLower.includes('project_health')) {
      return this.processProjectHealth(userText);
    }
    if (systemLower.includes('standup_generator')) {
      return this.processStandup(userText);
    }
    if (systemLower.includes('weekly_report')) {
      return this.processWeeklyReport(userText);
    }
    if (systemLower.includes('command_parser')) {
      return this.processCommand(userText);
    }
    if (systemLower.includes('search_query')) {
      return JSON.stringify({ answer: null, reasoning: 'Heuristic search delegates to keyword matching.' });
    }

    return JSON.stringify({ result: 'No matching heuristic handler found.' });
  }

  // ─── Meeting Summary ─────────────────────────────────────────────────────

  private processMeetingSummary(text: string): string {
    let title = 'Meeting';
    let sharedNotes = '';
    let transcript = '';
    let chatMessages: Array<{ sender: string; message: string }> = [];
    let workspaceMembers: Array<{ id: string; name: string; email: string }> = [];

    try {
      const parsed = JSON.parse(text);
      title = parsed.meetingTitle || parsed.title || title;
      sharedNotes = typeof parsed.sharedNotes === 'string' ? parsed.sharedNotes.trim() : '';
      transcript = typeof parsed.transcript === 'string' ? parsed.transcript.trim() : '';
      chatMessages = Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [];
      workspaceMembers = Array.isArray(parsed.workspaceMembers)
        ? parsed.workspaceMembers
        : Array.isArray(parsed.participants)
        ? parsed.participants
        : [];
    } catch {
      sharedNotes = text.trim();
    }

    const hasNotes = sharedNotes.length > 0;
    const hasTranscript = transcript.length > 0;
    const hasChat = chatMessages.length > 0;

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

    if (!hasNotes && !hasTranscript && !hasChat) {
      return JSON.stringify({
        source: 'No content recorded',
        overview: `No notes, transcript, or chat messages were recorded for "${title}".`,
        keyDiscussionPoints: [],
        executiveSummary: `[Source: No content recorded]\n\nNo notes, transcript, or chat messages were recorded for "${title}". Add notes during the meeting to generate intelligence.`,
        keyDecisions: [],
        actionItems: [],
        risks: [],
        pendingQuestions: [],
        deadlinesMentioned: [],
        suggestedFollowUps: [],
      });
    }

    // Collect all raw content lines
    const rawSegments: string[] = [];
    if (hasNotes) {
      rawSegments.push(sharedNotes);
    }
    if (hasChat) {
      rawSegments.push(chatMessages.map(c => `${c.sender}: ${c.message}`).join('\n'));
    }
    if (hasTranscript) {
      rawSegments.push(transcript);
    }

    const combinedText = rawSegments.join('\n\n');
    const sentences = this.splitSentences(combinedText);

    // Decisions: sentences indicating decisions
    const decisionMatches = sentences.filter(s =>
      /\b(decided|agreed|confirmed|approved|will go with|finalized|conclusion|resolution)\b/i.test(s) ||
      /^[•\-\*]?\s*(decision|agreed):/i.test(s)
    );
    const keyDecisions = decisionMatches.map(s => s.replace(/^[•\-\*]?\s*(decision|agreed):\s*/i, '').trim());

    // Risks: sentences indicating risk or blocker
    const riskMatches = sentences.filter(s =>
      /\b(risk|concern|worried|issue|problem|blocker|delay|threat|bottleneck|vulnerability)\b/i.test(s) ||
      /^[•\-\*]?\s*(risk|blocker):/i.test(s)
    );
    const risks = riskMatches.map(s => s.replace(/^[•\-\*]?\s*(risk|blocker):\s*/i, '').trim());

    // Questions: sentences ending in ? or labeled question/tbd
    const questionMatches = sentences.filter(s =>
      s.trim().endsWith('?') ||
      /\b(open question|unresolved|tbd|to investigate|to clarify)\b/i.test(s) ||
      /^[•\-\*]?\s*(question|q):/i.test(s)
    );
    const pendingQuestions = questionMatches.map(s => s.replace(/^[•\-\*]?\s*(question|q):\s*/i, '').trim());

    // Action items: actionable sentences with strict participant matching
    const actionItems = this.extractActionItems(sentences, workspaceMembers);

    // Deadlines mentioned: extract explicitly detected dates
    const deadlinesMentioned: any[] = [];
    for (const s of sentences) {
      const detectedDate = this.detectDate(s);
      if (detectedDate) {
        deadlinesMentioned.push({
          topic: this.cleanTitle(s),
          date: detectedDate,
          urgency: /\b(urgent|asap|critical)\b/i.test(s) ? 'HIGH' : 'MEDIUM',
          context: s.trim(),
        });
      }
    }

    // Follow-ups
    const followUps = sentences
      .filter(s => /\b(follow up|follow-up|schedule|next meeting|revisit|check back|sync again)\b/i.test(s))
      .map(s => this.cleanTitle(s));

    // Key discussion points: meaningful non-empty sentences summarizing main discussion
    const discussionPoints = sentences
      .filter(s => !decisionMatches.includes(s) && !questionMatches.includes(s) && s.length > 15)
      .slice(0, 5)
      .map(s => this.cleanTitle(s));

    const overview = sentences.length > 0
      ? `Summary of ${source.toLowerCase()} for "${title}": ${sentences.slice(0, 2).join(' ')}`
      : `Discussion recorded from ${source.toLowerCase()} for "${title}".`;

    const executiveSummary = `[Source: ${source}]\n\n${overview}\n\nKey Discussion Points:\n${
      discussionPoints.length > 0 ? discussionPoints.map(p => `• ${p}`).join('\n') : '• Content reviewed and recorded.'
    }`;

    return JSON.stringify({
      source,
      overview,
      keyDiscussionPoints: discussionPoints,
      executiveSummary,
      keyDecisions,
      actionItems,
      risks,
      pendingQuestions,
      deadlinesMentioned,
      suggestedFollowUps: followUps,
    });
  }

  // ─── Task Extraction ──────────────────────────────────────────────────────

  private processTaskExtraction(text: string): string {
    const sentences = this.splitSentences(text);
    const tasks: any[] = [];
    let id = 0;

    for (const sentence of sentences) {
      if (tasks.length >= 8) break;
      if (!this.isActionable(sentence)) continue;

      const priority = this.detectPriority(sentence);
      const assignee = this.detectName(sentence);
      const dueDate = this.detectDate(sentence);
      const title = this.cleanTitle(sentence);
      const confidence = this.calculateConfidence(sentence, !!assignee, !!dueDate);

      tasks.push({
        id: `ai-task-${id++}`,
        title,
        description: `Extracted from: "${sentence.trim()}"`,
        priority,
        status: 'TODO',
        assigneeName: assignee,
        assigneeId: null,
        dueDate,
        labels: this.detectLabels(sentence),
        confidence,
      });
    }

    if (tasks.length === 0 && text.trim().length > 0) {
      tasks.push({
        id: 'ai-task-fallback',
        title: 'Review notes and identify action items',
        description: text.substring(0, 300),
        priority: 'MEDIUM',
        status: 'TODO',
        assigneeName: null,
        assigneeId: null,
        dueDate: null,
        labels: ['review'],
        confidence: 55,
      });
    }

    return JSON.stringify({ tasks });
  }

  // ─── Sprint Planner ───────────────────────────────────────────────────────

  private processSprintPlan(text: string): string {
    // Input is JSON with backlog tasks, members, etc.
    try {
      const input = JSON.parse(text);
      const tasks = input.tasks || [];
      const memberCount = input.memberCount || 1;
      const capacityPerMember = 5; // default heuristic: 5 tasks per person per sprint

      // Sort by priority: URGENT > HIGH > MEDIUM > LOW
      const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const sorted = [...tasks].sort((a: any, b: any) =>
        (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
      );

      const maxTasks = memberCount * capacityPerMember;
      const selected = sorted.slice(0, maxTasks);
      const blocked = tasks.filter((t: any) => t.status === 'BACKLOG' && !selected.includes(t));

      return JSON.stringify({
        sprintGoal: `Complete ${selected.length} prioritized tasks across ${memberCount} team members`,
        selectedTasks: selected.map((t: any) => ({
          taskId: t.id,
          title: t.title,
          priority: t.priority,
          assignee: t.assigneeName || null,
          estimatedEffort: t.priority === 'URGENT' || t.priority === 'HIGH' ? 'Large' : 'Medium',
        })),
        estimatedCompletion: '2 weeks',
        potentialRisks: selected.filter((t: any) => t.priority === 'URGENT').length > 3
          ? ['High number of urgent tasks may cause context switching']
          : ['Sprint looks manageable'],
        blockedTasks: blocked.slice(0, 5).map((t: any) => t.title),
        capacityUsed: Math.min(100, Math.round((selected.length / maxTasks) * 100)),
      });
    } catch {
      return JSON.stringify({
        sprintGoal: 'Unable to parse backlog data',
        selectedTasks: [],
        estimatedCompletion: 'Unknown',
        potentialRisks: ['Could not analyze sprint data'],
        blockedTasks: [],
        capacityUsed: 0,
      });
    }
  }

  // ─── Project Health ───────────────────────────────────────────────────────

  private processProjectHealth(text: string): string {
    try {
      const input = JSON.parse(text);
      const tasks = input.tasks || [];
      const total = tasks.length;
      const completed = tasks.filter((t: any) => t.status === 'DONE' || t.status === 'CANCELLED').length;
      const inProgress = tasks.filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length;
      const overdue = tasks.filter((t: any) => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && t.status !== 'DONE' && t.status !== 'CANCELLED';
      }).length;

      const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const productivity = Math.max(0, Math.min(100, completionPct - (overdue * 5)));

      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (overdue > 5) riskLevel = 'critical';
      else if (overdue > 2) riskLevel = 'high';
      else if (overdue > 0) riskLevel = 'medium';

      return JSON.stringify({
        completionPercentage: completionPct,
        totalTasks: total,
        completedTasks: completed,
        inProgressTasks: inProgress,
        blockedTasks: 0,
        overdueTasks: overdue,
        upcomingDeadlines: tasks
          .filter((t: any) => t.dueDate && new Date(t.dueDate) > new Date() && t.status !== 'DONE')
          .slice(0, 5)
          .map((t: any) => ({
            taskTitle: t.title,
            dueDate: t.dueDate,
            assignee: t.assigneeName || null,
            priority: t.priority,
            daysRemaining: Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 86400000),
          })),
        productivityScore: productivity,
        riskLevel,
        risks: overdue > 0 ? [`${overdue} tasks are past their due date`] : ['No critical risks'],
        criticalIssues: overdue > 3 ? ['Multiple overdue tasks indicate a planning issue'] : [],
      });
    } catch {
      return JSON.stringify({ completionPercentage: 0, totalTasks: 0, riskLevel: 'low', risks: [] });
    }
  }

  // ─── Daily Standup ────────────────────────────────────────────────────────

  private processStandup(text: string): string {
    try {
      const input = JSON.parse(text);
      const members = input.members || [];
      const tasks = input.tasks || [];
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const standups = members.map((m: any) => {
        const memberTasks = tasks.filter((t: any) => t.assigneeId === m.userId);
        const done = memberTasks.filter((t: any) =>
          t.status === 'DONE' && t.updatedAt?.startsWith(yesterday)
        );
        const active = memberTasks.filter((t: any) =>
          t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW'
        );
        const blocked = memberTasks.filter((t: any) =>
          t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
        );

        return {
          userId: m.userId,
          name: m.name || m.email,
          yesterday: done.length > 0
            ? done.map((t: any) => `Completed: ${t.title}`)
            : ['No tasks completed yesterday'],
          today: active.length > 0
            ? active.map((t: any) => `Working on: ${t.title}`)
            : ['No active tasks assigned'],
          blockers: blocked.length > 0
            ? blocked.map((t: any) => `Overdue: ${t.title}`)
            : [],
        };
      });

      return JSON.stringify({ date: today, members: standups });
    } catch {
      return JSON.stringify({ date: new Date().toISOString().split('T')[0], members: [] });
    }
  }

  // ─── Weekly Report ────────────────────────────────────────────────────────

  private processWeeklyReport(text: string): string {
    try {
      const input = JSON.parse(text);
      const tasks = input.tasks || [];
      const weekStart = new Date(Date.now() - 7 * 86400000);
      const completed = tasks.filter((t: any) => t.status === 'DONE');
      const pending = tasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'CANCELLED');
      const overdue = tasks.filter((t: any) =>
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
      );

      const weekRange = `${weekStart.toLocaleDateString()} – ${new Date().toLocaleDateString()}`;
      const completedPct = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

      const md = [
        `# Weekly Status Report`,
        `**Period:** ${weekRange}`,
        ``,
        `## Completed Work`,
        ...completed.slice(0, 10).map((t: any) => `- ✅ ${t.title}`),
        completed.length === 0 ? '- No tasks completed this week' : '',
        ``,
        `## In Progress`,
        ...pending.filter((t: any) => t.status === 'IN_PROGRESS').slice(0, 10).map((t: any) => `- 🔄 ${t.title}`),
        ``,
        `## Sprint Progress`,
        `- **Completed:** ${completed.length} / ${tasks.length} (${completedPct}%)`,
        ``,
        `## Risks`,
        overdue.length > 0 ? `- ⚠️ ${overdue.length} overdue tasks require attention` : '- No critical risks',
        ``,
        `## Upcoming Goals`,
        `- Close remaining ${pending.length} open tasks`,
        `- Address any overdue items`,
      ].join('\n');

      return JSON.stringify({
        weekRange,
        completedWork: completed.slice(0, 10).map((t: any) => t.title),
        pendingWork: pending.slice(0, 10).map((t: any) => t.title),
        sprintProgress: { completed: completed.length, total: tasks.length, percentage: completedPct },
        risks: overdue.length > 0 ? [`${overdue.length} overdue tasks`] : ['No critical risks'],
        upcomingGoals: [`Close ${pending.length} open tasks`],
        markdownContent: md,
      });
    } catch {
      return JSON.stringify({ weekRange: '', completedWork: [], pendingWork: [], markdownContent: '' });
    }
  }

  // ─── Command Parser ───────────────────────────────────────────────────────

  private extractMoveTaskParams(text: string): { query: string; status: string } {
    const trimmed = text.trim();

    // 1. Check for quoted target title: e.g. Move "API testing" to Done
    const quoteMatch = trimmed.match(
      /^(?:please\s+)?(?:move|change\s+status(?:\s+of)?|update\s+status(?:\s+of)?|set\s+status(?:\s+of)?|mark)\s+(?:task\s+)?["'“‘]([^"'”’]+)["'”’](?:\s+(?:to\s+status|into\s+status|as\s+status|status\s+to|to|into|as|->)\s+(todo|to-do|to\s+do|in\s+progress|in-progress|in\s+review|in-review|done|completed|backlog|cancelled|canceled))?[.!?\s]*$/i
    );
    if (quoteMatch && quoteMatch[1]) {
      const query = quoteMatch[1].trim();
      const status = ((quoteMatch[2] ? quoteMatch[2].trim() : '') || 'done').toLowerCase();
      return { query, status };
    }

    // 2. Check for bracketed target title: e.g. Move [an existing exact task title] to In Progress.
    const bracketMatch = trimmed.match(
      /^(?:please\s+)?(?:move|change\s+status(?:\s+of)?|update\s+status(?:\s+of)?|set\s+status(?:\s+of)?|mark)\s+(?:task\s+)?\[([^\]]+)\](?:\s+(?:to\s+status|into\s+status|as\s+status|status\s+to|to|into|as|->)\s+(todo|to-do|to\s+do|in\s+progress|in-progress|in\s+review|in-review|done|completed|backlog|cancelled|canceled))?[.!?\s]*$/i
    );
    if (bracketMatch && bracketMatch[1]) {
      const query = bracketMatch[1].trim();
      const status = ((bracketMatch[2] ? bracketMatch[2].trim() : '') || 'done').toLowerCase();
      return { query, status };
    }

    // 3. General pattern: "Move <title> to <status>" or "Change status of <title> to <status>"
    const generalMatch = trimmed.match(
      /^(?:please\s+)?(?:move|change\s+status(?:\s+of)?|update\s+status(?:\s+of)?|set\s+status(?:\s+of)?|mark)\s+(?:task\s+)?(.+?)\s+(?:to\s+status|into\s+status|as\s+status|status\s+to|to|into|as|->)\s+(todo|to-do|to\s+do|in\s+progress|in-progress|in\s+review|in-review|done|completed|backlog|cancelled|canceled)[.!?\s]*$/i
    );
    if (generalMatch && generalMatch[1] && generalMatch[2]) {
      let query = generalMatch[1].trim();
      query = query.replace(/^["'\[`]+|["'\]`.,;!]+$/g, '').trim();
      const status = generalMatch[2].trim().toLowerCase();
      return { query, status };
    }

    // 4. Fallback: extract status if present, remove action prefix and status suffix
    const statusMatch = trimmed.toLowerCase().match(/\b(todo|to-do|to\s+do|in\s+progress|in-progress|in\s+review|in-review|done|completed|backlog|cancelled|canceled)\b/i);
    const status: string = (statusMatch && statusMatch[1] ? statusMatch[1] : 'done').toLowerCase();

    let query = trimmed;
    query = query.replace(/^(?:please\s+)?(?:move|change\s+status(?:\s+of)?|update\s+status(?:\s+of)?|set\s+status(?:\s+of)?|mark)\s+(?:task\s+)?/i, '');
    query = query.replace(/\s+(?:to\s+status|into\s+status|as\s+status|status\s+to|to|into|as|->)\s+(?:todo|to-do|to\s+do|in\s+progress|in-progress|in\s+review|in-review|done|completed|backlog|cancelled|canceled)[.!?\s]*$/i, '');
    query = query.replace(/^["'\[`]+|["'\]`.,;!]+$/g, '').trim();

    return {
      query: query || trimmed,
      status,
    };
  }

  private extractAssignTaskParams(text: string): { query: string; assignee: string | null } {
    const trimmed = text.trim();

    // 1. Quoted task title: e.g. Assign "API testing" to Rahul
    const quoteMatch = trimmed.match(
      /^(?:please\s+)?assign\s+(?:task\s+)?["'“‘]([^"'”’]+)["'”’](?:\s+to\s+([A-Za-z0-9_-]+))?[.!?\s]*$/i
    );
    if (quoteMatch && quoteMatch[1]) {
      return {
        query: quoteMatch[1].trim(),
        assignee: quoteMatch[2]?.trim() || this.detectName(trimmed),
      };
    }

    // 2. Bracketed task title: e.g. Assign [login task] to Harshitha
    const bracketMatch = trimmed.match(
      /^(?:please\s+)?assign\s+(?:task\s+)?\[([^\]]+)\](?:\s+to\s+([A-Za-z0-9_-]+))?[.!?\s]*$/i
    );
    if (bracketMatch && bracketMatch[1]) {
      return {
        query: bracketMatch[1].trim(),
        assignee: bracketMatch[2]?.trim() || this.detectName(trimmed),
      };
    }

    // 3. General pattern: "Assign <title> to <assignee>"
    const generalAssignMatch = trimmed.match(
      /^(?:please\s+)?assign\s+(?:task\s+)?(.+?)\s+to\s+([A-Z][a-z]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})[.!?\s]*$/i
    );
    if (generalAssignMatch && generalAssignMatch[1] && generalAssignMatch[2]) {
      let query = generalAssignMatch[1].trim();
      query = query.replace(/^["'\[`]+|["'\]`.,;!]+$/g, '').trim();
      return { query, assignee: generalAssignMatch[2].trim() };
    }

    // 4. Fallback with detectName
    const assignee = this.detectName(trimmed);
    let query = trimmed.replace(/^(?:please\s+)?assign\s+(?:task\s+)?/i, '');
    if (assignee) {
      query = query.replace(new RegExp(`\\s+to\\s+${assignee}[.!?\\s]*$`, 'i'), '');
    }
    query = query.replace(/^["'\[`]+|["'\]`.,;!]+$/g, '').trim();

    return {
      query: query || trimmed,
      assignee,
    };
  }

  // ─── Command Parser ───────────────────────────────────────────────────────

  private processCommand(text: string): string {
    const lower = text.toLowerCase().trim();

    if (/\b(create|add|new)\b.*\b(task|bug|issue|ticket)\b/i.test(lower)) {
      const priority = this.detectPriority(text);
      const assignee = this.detectName(text);
      const titleMatch = text.match(/(?:create|add|new)\s+(?:a\s+)?(?:\w+\s+)?(?:task|bug|issue|ticket)\s*(?:for\s+\w+\s*)?(?:[:"\-]\s*)?(.+)/i);
      return JSON.stringify({
        action: 'create_task',
        confidence: 80,
        parameters: {
          title: titleMatch?.[1]?.trim() || text,
          priority,
          assignee,
        },
        originalText: text,
        explanation: `Create a ${priority.toLowerCase()} priority task${assignee ? ` for ${assignee}` : ''}`,
      });
    }

    if (/\b(move|change status|update status|mark)\b/i.test(lower)) {
      const { query, status } = this.extractMoveTaskParams(text);
      return JSON.stringify({
        action: 'move_task',
        confidence: 80,
        parameters: { status, query },
        originalText: text,
        explanation: `Move task "${query}" to ${status}`,
      });
    }

    if (/\b(schedule|book)\b.*\b(meeting|planning|sync|standup|call)\b/i.test(lower) || /^schedule\b/i.test(lower)) {
      const titleMatch = text.match(/(?:schedule|book)\s+(?:a\s+)?(?:meeting\s+for\s+|meeting\s+)?(.+?)(?:\s+(?:tomorrow|next week|at|on|\d))?[.!?\s]*$/i);
      const title = titleMatch?.[1]?.trim() || 'Sprint Planning';
      return JSON.stringify({
        action: 'schedule_meeting',
        confidence: 80,
        parameters: { title },
        originalText: text,
        explanation: `Schedule meeting "${title}"`,
      });
    }

    if (/\b(show|list|find|get)\b.*\b(overdue)\b/i.test(lower)) {
      return JSON.stringify({
        action: 'show_overdue',
        confidence: 90,
        parameters: {},
        originalText: text,
        explanation: 'Show all overdue tasks',
      });
    }

    if (/\b(show|list|find|get)\b.*\b(blocked)\b/i.test(lower)) {
      return JSON.stringify({
        action: 'show_blocked',
        confidence: 90,
        parameters: {},
        originalText: text,
        explanation: 'Show all blocked tasks',
      });
    }

    if (/\b(assign)\b/i.test(lower)) {
      const { query, assignee } = this.extractAssignTaskParams(text);
      return JSON.stringify({
        action: 'assign_task',
        confidence: 75,
        parameters: { assignee, query },
        originalText: text,
        explanation: `Assign task "${query}"${assignee ? ` to ${assignee}` : ''}`,
      });
    }

    // Search fallback
    return JSON.stringify({
      action: 'search_tasks',
      confidence: 60,
      parameters: { query: text },
      originalText: text,
      explanation: `Search for: "${text}"`,
    });
  }

  // ─── Utility Methods ──────────────────────────────────────────────────────

  private splitSentences(text: string): string[] {
    return text
      .split(/[.!?\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
  }

  private isActionable(sentence: string): boolean {
    return /\b(need to|must|should|will|fix|build|create|draft|review|implement|update|refactor|deploy|test|design|write|set up|configure|migrate|integrate|resolve|address|prepare|complete|finalize|investigate|schedule|send|share|assign|discuss)\b/i.test(sentence);
  }

  private extractActionItems(
    sentences: string[],
    workspaceMembers?: Array<{ id: string; name: string; email?: string }>
  ): any[] {
    const items: any[] = [];
    for (const s of sentences) {
      if (items.length >= 8) break;
      if (!this.isActionable(s)) continue;

      const { name, memberId } = this.detectParticipant(s, workspaceMembers);
      const dueDate = this.detectDate(s);

      items.push({
        title: this.cleanTitle(s),
        description: s.trim(),
        assignee: name,
        suggestedAssigneeId: memberId,
        priority: this.detectPriority(s),
        dueDate,
        confidence: this.calculateConfidence(s, !!name, !!dueDate),
      });
    }
    return items;
  }

  private detectParticipant(
    text: string,
    workspaceMembers?: Array<{ id: string; name: string; email?: string }>
  ): { name: string | null; memberId: string | null } {
    if (!workspaceMembers || workspaceMembers.length === 0) {
      return { name: null, memberId: null };
    }

    for (const member of workspaceMembers) {
      if (!member.name) continue;
      const firstName = member.name.trim().split(/\s+/)[0];
      const fullName = member.name.trim();

      const nameRegex = new RegExp(`\\b${this.escapeRegex(fullName)}\\b`, 'i');
      const firstRegex = firstName && firstName.length > 2
        ? new RegExp(`\\b${this.escapeRegex(firstName)}\\b`, 'i')
        : null;

      if (nameRegex.test(text) || (firstRegex && firstRegex.test(text))) {
        return { name: member.name, memberId: member.id };
      }
    }

    return { name: null, memberId: null };
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private detectPriority(text: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (/\b(urgent|asap|critical|immediately|emergency|p0)\b/i.test(text)) return 'URGENT';
    if (/\b(important|high priority|high|p1|crucial)\b/i.test(text)) return 'HIGH';
    if (/\b(low priority|low|minor|p3|nice to have|someday|eventually)\b/i.test(text)) return 'LOW';
    return 'MEDIUM';
  }

  private detectName(text: string): string | null {
    // Match common patterns like "Rahul should...", "assign to Sarah", "for John"
    const patterns = [
      /\b(?:assign(?:ed)?\s+to|for)\s+([A-Z][a-z]+)/,
      /\b([A-Z][a-z]{2,})\s+(?:should|needs? to|will|must|can)\b/,
      /\b(?:tell|ask|notify)\s+([A-Z][a-z]+)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        // Filter out common false positives
        const excluded = new Set(['The', 'This', 'That', 'What', 'When', 'Where', 'There', 'Here', 'Also', 'Then', 'Next', 'After', 'Before', 'During', 'Sprint', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
        if (!excluded.has(match[1])) return match[1];
      }
    }
    return null;
  }

  private detectDate(text: string): string | null {
    // "by Friday", "by end of week", "tomorrow", "next week"
    const now = new Date();
    if (/\btomorrow\b/i.test(text)) {
      const d = new Date(now.getTime() + 86400000);
      return d.toISOString().split('T')[0] ?? null;
    }
    if (/\bnext week\b/i.test(text)) {
      const d = new Date(now.getTime() + 7 * 86400000);
      return d.toISOString().split('T')[0] ?? null;
    }
    if (/\bend of (?:this )?week\b/i.test(text)) {
      const d = new Date(now);
      d.setDate(d.getDate() + (5 - d.getDay()));
      return d.toISOString().split('T')[0] ?? null;
    }
    if (/\b(friday|monday|tuesday|wednesday|thursday)\b/i.test(text)) {
      const days: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
      const target = text.match(/\b(monday|tuesday|wednesday|thursday|friday)\b/i);
      if (target && target[1]) {
        const dayNum = days[target[1].toLowerCase()];
        if (dayNum !== undefined) {
          const d = new Date(now);
          const diff = (dayNum - d.getDay() + 7) % 7 || 7;
          d.setDate(d.getDate() + diff);
          return d.toISOString().split('T')[0] ?? null;
        }
      }
    }
    return null;
  }

  private detectLabels(text: string): string[] {
    const labels: string[] = [];
    if (/\b(bug|fix|patch|hotfix)\b/i.test(text)) labels.push('bug');
    if (/\b(feature|enhancement|improvement)\b/i.test(text)) labels.push('feature');
    if (/\b(design|ui|ux)\b/i.test(text)) labels.push('design');
    if (/\b(backend|api|server|database)\b/i.test(text)) labels.push('backend');
    if (/\b(frontend|client|react|ui)\b/i.test(text)) labels.push('frontend');
    if (/\b(devops|deploy|infrastructure|ci|cd)\b/i.test(text)) labels.push('devops');
    if (/\b(security|auth|encryption)\b/i.test(text)) labels.push('security');
    if (/\b(docs|documentation|readme)\b/i.test(text)) labels.push('docs');
    return labels;
  }

  private cleanTitle(sentence: string): string {
    let title = sentence.trim();
    // Remove leading action verbs for a cleaner title
    title = title.replace(/^(we |they |i |you |team )/i, '');
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
    // Truncate if too long
    if (title.length > 100) title = title.substring(0, 97) + '...';
    return title;
  }

  private calculateConfidence(sentence: string, hasAssignee: boolean, hasDueDate: boolean): number {
    let confidence = 65;
    if (hasAssignee) confidence += 12;
    if (hasDueDate) confidence += 8;
    if (/\b(must|urgent|asap|critical)\b/i.test(sentence)) confidence += 5;
    if (sentence.length > 20) confidence += 5;
    if (/\b(should|need to|will)\b/i.test(sentence)) confidence += 5;
    return Math.min(98, confidence);
  }
}
