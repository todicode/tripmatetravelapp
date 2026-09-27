import React, { useState, useEffect } from 'react';
import { NavProvider, useNav } from './context/NavContext';
import StatusBar from './components/StatusBar';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';

// Screens
import ExploreScreen from './screens/ExploreScreen';
import TripSetupScreen from './screens/TripSetupScreen';
import ManageTripsScreen from './screens/ManageTripsScreen';
import TrackTripScreen from './screens/TrackTripScreen';
import ChatListScreen from './screens/ChatListScreen';
import FriendChatScreen from './screens/FriendChatScreen';
import GroupChatScreen from './screens/GroupChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import FriendRequestsScreen from './screens/FriendRequestsScreen';
import CreateGroupScreen from './screens/CreateGroupScreen';
import AddFriendScreen from './screens/AddFriendScreen';

function AppContent() {
  const { currentScreen, prevScreen, animType } = useNav();
  const [isDeviceFrame, setIsDeviceFrame] = useState(true);

  // Enable smooth mouse drag-to-scroll & global wheel propagation
  useEffect(() => {
    let isDown = false;
    let startY = 0;
    let scrollTop = 0;
    let targetContainer = null;

    const findScrollableParent = (element) => {
      let el = element;
      while (el && el !== document.body && el !== document.documentElement) {
        if (el.classList && (el.classList.contains('leaflet-container') || el.classList.contains('no-drag-scroll'))) {
          return null;
        }
        const style = window.getComputedStyle(el);
        const canScrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        if (canScrollY) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const findActiveScrollContainer = () => Array.from(document.querySelectorAll('.screen-container [class*="overflow-y-auto"], .screen-container.overflow-y-auto'))
      .find(element => !element.closest('[inert]') && element.scrollHeight > element.clientHeight);

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      const target = e.target;
      const modalOpen = document.querySelector('[data-modal-layer]');
      if (modalOpen && !target.closest('[data-modal-layer]')) return;
      // Do not initiate drag on inputs, buttons, links, or inside map
      if (
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName) ||
        (target.closest && target.closest('button, input, textarea, select, a, .leaflet-container'))
      ) {
        return;
      }

      let scrollEl = findScrollableParent(target);
      if (!scrollEl && !modalOpen) {
        scrollEl = findActiveScrollContainer();
      }

      if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
        isDown = true;
        startY = e.pageY;
        scrollTop = scrollEl.scrollTop;
        targetContainer = scrollEl;
      }
    };

    const handleMouseMove = (e) => {
      if (!isDown || !targetContainer) return;
      if (document.querySelector('[data-modal-layer]') && !targetContainer.closest('[data-modal-layer]')) {
        handleMouseUp();
        return;
      }
      const dist = e.pageY - startY;
      if (Math.abs(dist) > 2) {
        targetContainer.scrollTop = scrollTop - dist;
      }
    };

    const handleMouseUp = () => {
      isDown = false;
      targetContainer = null;
    };

    // Forward wheel scroll when hovering over non-scrollable headers/bezels (but let Leaflet zoom natively)
    const handleWheel = (e) => {
      if (document.querySelector('[data-modal-layer]')) {
        // Never forward popup/backdrop gestures into the screen behind it.
        if (!e.target.closest('[data-modal-layer]') || !findScrollableParent(e.target)) {
          e.preventDefault();
        }
        return;
      }
      if (e.target && e.target.closest && e.target.closest('.leaflet-container')) {
        return; // Let Leaflet handle map zoom natively!
      }

      // Check if element under cursor can scroll
      let el = e.target;
      let canScroll = false;
      while (el && el !== document.body && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          canScroll = true;
          break;
        }
        el = el.parentElement;
      }

      // If cursor is on a non-scrollable area (header, tab bar, phone frame), forward wheel to active scroll container
      if (!canScroll) {
        const activeContainer = findActiveScrollContainer();
        if (activeContainer && activeContainer.scrollHeight > activeContainer.clientHeight) {
          activeContainer.scrollTop += e.deltaY;
        }
      }
    };

    const handleTouchMove = (e) => {
      if (document.querySelector('[data-modal-layer]') &&
          (!e.target.closest('[data-modal-layer]') || !findScrollableParent(e.target))) {
        e.preventDefault();
      }
    };

    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Screen resolver
  const renderScreen = (screenObj) => {
    if (!screenObj) return null;
    const { name, params } = screenObj;

    switch (name) {
      case 'explore':
        return <ExploreScreen params={params} />;
      case 'createTrip':
        return <TripSetupScreen params={params} />;
      case 'trips':
        return <ManageTripsScreen params={params} />;
      case 'trackTrip':
        return <TrackTripScreen params={params} />;
      case 'chat':
        return <ChatListScreen params={params} />;
      case 'friendChat':
        return <FriendChatScreen params={params} />;
      case 'groupChat':
        return <GroupChatScreen params={params} />;
      case 'profile':
        return <ProfileScreen params={params} />;
      case 'editProfile':
        return <EditProfileScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'friendRequests':
        return <FriendRequestsScreen params={params} />;
      case 'createGroup':
        return <CreateGroupScreen params={params} />;
      case 'addFriend':
        return <AddFriendScreen params={params} />;
      default:
        return <ExploreScreen params={params} />;
    }
  };

  // Only show bottom navigation on root tab screens
  const isRootTab = ['explore', 'trips', 'chat', 'profile'].includes(currentScreen.name);

  // Determine transition animation class
  let animClass = 'anim-tab-fade';
  if (animType === 'push') {
    animClass = 'anim-push-enter';
  } else if (animType === 'pop') {
    animClass = 'anim-pop-enter';
  } else if (animType === 'tab') {
    animClass = 'anim-tab-fade';
  }

  return (
    <div className="min-h-screen w-full bg-parchment flex flex-col items-center justify-center relative overflow-hidden select-none">

      {/* Desktop Mode Toggle Button */}
      <div className="fixed top-3 right-4 z-50 hidden md:flex items-center space-x-2 bg-canvas/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-hairline shadow-xs">
        <span className="text-[11px] text-ink-muted font-medium">Khung hiển thị:</span>
        <button
          type="button"
          onClick={() => setIsDeviceFrame(!isDeviceFrame)}
          className="text-[11px] font-semibold text-primary hover:underline apple-press"
        >
          {isDeviceFrame ? 'Toàn màn hình' : 'Mô phỏng điện thoại'}
        </button>
      </div>

      {/* DEVICE STAGE */}
      <main className={`relative flex items-center justify-center transition-all duration-300 ${
        isDeviceFrame ? 'my-auto p-2 sm:p-4' : 'w-full h-screen p-0'
      }`}>
        <div className={`relative transition-all duration-300 flex flex-col overflow-hidden ${
          isDeviceFrame
            ? 'w-[400px] h-[852px] bg-[#1d1d1f] rounded-[52px] p-[10px] border-[3px] border-[#333333] apple-product-shadow'
            : 'w-full h-screen rounded-none p-0 border-0'
        }`}>

          {/* Device Side Buttons (Only visible in device frame mode) */}
          {isDeviceFrame && (
            <>
              <div className="absolute -left-[5px] top-28 w-[3.5px] h-7 bg-[#272729] rounded-l-sm" />
              <div className="absolute -left-[5px] top-40 w-[3.5px] h-12 bg-[#272729] rounded-l-sm" />
              <div className="absolute -left-[5px] top-56 w-[3.5px] h-12 bg-[#272729] rounded-l-sm" />
              <div className="absolute -right-[5px] top-40 w-[3.5px] h-16 bg-[#272729] rounded-r-sm" />
            </>
          )}

          {/* Screen Inner Display */}
          <div className={`relative w-full h-full bg-canvas flex flex-col overflow-hidden ${
            isDeviceFrame ? 'rounded-[42px] border border-[#272729]' : ''
          }`}>
            {/* iOS Status Bar */}
            <StatusBar />

            {/* Screen Viewport with iOS Transition */}
            <div className="relative flex-1 w-full h-full overflow-hidden">
              <div
                key={`${currentScreen.name}_${JSON.stringify(currentScreen.params)}`}
                className={`screen-container ${animClass}`}
              >
                {renderScreen(currentScreen)}
              </div>
            </div>

            {/* Bottom Tab Bar */}
            {isRootTab && <BottomNav />}

            {/* iOS Home Indicator Bar */}
            <div className="h-4 bg-chrome shrink-0 flex items-center justify-center select-none">
              <div className="w-32 h-1 bg-[#1d1d1f]/30 rounded-full"></div>
            </div>
          </div>

        </div>
      </main>

      {/* Global Toast */}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <NavProvider>
      <AppContent />
    </NavProvider>
  );
}
