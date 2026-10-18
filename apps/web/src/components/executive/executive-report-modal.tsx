'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExportReport: (format: 'MARKDOWN' | 'PDF' | 'EXCEL' | 'LINK') => void;
  isExporting?: boolean;
}

export function ExecutiveReportModal({ isOpen, onClose, onExportReport, isExporting }: Props) {
  const [selectedFormat, setSelectedFormat] = useState<'MARKDOWN' | 'PDF' | 'EXCEL' | 'LINK'>('MARKDOWN');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-2xl border border-[#E4DED4] bg-white p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#252D2A]">📄 One-Click Executive Report Export</h3>
              <p className="text-xs text-[#5F6863]">Compile portfolio progress, risks, and recommendations into executive formats.</p>
            </div>
            <button
              onClick={onClose}
              className="text-[#5F6863] font-bold cursor-pointer hover:text-[#252D2A]"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-semibold text-[#252D2A]">Select Export Format</span>

            <div className="grid grid-cols-2 gap-2">
              {[
                { format: 'MARKDOWN', icon: '📝', label: 'Markdown Document' },
                { format: 'PDF', icon: '📄', label: 'PDF Executive Summary' },
                { format: 'EXCEL', icon: '📊', label: 'Excel Spreadsheet' },
                { format: 'LINK', icon: '🔗', label: 'Shareable Dashboard Link' },
              ].map((opt) => (
                <div
                  key={opt.format}
                  onClick={() => setSelectedFormat(opt.format as any)}
                  className={`cursor-pointer rounded-xl border p-3 text-center transition-all ${
                    selectedFormat === opt.format
                      ? 'border-[#205743] bg-[#205743]/10 text-[#205743] font-bold'
                      : 'border-[#E4DED4] bg-white text-[#252D2A] hover:bg-[#F7F5F0]'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <p className="mt-1 text-xs font-semibold">{opt.label}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E4DED4] pt-4">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={isExporting}
                onClick={() => {
                  onExportReport(selectedFormat);
                  onClose();
                }}
              >
                Export Report
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
