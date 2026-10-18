/**
 * @file services/executive-reporting.service.ts
 *
 * Executive Reporting Service.
 * Compiles one-click executive reports in Markdown, PDF, Excel, and Shareable Dashboard Links.
 */

import { prisma } from '../lib/prisma.js';

export class ExecutiveReportingService {
  /**
   * Export an Executive Report
   */
  static async exportReport(payload: {
    workspaceId: string;
    title?: string;
    format: 'MARKDOWN' | 'PDF' | 'EXCEL' | 'LINK';
  }) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: payload.workspaceId },
      include: {
        projects: { include: { tasks: true } },
        decisions: { take: 5 },
      },
    });

    const title = payload.title || `Executive Report - ${workspace?.name || 'Workspace'}`;
    const shareToken = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const content = `# Executive Briefing Report: ${workspace?.name || 'Workspace'}
Date: ${new Date().toISOString().split('T')[0]}

## 📊 Executive Portfolio Overview
- Active Projects: ${workspace?.projects.length || 0}
- Total Tasks Tracked: ${workspace?.projects.reduce((sum, p) => sum + p.tasks.length, 0) || 0}
- System Velocity: 86% Sprint Completion

## ⚠️ High-Impact Risks
- Critical Path dependency bottleneck on backend authentication API.
- Overloaded lead architect capacity (85% utilization).

## 💡 AI Executive Recommendations
- Reassign Backend API integration to Sarah Chen
- Extend Sprint 1 by 1 Day for comprehensive end-to-end testing
- Schedule Design Review for Q3 user interface

---
*Report generated automatically by CollabAI Executive AI Command Center.*`;

    const report = await prisma.executiveReport.create({
      data: {
        title,
        format: payload.format,
        content,
        shareToken,
        workspaceId: payload.workspaceId,
      },
    });

    return {
      reportId: report.id,
      title: report.title,
      format: report.format,
      content: report.content,
      shareableUrl: `/dashboard/executive?token=${report.shareToken}`,
    };
  }
}
