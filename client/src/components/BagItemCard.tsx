import { BagItem, FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";
import { NutritionPreview } from "@/components/NutritionPreview";

interface BagItemCardProps {
  item: BagItem | null;
  isPreview?: boolean;
  onDrop?: (itemId: string) => void;
  expanded: boolean;
  onToggle: () => void;
}

export const BagItemCard = ({ item, isPreview, onDrop, expanded, onToggle }: BagItemCardProps) => {
  if (!item) {
    // TODO: test when bag is empty and make this look nicer
    return (
      <div
        className="flex items-center justify-center w-full h-20 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 text-sm"
        aria-label="Empty bag slot"
      >
        Empty
      </div>
    );
  }

  const borderColor = FOOD_GROUP_COLORS[item.foodGroup];
  const rarityConfig = RARITY_CONFIG[item.rarity];

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-200
        ${item.matchesIdealMeal ? "shadow-lg ring-2 ring-green-400 motion-safe:animate-pulse" : "shadow-sm hover:shadow-md"}
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2`}
      style={{ borderColor }}
    >
      <button
        className="w-full p-2 focus:outline-none"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${item.name} - ${item.foodGroup}, ${rarityConfig.label} rarity${item.matchesIdealMeal ? ", matches your ideal meal" : ""}. ${expanded ? "Collapse" : "Tap for details"}`}
        disabled={isPreview}
      >
        <div className="flex items-center gap-2 m-auto relative">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: borderColor }} aria-hidden="true" />
          <div className="tooltip truncate max-w-[100px]">
            <span className="tooltip-content">{item.name}</span>
            <span className="p2">{item.name}</span>
          </div>
          {item.matchesIdealMeal && (
            <span
              className="absolute right-0 top-1 w-3 h-3 -mt-3 text-green-500"
              aria-label="Matches ideal meal"
              role="img"
            >
              &#9733;
            </span>
          )}
        </div>
        <div
          className="text-xs uppercase mt-1 px-1.5 py-0.5 rounded-full text-white"
          style={{ backgroundColor: rarityConfig.color }}
        >
          {rarityConfig.label}
        </div>
      </button>

      {!isPreview && expanded && (
        <div className="p-2 flex flex-col gap-3 border-t border-gray-100">
          <div className="flex items-center gap-2 p3">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: borderColor }}
              aria-hidden="true"
            />
            <span className="capitalize">{item.foodGroup}</span>
          </div>

          <NutritionPreview itemId={item.itemId} />

          <button
            className="btn btn-danger"
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
