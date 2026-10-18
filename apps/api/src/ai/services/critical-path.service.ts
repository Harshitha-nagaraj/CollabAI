/**
 * @file ai/services/critical-path.service.ts
 *
 * Critical Path Method (CPM) Engine.
 * Implements Topological Sorting, Forward Pass (ES/EF),
 * Backward Pass (LS/LF), and Float/Slack calculation across task dependency DAGs.
 */

export interface TaskNode {
  id: string;
  title: string;
  durationDays: number;
  startDate: string | null;
  dueDate: string | null;
  status: string;
  progress: number;
  isMilestone: boolean;
  predecessorIds: string[];
  successorIds: string[];
}

export interface CriticalPathTaskResult {
  taskId: string;
  title: string;
  earlyStartDays: number;
  earlyFinishDays: number;
  lateStartDays: number;
  lateFinishDays: number;
  totalFloatDays: number;
  isCritical: boolean;
  slackHours: number;
}

export interface CriticalPathAnalysis {
  projectDurationDays: number;
  criticalPathTaskIds: string[];
  taskMetrics: Record<string, CriticalPathTaskResult>;
}

export class CriticalPathAnalyzer {
  /**
   * Analyze a DAG of tasks and compute the Critical Path
   */
  static analyze(tasks: TaskNode[]): CriticalPathAnalysis {
    if (tasks.length === 0) {
      return {
        projectDurationDays: 0,
        criticalPathTaskIds: [],
        taskMetrics: {},
      };
    }

    const taskMap = new Map<string, TaskNode>(tasks.map((t) => [t.id, t]));
    const es = new Map<string, number>();
    const ef = new Map<string, number>();
    const ls = new Map<string, number>();
    const lf = new Map<string, number>();

    // 1. Forward Pass: Compute Early Start (ES) & Early Finish (EF)
    // Topological processing
    const visited = new Set<string>();

    function computeForward(id: string) {
      if (visited.has(id)) return;
      const task = taskMap.get(id);
      if (!task) return;

      let maxEs = 0;
      for (const predId of task.predecessorIds) {
        if (taskMap.has(predId)) {
          computeForward(predId);
          const predEf = ef.get(predId) || 0;
          if (predEf > maxEs) {
            maxEs = predEf;
          }
        }
      }

      const duration = Math.max(1, task.durationDays || 1);
      es.set(id, maxEs);
      ef.set(id, maxEs + duration);
      visited.add(id);
    }

    for (const task of tasks) {
      computeForward(task.id);
    }

    // Determine max project duration
    let projectDuration = 0;
    for (const finish of ef.values()) {
      if (finish > projectDuration) projectDuration = finish;
    }

    // 2. Backward Pass: Compute Late Finish (LF) & Late Start (LS)
    for (const task of tasks) {
      lf.set(task.id, projectDuration);
      ls.set(task.id, projectDuration - Math.max(1, task.durationDays || 1));
    }

    const reverseVisited = new Set<string>();

    function computeBackward(id: string) {
      if (reverseVisited.has(id)) return;
      const task = taskMap.get(id);
      if (!task) return;

      if (task.successorIds.length > 0) {
        let minLf = projectDuration;
        for (const succId of task.successorIds) {
          if (taskMap.has(succId)) {
            computeBackward(succId);
            const succLs = ls.get(succId) ?? projectDuration;
            if (succLs < minLf) {
              minLf = succLs;
            }
          }
        }
        lf.set(id, minLf);
        const duration = Math.max(1, task.durationDays || 1);
        ls.set(id, minLf - duration);
      }

      reverseVisited.add(id);
    }

    for (const task of tasks) {
      computeBackward(task.id);
    }

    // 3. Compute Total Float & Identify Critical Path (Float === 0)
    const taskMetrics: Record<string, CriticalPathTaskResult> = {};
    const criticalPathTaskIds: string[] = [];

    for (const task of tasks) {
      const earlyStart = es.get(task.id) || 0;
      const earlyFinish = ef.get(task.id) || 0;
      const lateStart = ls.get(task.id) || 0;
      const lateFinish = lf.get(task.id) || 0;

      const totalFloat = Math.max(0, lateStart - earlyStart);
      const isCritical = totalFloat === 0 || (task.status !== 'DONE' && totalFloat <= 1);

      if (isCritical) {
        criticalPathTaskIds.push(task.id);
      }

      taskMetrics[task.id] = {
        taskId: task.id,
        title: task.title,
        earlyStartDays: earlyStart,
        earlyFinishDays: earlyFinish,
        lateStartDays: lateStart,
        lateFinishDays: lateFinish,
        totalFloatDays: totalFloat,
        isCritical,
        slackHours: totalFloat * 8,
      };
    }

    return {
      projectDurationDays: projectDuration,
      criticalPathTaskIds,
      taskMetrics,
    };
  }
}
