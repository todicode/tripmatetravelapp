import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function ScreenHeader({ title, subtitle, onBack, action }) {
  return (
    <header className="shrink-0 bg-chrome px-4 py-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        {onBack && <button type="button" onClick={onBack} aria-label="Quay lại" className="ui-icon-button shrink-0"><ArrowLeft className="w-5 h-5" /></button>}
        <h1 className="flex-1 min-w-0 text-[20px] leading-[1.3] font-semibold text-ink">{title}</h1>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {subtitle && <p className="mt-1 text-[14px] leading-[1.43] text-ink-muted">{subtitle}</p>}
    </header>
  );
}
