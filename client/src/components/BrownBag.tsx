import { useMemo, useContext, useState } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { BagItemCard } from "@/components/BagItemCard";
import { SUPER_COMBOS } from "@shared/data/superCombos";

const BASE_BAG_SLOTS = 8;
const BIG_BAG_BONUS = 2;

interface BrownBagProps {
  isPreview?: boolean;
  onDrop?: (itemId: string) => void;
}

export const BrownBag = ({ isPreview, onDrop }: BrownBagProps) => {
  const { brownBag, dailyBuff } = useContext(GlobalStateContext);
  const BAG_SLOTS = BASE_BAG_SLOTS + (dailyBuff === "big-bag" ? BIG_BAG_BONUS : 0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section aria-label="Your brown bag">
      <div className="flex items-center justify-between mb-3">
        <h3>Your Bag</h3>
        <span className="p2 text-muted">
          {filledCount}/{BAG_SLOTS} items
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
              onDrop={onDrop}
              expanded={expandedIndex === index}
              onToggle={() => handleToggle(index)}
              comboPartnerName={item ? comboPartnerMap.get(item.itemId) : undefined}
            />
          );
        })}
      </div>
    </section>
  );
};
