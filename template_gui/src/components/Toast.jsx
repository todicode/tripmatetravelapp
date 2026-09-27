import React from 'react';
import { useNav } from '../context/NavContext';

export default function Toast() {
  const { toastInfo } = useNav();

  if (!toastInfo) return null;

  return (
    <div className="fixed top-12 left-4 right-4 z-50 flex justify-center pointer-events-none transition-all duration-300">
      <div className="bg-[#1d1d1f] text-[#ffffff] px-4 py-2.5 rounded-full text-[14px] font-normal flex items-center justify-between border border-[#333333]  max-w-[360px] w-full">
        <div className="min-w-0 pr-2">
          {toastInfo.title && <span className="font-semibold block text-[12px] truncate">{toastInfo.title}</span>}
          <span className="text-[11px] text-[#e0e0e0] block truncate">{toastInfo.message}</span>
        </div>
        <span className="text-[#2997ff] text-[11px] font-medium shrink-0">Xong</span>
      </div>
    </div>
  );
}
