import React from 'react';
import { useNav } from '../context/NavContext';
import { Compass, Map, MessageSquare, User } from 'lucide-react';

export default function BottomNav() {
  const { activeTab, switchTab, friendRequestsCount } = useNav();

  const tabs = [
    { key: 'explore', label: 'Khám phá', icon: Compass },
    { key: 'trips', label: 'Chuyến đi', icon: Map },
    { key: 'chat', label: 'Tin nhắn', icon: MessageSquare, badge: 3 },
    { key: 'profile', label: 'Cá nhân', icon: User, badge: friendRequestsCount > 0 ? friendRequestsCount : null }
  ];

  return (
    <nav 
      aria-label="Điều hướng chính" 
      className="bg-[#ffffff] border-t border-[#e0e0e0] px-3 py-1.5 flex justify-around items-center shrink-0 z-30"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const IconComponent = tab.icon;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchTab(tab.key)}
            className={`relative flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-colors apple-press ${
              isActive ? 'text-[#0066cc]' : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
            }`}
          >
            <div className="relative">
              <IconComponent 
                className="w-5 h-5 transition-transform" 
                strokeWidth={isActive ? 2.3 : 1.8} 
              />
              {tab.badge && (
                <span className="absolute -top-1 -right-2 bg-[#ff3b30] text-[#ffffff] text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-[#ffffff]">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-0.5 ${isActive ? 'font-semibold' : 'font-normal'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
