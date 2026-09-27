import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

export default function ScreenTransition({ children, duration = 200, slide = false }: { children: React.ReactNode; duration?: number; slide?: boolean }) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    progress.setValue(reducedMotion ? 1 : 0);
    const animation = Animated.timing(progress, { toValue: 1, duration: reducedMotion ? 0 : duration, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion, duration]);
  return <Animated.View style={{ flex: 1, opacity: progress, transform: [{ translateX: slide ? progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) : 0 }] }}>{children}</Animated.View>;
}
