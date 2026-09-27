import React, { useCallback, useState } from 'react';
import CreateMenu from './CreateMenu';
import { useNav } from '../context/NavContext';
import { Compass, Map, MessageSquare, User, Plus } from 'lucide-react';

export default function BottomNav() {
  const { activeTab, switchTab, friendRequestsCount } = useNav();
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const closeCreateMenu = useCallback(() => setCreateMenuOpen(false), []);

  return (
    <nav
      aria-label="Điều hướng chính"
      className="bg-chrome border-t border-hairline w-full grid grid-cols-5 items-center shrink-0 z-30 py-1 select-none"
    >
      {/* Tab 1: Khám phá */}
      <button
        type="button"
        onClick={() => switchTab('explore')}
        className={`w-full flex flex-col items-center justify-center min-h-12 py-1 transition-colors apple-press ${
          activeTab === 'explore' ? 'text-primary' : 'text-ink-muted hover:text-ink'
        }`}
      >
        <Compass
          className="w-[22px] h-[22px] transition-transform"
          strokeWidth={activeTab === 'explore' ? 2.3 : 1.8}
        />
        <span className={`text-[11px] mt-0.5 tracking-tight ${activeTab === 'explore' ? 'font-semibold' : 'font-normal'}`}>
          Khám phá
        </span>
      </button>

      {/* Tab 2: Chuyến đi */}
      <button
        type="button"
        onClick={() => switchTab('trips')}
        className={`w-full flex flex-col items-center justify-center min-h-12 py-1 transition-colors apple-press ${
          activeTab === 'trips' ? 'text-primary' : 'text-ink-muted hover:text-ink'
        }`}
      >
        <Map
          className="w-[22px] h-[22px] transition-transform"
          strokeWidth={activeTab === 'trips' ? 2.3 : 1.8}
        />
        <span className={`text-[11px] mt-0.5 tracking-tight ${activeTab === 'trips' ? 'font-semibold' : 'font-normal'}`}>
          Chuyến đi
        </span>
      </button>

      {/* Nút tạo chuyến đi ở giữa (theo images/tao_chuyen_di/image.png) - Căn giữa tuyệt đối ở cột 3 */}
      <div className="w-full flex items-center justify-center">
        <button
          type="button"
          onClick={() => setCreateMenuOpen(true)}
          aria-expanded={createMenuOpen}
          aria-haspopup="dialog"
          className="w-11 h-11 rounded-full bg-create-button hover:bg-create-hover text-[#ffffff] flex items-center justify-center  shrink-0 apple-press transition-transform -my-1"
          aria-label="Tạo chuyến đi"
          title="Tạo chuyến đi"
        >
          <Plus className={`w-5 h-5 text-[#ffffff] stroke-[2.5] transition-transform duration-300 ${createMenuOpen ? 'rotate-45' : 'rotate-0'}`} />
        </button>
      </div>

      {/* Tab 3: Tin nhắn */}
      <button
        type="button"
        onClick={() => switchTab('chat')}
        className={`w-full flex flex-col items-center justify-center min-h-12 py-1 transition-colors apple-press ${
          activeTab === 'chat' ? 'text-primary' : 'text-ink-muted hover:text-ink'
        }`}
      >
        <div className="relative">
          <MessageSquare
            className="w-[22px] h-[22px] transition-transform"
            strokeWidth={activeTab === 'chat' ? 2.3 : 1.8}
          />
          <span className="absolute -top-1 -right-2 bg-[#ff3b30] text-[#ffffff] text-[9px] font-semibold rounded-full w-4 h-4 flex items-center justify-center border-2 border-chrome">
            3
          </span>
        </div>
        <span className={`text-[11px] mt-0.5 tracking-tight ${activeTab === 'chat' ? 'font-semibold' : 'font-normal'}`}>
          Tin nhắn
        </span>
      </button>

      {/* Tab 4: Cá nhân */}
      <button
        type="button"
        onClick={() => switchTab('profile')}
        className={`w-full flex flex-col items-center justify-center min-h-12 py-1 transition-colors apple-press ${
          activeTab === 'profile' ? 'text-primary' : 'text-ink-muted hover:text-ink'
        }`}
      >
        <div className="relative">
          <User
            className="w-[22px] h-[22px] transition-transform"
            strokeWidth={activeTab === 'profile' ? 2.3 : 1.8}
          />
          {friendRequestsCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-[#ff3b30] text-[#ffffff] text-[9px] font-semibold rounded-full w-4 h-4 flex items-center justify-center border-2 border-chrome">
              {friendRequestsCount}
            </span>
          )}
        </div>
        <span className={`text-[11px] mt-0.5 tracking-tight ${activeTab === 'profile' ? 'font-semibold' : 'font-normal'}`}>
          Cá nhân
        </span>
      </button>
      {createMenuOpen && <CreateMenu onClose={closeCreateMenu} />}
    </nav>
  );
}
