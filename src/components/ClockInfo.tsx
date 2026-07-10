import React, { useRef, useEffect } from 'react';
import type { Move } from 'chess.js';
import type { ClockSettings } from '../hooks/useSettings';

export const getClockState = (
  t: number,
  timeMap: Record<number, number>,
  history: Move[],
  initial: number,
  increment: number,
  bInitial?: number,
  bIncrement?: number
) => {
  let wTime = initial;
  let bTime = bInitial !== undefined ? bInitial : initial;
  const wInc = increment;
  const bInc = bIncrement !== undefined ? bIncrement : increment;

  if (timeMap[0] === undefined || t < timeMap[0]) {
    return { wTime, bTime, active: null };
  }

  let lastTime = timeMap[0];
  let i = 1;

  while (timeMap[i] !== undefined && timeMap[i] <= t) {
    const dt = timeMap[i] - lastTime;
    if (i % 2 === 1) {
      wTime = wTime - dt + wInc;
    } else {
      bTime = bTime - dt + bInc;
    }
    lastTime = timeMap[i];
    i++;
  }

  const dt = t - lastTime;
  let isGameOver = false;
  if (i - 1 === history.length && history.length > 0) {
    const lastMove = history[history.length - 1].san;
    if (lastMove.includes('#')) isGameOver = true;
  }

  if (!isGameOver && dt > 0) {
    if (i % 2 === 1) {
      wTime -= dt;
    } else {
      bTime -= dt;
    }
  }

  return { wTime, bTime, active: isGameOver ? null : i % 2 === 1 ? 'white' : 'black' };
};

export const formatClock = (seconds: number) => {
  const maxZero = Math.max(0, seconds);
  const m = Math.floor(maxZero / 60);
  const s = Math.floor(maxZero % 60);
  const ms = Math.floor((maxZero % 1) * 10);
  if (m > 0) {
    return `${m}:${s.toString().padStart(2, '0')}`;
  } else {
    return `${s}.${ms}`;
  }
};

interface ClockInfoProps {
  player: any;
  timeMap: Record<number, number>;
  history: Move[];
  settings: ClockSettings;
  color: 'white' | 'black';
}

export const ClockInfo: React.FC<ClockInfoProps> = ({ player, timeMap, history, settings, color }) => {
  const clockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settings.enabled || !player) {
      if (clockRef.current) {
        clockRef.current.innerText = formatClock(settings.initial);
        clockRef.current.className =
          'font-mono text-lg md:text-xl font-bold px-3 py-0.5 leading-none rounded shadow-sm flex items-center justify-center min-w-[70px] lg:min-w-[90px] transition-colors border bg-slate-900/80 text-slate-400 border-slate-700/50';
      }
      return;
    }

    let animationFrameId: number;
    let isFetching = false;
    let isUnmounted = false;

    const tick = () => {
      if (isUnmounted) return;

      if (!isFetching) {
        isFetching = true;
        Promise.resolve(player.getCurrentTime())
          .then((t) => {
            if (isUnmounted) return;
            const { wTime, bTime, active } = getClockState(
              t,
              timeMap,
              history,
              settings.initial,
              settings.increment,
              settings.useDifferentForBlack ? settings.bInitial : undefined,
              settings.useDifferentForBlack ? settings.bIncrement : undefined
            );

            const time = color === 'white' ? wTime : bTime;
            const isActive = active === color;

            if (clockRef.current) {
              clockRef.current.innerText = formatClock(time);

              const baseClasses =
                'font-mono text-lg md:text-xl font-bold px-3 py-0.5 leading-none rounded shadow-sm flex items-center justify-center min-w-[70px] lg:min-w-[90px] transition-colors border';
              const activeClasses =
                'bg-amber-500/20 text-amber-400 border-amber-500 ring-1 ring-amber-500 shadow-amber-900/20';
              const inactiveClasses = 'bg-slate-900/80 text-slate-400 border-slate-700/50';

              clockRef.current.className = `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
            }
            isFetching = false;
          })
          .catch((e) => {
            console.debug('Clock sync error:', e);
            isFetching = false;
          });
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      isUnmounted = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [player, timeMap, history, settings, color]);

  if (!settings.enabled) return null;

  return (
    <div
      ref={clockRef}
      className="font-mono text-lg md:text-xl font-bold px-3 py-0.5 leading-none rounded shadow-sm flex items-center justify-center min-w-[70px] lg:min-w-[90px] transition-colors border bg-slate-900/80 text-slate-400 border-slate-700/50"
    >
      {formatClock(settings.initial)}
    </div>
  );
};
