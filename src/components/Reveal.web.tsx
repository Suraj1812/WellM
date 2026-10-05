import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { RevealProps } from './Reveal';

export default function Reveal({ children, delay = 0, variant = 'up', style }: RevealProps) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = element.current;
    if (!target || !('IntersectionObserver' in window)) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    const show = () => {
      target.style.opacity = '1';
      target.style.transform = 'none';
      target.dataset.revealed = 'true';
      observer?.disconnect();
    };
    const onMotionChange = () => {
      if (motion.matches) {
        target.style.transition = 'none';
        show();
      }
    };
    target.dataset.reveal = variant;
    target.addEventListener('focusin', show);
    motion.addEventListener('change', onMotionChange);
    if (!motion.matches) {
      target.style.opacity = '0';
      target.style.transform =
        variant === 'scale' ? 'scale(.96)' : variant === 'up' ? 'translateY(22px)' : 'none';
      target.style.transition = `opacity 520ms cubic-bezier(.22,1,.36,1) ${delay}ms, transform 520ms cubic-bezier(.22,1,.36,1) ${delay}ms`;
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) frame = requestAnimationFrame(show);
        },
        { threshold: 0.05 },
      );
      observer.observe(target);
    } else show();
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', onMotionChange);
      target.removeEventListener('focusin', show);
    };
  }, [delay, variant]);
  return (
    <View style={style}>
      <div ref={element} style={{ width: '100%' }}>
        {children}
      </div>
    </View>
  );
}
