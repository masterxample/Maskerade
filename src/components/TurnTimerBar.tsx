import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TurnTimerBarProps {
  turnDeadline: number | null | undefined;
  totalSeconds?: number;
  label?: string;
}

export const TurnTimerBar: React.FC<TurnTimerBarProps> = ({
  turnDeadline,
  totalSeconds = 30,
  label = 'Zeit verbleibend'
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!turnDeadline) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);

    return () => clearInterval(interval);
  }, [turnDeadline]);

  if (timeLeft === null || timeLeft <= 0) return null;

  const percentage = Math.min(100, Math.max(0, (timeLeft / totalSeconds) * 100));
  const isCritical = timeLeft <= 7;

  return (
    <div className="w-full bg-[#141416] border border-[#c5a05933] rounded-xl p-2.5 space-y-1.5 shadow-md">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-zinc-300">
          {isCritical ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-bounce" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-[#c5a059] animate-pulse" />
          )}
          <span className="font-semibold">{label}</span>
        </div>
        <span
          className={`font-bold px-2 py-0.5 rounded text-xs ${
            isCritical
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
              : 'bg-[#c5a05922] text-[#c5a059] border border-[#c5a05944]'
          }`}
        >
          {timeLeft}s
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isCritical ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-gradient-to-r from-[#917232] to-[#c5a059]'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
