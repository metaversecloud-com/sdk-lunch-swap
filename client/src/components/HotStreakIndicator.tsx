import { useEffect, useState } from "react";

interface HotStreakIndicatorProps {
  streak: number;
  hotStreakActive: boolean;
}

export const HotStreakIndicator = ({ streak, hotStreakActive }: HotStreakIndicatorProps) => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (streak <= 0) return null;

  // Determine number of flame emojis (cap visual at 5)
  const flameCount = Math.min(streak, 5);
  const flames = Array.from({ length: flameCount }, (_, i) => i);

  // Tier 1: 1 match = static flame
  // Tier 2: 2 matches = pulsing flames
  // Tier 3: 3+ (hot streak active) = full HOT STREAK banner
  const isPulsing = streak >= 2;
  const isBanner = streak >= 3 && hotStreakActive;

  if (isBanner) {
    return (
      <div
        className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-center"
        style={{
          background: "linear-gradient(135deg, #FF6B35 0%, #FF2D00 100%)",
          boxShadow: "0 0 16px rgba(255, 45, 0, 0.4)",
          animation: reducedMotion ? "none" : "hotStreakGlow 1.5s ease-in-out infinite alternate",
        }}
        role="status"
        aria-label={`Hot streak! ${streak} ideal meal matches in a row. 3 times XP on next pickup!`}
      >
        <div className="flex items-center gap-1">
          {flames.map((i) => (
            <span
              key={i}
              className="text-xl select-none"
              style={{
                animation: reducedMotion ? "none" : `hotStreakFlame 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                display: "inline-block",
              }}
              aria-hidden="true"
            >
              {"\u{1F525}"}
            </span>
          ))}
        </div>
        <span className="text-sm font-black text-white tracking-wider uppercase">HOT STREAK!</span>
        <span className="text-xs font-bold text-orange-100">3x XP on next pickup!</span>

        <style>{`
          @keyframes hotStreakGlow {
            0% { box-shadow: 0 0 16px rgba(255, 45, 0, 0.4); }
            100% { box-shadow: 0 0 24px rgba(255, 107, 53, 0.7); }
          }
          @keyframes hotStreakFlame {
            0% { transform: scale(1) translateY(0); }
            100% { transform: scale(1.15) translateY(-2px); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes hotStreakGlow {
              0%, 100% { box-shadow: 0 0 16px rgba(255, 45, 0, 0.4); }
            }
            @keyframes hotStreakFlame {
              0%, 100% { transform: none; }
            }
          }
        `}</style>
      </div>
    );
  }

  // Tier 1 & 2: compact flame indicator
  return (
    <div
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full"
      style={{
        backgroundColor: isPulsing ? "#FFF3E0" : "#FFF8F0",
        border: isPulsing ? "2px solid #FF9800" : "2px solid #FFB74D",
      }}
      role="status"
      aria-label={`Ideal meal match streak: ${streak}`}
    >
      {flames.map((i) => (
        <span
          key={i}
          className="text-base select-none"
          style={{
            animation:
              isPulsing && !reducedMotion ? `hotStreakPulse 1s ease-in-out ${i * 0.15}s infinite alternate` : "none",
            display: "inline-block",
          }}
          aria-hidden="true"
        >
          {"\u{1F525}"}
        </span>
      ))}
      <span className="text-xs font-bold text-orange-800 ml-0.5">{streak}x</span>

      {isPulsing && (
        <style>{`
          @keyframes hotStreakPulse {
            0% { transform: scale(1); }
            100% { transform: scale(1.2); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes hotStreakPulse {
              0%, 100% { transform: none; }
            }
          }
        `}</style>
      )}
    </div>
  );
};
