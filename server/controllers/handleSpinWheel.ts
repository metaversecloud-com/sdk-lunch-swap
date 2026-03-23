import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getVisitor,
  grantFoodToVisitor,
  getAllFoodItems,
  getVisitorBag,
} from "@utils/index.js";
import { spinWheel } from "@shared/data/wheelBuffs.js";

export const handleSpinWheel = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    const { visitor, visitorData } = await getVisitor(credentials, true);

    // One spin per day — dailyBuff is reset on new day
    if (visitorData.dailyBuff) {
      return res.status(400).json({ success: false, message: "Already spun today" });
    }

    // Spin the wheel
    const buff = spinWheel();

    // Update visitor data with buff
    await visitor.updateDataObject(
      {
        dailyBuff: buff.id,
      },
      {},
    );

    // Re-fetch the bag if an item was swapped so the client gets the updated inventory
    let updatedBag;

    // Apply immediate-effect buffs
    if (buff.id === "epic-drop" || buff.id === "target-item") {
      const allFood = await getAllFoodItems(credentials);
      const bag = await getVisitorBag(visitor, visitorData.targetMeal, credentials);
      const bagItemIds = new Set(bag.map((b) => b.itemId));

      let newItem;

      if (buff.id === "epic-drop") {
        // Grant a random epic food item directly into the bag
        const epicItems = allFood.filter((f) => f.rarity === "epic");
        if (epicItems.length > 0) {
          newItem = epicItems[Math.floor(Math.random() * epicItems.length)];
        }
      } else if (buff.id === "target-item") {
        // Upgrade one non-target bag item to a missing target meal item
        const missingTarget = (visitorData.targetMeal || []).filter((i: any) => !bagItemIds.has(i.itemId));

        if (missingTarget.length > 0) {
          const target = missingTarget[Math.floor(Math.random() * missingTarget.length)];

          // Look up full definition for the target item
          newItem = allFood.find((f) => f.itemId === target.itemId);
        }
      }

      if (newItem) {
        await grantFoodToVisitor(visitor, credentials, {
          itemId: newItem.itemId,
          name: newItem.name,
          foodGroup: newItem.foodGroup,
          rarity: newItem.rarity,
          matchesTargetMeal: buff.id === "target-item",
          nutrition: newItem.nutrition,
          funFact: newItem.funFact,
        });

        buff.description =
          buff.id === "epic-drop"
            ? `You received a random epic item: ${newItem.name}!`
            : `You received a ${newItem.name}!`;

        updatedBag = await getVisitorBag(visitor, visitorData.targetMeal, credentials);
      }
    }

    return res.json({
      success: true,
      buff: {
        id: buff.id,
        name: buff.name,
        description: buff.description,
      },
      ...(updatedBag && { brownBag: updatedBag }),
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSpinWheel",
      message: "Error spinning wheel",
      req,
      res,
    });
  }
};
