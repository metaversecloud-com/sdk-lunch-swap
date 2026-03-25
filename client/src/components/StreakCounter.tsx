import { useEffect, useState } from "react";

interface StreakCounterProps {
  currentStreak: number;
  longestStreak?: number;
  isNewStreakRecord?: boolean;
}

export const StreakCounter = ({ currentStreak, longestStreak, isNewStreakRecord }: StreakCounterProps) => {
  const [displayCount, setDisplayCount] = useState(0);

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
      className="grid items-center text-center"
      role="status"
      aria-label={`Current streak: ${currentStreak} week${currentStreak !== 1 ? "s" : ""}${isNewStreakRecord ? ", new record!" : ""}`}
    >
      <div className="flex gap-2 m-auto items-end justify-center">
        {/* Flame icon via CSS gradient */}
        <h3 className="motion-safe:animate-bounce" role="img" aria-hidden="true" style={{ animationDuration: "1.5s" }}>
          &#128293;
        </h3>
        <h2 className="">{displayCount}</h2>
        <p className="text-xs text-gray-400">week streak</p>
      </div>

      {isNewStreakRecord && (
        <span className="m-auto inline-flex items-center gap-1 px-3 py-1 mt-4 rounded-full bg-orange-100 text-orange-700 text-xs border border-orange-200 motion-safe:animate-pulse">
          <span aria-hidden="true">&#127942;</span> New Record!
        </span>
      )}

      {longestStreak !== undefined && !isNewStreakRecord && longestStreak > 0 && (
        <p className="pt-3 text-xs text-gray-400">
          Best: {longestStreak} week{longestStreak !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
};
