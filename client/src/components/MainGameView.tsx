import { useContext, useState } from "react";

// components
import { BrownBag, HotStreakIndicator, IdealMealTracker, NearbyItems, PageFooter } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { SET_BROWN_BAG, SET_COMPLETED, ErrorType, PostPickupResponseType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage } from "@/utils";

const BASE_BAG_CAPACITY = 8;
const BIG_BAG_BONUS = 2;

export const MainGameView = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { brownBag, idealMeal, hotStreakActive, idealPickupStreak, xp, level, dailyBuff } =
    useContext(GlobalStateContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const bagCapacity = BASE_BAG_CAPACITY + (dailyBuff === "big-bag" ? BIG_BAG_BONUS : 0);
  const bagItems = brownBag ?? [];
  const mealItems = idealMeal ?? [];
  const bagFull = bagItems.length >= bagCapacity;
  const bagItemIds = new Set(bagItems.map((b) => b.itemId));
  const allCollected = mealItems.length > 0 && mealItems.every((item) => bagItemIds.has(item.itemId));

  const showTemporaryMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleDrop = async (itemId: string) => {
    try {
      const response = await backendAPI.post("/drop-item", { itemId });
      const { brownBag: updatedBag, droppedItem, xpEarned, xp: newXp, level: newLevel } = response.data;

      dispatch!({ type: SET_BROWN_BAG, payload: { brownBag: updatedBag, xp: newXp, level: newLevel } });

      showTemporaryMessage(`Dropped ${droppedItem?.name ?? "item"}${xpEarned ? ` (+${xpEarned} XP)` : ""}`);
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    }
  };

  const handlePickup = async (droppedAssetId: string) => {
    try {
      const response = await backendAPI.post("/pickup-item", { droppedAssetId });
      handleAfterPickup(response.data);
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    }
  };

  const handleAfterPickup = async (data: PostPickupResponseType) => {
    const {
      brownBag: updatedBag,
      pickedUpItem,
      matchesIdealMeal,
      xpEarned,
      xp: newXp,
      level: newLevel,
      hotStreakActive,
      idealPickupStreak,
      funFact,
      wasMystery,
      visitorInventory,
    } = data;

    dispatch!({
      type: SET_BROWN_BAG,
      payload: {
        brownBag: updatedBag,
        xp: newXp,
        level: newLevel,
        hotStreakActive,
        idealPickupStreak,
        visitorInventory,
      },
    });

    let message = `Picked up ${pickedUpItem?.name ?? "item"}`;
    if (wasMystery) message = `Mystery revealed: ${pickedUpItem?.name ?? "item"}!`;
    if (matchesIdealMeal) message += " - Ideal meal match!";
    if (xpEarned) message += ` (+${xpEarned} XP)`;
    if (funFact) message += ` | ${funFact}`;

    showTemporaryMessage(message);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await backendAPI.post("/submit-meal");
      const {
        nutritionScore,
        nutritionBreakdown,
        superCombosFound,
        newTotalXp,
        newLevel,
        currentStreak,
        longestStreak,
        visitorInventory: updatedInventory,
      } = response.data;

      dispatch!({
        type: SET_COMPLETED,
        payload: {
          nutritionScore,
          nutritionBreakdown,
          superCombosFound,
          xp: newTotalXp,
          level: newLevel,
          currentStreak,
          longestStreak,
          visitorInventory: updatedInventory,
        },
      });
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Status bar */}
      <div className="flex items-center justify-between text-muted p2">
        <span>Level {level ?? 1}</span>
        {hotStreakActive && idealPickupStreak && (
          <HotStreakIndicator hotStreakActive={hotStreakActive} streak={idealPickupStreak} />
        )}
        <span>{xp ?? 0} XP</span>
      </div>

      {/* Action message toast */}
      {actionMessage && (
        <div
          className="px-4 py-2 rounded-lg bg-gray-800 text-white text-xs text-center motion-safe:animate-bounce"
          role="status"
          aria-live="polite"
        >
          {actionMessage}
        </div>
      )}

      {/* Ideal meal tracker */}
      <IdealMealTracker isPreview={false} />

      {/* Brown bag */}
      <BrownBag onDrop={handleDrop} />

      {/* Nearby items */}
      <NearbyItems onPickup={handlePickup} afterSwap={handleAfterPickup} bagFull={bagFull} />

      {/* Submit button — shown when all ideal meal items are collected */}
      {allCollected && (
        <PageFooter>
          <button
            className={`w-full py-4 px-6 rounded-2xl text-white shadow-xl 
              focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]
              ${
                isSubmitting
                  ? "bg-gray-400 cursor-not-allowed focus:ring-gray-300"
                  : "bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 active:from-yellow-600 active:via-orange-700 active:to-red-700 focus:ring-orange-400 motion-safe:shadow-[0_0_20px_rgba(249,115,22,0.5)]"
              }`}
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-label={isSubmitting ? "Submitting your meal..." : "Submit your completed meal"}
          >
            {isSubmitting ? "Submitting..." : "Submit Meal!"}
          </button>
        </PageFooter>
      )}
    </div>
  );
};
