import { useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { BagItem, FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";
import { backendAPI } from "@/utils/backendAPI";
import { setErrorMessage } from "@/utils";
import { ErrorType, PostPickupResponseType } from "@/context/types";
import { SUPER_COMBOS } from "@shared/data/superCombos";

interface BagFullSwapModalProps {
  pickupDroppedAssetId: string;
  onComplete: (data: PostPickupResponseType) => void;
  onClose: () => void;
}

export const BagFullSwapModal = ({ pickupDroppedAssetId, onComplete, onClose }: BagFullSwapModalProps) => {
  const dispatch = useContext(GlobalDispatchContext);
  const { brownBag, dailyBuff } = useContext(GlobalStateContext);
  const [selectedItem, setSelectedItem] = useState<BagItem | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLButtonElement>(null);
  const titleId = "bag-full-swap-title";

  const items = brownBag ?? [];

  // Build combo partner map (same logic as BrownBag)
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

  // Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleSelectItem = useCallback((item: BagItem) => {
    setSelectedItem((prev) => (prev?.itemId === item.itemId ? null : item));
    setError("");
  }, []);

  const handleConfirmSwap = async () => {
    if (!selectedItem) return;
    setIsSwapping(true);
    setError("");

    try {
      const { data } = await backendAPI.post("/swap-item", {
        dropItemId: selectedItem.itemId,
        pickupDroppedAssetId,
      });
      onComplete(data);
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
      setIsSwapping(false);
    }
  };

  return (
    <div className="modal-container" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id={titleId} className="text-xl font-bold text-center text-gray-800 mb-1">
          Bag is Full!
        </h4>
        <p className="p2">Choose an item to swap out.</p>

        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-600 text-sm text-center" role="alert">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 my-2">
          {items.map((item, index) => {
            const isSelected = selectedItem?.itemId === item.itemId;
            const borderColor = FOOD_GROUP_COLORS[item.foodGroup];
            const rarityConfig = RARITY_CONFIG[item.rarity];

            return (
              <button
                key={item.itemId}
                ref={index === 0 ? firstFocusRef : undefined}
                className={`relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all duration-200 min-h-[72px] 
                  ${
                    isSelected
                      ? "bg-red-50 border-red-400 shadow-md ring-2 ring-red-600 scale-[0.97]"
                      : "bg-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                style={{ borderColor: isSelected ? "grey" : borderColor }}
                onClick={() => handleSelectItem(item)}
                aria-pressed={isSelected}
                aria-label={`${item.name} - ${item.foodGroup}, ${rarityConfig.label}${item.matchesIdealMeal ? ", matches ideal meal" : ""}${isSelected ? " - selected for swap" : ""}`}
              >
                <div className="flex items-center gap-1.5 w-full">
                  {/* Food group indicator */}
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: borderColor }}
                    aria-hidden="true"
                  />
                  {/* Item name */}
                  <div className="tooltip truncate">
                    <span className="tooltip-content p3">{item.name}</span>
                    <span>{item.name}</span>
                  </div>
                  {item.matchesIdealMeal && (
                    <div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
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
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className="p3 font-bold uppercase px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: rarityConfig.color }}
                  >
                    {rarityConfig.label}
                  </span>
                  {comboPartnerMap.get(item.itemId) && (
                    <div className="tooltip">
                      <span className="tooltip-content p3 min-w-[100px] ">
                        Combo match with {comboPartnerMap.get(item.itemId)}
                      </span>
                      <span
                        className="p2 text-muted"
                        aria-label={`Combo match with ${comboPartnerMap.get(item.itemId)}`}
                        role="img"
                      >
                        &#9733;
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedItem && (
          <div
            className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-amber-800">
              Swap out <strong>{selectedItem.name}</strong>?
            </p>
            {selectedItem.matchesIdealMeal && (
              <p className="text-xs text-amber-600 mt-1 font-medium">Warning: This item is part of your ideal meal!</p>
            )}
          </div>
        )}

        <div className="actions">
          <button className="btn btn-outline" onClick={onClose} disabled={isSwapping}>
            Cancel
          </button>
          <button
            ref={lastFocusRef}
            className="btn btn-danger"
            onClick={handleConfirmSwap}
            disabled={!selectedItem || isSwapping}
            aria-label={selectedItem ? `Confirm swap: drop ${selectedItem.name}` : "Select an item first"}
          >
            {isSwapping ? "Swapping..." : "Swap"}
          </button>
        </div>
      </div>
    </div>
  );
};
