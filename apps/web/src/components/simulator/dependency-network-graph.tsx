'use client';

import React from 'react';
import type { SimulatedTask } from '@/lib/queries/simulations';
import { GitFork } from 'lucide-react';

interface DependencyNetworkGraphProps {
  tasks: SimulatedTask[];
}

export function DependencyNetworkGraph({ tasks }: DependencyNetworkGraphProps) {
  // SVG canvas layout dimensions
  const width = 800;
  const height = 280;

  // Calculate layout coordinates for nodes
  const nodePositions = tasks.map((t, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const x = 120 + col * 180;
    const y = 70 + row * 90;
    return { id: t.id, task: t, x, y };
  });

  const posMap = new Map(nodePositions.map((n) => [n.id, n]));

  // Build dependency edge lines
  const edges: { fromX: number; fromY: number; toX: number; toY: number; isCritical: boolean }[] = [];

  for (const node of nodePositions) {
    for (const predId of node.task.predecessorIds) {
      const predNode = posMap.get(predId);
      if (predNode) {
        edges.push({
          fromX: predNode.x + 60,
          fromY: predNode.y,
          toX: node.x - 60,
          toY: node.y,
          isCritical: predNode.task.isCritical && node.task.isCritical,
        });
      }
    }
  }

  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#205743]/10 text-[#205743] text-xs font-bold">
            <GitFork className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">
            Task Dependency Network Graph & Critical Path
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-[#5F6863]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#C56D4B]"></span> Critical Path Edge
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#205743]"></span> Standard Task Node
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[700px]">
          <defs>
            <marker
              id="arrow-normal"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#8C9590" />
            </marker>
            <marker
              id="arrow-critical"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#C56D4B" />
            </marker>
          </defs>

          {/* Render Edge Connectors */}
          {edges.map((edge, idx) => (
            <line
              key={`edge-${idx}`}
              x1={edge.fromX}
              y1={edge.fromY}
              x2={edge.toX}
              y2={edge.toY}
              stroke={edge.isCritical ? '#C56D4B' : '#8C9590'}
              strokeWidth={edge.isCritical ? 2.5 : 1.5}
              strokeDasharray={edge.isCritical ? 'none' : '4 2'}
              markerEnd={edge.isCritical ? 'url(#arrow-critical)' : 'url(#arrow-normal)'}
            />
          ))}

          {/* Render Task Nodes */}
          {nodePositions.map((node) => {
            const isCrit = node.task.isCritical;
            const isBlocked = node.task.isBlocked;

            return (
              <g key={node.id} transform={`translate(${node.x - 60}, ${node.y - 25})`}>
                <rect
                  width="120"
                  height="50"
                  rx="8"
                  fill="#FFFFFF"
                  stroke={isCrit ? '#C56D4B' : isBlocked ? '#D4A545' : '#205743'}
                  strokeWidth={isCrit ? 2 : 1.5}
                />
                <text
                  x="10"
                  y="20"
                  fill="#252D2A"
                  fontSize="10"
                  fontWeight="bold"
                  className="font-sans"
                >
                  {node.task.title.length > 15 ? node.task.title.substring(0, 13) + '...' : node.task.title}
                </text>
                <text
                  x="10"
                  y="36"
                  fill={isCrit ? '#C56D4B' : '#5F6863'}
                  fontSize="9"
                  fontWeight={isCrit ? '600' : '400'}
                  className="font-sans"
                >
                  {isCrit ? 'Critical Path' : `Slack: ${node.task.slackDays}d`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

