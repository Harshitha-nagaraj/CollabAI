'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold tracking-tight text-[#2D2D2D]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-[#2D2D2D] shadow-xs transition-all focus:outline-none focus:ring-2 cursor-pointer ${
            error 
              ? 'border-[#C93B3B] focus:border-[#C93B3B] focus:ring-[#C93B3B]/20' 
              : 'border-[#E2DACF] focus:border-[#1F4D3A] focus:ring-[#1F4D3A]/20 hover:border-[#C5BBAE]'
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" className="text-[#8C857B]">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-[#2D2D2D]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs font-medium text-[#C93B3B]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
