import type { PromptTemplate, PromptPayload } from '../types.js';

export const meetingSummaryPrompt: PromptTemplate = {
  name: 'meeting_summary',
  description: 'Generate a structured summary from meeting transcript or notes',
  buildPrompt(variables: Record<string, unknown>): PromptPayload {
    const transcript = variables.transcript as string;
    const participants = variables.participants as string[] | undefined;

    return {
      system: `[meeting_summary] You are an AI meeting analyst for a project management platform.
Given a meeting transcript or notes, produce a structured JSON analysis.

Output MUST be valid JSON with this exact structure:
{
  "executiveSummary": "string - 2-3 sentence summary",
  "keyDecisions": ["string array of decisions made"],
  "actionItems": [
    {
      "title": "string - clear task title",
      "description": "string - details",
      "assignee": "string or null - person's name if mentioned",
      "priority": "LOW|MEDIUM|HIGH|URGENT",
      "dueDate": "YYYY-MM-DD or null",
      "confidence": "number 0-100"
    }
  ],
  "risks": ["string array of identified risks"],
  "pendingQuestions": ["string array of unresolved questions"],
  "suggestedFollowUps": ["string array of recommended next steps"]
}`,

      user: `Meeting transcript:
${transcript}
${participants ? `\nParticipants: ${participants.join(', ')}` : ''}

Analyze this meeting and produce the structured JSON output.`,
    };
  },
};
