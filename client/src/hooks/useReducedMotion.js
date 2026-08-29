import { useState } from 'react';

/**
 * Returns true if the user prefers reduced motion.
 * @returns {boolean}
 */
export function useReducedMotion() {
  const [prefersReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  return prefersReduced;
}
