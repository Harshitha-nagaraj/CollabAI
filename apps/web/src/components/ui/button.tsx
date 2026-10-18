'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ai' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[#1F4D3A] text-white hover:bg-[#163E32] focus-visible:ring-[#1F4D3A] shadow-xs border border-[#163E32]',
  secondary:
    'bg-[#C96B4A] text-white hover:bg-[#B05B3A] focus-visible:ring-[#C96B4A] shadow-xs border border-[#B05B3A]',
  danger:
    'bg-[#C93B3B] text-white hover:bg-[#A82B2B] focus-visible:ring-[#C93B3B] shadow-xs',
  ghost:
    'bg-transparent text-[#1C2421] hover:text-[#1F4D3A] hover:bg-[#F0EEE6] focus-visible:ring-[#1F4D3A]',
  ai:
    'bg-[#163E32] text-white border border-[#C89B3C]/60 hover:bg-[#1F4D3A] focus-visible:ring-[#C89B3C] shadow-xs',
  outline:
    'border border-[#E2DCD2] bg-white text-[#1C2421] hover:bg-[#F0EEE6] hover:border-[#D5CFC5] focus-visible:ring-[#1F4D3A] shadow-xs',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs tracking-tight',
  md: 'px-4 py-2 text-sm font-medium tracking-tight',
  lg: 'px-5 py-2.5 text-sm font-semibold tracking-tight',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-lg transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F5F2] disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
