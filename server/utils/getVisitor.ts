import { Visitor } from "./topiaInit.js";
import { Credentials } from "../types/index.js";
import { standardizeError } from "./standardizeError.js";
import { VISITOR_DATA_DEFAULTS, VisitorGameData } from "@shared/types/DataObjects.js";
import { BagItem, IdealMealItem } from "@shared/types/FoodItem.js";
import { getCurrentDateMT, isNewDay } from "./gameLogic/index.js";
import { getFoodItemsById } from "./foodItemLookup.js";

export const getVisitor = async (credentials: Credentials, shouldGetVisitorDetails = false) => {
  try {
    const {  urlSlug, visitorId } = credentials;

    let visitor: any;
    if (shouldGetVisitorDetails) visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    else visitor = await Visitor.create(visitorId, urlSlug, { credentials });

    if (!visitor) throw "Not in world";

    const dataObject = (await visitor.fetchDataObject()) as VisitorGameData;

    const currentDate = getCurrentDateMT();
    const newDay = !dataObject.lastPlayedDate || isNewDay(dataObject.lastPlayedDate, currentDate);
    
    if (!dataObject.lastPlayedDate) {
      await visitor.setDataObject(
        { ...VISITOR_DATA_DEFAULTS, lastPlayedDate: currentDate },
        { lock: { lockId:`${urlSlug}-${visitorId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`, releaseLock: true } },
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

    // Build brown bag from inventory items, enriched with ecosystem data
    const idealItemIds = new Set((visitorData.idealMeal || []).map((i: IdealMealItem) => i.itemId));
    const foodItemsById = await getFoodItemsById(credentials);
    const brownBag: BagItem[] = allItems
      .filter((item: any) => item.type === "ITEM" && item.status === "ACTIVE" && (item.quantity ?? item.availableQuantity ?? 1) > 0)
      .map((item: any) => {
        const itemId = item.metadata?.itemId ?? item.item?.metadata?.itemId ?? item.name;
        const foodDef = foodItemsById.get(itemId);
        return {
          itemId,
          name: foodDef?.name ?? item.metadata?.name ?? item.name,
          foodGroup: foodDef?.foodGroup ?? item.metadata?.foodGroup ?? "snack",
          rarity: foodDef?.rarity ?? item.metadata?.rarity ?? "common",
          matchesIdealMeal: idealItemIds.has(itemId),
          nutrition: foodDef?.nutrition,
          funFact: foodDef?.funFact,
        };
      });

    return { visitor, visitorData, visitorInventory, brownBag, newDay };
  } catch (error) {
    throw standardizeError(error);
  }
};
