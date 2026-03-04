import { useState } from "react";
import { NearbyItem } from "@shared/types/NearbyItem";
import { FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";
import { BagFullSwapModal } from "@/components/BagFullSwapModal";
import { PostPickupResponseType } from "@/context/types";

interface NearbyItemCardProps {
  item: NearbyItem;
  bagFull?: boolean;
  onPickup: (droppedAssetId: string) => void;
  afterSwap?: (data: PostPickupResponseType) => void;
}

const formatDistance = (distance: number): string => {
  if (distance < 50) return "Right here!";
  if (distance < 100) return "Very close";
  if (distance < 150) return "Nearby";
  return "A bit far";
};

export const NearbyItemCard = ({ item, onPickup, afterSwap, bagFull = false }: NearbyItemCardProps) => {
  const [showSwapModal, setShowSwapModal] = useState(false);

  const borderColor = FOOD_GROUP_COLORS[item.foodGroup];
  const rarityConfig = RARITY_CONFIG[item.rarity];
  const displayName = item.isMystery ? "???" : item.name;

  const handleClick = () => {
    if (bagFull) {
      setShowSwapModal(true);
    } else {
      onPickup(item.droppedAssetId);
    }
  };

  const handleSwapComplete = (data: PostPickupResponseType) => {
    setShowSwapModal(false);
    afterSwap?.(data);
  };

  return (
    <>
      <div
        className={`relative flex items-center gap-3 p-3 rounded-xl border-2 bg-white transition-all duration-200
          ${item.matchesIdealMeal && !item.isMystery ? "shadow-md ring-2 ring-yellow-400" : ""}
          ${item.isComboMatch && !item.isMystery ? "shadow-md ring-2 ring-purple-400" : ""}
          ${!item.matchesIdealMeal && !item.isComboMatch ? "shadow-sm" : ""}
          hover:shadow-md`}
        style={{ borderColor: item.isMystery ? "#6B7280" : borderColor }}
        aria-label={`${displayName}${item.matchesIdealMeal && !item.isMystery ? ", matches your ideal meal" : ""}${item.isComboMatch && !item.isMystery ? ", super combo pair" : ""}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {item.matchesIdealMeal && !item.isMystery && (
              <span className="text-yellow-500 text-sm" aria-label="Matches ideal meal" role="img">
                &#9733;
              </span>
            )}
            {item.isComboMatch && !item.isMystery && (
              <div className="tooltip">
                <span className="tooltip-content p3">
                  Combo match with {item.comboMatchPartner ?? "bag item"}
                </span>
                <span className="text-purple-500 text-sm" aria-label="Super combo pair" role="img">
                  &#9733;
                </span>
              </div>
            )}
            <div className="tooltip truncate">
              <span className="tooltip-content p3">{displayName}</span>
              <span className={`p2 ${item.isMystery ? "italic" : ""}`}>{displayName}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {!item.isMystery && (
              <span
                className="p3 uppercase px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: borderColor }}
              >
                {item.foodGroup}
              </span>
            )}
            <span
              className="p3 uppercase px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: item.isMystery ? "#6B7280" : rarityConfig.color }}
            >
              {item.isMystery ? "Mystery" : rarityConfig.label}
            </span>
            <span className="p3">{formatDistance(item.distance)}</span>
          </div>

          {item.lastDroppedByName && !item.isMystery && (
            <div className="tooltip truncate mt-1">
              <span className="tooltip-content p3">Dropped by {item.lastDroppedByName}</span>
              <p className="p3 text-gray-400">Dropped by {item.lastDroppedByName}</p>
            </div>
          )}
        </div>

        <button
          className="btn btn-success flex-shrink-0 p3 transition-colors max-w-[44px]
            focus:outline-none focus:ring-2 focus:ring-offset-2
            bg-green-500 hover:bg-green-600 active:bg-green-700 focus:ring-green-400"
          onClick={handleClick}
          aria-label={`Pick up ${displayName}`}
        >
          {item.isMystery ? "?" : "Grab it!"}
        </button>
      </div>

      {showSwapModal && (
        <BagFullSwapModal
          pickupDroppedAssetId={item.droppedAssetId}
          onComplete={handleSwapComplete}
          onClose={() => setShowSwapModal(false)}
        />
      )}
    </>
  );
};
