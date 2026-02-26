import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { BagItem, FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";
import { backendAPI } from "@/utils/backendAPI";

interface BagFullSwapModalProps {
  pickupDroppedAssetId: string;
  onComplete: (response: any) => void;
  onClose: () => void;
}

export const BagFullSwapModal = ({ pickupDroppedAssetId, onComplete, onClose }: BagFullSwapModalProps) => {
  const { brownBag } = useContext(GlobalStateContext);
  const [selectedItem, setSelectedItem] = useState<BagItem | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLButtonElement>(null);
  const titleId = "bag-full-swap-title";

  const items = brownBag ?? [];

  // Focus trap and Escape handler
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement;
    firstFocusRef.current?.focus();

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
      previousFocus?.focus();
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
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Swap failed. Try again!");
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
        <p className="text-sm text-gray-500 text-center mb-4">Choose an item to swap out.</p>

        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-600 text-sm text-center" role="alert">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4 max-h-[50vh] overflow-y-auto px-1">
          {items.map((item, index) => {
            const isSelected = selectedItem?.itemId === item.itemId;
            const borderColor = FOOD_GROUP_COLORS[item.foodGroup];
            const rarityConfig = RARITY_CONFIG[item.rarity];

            return (
              <button
                key={item.itemId}
                ref={index === 0 ? firstFocusRef : undefined}
                className={`relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all duration-200 min-h-[72px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${
                    isSelected
                      ? "bg-red-50 border-red-400 shadow-md ring-2 ring-red-300 scale-[0.97]"
                      : "bg-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                style={{ borderColor: isSelected ? undefined : borderColor }}
                onClick={() => handleSelectItem(item)}
                aria-pressed={isSelected}
                aria-label={`${item.name} - ${item.foodGroup}, ${rarityConfig.label}${item.matchesIdealMeal ? ", matches ideal meal" : ""}${isSelected ? " - selected for swap" : ""}`}
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: borderColor }}
                    aria-hidden="true"
                  />
                  <div className="tooltip flex-1 truncate">
                    <span className="tooltip-content">{item.name}</span>
                    <span className="font-semibold text-sm text-gray-800">{item.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className="p3 font-bold uppercase px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: rarityConfig.color }}
                  >
                    {rarityConfig.label}
                  </span>
                  {item.matchesIdealMeal && (
                    <span className="text-green-500 text-xs" aria-label="Matches ideal meal" role="img">
                      &#9733;
                    </span>
                  )}
                </div>
                {isSelected && (
                  <span
                    className="absolute top-1 right-1 text-red-500 font-bold text-xs bg-red-100 rounded-full px-1.5 py-0.5"
                    aria-hidden="true"
                  >
                    SWAP
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedItem && (
          <div
            className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-center"
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
            className="btn btn-danger-outline"
            onClick={handleConfirmSwap}
            disabled={!selectedItem || isSwapping}
            aria-label={selectedItem ? `Confirm swap: drop ${selectedItem.name}` : "Select an item first"}
          >
            {isSwapping ? "Swapping..." : "Confirm Swap"}
          </button>
        </div>
      </div>
    </div>
  );
};
