import { Visitor } from "./topiaInit.js";
import { Credentials } from "../types/index.js";
import { VISITOR_DATA_DEFAULTS, VisitorGameData } from "@shared/types/DataObjects.js";
import {
  buildBagFromItems,
  getVisitorXp,
  getCurrentDateMT,
  getFoodItemsById,
  isNewDay,
  standardizeError,
} from "./index.js";
import { getLevelForXp } from "@shared/data/xpConfig.js";
import { VisitorInterface } from "@rtsdk/topia";
import { BagItem } from "@shared/types/FoodItem.js";

export const getVisitor = async (
  credentials: Credentials,
  shouldGetVisitorDetails = false,
): Promise<{
  visitor: VisitorInterface;
  visitorData: VisitorGameData;
  visitorInventory: { [key: string]: { id: string; icon: string; name: string } };
  brownBag: BagItem[];
  newDay: boolean;
  isFirstPlay: boolean;
  xp: number;
  level: number;
}> => {
  try {
    const { urlSlug, visitorId } = credentials;

    let visitor: VisitorInterface;
    if (shouldGetVisitorDetails) visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    else visitor = await Visitor.create(visitorId, urlSlug, { credentials });

    if (!visitor) throw "Not in world";

    const dataObject = (await visitor.fetchDataObject()) as VisitorGameData;

    const currentDate = getCurrentDateMT();
    const isFirstPlay = !dataObject.lastPlayedDate;
    const newDay = isFirstPlay || isNewDay(dataObject.lastPlayedDate, currentDate);

    if (!dataObject.lastPlayedDate) {
      await visitor.setDataObject(
        { ...VISITOR_DATA_DEFAULTS, lastPlayedDate: currentDate },
        {
          lock: {
            lockId: `${urlSlug}-${visitorId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`,
            releaseLock: true,
          },
        },
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
    const foodItemsById = await getFoodItemsById(credentials);
    const brownBag = buildBagFromItems(allItems, visitorData.targetMeal || [], foodItemsById);

    // Read XP from inventory
    const xp = getVisitorXp(allItems);
    const level = getLevelForXp(xp);

    return { visitor, visitorData, visitorInventory, brownBag, newDay, isFirstPlay, xp, level };
  } catch (error) {
    throw standardizeError(error);
  }
};
