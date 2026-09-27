import React, { useCallback, useEffect, useRef, useState } from 'react';

export default function StablePopup({ label, onClose, children }) {
  const panel = useRef(null);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const requestClose = useCallback(() => {
    if (closeTimer.current !== null) return;
    setClosing(true);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
    closeTimer.current = window.setTimeout(() => close.current(), duration);
  }, []);
  useEffect(() => {
    const previous = document.activeElement;
    const controls = () => Array.from(panel.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select, textarea, [tabindex="0"]') || []);
    // Focus a non-input control so opening the sheet does not summon a keyboard.
    (panel.current?.querySelector('button') || panel.current)?.focus({ preventScroll: true });
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); requestClose(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault(); items.at(-1).focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault(); items[0].focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      window.clearTimeout(closeTimer.current);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [requestClose]);
  return <div data-modal-layer className={`absolute inset-0 z-[700] bg-black/35 flex items-end ${closing ? 'anim-popup-backdrop-out' : 'anim-popup-backdrop-in'}`} onClick={requestClose}>
    <section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} onClick={event => event.stopPropagation()} onClickCapture={event => {
      if (event.target.closest('[data-popup-close]')) { event.stopPropagation(); requestClose(); }
    }} className={`w-full h-[85%] min-h-0 rounded-t-[18px] bg-canvas flex flex-col overflow-hidden ${closing ? 'anim-popup-out pointer-events-none' : 'anim-sheet-up'}`}>
      <span aria-hidden="true" className="w-10 h-1 rounded-full bg-hairline mx-auto mt-2 shrink-0" />
      {typeof children === 'function' ? children(requestClose) : children}
    </section>
  </div>;
}
