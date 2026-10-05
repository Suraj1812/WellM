import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, View } from 'react-native';
import { useTheme } from './ThemeProvider';

const MotionPreference = createContext<boolean | null>(null);

export function MotionSettings({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setReduced(media.matches);
      update();
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => mounted && setReduced(enabled),
      () => mounted && setReduced(true),
    );
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return <MotionPreference.Provider value={reduced}>{children}</MotionPreference.Provider>;
}

export function useMotionPreference() {
  return useContext(MotionPreference);
}

export function useReducedMotion() {
  return useMotionPreference() !== false;
}

type Viewport = { top: number; bottom: number };
type RevealController = {
  subscribe(listener: (viewport: Viewport) => void): () => void;
  refresh(): void;
};
export const RevealViewport = createContext<RevealController | null>(null);

// Only unrevealed native cards subscribe. Scrolling does not re-render the screen.
export function useScrollRevealViewport(scroll: React.RefObject<View | null>) {
  const listeners = useRef(new Set<(viewport: Viewport) => void>());
  const frame = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return useMemo<RevealController>(
    () => ({
      subscribe(listener) {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
      refresh() {
        if (Platform.OS === 'web' || !listeners.current.size || frame.current !== null) return;
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          scroll.current?.measureInWindow((_x, y, _width, height) => {
            listeners.current.forEach((listener) => listener({ top: y, bottom: y + height }));
          });
        });
      },
    }),
    [scroll],
  );
}

// The halo follows the microphone's measured level. It never loops on invented activity.
export function SignalHalo({
  level,
  active,
  children,
}: {
  level: number;
  active: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [signal] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(signal, {
      toValue: active ? Math.min(1, Math.max(0, level)) : 0,
      duration: reduced ? 0 : 240,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [active, level, reduced, signal]);
  return (
    <View style={{ width: 86, height: 86, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 78,
          height: 78,
          borderRadius: 39,
          backgroundColor: colors.greenLight,
          opacity: signal.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.75] }),
          transform: [{ scale: signal.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
        }}
      />
      {children}
    </View>
  );
}
