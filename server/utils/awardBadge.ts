import { Credentials } from "../types/index.js";
import { getCachedInventoryItems } from "./inventoryCache.js";
import { standardizeError } from "./standardizeError.js";
import { VisitorInterface } from "@rtsdk/topia";
import { VisitorBadgeRecord } from "./getVisitorBadges.js";

export const awardBadge = async ({
  credentials,
  visitor,
  visitorInventory,
  badgeName,
}: {
  credentials: Credentials;
  visitor: VisitorInterface;
  visitorInventory: VisitorBadgeRecord;
  badgeName: string;
}): Promise<{ success: boolean }> => {
  try {
    if (visitorInventory[badgeName]) return { success: true };

    const inventoryItems = await getCachedInventoryItems({ credentials });
    const inventoryItem = inventoryItems?.find((item) => item.name === badgeName);
    if (!inventoryItem) throw new Error(`Inventory item ${badgeName} not found in ecosystem`);

    await (visitor as any).grantInventoryItem(inventoryItem, 1);

    await visitor
      .fireToast({
        title: "Badge Awarded",
        text: `You have earned the ${badgeName} badge!`,
      })
      .catch(() => console.error(`Failed to fire toast after awarding the ${badgeName} badge.`));

    return { success: true };
  } catch (error) {
    throw standardizeError(error);
  }
};
