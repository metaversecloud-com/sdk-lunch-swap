import { BagItem, FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";
import { NutritionPreview } from "@/components/NutritionPreview";

interface BagItemCardProps {
  item: BagItem | null;
  onDrop?: (itemId: string) => void;
  expanded: boolean;
  onToggle: () => void;
  comboPartnerName?: string;
}

export const BagItemCard = ({ item, onDrop, expanded, onToggle, comboPartnerName }: BagItemCardProps) => {
  if (!item) {
    return (
      <div
        className="flex items-center justify-center w-full min-h-[70px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-muted"
        aria-label="Empty bag slot"
      >
        Empty
      </div>
    );
  }

  const foodGroupColor = FOOD_GROUP_COLORS[item.foodGroup];
  const rarityConfig = RARITY_CONFIG[item.rarity];

  return (
    <div
      className={`cursor-pointer w-full p-2 rounded-xl border-2 transition-all duration-200 min-h-[70px] ${item.matchesTargetMeal ? "shadow-lg ring-2 ring-green-100 motion-safe:animate-pulse" : ""}`}
      style={{ borderColor: foodGroupColor }}
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${item.name} - ${item.foodGroup}, ${rarityConfig.label} rarity${item.matchesTargetMeal ? ", matches your target meal" : ""}${comboPartnerName ? `, combo match with ${comboPartnerName}` : ""}. ${expanded ? "Collapse" : "Tap for details"}`}
    >
      <div className="flex items-center gap-1.5 m-auto relative">
        {/* Item image */}
        <img src={item.image} alt={item.name} className="h-7 object-contain" />

        {/* Item name */}
        <div className="tooltip truncate max-w-[100px]">
          <span className="tooltip-content p3">{item.name}</span>
          <span className="p2">{item.name}</span>
        </div>
        {item.matchesTargetMeal && (
          <div
            className="absolute -top-4 -right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
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
        {comboPartnerName && (
          <div className="tooltip">
            <span className="tooltip-content p3 min-w-[100px]" style={{ marginLeft: "-30px" }}>
              Combo match with {comboPartnerName}
            </span>
            <span className="p2 text-muted" aria-label={`Combo match with ${comboPartnerName}`} role="img">
              &#9733;
            </span>
          </div>
        )}
      </div>

      {/* Food group label */}
      <div className="chip text-white capitalize" style={{ backgroundColor: foodGroupColor, fontSize: "0.625rem" }}>
        {item.foodGroup}
      </div>

      {/* Rarity label */}
      <div className="chip text-white" style={{ backgroundColor: rarityConfig.color, fontSize: "0.625rem" }}>
        {rarityConfig.label}
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 pt-3">
          {item.nutrition && (
            <>
              <p className="p3 uppercase tracking-wide">Nutrition</p>
              <NutritionPreview nutrition={item.nutrition} name={item.name} />
            </>
          )}

          <button
            className="btn btn-danger-outline"
            onClick={(e) => {
              e.stopPropagation();
              onDrop?.(item.itemId);
            }}
            aria-label={`Drop ${item.name} from your bag`}
          >
            Drop
          </button>
        </div>
      )}
    </div>
  );
};
