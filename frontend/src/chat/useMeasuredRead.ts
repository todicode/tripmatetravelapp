import { useEffect, useRef } from 'react';
import { AppState, View } from 'react-native';

export function visibleFraction(
  rowY: number,
  rowHeight: number,
  viewportY: number,
  viewportHeight: number,
) {
  if (rowHeight <= 0 || viewportHeight <= 0) return 0;
  return (
    Math.max(
      0,
      Math.min(rowY + rowHeight, viewportY + viewportHeight) - Math.max(rowY, viewportY),
    ) / rowHeight
  );
}

/** Native measurements cover inverted-list insertions that do not emit viewability changes. */
export function useMeasuredRead(
  seq: string | undefined,
  enabled: boolean,
  onRead: (seq: string) => void,
  loadedThrough?: string,
) {
  const viewport = useRef<View>(null),
    row = useRef<View>(null),
    read = useRef(onRead);
  read.current = onRead;
  useEffect(() => {
    let active = true,
      reported = false,
      visibleSince: number | null = null,
      measuring = false;
    const check = () => {
      if (!active || !enabled || !seq || AppState.currentState !== 'active') {
        visibleSince = null;
        return;
      }
      if (measuring || !viewport.current || !row.current) return;
      measuring = true;
      viewport.current.measureInWindow((_x, y, _w, h) => {
        if (!active || !row.current) {
          measuring = false;
          return;
        }
        row.current.measureInWindow((_rx, ry, _rw, rh) => {
          measuring = false;
          if (!active || AppState.currentState !== 'active') {
            visibleSince = null;
            return;
          }
          const fraction = visibleFraction(ry, rh, y, h);
          if (!Number.isFinite(fraction) || fraction < 0.6) {
            visibleSince = null;
            return;
          }
          const now = Date.now();
          if (visibleSince === null) visibleSince = now;
          else if (!reported && now - visibleSince >= 500) {
            reported = true;
            read.current(seq);
          }
        });
      });
    };
    const timer = setInterval(check, 250);
    const sub = AppState.addEventListener('change', () => {
      visibleSince = null;
      reported = false;
    });
    return () => {
      active = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [seq, enabled, loadedThrough]);
  return { viewport, row };
}
