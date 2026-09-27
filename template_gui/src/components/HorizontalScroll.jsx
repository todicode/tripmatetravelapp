import React, { useEffect, useRef } from 'react';

export default function HorizontalScroll({ children, className = '', ...props }) {
  const ref = useRef(null);
  const drag = useRef(null);
  useEffect(() => {
    const element = ref.current;
    const wheel = event => {
      if (event.ctrlKey || element.scrollWidth <= element.clientWidth) return;
      event.preventDefault();
      event.stopPropagation();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      element.scrollLeft += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);
  const finishDrag = event => {
    if (ref.current.hasPointerCapture(event.pointerId)) ref.current.releasePointerCapture(event.pointerId);
    if (drag.current) drag.current.active = false;
  };
  return <div {...props} ref={ref} className={`overflow-x-auto no-scrollbar touch-pan-x select-none cursor-grab active:cursor-grabbing ${className}`}
    onMouseDown={event => event.stopPropagation()}
    onPointerDown={event => {
      drag.current = null;
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag.current = { active: true, moved: false, x: event.clientX, left: ref.current.scrollLeft };
    }}
    onPointerMove={event => {
      const state = drag.current;
      if (!state?.active || event.pointerType !== 'mouse') return;
      const distance = event.clientX - state.x;
      if (!state.moved && Math.abs(distance) < 6) return;
      state.moved = true;
      ref.current.setPointerCapture(event.pointerId);
      ref.current.scrollLeft = state.left - distance;
      event.preventDefault();
    }}
    onPointerUp={finishDrag} onPointerCancel={finishDrag}
    onPointerLeave={event => { if (!ref.current.hasPointerCapture(event.pointerId) && drag.current) drag.current.active = false; }}
    onClickCapture={event => {
      if (event.detail > 0 && drag.current?.moved) { event.preventDefault(); event.stopPropagation(); }
    }}>
    {children}
  </div>;
}
