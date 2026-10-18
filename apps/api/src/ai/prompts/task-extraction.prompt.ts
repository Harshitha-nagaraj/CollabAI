import type { PromptTemplate, PromptPayload } from '../types.js';

export const taskExtractionPrompt: PromptTemplate = {
  name: 'task_extraction',
  description: 'Extract structured tasks from freeform text',
  buildPrompt(variables: Record<string, unknown>): PromptPayload {
    const text = variables.text as string;
    const members = variables.members as string[] | undefined;

    return {
      system: `[task_extraction] You are an AI task extraction engine.
Given freeform text (meeting notes, emails, chat messages), extract actionable tasks.

Known team members: ${members?.join(', ') || 'Unknown'}

Output MUST be valid JSON:
{
  "tasks": [
    {
      "id": "ai-task-N",
      "title": "string - clear actionable title",
      "description": "string - context from source text",
      "priority": "LOW|MEDIUM|HIGH|URGENT",
      "status": "TODO",
      "assigneeName": "string or null - matched team member name",
      "assigneeId": null,
      "dueDate": "YYYY-MM-DD or null",
      "labels": ["string array - bug, feature, design, backend, frontend, etc"],
      "confidence": "number 0-100"
    }
  ]
}

Rules:
- Only extract genuinely actionable items (not observations or questions)
- Match assignee names to known team members when possible
- Set realistic priorities based on urgency language
- Maximum 8 tasks per extraction`,

      user: text,
    };
  },
};
