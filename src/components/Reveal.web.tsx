import React, { useEffect, useRef } from 'react';

let stylesheet: Promise<boolean> | undefined;

function loadStylesheet() {
  if (stylesheet) return stylesheet;
  stylesheet = new Promise<boolean>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css';
    link.onload = () => resolve(true);
    link.onerror = () => resolve(false);
    const overrides = document.createElement('style');
    overrides.textContent = `[data-aos="fade-up"] { transform: translate3d(0, 18px, 0); }
      [data-aos="fade-up"].aos-animate { transform: none; }
      @media (prefers-reduced-motion: reduce) {
        [data-aos] { opacity: 1 !important; transform: none !important; transition: none !important; }
      }`;
    document.head.append(link, overrides);
  });
  return stylesheet;
}

export default function Reveal({ children }: { children: React.ReactNode }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = element.current;
    if (!target || !('IntersectionObserver' in window)) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cancelled = false;
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    const show = () => {
      target.classList.add('aos-animate');
      observer?.disconnect();
    };
    const onMotionChange = () => {
      if (motion.matches) show();
    };
    target.addEventListener('focusin', show);
    motion.addEventListener('change', onMotionChange);
    if (!motion.matches) {
      void loadStylesheet().then((loaded) => {
        if (!loaded || cancelled || motion.matches) return;
        target.dataset.aos = 'fade-up';
        target.dataset.aosDuration = '500';
        target.dataset.aosEasing = 'ease-out-cubic';
        target.dataset.aosOnce = 'true';
        target.classList.add('aos-init');
        observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) frame = requestAnimationFrame(show);
          },
          { threshold: 0.08 },
        );
        observer.observe(target);
      });
    }
    return () => {
      cancelled = true;
      observer?.disconnect();
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', onMotionChange);
      target.removeEventListener('focusin', show);
    };
  }, []);
  return (
    <div ref={element} style={{ width: '100%' }}>
      {children}
    </div>
  );
}
