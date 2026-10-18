'use client';

import React, { useState } from 'react';
import type { ProjectRetrospectiveData } from '@/lib/queries/learning';
import { FileText, Edit2, Save, X, Plus } from 'lucide-react';

interface RetrospectiveViewProps {
  retrospective: ProjectRetrospectiveData;
  onSaveRetrospective?: (updated: ProjectRetrospectiveData) => void;
  isSaving?: boolean;
}

export function RetrospectiveView({
  retrospective,
  onSaveRetrospective,
  isSaving,
}: RetrospectiveViewProps) {
  const [data, setData] = useState<ProjectRetrospectiveData>(retrospective);
  const [isEditing, setIsEditing] = useState(false);

  const handleArrayItemChange = (
    field: keyof ProjectRetrospectiveData,
    index: number,
    value: string
  ) => {
    const arr = [...(data[field] as string[])];
    arr[index] = value;
    setData({ ...data, [field]: arr });
  };

  const handleAddItem = (field: keyof ProjectRetrospectiveData) => {
    const arr = [...(data[field] as string[]), 'New retrospective note item'];
    setData({ ...data, [field]: arr });
  };

  const handleRemoveItem = (field: keyof ProjectRetrospectiveData, index: number) => {
    const arr = (data[field] as string[]).filter((_, i) => i !== index);
    setData({ ...data, [field]: arr });
  };

  const handleSave = () => {
    if (onSaveRetrospective) {
      onSaveRetrospective(data);
    }
    setIsEditing(false);
  };

  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E4DED4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#205743]/10 text-[#205743] text-sm font-bold">
              <FileText className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-[#252D2A]">
              Project Retrospective: {data.projectName}
            </h3>
          </div>
          <p className="text-xs text-[#5F6863] mt-1">
            Automated AI Retrospective analysis & continuous learning insights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-[#5F6863] hover:bg-[#F7F5F0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-lg bg-[#205743] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#163E32] cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E4DED4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#252D2A] hover:bg-[#F7F5F0] cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#5F6863]" />
              <span>Edit Retrospective</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Box */}
      <div className="rounded-lg bg-[#F7F5F0] p-4 border border-[#E4DED4]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#205743] mb-1">
          Executive Summary
        </h4>
        {isEditing ? (
          <textarea
            value={data.summary}
            onChange={(e) => setData({ ...data, summary: e.target.value })}
            className="w-full rounded-lg border border-[#E4DED4] bg-white p-2.5 text-xs text-[#252D2A] focus:border-[#205743] focus:outline-none"
            rows={2}
          />
        ) : (
          <p className="text-xs text-[#252D2A] leading-relaxed font-medium">
            {data.summary}
          </p>
        )}
      </div>

      {/* 6 Core Retrospective Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 1. What Went Well */}
        <RetroSectionCard
          title="What Went Well"
          items={data.whatWentWell}
          isEditing={isEditing}
          onItemChange={(idx, val) => handleArrayItemChange('whatWentWell', idx, val)}
          onAddItem={() => handleAddItem('whatWentWell')}
          onRemoveItem={(idx) => handleRemoveItem('whatWentWell', idx)}
          badgeColor="bg-[#205743]/10 text-[#205743] border-[#205743]/20"
        />

        {/* 2. What Caused Delays */}
        <RetroSectionCard
          title="What Caused Delays"
          items={data.whatCausedDelays}
          isEditing={isEditing}
          onItemChange={(idx, val) => handleArrayItemChange('whatCausedDelays', idx, val)}
          onAddItem={() => handleAddItem('whatCausedDelays')}
          onRemoveItem={(idx) => handleRemoveItem('whatCausedDelays', idx)}
          badgeColor="bg-[#D4A545]/15 text-[#8A661C] border-[#D4A545]/30"
        />

        {/* 3. Biggest Blockers */}
        <RetroSectionCard
          title="Biggest Blockers"
          items={data.biggestBlockers}
          isEditing={isEditing}
          onItemChange={(idx, val) => handleArrayItemChange('biggestBlockers', idx, val)}
          onAddItem={() => handleAddItem('biggestBlockers')}
          onRemoveItem={(idx) => handleRemoveItem('biggestBlockers', idx)}
          badgeColor="bg-[#C56D4B]/15 text-[#C56D4B] border-[#C56D4B]/30"
        />

        {/* 4. Team Achievements */}
        <RetroSectionCard
          title="Team Achievements"
          items={data.teamAchievements}
          isEditing={isEditing}
          onItemChange={(idx, val) => handleArrayItemChange('teamAchievements', idx, val)}
          onAddItem={() => handleAddItem('teamAchievements')}
          onRemoveItem={(idx) => handleRemoveItem('teamAchievements', idx)}
          badgeColor="bg-[#205743]/10 text-[#205743] border-[#205743]/20"
        />

        {/* 5. Lessons Learned */}
        <RetroSectionCard
          title="Lessons Learned"
          items={data.lessonsLearned}
          isEditing={isEditing}
          onItemChange={(idx, val) => handleArrayItemChange('lessonsLearned', idx, val)}
          onAddItem={() => handleAddItem('lessonsLearned')}
          onRemoveItem={(idx) => handleRemoveItem('lessonsLearned', idx)}
          badgeColor="bg-[#205743]/10 text-[#205743] border-[#205743]/20"
        />

        {/* 6. Future Recommendations */}
        <RetroSectionCard
          title="Recommendations for Future Projects"
          items={data.futureRecommendations}
          isEditing={isEditing}
          onItemChange={(idx, val) => handleArrayItemChange('futureRecommendations', idx, val)}
          onAddItem={() => handleAddItem('futureRecommendations')}
          onRemoveItem={(idx) => handleRemoveItem('futureRecommendations', idx)}
          badgeColor="bg-[#205743]/10 text-[#205743] border-[#205743]/20"
        />
      </div>
    </div>
  );
}

function RetroSectionCard({
  title,
  items,
  isEditing,
  onItemChange,
  onAddItem,
  onRemoveItem,
  badgeColor,
}: {
  title: string;
  items: string[];
  isEditing: boolean;
  onItemChange: (index: number, val: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  badgeColor: string;
}) {
  return (
    <div className="rounded-lg border border-[#E4DED4] bg-white p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#252D2A]">
          {title}
        </h4>
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeColor}`}>
          {items.length} Points
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-[#205743] font-bold text-xs mt-0.5">•</span>
            {isEditing ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => onItemChange(idx, e.target.value)}
                  className="flex-1 rounded-md border border-[#E4DED4] px-2 py-1 text-xs text-[#252D2A] focus:border-[#205743] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onRemoveItem(idx)}
                  className="text-[#C56D4B] text-xs font-bold hover:text-[#A34B29] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#252D2A] font-medium leading-normal">
                {item}
              </p>
            )}
          </div>
        ))}

        {isEditing && (
          <button
            type="button"
            onClick={onAddItem}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#205743] hover:text-[#163E32] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Point
          </button>
        )}
      </div>
    </div>
  );
}

