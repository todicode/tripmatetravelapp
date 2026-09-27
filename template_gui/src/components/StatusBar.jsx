import React, { useState, useEffect } from 'react';

export default function StatusBar({ isDark = false }) {
  const [timeStr, setTimeStr] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      setTimeStr(`${h}:${m}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const textColor = isDark ? 'text-[#ffffff]' : 'text-ink';

  return (
    <div className={`h-11 px-6 bg-chrome flex items-center justify-between text-[13px] font-semibold select-none shrink-0 z-30 ${textColor}`}>
      <span className="tracking-tight">{timeStr}</span>

      {/* Dynamic Island Pill */}
      <div className="w-24 h-4 bg-[#1d1d1f] rounded-full mx-auto hidden sm:block opacity-90"></div>

      <div className="flex items-center space-x-2">
        {/* Signal */}
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <rect x="2" y="16" width="3" height="6" rx="0.5" />
          <rect x="7" y="12" width="3" height="10" rx="0.5" />
          <rect x="12" y="8" width="3" height="14" rx="0.5" />
          <rect x="17" y="4" width="3" height="18" rx="0.5" />
        </svg>
        {/* Wifi */}
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4zm0 3.5c3.78 0 7.21 1.5 9.73 3.93L12 19.3 2.27 11.43C4.79 9 8.22 7.5 12 7.5z"/>
        </svg>
        {/* Battery */}
        <div className="w-5 h-2.5 border border-current rounded-sm p-[1px] flex items-center">
          <div className="h-full w-3.5 bg-current rounded-2xs"></div>
        </div>
      </div>
    </div>
  );
}
