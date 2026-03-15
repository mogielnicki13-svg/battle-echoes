// ============================================================
// BATTLE ECHOES — useRecruitPackTimer.ts
//
// Stateful countdown hook for the 48-hour Recruit Pack offer.
// Reads `firstLaunchTs` from the store and ticks every second.
//
// Returns:
//   active          — true while the offer window is open
//   secondsLeft     — raw seconds remaining (≥ 0)
//   hoursLeft       — integer hours component
//   minutesLeft     — integer minutes component (0-59)
//   secondsDisplay  — seconds component (0-59)
//   label           — formatted "HH:MM:SS" string
//
// The hook automatically clears its interval when the timer
// reaches zero or the component unmounts.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';

export interface RecruitPackTimerResult {
  active:         boolean;
  secondsLeft:    number;
  hoursLeft:      number;
  minutesLeft:    number;
  secondsDisplay: number;
  label:          string;
}

function formatHMS(totalSeconds: number): string {
  const h  = Math.floor(totalSeconds / 3600);
  const m  = Math.floor((totalSeconds % 3600) / 60);
  const s  = totalSeconds % 60;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function useRecruitPackTimer(): RecruitPackTimerResult {
  const isRecruitPackActive       = useAppStore(s => s.isRecruitPackActive);
  const getRecruitPackSecondsLeft = useAppStore(s => s.getRecruitPackSecondsLeft);

  const [secondsLeft, setSecondsLeft] = useState(getRecruitPackSecondsLeft());
  const [active, setActive]           = useState(isRecruitPackActive());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => {
      const secs    = getRecruitPackSecondsLeft();
      const isAlive = isRecruitPackActive();
      setSecondsLeft(secs);
      setActive(isAlive);
      if (!isAlive && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Initial read
    tick();

    if (isRecruitPackActive()) {
      intervalRef.current = setInterval(tick, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // run once on mount; store getters are stable references

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;

  return {
    active,
    secondsLeft,
    hoursLeft:      h,
    minutesLeft:    m,
    secondsDisplay: s,
    label:          active ? formatHMS(secondsLeft) : '00:00:00',
  };
}
