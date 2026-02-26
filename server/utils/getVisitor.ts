import { Visitor } from "./topiaInit.js";
import { Credentials } from "../types/index.js";
import { standardizeError } from "./standardizeError.js";
import { VISITOR_DATA_DEFAULTS, VisitorGameData } from "@shared/types/DataObjects.js";
import { BagItem, IdealMealItem } from "@shared/types/FoodItem.js";
import { getCurrentDateMT } from "./gameLogic/index.js";

export const getVisitor = async (credentials: Credentials, shouldGetVisitorDetails = false) => {
  try {
    const { sceneDropId, urlSlug, visitorId } = credentials;

    let visitor: any;
    if (shouldGetVisitorDetails) visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    else visitor = await Visitor.create(visitorId, urlSlug, { credentials });

    if (!visitor) throw "Not in world";

    const dataObject = (await visitor.fetchDataObject()) as VisitorGameData;

    const lockId = `${sceneDropId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
    if (!dataObject.lastPlayedDate) {
      const currentDate = getCurrentDateMT();
      await visitor.setDataObject(
        { ...VISITOR_DATA_DEFAULTS, lastPlayedDate: currentDate },
        { lock: { lockId, releaseLock: true } },
      );
    }

    const visitorData: VisitorGameData = { ...VISITOR_DATA_DEFAULTS, ...visitor.dataObject };

    // Fetch inventory items
    await visitor.fetchInventoryItems();
    const allItems: any[] = visitor.inventoryItems || [];

    // Build badge inventory
    let visitorInventory: { [key: string]: { id: string; icon: string; name: string } } = {};
    for (const visitorItem of allItems) {
      const { id, status, item } = visitorItem;
      const { name, type, image_url = "" } = item || {};

      if (status === "ACTIVE" && type === "BADGE") {
        visitorInventory[name] = {
          id,
          icon: image_url,
          name,
        };
      }
    }

    // Build brown bag from inventory items
    const idealItemIds = new Set((visitorData.idealMeal || []).map((i: IdealMealItem) => i.itemId));
    const brownBag: BagItem[] = allItems
      .filter((item: any) => item.type === "ITEM" && item.status === "ACTIVE" && (item.quantity ?? item.availableQuantity ?? 1) > 0)
      .map((item: any) => ({
        itemId: item.metadata?.itemId ?? item.name,
        name: item.metadata?.name ?? item.name,
        foodGroup: item.metadata?.foodGroup ?? "snack",
        rarity: item.metadata?.rarity ?? "common",
        matchesIdealMeal: idealItemIds.has(item.metadata?.itemId ?? item.name),
      }));

    return { visitor, visitorData, visitorInventory, brownBag };
  } catch (error) {
    throw standardizeError(error);
  }
};
