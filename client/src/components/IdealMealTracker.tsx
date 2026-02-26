import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";

export const IdealMealTracker = ({ isPreview }: { isPreview: boolean }) => {
  const { idealMeal } = useContext(GlobalStateContext);
  const items = idealMeal ?? [];
  const collectedCount = items.filter((item) => item.collected).length;
  const totalCount = items.length || 5;
  const allCollected = collectedCount === totalCount && totalCount > 0;
  const progressPercent = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  return (
    <section aria-label="Ideal meal tracker">
      <div className="flex items-center justify-between mb-2">
        <h3>Today's Ideal Meal</h3>
        {!isPreview && (
          <span className="p2 text-muted">
            {collectedCount}/{totalCount}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {!isPreview && (
        <div
          className="w-full h-3 rounded-full bg-gray-200 overflow-hidden mb-3"
          role="progressbar"
          aria-valuenow={collectedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label={`Ideal meal progress: ${collectedCount} of ${totalCount} items collected`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${allCollected ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* 6-slot display */}
      <div
        className={`grid grid-cols-2 gap-2 ${allCollected ? "motion-safe:animate-pulse" : ""}`}
        role="list"
        aria-label="Ideal meal items"
      >
        {items.map((item) => {
          const borderColor = FOOD_GROUP_COLORS[item.foodGroup];
          const rarityConfig = RARITY_CONFIG[item.rarity];

          return (
            <div
              key={item.itemId}
              role="listitem"
              className={`relative grid gap-1 rounded-xl border-2 p-2 text-center transition-all duration-300 ${
                item.collected || isPreview ? "bg-white shadow-md" : "bg-gray-100 opacity-60"
              } ${allCollected ? "motion-safe:shadow-[0_0_12px_rgba(34,197,94,0.5)]" : ""}`}
              style={{ borderColor: item.collected ? borderColor : `${borderColor}80` }}
              aria-label={`${item.name} - ${item.foodGroup}, ${rarityConfig.label}${item.collected ? ", collected" : ", not yet collected"}`}
            >
              {/* Food group color dot */}
              <div
                className={`w-4 h-4 rounded-full mx-auto`}
                style={{ backgroundColor: borderColor }}
                aria-hidden="true"
              />

              {/* Item name */}
              <div className="tooltip truncate">
                <span className="tooltip-content">{item.name}</span>
                <p>{item.name}</p>
              </div>

              {/* Rarity label */}
              <p className="p3 uppercase">{rarityConfig.label}</p>

              {/* Checkmark overlay for collected */}
              {item.collected && (
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
