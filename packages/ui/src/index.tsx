'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type HTMLAttributes,
} from 'react';

// ==========================================
// 1. NATIVE ICONS (Crisp SVGs, zero extra deps)
// ==========================================

export function DashboardIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

export function MentorIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

export function PlaygroundIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

export function LearnIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10" />
      <path d="M6 10h10" />
    </svg>
  );
}

export function ExploreIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  );
}

export function RoadmapIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7H5.5a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  );
}

export function ProgressIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

export function PortfolioIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function SunIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

export function MoonIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function SearchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function CloseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function SpinnerIcon({ className = 'w-4 h-4 animate-spin' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}

export function LogoutIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export function MenuIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

// ==========================================
// 2. BUTTON COMPONENT
// ==========================================

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'icon' | 'hero';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.97]';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8 min-h-[32px]',
    md: 'text-sm px-4 py-2 gap-2 h-9 min-h-[36px]',
    lg: 'text-base px-5 py-2.5 gap-2.5 h-11 min-h-[44px]',
  };

  const variantStyles = {
    primary: 'bg-brand text-content-inverse hover:bg-brand-hover shadow-subtle',
    secondary: 'bg-surface-elevated text-content-primary hover:bg-surface-hover border border-border-subtle',
    ghost: 'bg-transparent text-content-secondary hover:bg-surface-hover hover:text-content-primary',
    outline: 'bg-transparent border border-border text-content-primary hover:bg-surface-hover',
    danger: 'bg-status-danger text-white hover:opacity-90 shadow-subtle',
    success: 'bg-status-success text-white hover:opacity-90 shadow-subtle',
    icon: 'p-2 bg-transparent text-content-secondary hover:bg-surface-hover hover:text-content-primary rounded-lg h-9 w-9 min-h-[36px] min-w-[36px]',
    // Hero: reserved for primary CTAs only — purple→pink→orange gradient
    hero: 'bg-gradient-to-r from-[#a855f7] via-[#ec4899] to-[#f97316] text-white shadow-elevated hover:opacity-90 hover:shadow-glow',
  };

  return (
    <button
      className={`${baseStyles} ${variant !== 'icon' ? sizeStyles[size] : ''} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <SpinnerIcon className="w-4 h-4 animate-spin shrink-0" />}
      {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

// ==========================================
// 3. CARD COMPONENT
// ==========================================

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'selected';
}

export function Card({
  children,
  variant = 'default',
  className = '',
  ...props
}: CardProps) {
  const baseStyles = 'rounded-xl border transition-all duration-200';

  const variantStyles = {
    default: 'bg-surface border-border-subtle shadow-subtle text-content-primary',
    elevated: 'bg-surface-elevated border-border shadow-elevated text-content-primary',
    interactive:
      'bg-surface border-border-subtle shadow-subtle hover:border-brand-border hover:shadow-glow text-content-primary cursor-pointer',
    selected: 'bg-surface border-brand shadow-glow text-content-primary ring-1 ring-brand',
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 border-b border-border-subtle ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-base font-semibold tracking-tight text-content-primary ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs text-content-secondary mt-1 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-3 border-t border-border-subtle bg-surface-elevated/40 rounded-b-xl ${className}`}>{children}</div>;
}

// ==========================================
// 3B. METRIC CARD & PROGRESS BAR PRIMITIVES
// ==========================================

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'brand' | 'violet' | 'success' | 'amber' | 'data' | 'reward';
  label?: string;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'sm',
  variant = 'brand',
  label,
  className = '',
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const sizeStyles = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2.5',
  };

  const variantStyles = {
    brand:   'bg-gradient-to-r from-indigo-500 to-violet-500',
    violet:  'bg-gradient-to-r from-violet-500 to-fuchsia-400',
    success: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    amber:   'bg-gradient-to-r from-amber-500 to-orange-400',
    // New semantic variants
    data:    'bg-gradient-to-r from-teal-500 to-cyan-400',
    reward:  'bg-gradient-to-r from-amber-400 to-yellow-300',
  };

  return (
    <div className={`w-full ${className}`} {...props}>
      <div
        className={`w-full overflow-hidden rounded-full bg-surface-elevated ${sizeStyles[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${variantStyles[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  subvalue?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  progress?: number;
  variant?: 'default' | 'elevated' | 'interactive';
}

export function MetricCard({
  label,
  value,
  subvalue,
  icon,
  badge,
  progress,
  variant = 'default',
  className = '',
  ...props
}: MetricCardProps) {
  return (
    <Card variant={variant} className={`p-5 flex flex-col justify-between ${className}`} {...props}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-secondary">
            {label}
          </p>
          {badge ? badge : icon ? <span className="text-base text-content-muted">{icon}</span> : null}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-content-primary">
            {value}
          </span>
          {subvalue && (
            <span className="text-xs font-semibold text-content-secondary">
              {subvalue}
            </span>
          )}
        </div>
      </div>

      {typeof progress === 'number' && (
        <div className="mt-3 pt-2">
          <ProgressBar value={progress} max={100} size="xs" variant="violet" label={label} />
        </div>
      )}
    </Card>
  );
}

// ==========================================
// 3C. CONTENT CALLOUT & CODE BLOCK PRIMITIVES
// ==========================================

export interface ContentCalloutProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  title?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
}

export function ContentCallout({
  variant = 'info',
  title,
  icon,
  children,
  className = '',
  ...props
}: ContentCalloutProps) {
  const variantStyles = {
    info: 'bg-brand-subtle border-brand-border text-content-primary',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-content-primary',
    warning: 'bg-amber-500/10 border-amber-500/20 text-content-primary',
    danger: 'bg-rose-500/10 border-rose-500/20 text-content-primary',
    neutral: 'bg-surface-elevated border-border-subtle text-content-primary',
  };

  const defaultIcons = {
    info: '💡',
    success: '✓',
    warning: '⚠',
    danger: '✗',
    neutral: 'ℹ',
  };

  return (
    <div
      className={`rounded-xl border p-4 text-xs leading-relaxed transition-all duration-150 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 text-sm select-none">
          {icon !== undefined ? icon : defaultIcons[variant]}
        </span>
        <div className="space-y-1 min-w-0 flex-1">
          {title && <p className="font-semibold text-content-primary text-xs">{title}</p>}
          <div className="text-content-secondary leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

export interface CodeBlockProps extends HTMLAttributes<HTMLDivElement> {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({
  code,
  language = 'python',
  title,
  className = '',
  ...props
}: CodeBlockProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border-subtle bg-surface-elevated text-content-primary shadow-subtle ${className}`}
      {...props}
    >
      {(title || language) && (
        <div className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-2 text-[11px] font-mono text-content-secondary select-none">
          <span>{title || `${language} example`}</span>
          <span className="uppercase text-[9px] font-bold text-content-muted tracking-wider">
            {language}
          </span>
        </div>
      )}
      <div className="p-4 font-mono text-xs overflow-x-auto">
        <pre className="text-content-primary leading-relaxed">{code}</pre>
      </div>
    </div>
  );
}

// ==========================================
// 4. INPUT & SEARCH COMPONENT
// ==========================================

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({ error, leftIcon, rightIcon, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-content-muted pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none ${
            leftIcon ? 'pl-9' : ''
          } ${rightIcon ? 'pr-10' : ''} ${error ? 'border-status-danger focus:ring-status-danger' : 'border-border-subtle hover:border-border'} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-2.5 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}

export function SearchInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      type="search"
      leftIcon={<SearchIcon className="w-4 h-4 text-content-muted" />}
      placeholder="Search topics, roadmap, or concepts..."
      className={className}
      {...props}
    />
  );
}

export function Textarea({ error, className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return (
    <div className="w-full">
      <textarea
        className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none ${
          error ? 'border-status-danger focus:ring-status-danger' : 'border-border-subtle hover:border-border'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}

// ==========================================
// 5. BADGE COMPONENT
// ==========================================

export interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'ai-accent' | 'reward' | 'data';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'neutral', size = 'sm', className = '' }: BadgeProps) {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  const variantStyles = {
    neutral:    'bg-surface-elevated text-content-secondary border border-border-subtle',
    primary:    'bg-brand-subtle text-brand border border-brand-border',
    success:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    warning:    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    danger:     'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    // Updated ai-accent: indigo-violet family
    'ai-accent': 'bg-gradient-to-r from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-400/30 shadow-subtle',
    // New semantic variants
    reward:     'bg-amber-500/12 text-amber-600 dark:text-amber-300 border border-amber-400/25',
    data:       'bg-teal-500/10 text-teal-600 dark:text-teal-300 border border-teal-400/25',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ==========================================
// 6. THEME TOGGLE BUTTON
// ==========================================

export function ThemeToggle({
  theme = 'dark',
  onToggle,
  className = '',
}: {
  theme?: 'dark' | 'light';
  onToggle?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg border border-border-subtle bg-surface text-content-secondary transition hover:bg-surface-hover hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${className}`}
      aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
    </button>
  );
}

// ==========================================
// 7. PAGE LAYOUT PRIMITIVES (Sprint 2 Foundation)
// ==========================================

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  maxWidth?: '5xl' | '6xl' | '7xl' | 'full';
}

export function PageContainer({
  children,
  maxWidth = '7xl',
  className = '',
  ...props
}: PageContainerProps) {
  const maxStyles = {
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div className={`mx-auto w-full ${maxStyles[maxWidth]} px-4 sm:px-6 lg:px-8 py-6 space-y-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-5 ${className}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-content-secondary">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 8. APPSHELL (PRESERVED PROPS & REFINED UX)
// ==========================================

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: <DashboardIcon className="w-4 h-4" />,
      },
      {
        label: 'Learn',
        href: '/learn',
        icon: <LearnIcon className="w-4 h-4" />,
      },
      {
        label: 'Explore',
        href: '/explore',
        icon: <ExploreIcon className="w-4 h-4" />,
        badge: 'NEW',
      },
      {
        label: 'Playground',
        href: '/playground',
        icon: <PlaygroundIcon className="w-4 h-4" />,
      },
      {
        label: 'Roadmap',
        href: '/roadmap',
        icon: <RoadmapIcon className="w-4 h-4" />,
      },
      {
        label: 'Progress',
        href: '/progress',
        icon: <ProgressIcon className="w-4 h-4" />,
      },
      {
        label: 'Projects',
        href: '/projects',
        icon: <PortfolioIcon className="w-4 h-4" />,
      },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      {
        label: 'AI Mentor',
        href: '/mentor',
        icon: <MentorIcon className="w-4 h-4" />,
        badge: 'AI',
      },
    ],
  },
];

export interface AppShellUser {
  id: number;
  email: string;
  full_name: string;
}

export interface AppShellProps {
  children: ReactNode;
  pathname: string;
  user?: AppShellUser | null;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

function getInitials(name: string): string {
  if (!name) return 'TS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CollapseSidebarIcon({ className = 'w-4 h-4', collapsed = false }: { className?: string; collapsed?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {collapsed ? (
        <>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="m14 15 3-3-3-3" />
        </>
      ) : (
        <>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="m16 9-3 3 3 3" />
        </>
      )}
    </svg>
  );
}

export const AppShell = ({
  children,
  pathname,
  user,
  onLogout,
  theme = 'dark',
  onToggleTheme,
}: AppShellProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore collapsed state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('techseeker_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {}
    setIsHydrated(true);
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('techseeker_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Close mobile drawer on ESC key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    },
    [mobileMenuOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderSidebarContent = (isRail: boolean) => (
    <div className="flex h-full flex-col justify-between select-none overflow-hidden">
      {/* Brand Header */}
      <div className={`shrink-0 border-b border-border-subtle ${isRail ? 'p-3 flex flex-col items-center gap-2' : 'px-4 py-3.5 sm:px-5 sm:py-4'}`}>
        <div className={`flex items-center ${isRail ? 'flex-col gap-2' : 'justify-between w-full'}`}>
          <a
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg p-0.5"
            title={isRail ? 'TechSeeker' : undefined}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-subtle group-hover:scale-105 transition-transform shrink-0">
              T
            </div>
            {!isRail && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold tracking-tight text-content-primary">
                    TechSeeker
                  </h1>
                  <span className="rounded bg-brand-subtle px-1 py-0.2 text-[8px] font-bold text-brand uppercase tracking-wider">
                    PRO
                  </span>
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-content-muted truncate">
                  AI Learning System
                </p>
              </div>
            )}
          </a>

          <div className={`flex items-center ${isRail ? 'flex-col gap-1.5' : 'gap-1'}`}>
            {onToggleTheme && (
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            )}

            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle text-content-muted hover:border-brand-border hover:bg-surface-hover hover:text-content-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              title={isRail ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isRail ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <CollapseSidebarIcon className="w-3.5 h-3.5" collapsed={isRail} />
            </button>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle text-content-muted hover:text-content-primary md:hidden"
              aria-label="Close navigation"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className={`flex-1 min-h-0 overflow-y-auto ${isRail ? 'px-2 py-3 space-y-3' : 'px-3 py-3 space-y-4'}`} aria-label="Main navigation">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isRail && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-content-muted transition-opacity">
                {group.title}
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                return (
                  <div key={item.label} className="relative group/navitem">
                    <a
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center ${isRail ? 'justify-center w-10 h-10 mx-auto p-0 rounded-xl' : 'gap-3 px-3 py-2.5 rounded-lg min-h-[40px]'} text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        active
                          ? 'bg-brand-subtle text-brand font-semibold shadow-subtle border-l-2 border-brand ' + (isRail ? 'border-l-0 ring-1 ring-brand' : 'pl-2.5')
                          : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center transition-colors shrink-0 ${
                          active
                            ? 'text-brand'
                            : 'text-content-muted group-hover/navitem:text-content-primary'
                        }`}
                      >
                        {item.icon}
                      </span>

                      {!isRail && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </a>

                    {/* Floating Tooltip in Rail Mode */}
                    {isRail && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 hidden group-hover/navitem:flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated text-content-primary border border-border rounded-lg shadow-elevated text-xs font-medium whitespace-nowrap pointer-events-none animate-fade-in">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1 text-[8px] font-bold text-emerald-500">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile & Logout (Pinned Bottom) */}
      <div className={`shrink-0 border-t border-border-subtle bg-surface ${isRail ? 'p-2 flex flex-col items-center gap-2' : 'p-3'}`}>
        {user ? (
          isRail ? (
            <div className="relative group/user flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[11px] font-bold text-white shadow-subtle cursor-pointer">
                {getInitials(user.full_name)}
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-content-muted hover:text-status-danger hover:bg-status-danger/10 transition"
                  aria-label="Sign out"
                >
                  <LogoutIcon className="w-3.5 h-3.5" />
                </button>
              )}

              {/* User Tooltip */}
              <div className="absolute left-full bottom-2 ml-2 z-50 hidden group-hover/user:flex flex-col px-3 py-1.5 bg-surface-elevated text-content-primary border border-border rounded-lg shadow-elevated text-xs whitespace-nowrap pointer-events-none animate-fade-in">
                <span className="font-semibold">{user.full_name}</span>
                <span className="text-[10px] text-content-muted">{user.email}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-elevated p-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white shadow-subtle">
                  {getInitials(user.full_name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-content-primary">
                    {user.full_name}
                  </p>
                  <p className="truncate text-[10px] text-content-muted" title={user.email}>
                    {user.email}
                  </p>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out"
                  className="ml-1.5 flex h-7 w-7 min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface text-content-muted transition hover:border-status-danger/30 hover:bg-status-danger/10 hover:text-status-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger"
                  aria-label="Sign out"
                >
                  <LogoutIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        ) : (
          isRail ? (
            <a
              href="/login"
              title="Sign in"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-brand-subtle text-xs font-bold text-brand hover:bg-brand hover:text-content-inverse transition"
            >
              →
            </a>
          ) : (
            <a
              href="/login"
              className="flex items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-subtle px-3 py-2 text-xs font-semibold text-brand transition hover:bg-brand-hover hover:text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-[36px]"
            >
              <span>Sign in</span>
              <span>→</span>
            </a>
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-canvas text-content-primary">
      {/* Desktop Sidebar (Collapsible Rail) */}
      <aside
        className={`relative z-20 hidden h-full shrink-0 border-r border-border-subtle bg-surface md:flex md:flex-col sidebar-transition ${
          isCollapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
      >
        {renderSidebarContent(isCollapsed)}
      </aside>

      {/* Mobile Drawer (Accessible Dialog) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-[260px] max-w-[85vw] flex-col border-r border-border-subtle bg-surface shadow-elevated z-10 animate-fade-in">
            {renderSidebarContent(false)}
          </div>
        </div>
      )}

      {/* Main Content Viewport Area */}
      <div className="relative z-10 flex flex-1 flex-col h-full min-w-0 overflow-hidden bg-canvas">
        {/* Mobile Header Bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-4 md:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-border-subtle bg-surface text-content-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Open navigation menu"
            >
              <MenuIcon className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-content-primary tracking-tight">
              TechSeeker
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onToggleTheme && (
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            )}
            {user && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white">
                {getInitials(user.full_name)}
              </div>
            )}
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="relative flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};