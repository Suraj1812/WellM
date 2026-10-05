import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, type StyleProp, type View, type ViewStyle } from 'react-native';
import { RevealViewport, useMotionPreference } from './Motion';

export interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  variant?: 'up' | 'scale' | 'fade';
  style?: StyleProp<ViewStyle>;
}

export default function Reveal({ children, delay = 0, variant = 'up', style }: RevealProps) {
  const preference = useMotionPreference();
  const viewport = useContext(RevealViewport);
  const element = useRef<View>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const shown = useRef(false);
  const reveal = useCallback(() => {
    if (shown.current) return;
    shown.current = true;
    Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [delay, progress]);

  useEffect(() => {
    if (preference === null) return;
    if (preference) {
      shown.current = true;
      progress.stopAnimation();
      progress.setValue(1);
      return;
    }
    if (!viewport) {
      reveal();
      return;
    }
    let cancelled = false;
    const unsubscribe = viewport.subscribe(({ top, bottom }) => {
      if (cancelled || shown.current) return;
      element.current?.measureInWindow((_x, y, _width, height) => {
        if (!cancelled && height > 0 && y < bottom - 18 && y + height > top + 18) {
          reveal();
          unsubscribe();
        }
      });
    });
    viewport.refresh();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [preference, progress, reveal, viewport]);

  useEffect(() => () => progress.stopAnimation(), [progress]);
  return (
    <Animated.View
      ref={element}
      onLayout={() => viewport?.refresh()}
      style={[
        style,
        {
          opacity: progress,
          transform:
            variant === 'scale'
              ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }]
              : [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [variant === 'up' ? 22 : 0, 0],
                    }),
                  },
                ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
