# Interface motion

The browser preview uses the AOS 2.3.4 stylesheet from jsDelivr for restrained fade-up reveals. Each section moves 18 pixels over 500 milliseconds and animates once. The primary recording controls remain outside the reveal wrappers.

`src/components/Reveal.web.tsx` uses IntersectionObserver to trigger the AOS classes. This handles React Native Web’s nested scroll container without a separate window-scroll listener or an added runtime package. The stylesheet is requested once per browser page. If it fails to load, content stays visible.

Reduced-motion preferences disable the effect. Keyboard focus reveals a section immediately, and observers are disconnected after the first reveal and on unmount. The phone version resolves `Reveal.tsx`, which preserves the layout without loading web CSS or making network requests.

The browser implementation was checked for initial visibility, reveal after scrolling, route navigation, and reduced-motion behavior. Recording, inference, and native background work are independent of interface motion.
