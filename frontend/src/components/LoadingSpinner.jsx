import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ size = 'md', message = 'Loading...', inline = false }) => {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  }[size] || 'w-7 h-7';

  if (inline) {
    return (
      <span className="inline-flex items-center justify-center gap-1.5">
        <Loader2 className={`${sizeClasses} animate-spin text-current`} />
        {message && <span className="text-xs font-semibold">{message}</span>}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3 animate-fade-in">
      <div className="relative flex items-center justify-center">
        <Loader2 className={`${sizeClasses} animate-spin text-indigo-600 stroke-[2]`} />
      </div>
      {message && (
        <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
