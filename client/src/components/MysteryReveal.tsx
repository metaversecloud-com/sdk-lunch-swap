import { useEffect, useRef, useState } from "react";
import { BagItem, FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";

interface MysteryRevealProps {
  item: BagItem;
  onComplete: () => void;
}

export const MysteryReveal = ({ item, onComplete }: MysteryRevealProps) => {
  const [flipped, setFlipped] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    // Start the flip after a brief pause so the user sees the "?" card
    const flipTimer = setTimeout(() => setFlipped(true), reducedMotion ? 100 : 400);

    return () => clearTimeout(flipTimer);
  }, [reducedMotion]);

  useEffect(() => {
    if (!flipped) return;

    // After the flip animation completes, wait a moment then call onComplete
    completeTimerRef.current = setTimeout(() => onComplete(), reducedMotion ? 500 : 1500);

    return () => {
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [flipped, onComplete, reducedMotion]);

  const foodGroupColor = FOOD_GROUP_COLORS[item.foodGroup];
  const rarityInfo = RARITY_CONFIG[item.rarity];

  return (
    <div
      className="flex flex-col items-center justify-center p-4"
      role="status"
      aria-live="polite"
      aria-label={
        flipped
          ? `Mystery item revealed: ${item.name}, ${rarityInfo.label} ${item.foodGroup}`
          : "Revealing mystery item..."
      }
    >
      <h2 className="text-lg font-bold mb-3 text-center">{flipped ? "You found..." : "Mystery Item!"}</h2>

      <div
        className="relative w-40 h-56"
        style={{
          perspective: reducedMotion ? "none" : "800px",
        }}
      >
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            transformStyle: reducedMotion ? undefined : "preserve-3d",
            transition: reducedMotion ? "none" : "transform 0.8s ease-in-out",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front face: Mystery "?" card */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl border-4 border-dashed"
            style={{
              backfaceVisibility: "hidden",
              backgroundColor: "#2C2C3E",
              borderColor: "#FFD700",
              ...(reducedMotion ? { display: flipped ? "none" : "flex" } : {}),
            }}
            aria-hidden={flipped}
          >
            <span className="text-6xl font-black select-none" style={{ color: "#FFD700" }}>
              ?
            </span>
          </div>

          {/* Back face: Revealed item */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-4 p-3 gap-2"
            style={{
              backfaceVisibility: "hidden",
              transform: reducedMotion ? undefined : "rotateY(180deg)",
              backgroundColor: "#FFFFFF",
              borderColor: rarityInfo.color,
              ...(reducedMotion ? { display: flipped ? "flex" : "none" } : {}),
            }}
            aria-hidden={!flipped}
          >
            {/* Food group color indicator */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: foodGroupColor }}
              aria-hidden="true"
            >
              {item.foodGroup === "drink" && "\u{1F964}"}
              {item.foodGroup === "fruit" && "\u{1F34E}"}
              {item.foodGroup === "veggie" && "\u{1F966}"}
              {item.foodGroup === "main" && "\u{1F35E}"}
              {item.foodGroup === "snack" && "\u{1F36A}"}
            </div>

            <span className="font-bold text-base text-center text-gray-900">{item.name}</span>

            <span
              className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: rarityInfo.color }}
            >
              {rarityInfo.label}
            </span>

            <span className="text-xs font-medium capitalize" style={{ color: foodGroupColor }}>
              {item.foodGroup}
            </span>

            {item.matchesIdealMeal && <span className="text-xs font-bold text-green-600 mt-1">Ideal Meal Match!</span>}
          </div>
        </div>
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="assertive">
        {flipped &&
          `Revealed: ${item.name}, a ${rarityInfo.label} ${item.foodGroup} item${item.matchesIdealMeal ? " that matches your ideal meal!" : "."}`}
      </div>
    </div>
  );
};
