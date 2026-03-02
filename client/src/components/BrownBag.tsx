import { useContext, useState } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { BagItemCard } from "@/components/BagItemCard";

const BAG_SLOTS = 8;

interface BrownBagProps {
  isPreview?: boolean;
  onDrop?: (itemId: string) => void;
}

export const BrownBag = ({ isPreview, onDrop }: BrownBagProps) => {
  const { brownBag } = useContext(GlobalStateContext);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const items = brownBag ?? [];
  const filledCount = items.length;

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

      <div className="grid grid-cols-2 gap-2">
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
            />
          );
        })}
      </div>
    </section>
  );
};
