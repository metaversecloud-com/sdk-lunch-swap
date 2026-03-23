import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";

export const MealTracker = () => {
  const { targetMeal, brownBag } = useContext(GlobalStateContext);
  const items = targetMeal ?? [];
  const bagItemIds = new Set((brownBag ?? []).map((b) => b.itemId));
  const isCollected = (itemId: string) => bagItemIds.has(itemId);
  const collectedCount = items.filter((item) => isCollected(item.itemId)).length;
  const totalCount = items.length || 5;
  const allCollected = collectedCount === totalCount && totalCount > 0;
  const progressPercent = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  return (
    <section aria-label="Meal tracker">
      <div className="flex items-center justify-between mb-2">
        <h3>Today's Perfect Lunch</h3>
        <span className="p2 text-muted">
          {collectedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-3 rounded-full bg-gray-200 overflow-hidden mb-3"
        role="progressbar"
        aria-valuenow={collectedCount}
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-label={`Target meal progress: ${collectedCount} of ${totalCount} items collected`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${allCollected ? "bg-green-500" : "bg-blue-500"}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 6-slot display */}
      <div
        className={`grid grid-cols-3 gap-2 ${allCollected ? "motion-safe:animate-pulse" : ""}`}
        role="list"
        aria-label="Target meal items"
      >
        {items.map((item) => {
          const borderColor = FOOD_GROUP_COLORS[item.foodGroup];
          const rarityConfig = RARITY_CONFIG[item.rarity];

          return (
            <div
              key={item.itemId}
              role="listitem"
              className={`relative grid gap-1 rounded-xl border-2 p-2 text-center transition-all duration-300 overflow-hidden ${
                isCollected(item.itemId) ? "bg-white shadow-md" : "bg-gray-100 opacity-60"
              } ${allCollected ? "motion-safe:shadow-[0_0_12px_rgba(34,197,94,0.5)]" : ""}`}
              style={{ borderColor: isCollected(item.itemId) ? borderColor : `${borderColor}80` }}
              aria-label={`${item.name} - ${item.foodGroup}, ${rarityConfig.label}${isCollected(item.itemId) ? ", collected" : ", not yet collected"}`}
            >
              {/* Item image */}
              <img src={item.image} alt={item.name} className="h-10 mx-auto object-contain" />

              {/* Item name */}
              <div className="tooltip min-w-0">
                <span className="tooltip-content p3">{item.name}</span>
                <p className="p2 truncate">{item.name}</p>
              </div>

              {/* Rarity label */}
              {/* <p className="p3 uppercase">{rarityConfig.label}</p> */}

              {/* Checkmark overlay for collected */}
              {isCollected(item.itemId) && (
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
