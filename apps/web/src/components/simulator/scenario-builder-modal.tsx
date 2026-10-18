'use client';

import React, { useState } from 'react';
import type { SimulationAction, SimulationActionType } from '@/lib/queries/simulations';
import { Sliders, X, Plus, Save, Play } from 'lucide-react';

interface ScenarioBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSimulation: (actions: SimulationAction[], scenarioName: string) => void;
  onSaveScenario?: (actions: SimulationAction[], scenarioName: string, description: string) => void;
}

const ACTION_TYPE_OPTIONS: { type: SimulationActionType; label: string; icon: string; defaultDesc: string }[] = [
  { type: 'DELAY_TASK', label: 'Delay a Task', icon: '⏱️', defaultDesc: 'Delay task completion by X days' },
  { type: 'ADD_DEVELOPER', label: 'Add New Developer', icon: '👨‍💻', defaultDesc: 'Add additional engineer to team' },
  { type: 'REMOVE_MEMBER', label: 'Remove Team Member', icon: '👤', defaultDesc: 'Remove a member from project' },
  { type: 'EMPLOYEE_LEAVE', label: 'Simulate Employee Leave', icon: '🏖️', defaultDesc: 'Simulate member on leave for X days' },
  { type: 'SPRINT_DURATION', label: 'Increase Sprint Duration', icon: '📅', defaultDesc: 'Extend current sprint length' },
  { type: 'MOVE_TASK', label: 'Move Task Between Sprints', icon: '↔️', defaultDesc: 'Shift task timeline forward or backward' },
  { type: 'PRIORITY_CHANGE', label: 'Change Task Priority', icon: '🔥', defaultDesc: 'Update task urgency level' },
  { type: 'ADD_FEATURE', label: 'Add Feature Request', icon: '✨', defaultDesc: 'Introduce new feature task' },
  { type: 'CRITICAL_BUG', label: 'Introduce Critical Bug', icon: '🐛', defaultDesc: 'Simulate emergency bug fix' },
  { type: 'SCOPE_CHANGE', label: 'Simulate Scope Changes', icon: '📈', defaultDesc: 'Increase task effort scope by X%' },
];

export function ScenarioBuilderModal({
  isOpen,
  onClose,
  onRunSimulation,
  onSaveScenario,
}: ScenarioBuilderModalProps) {
  const [scenarioName, setScenarioName] = useState('Custom Project Scenario');
  const [description, setDescription] = useState('Simulating task delay and developer additions');
  const [actions, setActions] = useState<SimulationAction[]>([
    {
      id: 'act-1',
      type: 'DELAY_TASK',
      description: 'Delay Backend Authentication API by 5 days',
      taskTitle: 'Backend Authentication API',
      days: 5,
    },
  ]);

  const [selectedType, setSelectedType] = useState<SimulationActionType>('DELAY_TASK');
  const [paramTaskTitle, setParamTaskTitle] = useState('Backend Authentication API');
  const [paramDays, setParamDays] = useState(5);
  const [paramDevRole, setParamDevRole] = useState('Frontend Engineer');
  const [paramMemberName, setParamMemberName] = useState('Rahul Sharma');
  const [paramPriority, setParamPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [paramScopePct, setParamScopePct] = useState(25);

  if (!isOpen) return null;

  const handleAddAction = () => {
    const option = ACTION_TYPE_OPTIONS.find((o) => o.type === selectedType);
    const newId = `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let desc = option?.defaultDesc || 'Simulation action';
    if (selectedType === 'DELAY_TASK') desc = `Delay "${paramTaskTitle}" by ${paramDays} days`;
    else if (selectedType === 'ADD_DEVELOPER') desc = `Add ${paramDevRole} to engineering team`;
    else if (selectedType === 'EMPLOYEE_LEAVE') desc = `Simulate ${paramMemberName} on leave for ${paramDays} days`;
    else if (selectedType === 'REMOVE_MEMBER') desc = `Remove ${paramMemberName} from workspace`;
    else if (selectedType === 'SPRINT_DURATION') desc = `Extend sprint duration by ${paramDays} days`;
    else if (selectedType === 'MOVE_TASK') desc = `Move "${paramTaskTitle}" schedule by ${paramDays} days`;
    else if (selectedType === 'PRIORITY_CHANGE') desc = `Change "${paramTaskTitle}" priority to ${paramPriority}`;
    else if (selectedType === 'ADD_FEATURE') desc = `Add new feature "${paramTaskTitle}" (${paramDays * 8}h effort)`;
    else if (selectedType === 'CRITICAL_BUG') desc = `Introduce critical bug fix "${paramTaskTitle}" (${paramDays * 8}h effort)`;
    else if (selectedType === 'SCOPE_CHANGE') desc = `Simulate scope expansion +${paramScopePct}% on open tasks`;

    const newAction: SimulationAction = {
      id: newId,
      type: selectedType,
      description: desc,
      taskTitle: paramTaskTitle,
      days: paramDays,
      developerName: selectedType === 'ADD_DEVELOPER' ? `Simulated ${paramDevRole}` : undefined,
      developerRole: paramDevRole,
      targetMemberName: paramMemberName,
      sprintDeltaDays: paramDays,
      newPriority: paramPriority,
      featureTitle: paramTaskTitle,
      estimatedHours: paramDays * 8,
      scopePercentage: paramScopePct,
    };

    setActions([...actions, newAction]);
  };

  const handleRemoveAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const handleRun = () => {
    if (actions.length === 0) return;
    onRunSimulation(actions, scenarioName);
    onClose();
  };

  const handleSave = () => {
    if (actions.length === 0 || !onSaveScenario) return;
    onSaveScenario(actions, scenarioName, description);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252D2A]/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl border border-[#E4DED4]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4DED4] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#205743] text-white">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-[#252D2A]">
                Interactive Scenario Builder
              </h2>
              <p className="text-xs text-[#5F6863]">
                Configure custom scenario parameters to model risk and timelines without affecting real project data.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#5F6863] hover:bg-[#F7F5F0] hover:text-[#252D2A] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Scenario Name & Description */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#252D2A]">
                Scenario Name
              </label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-white px-3 py-2 text-xs font-medium text-[#252D2A] focus:border-[#205743] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#252D2A]">
                Description / Notes
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-white px-3 py-2 text-xs font-medium text-[#252D2A] focus:border-[#205743] focus:outline-none"
              />
            </div>
          </div>

          {/* Add Modification Controls */}
          <div className="rounded-lg bg-[#F7F5F0] p-4 border border-[#E4DED4]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#252D2A] mb-3">
              Add New Modification Action
            </h4>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-[#5F6863]">
                  Action Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as SimulationActionType)}
                  className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-white px-2.5 py-2 text-xs font-medium text-[#252D2A] cursor-pointer focus:border-[#205743] focus:outline-none"
                >
                  {ACTION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.type} value={opt.type}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Parameters */}
              {(selectedType === 'DELAY_TASK' || selectedType === 'MOVE_TASK' || selectedType === 'PRIORITY_CHANGE' || selectedType === 'ADD_FEATURE' || selectedType === 'CRITICAL_BUG') && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#5F6863]">
                    Target Task Name / Feature
                  </label>
                  <input
                    type="text"
                    value={paramTaskTitle}
                    onChange={(e) => setParamTaskTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-white px-2.5 py-2 text-xs text-[#252D2A] focus:border-[#205743] focus:outline-none"
                  />
                </div>
              )}

              {(selectedType === 'EMPLOYEE_LEAVE' || selectedType === 'REMOVE_MEMBER') && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#5F6863]">
                    Team Member Name
                  </label>
                  <input
                    type="text"
                    value={paramMemberName}
                    onChange={(e) => setParamMemberName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-white px-2.5 py-2 text-xs text-[#252D2A] focus:border-[#205743] focus:outline-none"
                  />
                </div>
              )}

              {selectedType === 'ADD_DEVELOPER' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#5F6863]">
                    Developer Specialty / Role
                  </label>
                  <select
                    value={paramDevRole}
                    onChange={(e) => setParamDevRole(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-white px-2.5 py-2 text-xs text-[#252D2A] focus:border-[#205743] focus:outline-none cursor-pointer"
                  >
                    <option value="Frontend Engineer">Frontend Engineer</option>
                    <option value="Backend Engineer">Backend Engineer</option>
                    <option value="QA Engineer">QA Engineer</option>
                    <option value="Full Stack Dev">Full Stack Dev</option>
                  </select>
                </div>
              )}

              {selectedType === 'SCOPE_CHANGE' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#5F6863]">
                    Scope Increase (%)
                  </label>
                  <input
                    type="number"
                    value={paramScopePct}
                    onChange={(e) => setParamScopePct(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-white px-2.5 py-2 text-xs text-[#252D2A] focus:border-[#205743] focus:outline-none"
                  />
                </div>
              )}

              {(selectedType === 'DELAY_TASK' || selectedType === 'EMPLOYEE_LEAVE' || selectedType === 'SPRINT_DURATION' || selectedType === 'MOVE_TASK' || selectedType === 'ADD_FEATURE' || selectedType === 'CRITICAL_BUG') && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#5F6863]">
                    Duration / Days
                  </label>
                  <input
                    type="number"
                    value={paramDays}
                    onChange={(e) => setParamDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-white px-2.5 py-2 text-xs text-[#252D2A] focus:border-[#205743] focus:outline-none"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddAction}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#205743] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#163E32] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Action to Scenario
            </button>
          </div>

          {/* Configured Actions List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#252D2A] mb-2">
              Configured Scenario Actions ({actions.length})
            </h4>

            {actions.length === 0 ? (
              <p className="text-xs text-[#8C9590] italic">No actions added yet. Click "Add Action" above.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {actions.map((act, i) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between rounded-lg border border-[#E4DED4] bg-white px-3.5 py-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-[#205743]/10 text-[11px] font-bold text-[#205743]">
                        {i + 1}
                      </span>
                      <span className="text-xs font-semibold text-[#252D2A]">
                        {act.description}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAction(act.id)}
                      className="text-xs text-[#C56D4B] hover:text-[#A34B29] font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E4DED4] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-[#5F6863] hover:bg-[#F7F5F0] cursor-pointer"
          >
            Cancel
          </button>

          {onSaveScenario && (
            <button
              type="button"
              onClick={handleSave}
              disabled={actions.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-[#E4DED4] bg-white px-4 py-2 text-xs font-semibold text-[#252D2A] hover:bg-[#F7F5F0] disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#5F6863]" /> Save Scenario
            </button>
          )}

          <button
            type="button"
            onClick={handleRun}
            disabled={actions.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-[#205743] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#163E32] disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Run Simulation
          </button>
        </div>
      </div>
    </div>
  );
}

