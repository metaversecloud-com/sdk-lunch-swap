import { useContext, useEffect, useRef } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";

interface SubmitMealConfirmModalProps {
  onConfirm: () => void;
  onClose: () => void;
}

export const SubmitMealConfirmModal = ({ onConfirm, onClose }: SubmitMealConfirmModalProps) => {
  const { idealMeal } = useContext(GlobalStateContext);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = "submit-meal-title";

  const items = idealMeal ?? [];

  // Focus trap and Escape handler
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement;
    cancelRef.current?.focus();

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

  const collectedCount = items.filter((i) => i.collected).length;

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
          Submit Your Meal?
        </h4>
        <p className="text-sm text-gray-500 text-center mb-4">
          {collectedCount} of {items.length} ideal items collected
        </p>

        <div className="flex flex-col gap-2 mb-4" role="list" aria-label="Your meal items">
          {items.map((item) => {
            const borderColor = FOOD_GROUP_COLORS[item.foodGroup];
            const rarityConfig = RARITY_CONFIG[item.rarity];

            return (
              <div
                key={item.itemId}
                role="listitem"
                className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all duration-200
                  ${item.collected ? "bg-white shadow-sm" : "bg-gray-50 opacity-50 border-dashed"}`}
                style={{ borderColor: item.collected ? borderColor : "#d1d5db" }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.collected ? borderColor : "#d1d5db" }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="tooltip truncate">
                    <span className="tooltip-content">{item.name}</span>
                    <p className={`font-semibold text-sm ${item.collected ? "text-gray-800" : "text-gray-400"}`}>
                      {item.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 capitalize">{item.foodGroup}</span>
                    <span
                      className="p3 font-bold uppercase px-1.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: item.collected ? rarityConfig.color : "#d1d5db" }}
                    >
                      {rarityConfig.label}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-lg flex-shrink-0 ${item.collected ? "text-green-500" : "text-gray-300"}`}
                  aria-label={item.collected ? "Collected" : "Not collected"}
                >
                  {item.collected ? "\u2713" : "\u2014"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-center mb-4">
          <p className="text-xs text-blue-700">
            Remaining items in your bag will be dropped into the world for others.
          </p>
        </div>

        <div className="actions">
          <button ref={cancelRef} className="btn btn-outline" onClick={onClose}>
            Not Yet
          </button>
          <button className="btn btn-danger-outline" onClick={onConfirm} aria-label="Submit your meal for scoring">
            Submit Meal
          </button>
        </div>
      </div>
    </div>
  );
};
