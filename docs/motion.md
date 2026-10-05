# Interface motion

Scroll sections reveal with a short fade, upward movement, or scale transition, with staggered timing. The browser uses local IntersectionObserver-driven styles rather than downloading an animation stylesheet. Native sections use Animated with native transforms and viewport measurements from the screen scroll container.

Route changes reset the scroll position. Week score bars grow upward from the baseline on entry, with staggered days and grid lines appearing from bottom to top. Buttons provide press feedback, the microphone indicator responds to measured captured signal energy. Live waveform bars use captured values only; an empty signal shows a neutral baseline.

Reduced-motion preferences disable movement and show content immediately. Keyboard focus reveals a browser section immediately. Observers, scroll subscriptions, and running animations are cleaned up on unmount. Animation does not drive capture timers, recording data, or model results.

Recording, inference, and background work remain independent of interface motion. Real-device background acceptance is recorded separately in `verification.md`.
