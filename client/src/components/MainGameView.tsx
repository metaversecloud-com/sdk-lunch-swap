import { useContext, useEffect, useState } from "react";

// components
import { BonusWheel, BrownBag, Divider, HotStreakIndicator, MealTracker, NearbyItems, PageFooter } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { SET_BROWN_BAG, SET_COMPLETED, SET_DAILY_BUFF, ErrorType, PostPickupResponseType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage } from "@/utils";
import { getLevelTitle } from "@shared/data/xpConfig";
import { WHEEL_BUFFS } from "@shared/data/wheelBuffs";
import InstructionsModal from "./InstructionsModal";

const BASE_BAG_CAPACITY = 8;
const BIG_BAG_BONUS = 2;

export const MainGameView = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { brownBag, targetMeal, hotStreakActive, pickupStreak, xp, level, dailyBuff, isFirstPlay } =
    useContext(GlobalStateContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Auto-open instructions on first play
  useEffect(() => {
    if (isFirstPlay) setShowInstructions(true);
  }, [isFirstPlay]);

  const activeBuffName = dailyBuff ? WHEEL_BUFFS.find((b) => b.id === dailyBuff)?.name ?? dailyBuff : null;

  const bagCapacity = BASE_BAG_CAPACITY + (dailyBuff === "big-bag" ? BIG_BAG_BONUS : 0);
  const bagItems = brownBag ?? [];
  const mealItems = targetMeal ?? [];
  const bagFull = bagItems.length >= bagCapacity;
  const bagItemIds = new Set(bagItems.map((b) => b.itemId));
  const allCollected = mealItems.length > 0 && mealItems.every((item) => bagItemIds.has(item.itemId));

  const showTemporaryMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleDrop = async (itemId: string) => {
    // Optimistically remove item from UI
    const previousBag = brownBag;
    const optimisticBag = bagItems.filter((item) => item.itemId !== itemId);
    dispatch!({ type: SET_BROWN_BAG, payload: { brownBag: optimisticBag } });

    try {
      const response = await backendAPI.post("/drop-item", { itemId });
      const { brownBag: updatedBag, droppedItem, xpEarned, xp: newXp, level: newLevel } = response.data;

      dispatch!({ type: SET_BROWN_BAG, payload: { brownBag: updatedBag, xp: newXp, level: newLevel } });

      showTemporaryMessage(`Dropped ${droppedItem?.name ?? "item"}${xpEarned ? ` (+${xpEarned} XP)` : ""}`);
    } catch (error) {
      // Revert on failure
      dispatch!({ type: SET_BROWN_BAG, payload: { brownBag: previousBag } });
      setErrorMessage(dispatch, error as ErrorType);
    }
  };

  const handleDropAllNonMatches = async () => {
    // Optimistically remove non-matching items from UI
    const previousBag = brownBag;
    const optimisticBag = bagItems.filter((item) => item.matchesTargetMeal);
    dispatch!({ type: SET_BROWN_BAG, payload: { brownBag: optimisticBag } });

    try {
      const response = await backendAPI.post("/drop-all-non-matches");
      const { brownBag: updatedBag, droppedCount, xpEarned, xp: newXp, level: newLevel } = response.data;

      dispatch!({ type: SET_BROWN_BAG, payload: { brownBag: updatedBag, xp: newXp, level: newLevel } });

      if (droppedCount > 0) {
        showTemporaryMessage(
          `Dropped ${droppedCount} non-matching item${droppedCount > 1 ? "s" : ""}${xpEarned ? ` (+${xpEarned} XP)` : ""}`,
        );
      } else {
        showTemporaryMessage("No non-matching items to drop");
      }
    } catch (error) {
      // Revert on failure
      dispatch!({ type: SET_BROWN_BAG, payload: { brownBag: previousBag } });
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
      xpEarned,
      xp: newXp,
      level: newLevel,
      hotStreakActive,
      pickupStreak,
      visitorInventory,
    } = data;

    dispatch!({
      type: SET_BROWN_BAG,
      payload: {
        brownBag: updatedBag,
        xp: newXp,
        level: newLevel,
        hotStreakActive,
        pickupStreak,
        visitorInventory,
      },
    });

    let message = `Picked up ${pickedUpItem?.name ?? "item"}`;
    if (xpEarned) message += ` (+${xpEarned} XP)`;

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
        leaderboard,
        isNewStreakRecord,
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
          leaderboard,
          isNewStreakRecord,
        },
      });
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Status bar */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-green-200 to-lime-100 border border-gray-300 shadow-sm p-3">
        <div className="flex grid-cols-2 items-center p2">
          <span className="flex items-center justify-center  mr-2 rounded-full border border-gray-900 w-7 h-7">
            {level}
          </span>
          {getLevelTitle(level ?? 1)}
        </div>
        <span className="p2">{xp ?? 0} XP</span>
      </div>

      {/* Daily buff / spin to win + Instructions */}
      <div className="flex items-center justify-between p2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 200 200" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
            {WHEEL_BUFFS.map((_, i) => {
              const segAngle = 360 / WHEEL_BUFFS.length;
              const startRad = (i * segAngle * Math.PI) / 180;
              const endRad = ((i + 1) * segAngle * Math.PI) / 180;
              const x1 = 100 + 100 * Math.sin(startRad);
              const y1 = 100 - 100 * Math.cos(startRad);
              const x2 = 100 + 100 * Math.sin(endRad);
              const y2 = 100 - 100 * Math.cos(endRad);
              const large = segAngle > 180 ? 1 : 0;
              return (
                <path
                  key={i}
                  d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${large} 1 ${x2} ${y2} Z`}
                  fill={["#FF6B6B", "#ffa94d", "#45B7D1", "#4ECDC4", "#cf8df7"][i]}
                  stroke="#fff"
                  strokeWidth="4"
                />
              );
            })}
            <circle cx="100" cy="100" r="12" fill="#fff" />
          </svg>
          {activeBuffName ? (
            <span className="text-muted">{activeBuffName}</span>
          ) : (
            <button className="btn-text" onClick={() => setShowWheelModal(true)} aria-label="Open bonus wheel">
              Spin to win a bonus!
            </button>
          )}
        </div>
        <button onClick={() => setShowInstructions(true)} aria-label="Show game instructions">
          <img src="https://sdk-style.s3.amazonaws.com/icons/info.svg" alt="Instructions" />
        </button>
      </div>

      {/* Hot streak indicator */}
      {hotStreakActive && pickupStreak && (
        <HotStreakIndicator hotStreakActive={hotStreakActive} streak={pickupStreak} />
      )}

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

      <MealTracker />

      <Divider />

      <BrownBag onDrop={handleDrop} onDropAllNonMatches={handleDropAllNonMatches} />

      <Divider />

      <NearbyItems onPickup={handlePickup} afterSwap={handleAfterPickup} bagFull={bagFull} />

      {/* Submit button — shown when all meal items are collected */}
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
            {isSubmitting ? "Submitting..." : "Submit Meal"}
          </button>
        </PageFooter>
      )}

      {/* Bonus wheel modal */}
      {showWheelModal && (
        <BonusWheel
          closeModal={() => setShowWheelModal(false)}
          onResult={({ buff, brownBag: updatedBag }) => {
            dispatch!({ type: SET_DAILY_BUFF, payload: { dailyBuff: buff.id } });
            if (updatedBag) {
              dispatch!({ type: SET_BROWN_BAG, payload: { brownBag: updatedBag } });
            }
            setShowWheelModal(false);
          }}
        />
      )}

      {/* Instructions modal */}
      {showInstructions && <InstructionsModal handleToggleShowInstructions={() => setShowInstructions(false)} />}
    </div>
  );
};
