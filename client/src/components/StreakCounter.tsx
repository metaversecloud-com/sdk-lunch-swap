import { useEffect, useState } from "react";

interface StreakCounterProps {
  currentStreak: number;
  longestStreak?: number;
}

export const StreakCounter = ({ currentStreak, longestStreak }: StreakCounterProps) => {
  const [displayCount, setDisplayCount] = useState(0);
  const isNewRecord = longestStreak !== undefined && currentStreak > longestStreak;

  // Animate the count up on mount
  useEffect(() => {
    if (currentStreak <= 0) {
      setDisplayCount(0);
      return;
    }

    let frame: number;
    const duration = 800; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(eased * currentStreak));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [currentStreak]);

  return (
    <div
      className="flex flex-col items-center gap-2"
      role="status"
      aria-label={`Current streak: ${currentStreak} day${currentStreak !== 1 ? "s" : ""}${isNewRecord ? ", new record!" : ""}`}
    >
      <div className="flex items-center gap-2">
        {/* Flame icon via CSS gradient */}
        <span
          className="text-3xl motion-safe:animate-bounce"
          role="img"
          aria-hidden="true"
          style={{ animationDuration: "1.5s" }}
        >
          &#128293;
        </span>
        <span className="text-4xl font-extrabold text-gray-800 tabular-nums">{displayCount}</span>
      </div>
      <p className="text-sm font-medium text-gray-500">day streak</p>

      {isNewRecord && (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 motion-safe:animate-pulse">
          <span aria-hidden="true">&#127942;</span> New Record!
        </span>
      )}

      {longestStreak !== undefined && !isNewRecord && longestStreak > 0 && (
        <p className="text-xs text-gray-400">
          Best: {longestStreak} day{longestStreak !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
};
