interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = 'md', className = '', label }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`
          ${sizes[size]}
          border-slate-200 border-t-slate-900
          rounded-full animate-spin
        `}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && <p className="text-sm text-slate-600">{label}</p>}
    </div>
  );
}

// Full page loading
export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}

// Button loading spinner
export function ButtonSpinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  );
}

export default LoadingSpinner;
