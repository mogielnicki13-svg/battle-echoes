// ============================================================
// BATTLE ECHOES — useTapCounter.ts
//
// Reusable hook for secret N-tap unlock gestures.
//
// Usage — unlock developer screen after 7 taps on version text:
//
//   const { tap, count } = useTapCounter(7, () => {
//     navigation.navigate('DeveloperSettings');
//   });
//
//   <TouchableOpacity onPress={tap}>
//     <Text>v1.0.0</Text>
//   </TouchableOpacity>
//
// Taps must all happen within `resetAfterMs` (default 4s).
// On each tap between count 4 and target-1, the haptic
// intensity escalates so the user knows they're close.
// ============================================================

import { useRef, useState, useCallback, useEffect } from 'react';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/HapticsService';

interface TapCounterOptions {
  /** Number of consecutive taps needed to unlock (default: 7) */
  targetCount?: number;
  /** Window in ms — taps must all happen within this time (default: 4000) */
  resetAfterMs?: number;
  /** Called once when targetCount is reached */
  onUnlocked: () => void;
}

interface TapCounterResult {
  /** Call this from your onPress handler */
  tap:   () => void;
  /** Current tap count (0..targetCount-1). Useful for debug display */
  count: number;
  /** Resets the counter manually (e.g., on screen blur) */
  reset: () => void;
}

export function useTapCounter({
  targetCount  = 7,
  resetAfterMs = 4000,
  onUnlocked,
}: TapCounterOptions): TapCounterResult {
  const [count,  setCount]  = useState(0);
  const countRef            = useRef(0);  // sync reference alongside state
  const timerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlockedRef         = useRef(false);

  // Clean up timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    countRef.current  = 0;
    unlockedRef.current = false;
    setCount(0);
  }, []);

  const tap = useCallback(() => {
    // Prevent firing multiple times after unlock
    if (unlockedRef.current) return;

    // Restart the reset timer
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(reset, resetAfterMs);

    const newCount = countRef.current + 1;
    countRef.current = newCount;
    setCount(newCount);

    // Haptic feedback — escalates as user gets closer to target
    const remaining = targetCount - newCount;
    if (newCount >= targetCount) {
      // Unlocked!
      unlockedRef.current = true;
      hapticSuccess();
      if (timerRef.current) clearTimeout(timerRef.current);
      countRef.current = 0;
      setCount(0);
      // Slight delay so the haptic fires before navigation
      const UNLOCK_HAPTIC_DELAY_MS = 80;
      setTimeout(onUnlocked, UNLOCK_HAPTIC_DELAY_MS);
    } else if (remaining <= 2) {
      // Almost there — strong feedback
      hapticMedium();
    } else if (newCount >= Math.floor(targetCount / 2)) {
      // Halfway — medium feedback
      hapticLight();
    } else {
      // Early taps — light feedback
      hapticLight();
    }
  }, [targetCount, resetAfterMs, onUnlocked, reset]);

  return { tap, count, reset };
}
