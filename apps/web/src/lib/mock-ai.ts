import type { Priority } from '@/types';

export interface AITaskProposal {
  id: string; // temp id for rendering
  title: string;
  description: string;
  priority: Priority;
  assigneeId?: string;
  projectId?: string;
  dueDate?: Date;
  confidence: number;
}

export async function simulateAITaskGeneration(text: string, members: any[], projects: any[]): Promise<AITaskProposal[]> {
  // Simulate network delay for AI processing
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const proposals: AITaskProposal[] = [];
  const lowerText = text.toLowerCase();
  
  // Basic heuristic simulation for frontend purposes
  const sentences = text.split(/[.!?\n]/).filter(s => s.trim().length > 10);
  
  sentences.forEach((sentence, i) => {
    // Only generate 1-3 tasks max
    if (proposals.length >= 3) return;
    
    // Check if it sounds like an actionable item
    if (sentence.match(/\b(need to|must|should|fix|build|create|draft|review)\b/i)) {
      
      let priority: Priority = 'MEDIUM';
      if (sentence.match(/\b(urgent|asap|critical|immediate)\b/i)) priority = 'URGENT';
      else if (sentence.match(/\b(important|high)\b/i)) priority = 'HIGH';
      else if (sentence.match(/\b(low|someday|eventually)\b/i)) priority = 'LOW';

      // Attempt assignee match
      let assigneeId;
      for (const member of members) {
        const first = member.name ? member.name.toLowerCase().split(' ')[0] : member.email.split('@')[0].toLowerCase();
        if (sentence.toLowerCase().includes(first)) {
          assigneeId = member.user?.id || member.userId || member.id;
          break;
        }
      }

      // Generate confidence between 75 and 98
      const confidence = Math.floor(Math.random() * (98 - 75 + 1) + 75);

      // Clean up title
      const title = sentence.trim().charAt(0).toUpperCase() + sentence.trim().slice(1);

      proposals.push({
        id: `ai-prop-${i}`,
        title,
        description: `Generated from context: "${sentence.trim()}"`,
        priority,
        assigneeId,
        confidence,
      });
    }
  });

  // Fallback if no actions found
  if (proposals.length === 0 && text.trim().length > 0) {
    proposals.push({
      id: 'ai-prop-fallback',
      title: 'Review notes and take action',
      description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      priority: 'MEDIUM',
      confidence: 65,
    });
  }

  return proposals;
}
