import { useMemo, useContext, useState } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { BagItemCard } from "@/components/BagItemCard";
import { SUPER_COMBOS } from "@shared/data/superCombos";

const BASE_BAG_SLOTS = 8;
const BIG_BAG_BONUS = 2;

interface BrownBagProps {
  isPreview?: boolean;
  onDrop?: (itemId: string) => void;
  onDropAllNonMatches?: () => Promise<void>;
}

export const BrownBag = ({ isPreview, onDrop, onDropAllNonMatches }: BrownBagProps) => {
  const { brownBag, dailyBuff } = useContext(GlobalStateContext);
  const BAG_SLOTS = BASE_BAG_SLOTS + (dailyBuff === "big-bag" ? BIG_BAG_BONUS : 0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [isDroppingAll, setIsDroppingAll] = useState(false);

  const items = brownBag ?? [];
  const filledCount = items.length;

  // Build a map of itemId -> combo partner name for items currently in the bag
  const comboPartnerMap = useMemo(() => {
    if (dailyBuff !== "combo-finder") return new Map<string, string>();
    const bag = brownBag ?? [];
    const bagItemIds = new Set(bag.map((i) => i.itemId));
    const map = new Map<string, string>();
    for (const combo of SUPER_COMBOS) {
      const [a, b] = combo.items;
      if (bagItemIds.has(a) && bagItemIds.has(b)) {
        const nameA = bag.find((i) => i.itemId === a)?.name ?? a;
        const nameB = bag.find((i) => i.itemId === b)?.name ?? b;
        map.set(a, nameB);
        map.set(b, nameA);
      }
    }
    return map;
  }, [dailyBuff, brownBag]);

  const handleToggle = (index: number) => {
    setExpandAll(false);
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section aria-label="Your brown bag">
      <div className="flex items-center justify-between mb-3">
        <h3>Your Bag</h3>
        <span className="grid p2 text-muted text-right">
          {filledCount}/{BAG_SLOTS} items
          {!isPreview && (
            <button
              className="btn-text mt-1"
              onClick={() => {
                setExpandAll((prev) => !prev);
                setExpandedIndex(null);
              }}
              aria-label={expandAll ? "Collapse all items" : "Expand all items"}
            >
              {expandAll ? "Collapse all" : "Expand all"}
            </button>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: BAG_SLOTS }, (_, index) => {
          const item = items[index] ?? null;
          return (
            <BagItemCard
              key={item ? item.itemId : `empty-${index}`}
              item={item}
              isPreview={isPreview}
              onDrop={(itemId) => {
                setExpandedIndex(null);
                onDrop?.(itemId);
              }}
              expanded={expandAll || expandedIndex === index}
              onToggle={() => handleToggle(index)}
              comboPartnerName={item ? comboPartnerMap.get(item.itemId) : undefined}
            />
          );
        })}
      </div>

      {!isPreview && onDropAllNonMatches && items.some((item) => !item.matchesIdealMeal) && (
        <button
          className="btn btn-danger w-full mt-3"
          onClick={async () => {
            setIsDroppingAll(true);
            try {
              await onDropAllNonMatches();
            } finally {
              setIsDroppingAll(false);
            }
          }}
          disabled={isDroppingAll}
          aria-label={isDroppingAll ? "Dropping items..." : "Drop all non-matching items from your bag"}
        >
          {isDroppingAll ? "Dropping..." : "Drop All Non-Matching Items"}
        </button>
      )}
    </section>
  );
};
