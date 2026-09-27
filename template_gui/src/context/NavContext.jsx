import React, { createContext, useContext, useState, useEffect } from 'react';

const NavContext = createContext(null);

export function NavProvider({ children }) {
  // Stack of screens: default starts at 'explore'
  const [stack, setStack] = useState([{ name: 'explore', params: {} }]);
  const [activeTab, setActiveTab] = useState('explore');
  const [animType, setAnimType] = useState('none'); // 'push', 'pop', 'tab'
  const [toastInfo, setToastInfo] = useState(null);

  // PROMPT: Bản bàn giao không có đăng nhập: mở thẳng Khám phá
  useEffect(() => {
    setStack([{ name: 'explore', params: {} }]);
    setActiveTab('explore');
    window.history.replaceState({ screen: 'explore' }, '', '#/explore');
  }, []);

  // Synchronize with URL hash for easy bookmarking and browser back button
  useEffect(() => {
    const handlePopState = (e) => {
      if (stack.length > 1) {
        setAnimType('pop');
        setStack(prev => prev.slice(0, -1));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [stack.length]);

  const showToast = (title, message) => {
    setToastInfo({ title, message });
    setTimeout(() => {
      setToastInfo(null);
    }, 2400);
  };

  const push = (name, params = {}) => {
    setAnimType('push');
    setStack(prev => [...prev, { name, params }]);
    window.history.pushState({ screen: name }, '', `#/${name}`);
  };

  const pop = () => {
    if (stack.length > 1) {
      setAnimType('pop');
      setStack(prev => prev.slice(0, -1));
    }
  };

  const switchTab = (tabName) => {
    setAnimType('tab');
    setActiveTab(tabName);
    setStack([{ name: tabName, params: {} }]);
    window.history.replaceState({ screen: tabName }, '', `#/${tabName}`);
  };

  // Friend Requests State for global badge counts across Navigation and Profile
  const [friendRequests, setFriendRequests] = useState([
    { id: 'req1', name: 'Trần Văn Hoàng', mutualCount: 3, avatar: 'H', phone: '0938 123 456' },
    { id: 'req2', name: 'Lê Thị Mai', mutualCount: 1, avatar: 'M', phone: '0972 888 999' }
  ]);

  const acceptFriendRequest = (id, name) => {
    setFriendRequests(prev => prev.filter(r => r.id !== id));
    showToast('Đã kết bạn', `Bạn và ${name || 'người dùng'} đã trở thành bạn bè`);
  };

  const declineFriendRequest = (id) => {
    setFriendRequests(prev => prev.filter(r => r.id !== id));
    showToast('Đã gỡ', 'Đã bỏ qua lời mời kết bạn');
  };

  const currentScreen = stack[stack.length - 1] || { name: 'explore', params: {} };
  const prevScreen = stack.length > 1 ? stack[stack.length - 2] : null;

  return (
    <NavContext.Provider value={{
      currentScreen,
      prevScreen,
      stack,
      activeTab,
      animType,
      push,
      pop,
      switchTab,
      showToast,
      toastInfo,
      friendRequests,
      friendRequestsCount: friendRequests.length,
      acceptFriendRequest,
      declineFriendRequest,
      setFriendRequests
    }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
export default NavContext;
