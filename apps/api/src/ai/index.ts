/**
 * @file ai/index.ts — Barrel export for the AI module.
 */

export * from './types.js';
export { getAIProvider } from './provider-factory.js';
export { MeetingProcessor } from './services/meeting-processor.js';
export { TaskGenerator } from './services/task-generator.js';
export { InsightsEngine } from './services/insights-engine.js';
export { CommandParser } from './services/command-parser.js';
export { SearchEngine } from './services/search-engine.js';
