/**
 * @file ai/services/nl-scenario-parser.service.ts
 *
 * Natural Language Scenario Parser.
 * Transforms natural language user prompts (e.g. "What if Rahul is on leave for one week?")
 * into structured SimulationAction objects using LLM provider with robust heuristic regex fallback.
 */

import type { SimulationAction, NLScenarioParseResult } from '../types/simulation.types.js';
import { getAIProvider } from '../provider-factory.js';
import { logger } from '../../utils/logger.js';

export class NLScenarioParser {
  static async parsePrompt(prompt: string): Promise<NLScenarioParseResult> {
    try {
      const provider = getAIProvider();
      const systemPrompt = `You are the AI Project Simulator Parser for CollabAI. Convert the user prompt into a JSON array of simulation actions.`;
      const userPrompt = `
Prompt: "${prompt}"

Supported action types:
1. DELAY_TASK: { "type": "DELAY_TASK", "taskTitle": string, "days": number }
2. ADD_DEVELOPER: { "type": "ADD_DEVELOPER", "developerName": string, "developerRole": string }
3. REMOVE_MEMBER: { "type": "REMOVE_MEMBER", "targetMemberName": string }
4. EMPLOYEE_LEAVE: { "type": "EMPLOYEE_LEAVE", "targetMemberName": string, "days": number }
5. SPRINT_DURATION: { "type": "SPRINT_DURATION", "sprintDeltaDays": number }
6. MOVE_TASK: { "type": "MOVE_TASK", "taskTitle": string, "days": number }
7. PRIORITY_CHANGE: { "type": "PRIORITY_CHANGE", "taskTitle": string, "newPriority": "LOW"|"MEDIUM"|"HIGH"|"URGENT" }
8. ADD_FEATURE: { "type": "ADD_FEATURE", "featureTitle": string, "estimatedHours": number }
9. CRITICAL_BUG: { "type": "CRITICAL_BUG", "description": string, "estimatedHours": number }
10. SCOPE_CHANGE: { "type": "SCOPE_CHANGE", "scopePercentage": number }

Respond ONLY with valid JSON array:
`;

      const responseText = await provider.complete({ system: systemPrompt, user: userPrompt }, { jsonMode: true });
      const cleanedJson = responseText.replace(/```json|```/g, '').trim();

      const parsedJson = JSON.parse(cleanedJson);
      if (Array.isArray(parsedJson) && parsedJson.length > 0) {
        const actions: SimulationAction[] = parsedJson.map((act: any, idx: number) => ({
          id: `act-nl-${Date.now()}-${idx}`,
          type: act.type || 'DELAY_TASK',
          description: act.description || `Simulated ${act.type} from NL prompt`,
          taskTitle: act.taskTitle,
          days: act.days,
          developerName: act.developerName,
          developerRole: act.developerRole,
          targetMemberName: act.targetMemberName,
          sprintDeltaDays: act.sprintDeltaDays,
          newPriority: act.newPriority,
          featureTitle: act.featureTitle,
          estimatedHours: act.estimatedHours,
          scopePercentage: act.scopePercentage,
        }));

        return {
          parsedActions: actions,
          originalPrompt: prompt,
          explanation: `Successfully parsed ${actions.length} scenario action(s) from prompt via AI Engine.`,
        };
      }
    } catch (err) {
      logger.info(`LLM NL parsing fallback to Heuristic Parser for prompt: "${prompt}"`);
    }

    // Heuristic Fallback Parser
    return this.heuristicParse(prompt);
  }

  private static heuristicParse(prompt: string): NLScenarioParseResult {
    const actions: SimulationAction[] = [];
    const lower = prompt.toLowerCase();

    // 1. Employee Leave (e.g. "Rahul is on leave for 1 week")
    if (lower.includes('leave') || lower.includes('vacation') || lower.includes('out of office')) {
      const daysMatch = lower.match(/(\d+)\s*(day|week)/i);
      let days = 7;
      if (daysMatch && daysMatch[1]) {
        const num = parseInt(daysMatch[1], 10);
        days = daysMatch[2] && daysMatch[2].startsWith('week') ? num * 7 : num;
      }

      let personName = 'Rahul Sharma';
      const words = prompt.split(/\s+/);
      for (const w of words) {
        if (/^[A-Z][a-z]+$/.test(w) && !['What', 'If', 'Is', 'On', 'Leave', 'For', 'Week', 'Days'].includes(w)) {
          personName = w;
          break;
        }
      }

      actions.push({
        id: `act-nl-leave-${Date.now()}`,
        type: 'EMPLOYEE_LEAVE',
        description: `Simulate ${personName} on leave for ${days} days`,
        targetMemberName: personName,
        days,
      });
    }

    // 2. Add Developers
    if (lower.includes('add') && (lower.includes('dev') || lower.includes('developer') || lower.includes('engineer'))) {
      const numMatch = lower.match(/(?:add|hire)\s+(\d+|one|two|three)\s+([a-zA-Z\s]*)(?:dev|developer|engineer)/i);
      let count = 1;
      let role = 'Software Engineer';

      if (numMatch) {
        const val = numMatch[1] ? numMatch[1].toLowerCase() : 'one';
        if (val === 'one') count = 1;
        else if (val === 'two') count = 2;
        else if (val === 'three') count = 3;
        else count = parseInt(val, 10) || 1;

        if (numMatch[2] && numMatch[2].trim()) {
          role = `${numMatch[2].trim().toUpperCase()} Developer`;
        }
      }

      for (let i = 0; i < count; i++) {
        actions.push({
          id: `act-nl-add-dev-${Date.now()}-${i}`,
          type: 'ADD_DEVELOPER',
          description: `Add ${role} #${i + 1} to team`,
          developerName: `Simulated ${role} #${i + 1}`,
          developerRole: role,
        });
      }
    }

    // 3. Task Delay
    if (lower.includes('delay') || lower.includes('takes') || lower.includes('takes more') || lower.includes('extra days')) {
      const daysMatch = lower.match(/(\d+|one|two|three|four|five|six|seven)\s*(?:more\s*)?(?:day|days)/i);
      let days = 5;
      if (daysMatch && daysMatch[1]) {
        const val = daysMatch[1].toLowerCase();
        const wordMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
        days = wordMap[val] || parseInt(val, 10) || 5;
      }

      let taskTitle = 'Backend Authentication';
      if (lower.includes('auth') || lower.includes('authentication')) taskTitle = 'Authentication API';
      else if (lower.includes('testing') || lower.includes('qa')) taskTitle = 'Integration Testing';
      else if (lower.includes('frontend') || lower.includes('ui')) taskTitle = 'Frontend Dashboard';

      actions.push({
        id: `act-nl-delay-${Date.now()}`,
        type: 'DELAY_TASK',
        description: `Delay ${taskTitle} by ${days} days`,
        taskTitle,
        days,
      });
    }

    // 4. Move tasks
    if (lower.includes('move') || lower.includes('shift') || lower.includes('earlier')) {
      let taskTitle = 'Integration Testing';
      if (lower.includes('auth')) taskTitle = 'Authentication API';

      actions.push({
        id: `act-nl-move-${Date.now()}`,
        type: 'MOVE_TASK',
        description: `Shift ${taskTitle} timeline schedule`,
        taskTitle,
        days: lower.includes('earlier') ? -3 : 3,
      });
    }

    // 5. Scope Change
    if (lower.includes('scope') || lower.includes('feature creep')) {
      const pctMatch = lower.match(/(\d+)\s*%/);
      const pct = pctMatch && pctMatch[1] ? parseInt(pctMatch[1], 10) : 25;
      actions.push({
        id: `act-nl-scope-${Date.now()}`,
        type: 'SCOPE_CHANGE',
        description: `Increase estimated effort scope by +${pct}%`,
        scopePercentage: pct,
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: `act-nl-default-${Date.now()}`,
        type: 'DELAY_TASK',
        description: `Simulate 5-day impact on critical path from prompt: "${prompt}"`,
        taskTitle: 'Critical Path Deliverables',
        days: 5,
      });
    }

    return {
      parsedActions: actions,
      originalPrompt: prompt,
      explanation: `Parsed prompt into ${actions.length} action(s) using Intelligent Heuristic Parser.`,
    };
  }
}
