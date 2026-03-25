import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { Confetti, Divider, MealTracker, PageContainer } from "@/components";
import { NutritionPreview } from "@/components/NutritionPreview";
import { BagFullSwapModal } from "@/components/BagFullSwapModal";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType, PostPickupResponseType, SET_BROWN_BAG, SET_TARGET_MEAL } from "@/context/types";

// utils
import { backendAPI, setErrorMessage } from "@/utils";

// types
import { FoodItemDefinition, FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";

type ItemDetails = {
  foodDef: FoodItemDefinition;
  isMystery: boolean;
  matchesTargetMeal: boolean;
  bagFull: boolean;
};

export const Item = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams, targetMeal, brownBag } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [itemDetails, setItemDetails] = useState<ItemDetails | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [isPickedUp, setIsPickedUp] = useState(false);
  const [pickupXp, setPickupXp] = useState(0);
  const [mealComplete, setMealComplete] = useState(false);
  const [isPickingUp, setIsPickingUp] = useState(false);
  const [isGone, setIsGone] = useState(false);
  const [isNewDay, setIsNewDay] = useState(false);
  const [hasCompletedToday, setHasCompletedToday] = useState(false);
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [keyAssetId, setKeyAssetId] = useState<string | null>(null);

  const droppedAssetId = searchParams.get("assetId") || "";
  const mealItems = targetMeal ?? [];
  const bagItemIds = new Set((brownBag ?? []).map((b) => b.itemId));

  const checkMealComplete = (updatedBag: { itemId: string }[]) => {
    const bagIds = new Set(updatedBag.map((b) => b.itemId));
    return mealItems.length > 0 && mealItems.every((item) => bagIds.has(item.itemId));
  };

  useEffect(() => {
    if (!hasInteractiveParams || !droppedAssetId) return;

    backendAPI
      .get("/item-details", { params: { droppedAssetId } })
      .then(({ data }) => {
        const { brownBag, targetMeal, newDay, completedToday, keyAssetId } = data;
        dispatch!({
          type: SET_BROWN_BAG,
          payload: { brownBag },
        });
        dispatch!({ type: SET_TARGET_MEAL, payload: { targetMeal } });
        setItemDetails(data);
        setIsNewDay(newDay || !targetMeal?.length);
        setHasCompletedToday(completedToday);
        setKeyAssetId(keyAssetId);
      })
      .catch(() => {
        setIsGone(true);
      })
      .finally(() => setIsLoading(false));
  }, [hasInteractiveParams, droppedAssetId]);

  const handlePickup = async () => {
    if (isPickingUp) return;
    setIsPickingUp(true);

    try {
      const { data } = await backendAPI.post("/pickup-item", { droppedAssetId });
      const { brownBag, xp, level, hotStreakActive, pickupStreak, visitorInventory, xpEarned } = data;

      dispatch!({
        type: SET_BROWN_BAG,
        payload: { brownBag, xp, level, hotStreakActive, pickupStreak, visitorInventory },
      });

      setPickupXp(xpEarned || 0);
      setMealComplete(checkMealComplete(brownBag));
      setIsPickedUp(true);
    } catch (error) {
      setIsGone(true);
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsPickingUp(false);
    }
  };

  const handleTeleportToFoodTruck = async () => {
    if (isTeleporting) return;
    setIsTeleporting(true);
    try {
      await backendAPI.post("/teleport-player", { keyAssetId });
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsTeleporting(false);
    }
  };

  const handleButtonClick = () => {
    if (itemDetails?.bagFull) {
      setShowSwapModal(true);
    } else {
      handlePickup();
    }
  };

  const handleSwapComplete = (data: PostPickupResponseType) => {
    setShowSwapModal(false);
    const { brownBag, xp, level, hotStreakActive, pickupStreak, visitorInventory, xpEarned } = data;
    dispatch!({
      type: SET_BROWN_BAG,
      payload: { brownBag, xp, level, hotStreakActive, pickupStreak, visitorInventory },
    });
    setPickupXp(xpEarned || 0);
    setMealComplete(checkMealComplete(brownBag));
    setIsPickedUp(true);
  };

  // --- Render states ---

  const gone = () => {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <span className="text-4xl">&#128542;</span>
        <h3>Already Gone!</h3>
        <p className="p2 text-muted">Someone else picked up this item before you could grab it.</p>
      </div>
    );
  };

  const pickedUp = () => {
    const { foodDef, isMystery } = itemDetails!;
    const { name, image } = foodDef;
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center relative">
        <Confetti />
        <h3>{isMystery ? `Mystery revealed: ${name}!` : `Picked up ${name}!`}</h3>
        {image && <img src={image} alt={name} className="h-24 object-contain" />}
        {pickupXp > 0 && <p className="p2 text-muted">+{pickupXp} XP</p>}
        {mealComplete ? (
          <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200">
            <p className="p2 font-semibold text-green-700">
              Your meal is complete! Head back to the food truck to submit it.
            </p>
          </div>
        ) : (
          <>
            <p className="p2 text-muted pb-4">Keep searching for your items to complete your meal!</p>
            <MealTracker />
          </>
        )}
      </div>
    );
  };

  const mystery = () => {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <span className="text-4xl">⁇</span>
        <h3>Mystery Item!</h3>
        <p className="p2 text-muted">Pick this item to reveal what it is.</p>
      </div>
    );
  };

  const available = () => {
    const { foodDef, matchesTargetMeal, bagFull, isMystery } = itemDetails!;
    const { name, image, foodGroup, rarity, nutrition, funFact } = foodDef;
    const alreadyInBag = bagItemIds.has(foodDef.itemId);
    return (
      <div className="grid gap-6">
        <div className="flex flex-col gap-4">
          {isMystery ? (
            mystery()
          ) : (
            <>
              {/* Item image */}
              <div className="flex justify-center py-4">
                {image ? (
                  <img src={image} alt={name} className="h-28 object-contain" />
                ) : (
                  <div className="flex items-center justify-center h-28 w-28 rounded-2xl bg-gray-200 text-4xl text-gray-400">
                    ?
                  </div>
                )}
              </div>

              {/* Name */}
              <h3 className="text-center">{name}</h3>

              {/* Chips */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {
                  <span
                    className="p3 uppercase px-3 py-1 rounded-full text-white font-bold"
                    style={{ backgroundColor: FOOD_GROUP_COLORS[foodGroup] }}
                  >
                    {foodGroup}
                  </span>
                }
                <span
                  className="p3 uppercase px-3 py-1 rounded-full text-white font-bold"
                  style={{ backgroundColor: RARITY_CONFIG[rarity].color }}
                >
                  {RARITY_CONFIG[rarity].label}
                </span>
              </div>

              {/* Target meal match */}
              {matchesTargetMeal && (
                <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200">
                  <span className="text-green-500">&#9733;</span>
                  <span className="p2 font-semibold text-green-700">Matches your meal!</span>
                </div>
              )}

              {/* Nutrition */}
              {nutrition && (
                <div className="grid gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <p>Nutrition</p>
                  <NutritionPreview nutrition={nutrition} name={name} />
                  <div className="grid grid-cols-2 gap-4">
                    <p className="p3 text-muted">{nutrition.calories} calories</p>
                    {nutrition.vitamins.length > 0 && (
                      <p className="p3 text-muted text-right">Vitamins: {nutrition.vitamins.join(", ")}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Fun fact */}
              {funFact && (
                <div className="grid gap-2 p-3 rounded-xl bg-violet-50 border border-violet-200">
                  <div className="text-violet-700">Fun Fact</div>
                  <p className="p2">{funFact}</p>
                </div>
              )}
            </>
          )}

          {isNewDay ? (
            <div className="p-4 rounded-xl bg-gray-100 border border-gray-300 text-center">
              <span className="text-gray-600 italic">
                You haven't started a meal yet today. Find the food truck to get started!
              </span>
            </div>
          ) : hasCompletedToday ? (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
              <span className="text-sm text-green-700 italic">
                You've already completed a meal today. <br />
                Come back tomorrow to play again!
              </span>
            </div>
          ) : (
            <>
              <button
                className={`btn flex-shrink-0
            focus:outline-none focus:ring-2 focus:ring-offset-2
              ${
                alreadyInBag
                  ? "bg-gray-400 cursor-not-allowed focus:ring-gray-300"
                  : isPickingUp
                    ? "bg-gray-400 cursor-not-allowed"
                    : "btn-success bg-green-500 hover:bg-green-600 active:bg-green-700 focus:ring-green-400"
              }`}
                onClick={handleButtonClick}
                disabled={isPickingUp || alreadyInBag}
                aria-label={
                  alreadyInBag
                    ? `${name} already in your bag`
                    : isPickingUp
                      ? "Picking up..."
                      : isMystery
                        ? "Reveal and pick up this mystery item"
                        : `Pick up ${name}`
                }
              >
                {alreadyInBag
                  ? "Got it!"
                  : isPickingUp
                    ? "Picking up..."
                    : bagFull
                      ? "Swap for this item"
                      : isMystery
                        ? "Pick Up & Reveal"
                        : "Pick Up"}
              </button>
              {alreadyInBag && <p className="p3 text-center text-muted">You already have this item in your bag.</p>}
              {bagFull && !isPickingUp && !alreadyInBag && (
                <p className="p3 text-center text-muted">Your bag is full. Picking up will let you swap an item out.</p>
              )}
            </>
          )}
        </div>

        {!isNewDay && !hasCompletedToday && (
          <>
            <Divider />

            <MealTracker />
          </>
        )}

        {showSwapModal && (
          <BagFullSwapModal
            pickupDroppedAssetId={droppedAssetId}
            onComplete={handleSwapComplete}
            onClose={() => setShowSwapModal(false)}
          />
        )}
      </div>
    );
  };

  return (
    <PageContainer isLoading={isLoading}>
      {!itemDetails || isGone ? gone() : isPickedUp ? pickedUp() : available()}
      <button
        className="btn btn-outline"
        onClick={handleTeleportToFoodTruck}
        disabled={isTeleporting}
        aria-label="Return to Food Truck"
        style={{ marginTop: "1rem", width: "100%" }}
      >
        {isTeleporting ? "Returning..." : "Return to Food Truck"}
      </button>
    </PageContainer>
  );
};

export default Item;
