'use client';

import React, { useState } from 'react';
import type { ProjectTemplateData } from '@/lib/queries/learning';
import { Layers, X, Rocket } from 'lucide-react';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ProjectTemplateData[];
  onInstantiateTemplate: (templateId: string, name: string, description: string) => Promise<void>;
  isInstantiating?: boolean;
}

export function TemplatePickerModal({
  isOpen,
  onClose,
  templates,
  onInstantiateTemplate,
  isInstantiating,
}: TemplatePickerModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || 'tmpl-web-app');
  const [projectName, setProjectName] = useState('New Project from Template');
  const [projectDescription, setProjectDescription] = useState('Instantiated using AI Reusable Template');

  if (!isOpen) return null;

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleInstantiate = async () => {
    if (!selectedTemplateId || !projectName.trim()) return;
    await onInstantiateTemplate(selectedTemplateId, projectName.trim(), projectDescription.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252D2A]/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl border border-[#E4DED4]">
        <div className="flex items-center justify-between border-b border-[#E4DED4] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#205743] text-white">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-[#252D2A]">
                Reusable AI Project Templates
              </h2>
              <p className="text-xs text-[#5F6863]">
                Instantiate a new project instantly using proven structures from top-performing historical projects.
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
          {/* Template Selection Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplateId;
              const totalHours = tmpl.tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplateId(tmpl.id!)}
                  className={`rounded-lg border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#205743] bg-[#205743]/5 ring-2 ring-[#205743]/20'
                      : 'border-[#E4DED4] bg-white hover:border-[#205743]/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-bold text-[#252D2A]">
                      {tmpl.name}
                    </h4>
                    <span className="rounded bg-[#205743]/10 border border-[#205743]/20 px-2 py-0.5 text-[10px] font-bold text-[#205743]">
                      {tmpl.category}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-[#5F6863] line-clamp-2">
                    {tmpl.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-[#5F6863]">
                    <span>{tmpl.tasks.length} Pre-configured Tasks</span>
                    <span className="font-bold text-[#205743]">{totalHours}h Estimated</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* New Project Parameters */}
          <div className="rounded-lg bg-[#F7F5F0] p-4 border border-[#E4DED4] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#252D2A]">
              Instantiate New Project
            </h4>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#5F6863]">
                  New Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-white px-3 py-2 text-xs font-medium text-[#252D2A] focus:border-[#205743] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5F6863]">
                  Description
                </label>
                <input
                  type="text"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-white px-3 py-2 text-xs font-medium text-[#252D2A] focus:border-[#205743] focus:outline-none"
                />
              </div>
            </div>

            {/* Template Task Breakdown Preview */}
            {selectedTemplate && (
              <div>
                <h5 className="text-[11px] font-bold text-[#5F6863] mb-1.5">
                  Tasks included in "{selectedTemplate.name}":
                </h5>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {selectedTemplate.tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md bg-white px-3 py-1 text-xs border border-[#E4DED4]"
                    >
                      <span className="font-medium text-[#252D2A]">
                        {idx + 1}. {task.title}
                      </span>
                      <span className="text-[10px] font-bold text-[#205743] bg-[#205743]/10 px-1.5 py-0.2 rounded">
                        {task.estimatedHours}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E4DED4] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-[#5F6863] hover:bg-[#F7F5F0] cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleInstantiate}
            disabled={!projectName.trim() || isInstantiating}
            className="flex items-center gap-1.5 rounded-lg bg-[#205743] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#163E32] disabled:opacity-50 cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>{isInstantiating ? 'Instantiating...' : 'Create Project from Template'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

