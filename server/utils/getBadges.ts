import { Credentials } from "../types/index.js";
import { getCachedInventoryItems } from "./inventoryCache.js";

export type BadgeRecord = {
  [name: string]: {
    id: string;
    name: string;
    icon: string;
    description: string;
  };
};

/**
 * Get all active badges from ecosystem inventory.
 * Uses cached inventory items for performance.
 */
export const getBadges = async (credentials: Credentials, forceRefresh = false): Promise<BadgeRecord> => {
  const inventoryItems = await getCachedInventoryItems({ credentials, forceRefresh });

  const badges: BadgeRecord = {};

  for (const item of inventoryItems) {
    const { id, name, image_path, description, type, status } = item as any;
    if (name && type === "BADGE" && status === "ACTIVE") {
      badges[name] = {
        id,
        name,
        icon: image_path || "",
        description: description || "",
      };
    }
  }

  return badges;
};
