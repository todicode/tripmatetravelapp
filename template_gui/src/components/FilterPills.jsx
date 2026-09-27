import React from 'react';

export default function FilterPills({ items, value, onChange, label, className = 'px-4 pb-3' }) {
  return <div role="group" aria-label={label} className={`flex items-center gap-2 overflow-x-auto no-scrollbar bg-canvas shrink-0 ${className}`}>{items.map(item => <button type="button" key={item.key} onClick={() => onChange(item.key)} aria-pressed={value === item.key} className={`min-h-11 rounded-full px-4 text-[14px] whitespace-nowrap font-semibold apple-press ${value === item.key ? 'bg-primary-light text-primary' : 'bg-parchment text-ink-muted'}`}>{item.label}</button>)}</div>;
}
