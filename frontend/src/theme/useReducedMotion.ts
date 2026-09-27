import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => { let active = true; void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReducedMotion(value); }).catch(() => {}); const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion); return () => { active = false; sub.remove(); }; }, []);
  return reducedMotion;
}
