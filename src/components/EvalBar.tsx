import React from 'react';
import type { EngineScore } from '../engine/StockfishManager';

interface EvalBarProps {
  score: EngineScore | null;
}

export const EvalBar: React.FC<EvalBarProps> = ({ score }) => {
  let whitePercentage = 50;
  let text = '0.00';
  let isWhiteAdvantage = true;

  if (score) {
    if (score.type === 'mate') {
      whitePercentage = score.value > 0 ? 100 : 0;
      text = `M${Math.abs(score.value)}`;
      isWhiteAdvantage = score.value > 0;
    } else {
      // Convert cp to win probability percentage for smooth bar
      // using a common formula: 50 + 50 * (2 / PI) * atan(cp / 290)
      whitePercentage = 50 + 50 * (2 / Math.PI) * Math.atan(score.value / 290);
      const cpVal = score.value / 100;
      text = Math.abs(cpVal).toFixed(2);
      isWhiteAdvantage = score.value >= 0;
    }
  }

  // If orientation is black, flip the bar?
  // Standard chess eval bars usually keep White at bottom regardless of orientation,
  // but some like to flip. We'll stick to White at bottom.

  return (
    <div className="relative w-4 sm:w-6 md:w-8 h-full bg-slate-800 rounded overflow-hidden flex flex-col border border-slate-700/50 shadow-inner">
      {/* Black section (top) */}
      <div 
        className="w-full bg-[#403D39] transition-all duration-300 ease-in-out"
        style={{ height: `${100 - whitePercentage}%` }}
      />
      {/* White section (bottom) */}
      <div 
        className="w-full bg-[#EAE6D7] transition-all duration-300 ease-in-out"
        style={{ height: `${whitePercentage}%` }}
      />
      
      {/* Text Overlay */}
      {score && (
        <div 
          className={`absolute left-0 right-0 text-[10px] sm:text-xs font-bold text-center w-full z-10 transition-all ${
            isWhiteAdvantage ? 'bottom-1 text-[#403D39]' : 'top-1 text-[#EAE6D7]'
          }`}
        >
          {text}
        </div>
      )}
    </div>
  );
};
