'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold tracking-tight text-[#1C2421]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-[#1C2421] placeholder:text-[#525B56]/70 transition-all focus:outline-none focus:ring-2 shadow-xs ${
            error 
              ? 'border-[#C93B3B] focus:border-[#C93B3B] focus:ring-[#C93B3B]/20' 
              : 'border-[#E2DCD2] focus:border-[#1F4D3A] focus:ring-[#1F4D3A]/20 hover:border-[#E2DCD2]'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs font-medium text-[#C93B3B]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
