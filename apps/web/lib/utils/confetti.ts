import confetti from 'canvas-confetti';

export function triggerConfetti() {
  try {
    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const count = 40;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
      disableForReducedMotion: true,
    };

    confetti({
      ...defaults,
      particleCount: count,
      spread: 60,
      colors: ['#818cf8', '#fbbf24', '#ec4899', '#2dd4bf', '#fcd34d'],
    });
  } catch {}
}

export function triggerAchievementCelebration() {
  try {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const end = Date.now() + 600;
    const colors = ['#818cf8', '#fbbf24', '#ec4899', '#2dd4bf'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
        zIndex: 9999,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
        zIndex: 9999,
        disableForReducedMotion: true,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  } catch {}
}
