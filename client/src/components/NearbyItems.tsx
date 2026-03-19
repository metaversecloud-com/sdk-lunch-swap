import { useContext, useEffect, useRef } from "react";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { SET_NEARBY_ITEMS } from "@/context/types";
import { backendAPI } from "@/utils";
import { NearbyItemCard } from "@/components/NearbyItemCard";
import { BagItem } from "@shared/types/FoodItem";

const POLL_INTERVAL_MS = 3000;

interface NearbyItemsProps {
  bagFull?: boolean;
  onPickup: (droppedAssetId: string) => void;
  afterSwap?: (data: {
    brownBag: BagItem[];
    pickedUpItem: BagItem | null;
    matchesTargetMeal: boolean;
    xpEarned: number;
    xp: number;
    level: number;
    hotStreakActive: boolean;
    pickupStreak: number;
    funFact: string | null;
    isMystery: boolean;
  }) => void;
}

export const NearbyItems = ({ onPickup, afterSwap, bagFull = false }: NearbyItemsProps) => {
  const dispatch = useContext(GlobalDispatchContext);
  const { nearbyItems } = useContext(GlobalStateContext);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchNearbyItems = async () => {
      try {
        const response = await backendAPI.get("/nearby-items");

        dispatch!({
          type: SET_NEARBY_ITEMS,
          payload: { nearbyItems: response.data.nearbyItems },
        });
      } catch {
        // Silently fail on polling — avoids spamming errors every 3s
      }
    };

    // Fetch immediately on mount
    fetchNearbyItems();

    // Set up polling interval
    intervalRef.current = setInterval(fetchNearbyItems, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [dispatch]);

  const items = nearbyItems ?? [];

  return (
    <section aria-label="Nearby food items">
      <div className="flex items-center justify-between mb-3">
        <h3>Nearby Food</h3>
        {items.length > 0 && (
          <span className="p2 text-muted">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div
          className="grid gap-2 items-center justify-center py-6 text-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50"
          role="status"
        >
          <h3 aria-hidden="true">&#128270;</h3>
          <p>No food nearby. Keep exploring!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2" role="list" aria-label="List of nearby food items">
          {items.map((item) => (
            <div key={item.droppedAssetId} role="listitem">
              <NearbyItemCard item={item} onPickup={onPickup} afterSwap={afterSwap} bagFull={bagFull} />
            </div>
          ))}
        </div>
      )}

      {bagFull && items.length > 0 && (
        <p className="p2 text-center text-warning pt-3" role="alert">
          Your bag is full! <br />
          Drop an item to pick up more.
        </p>
      )}
    </section>
  );
};
