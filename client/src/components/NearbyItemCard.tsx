import { NearbyItem } from "@shared/types/NearbyItem";
import { FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";

interface NearbyItemCardProps {
  item: NearbyItem;
  onPickup: (droppedAssetId: string) => void;
  disabled?: boolean;
}

const formatDistance = (distance: number): string => {
  if (distance < 50) return "Right here!";
  if (distance < 100) return "Very close";
  if (distance < 150) return "Nearby";
  return "A bit far";
};

export const NearbyItemCard = ({ item, onPickup, disabled = false }: NearbyItemCardProps) => {
  const borderColor = FOOD_GROUP_COLORS[item.foodGroup];
  const rarityConfig = RARITY_CONFIG[item.rarity];
  const displayName = item.isMystery ? "???" : item.name;

  return (
    <div
      className={`relative flex items-center gap-3 p-3 rounded-xl border-2 bg-white transition-all duration-200
        ${item.matchesIdealMeal && !item.isMystery ? "shadow-md ring-2 ring-yellow-400" : "shadow-sm"}
        ${disabled ? "opacity-60" : "hover:shadow-md"}`}
      style={{ borderColor: item.isMystery ? "#6B7280" : borderColor }}
      aria-label={`${displayName}${item.matchesIdealMeal && !item.isMystery ? ", matches your ideal meal" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          {item.matchesIdealMeal && !item.isMystery && (
            <span className="text-yellow-500 text-sm" aria-label="Matches ideal meal" role="img">
              &#9733;
            </span>
          )}
          <div className="tooltip truncate">
            <span className="tooltip-content">{displayName}</span>
            <span className={`p2 ${item.isMystery ? "italic" : ""}`}>{displayName}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {!item.isMystery && (
            <span className="p3 uppercase px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: borderColor }}>
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
            <span className="tooltip-content">Dropped by {item.lastDroppedByName}</span>
            <p className="p3 text-gray-400">Dropped by {item.lastDroppedByName}</p>
          </div>
        )}
      </div>

      <button
        className={`btn btn-success flex-shrink-0 p3 transition-colors max-w-[44px]
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${
            disabled
              ? "bg-gray-400 cursor-not-allowed focus:ring-gray-300"
              : "bg-green-500 hover:bg-green-600 active:bg-green-700 focus:ring-green-400"
          }`}
        onClick={() => onPickup(item.droppedAssetId)}
        disabled={disabled}
        aria-label={`Pick up ${displayName}`}
      >
        {item.isMystery ? "?" : "Grab it!"}
      </button>
    </div>
  );
};
