import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, World } from "@utils/index.js";
import { DroppedAssetInterface } from "@rtsdk/topia";

export const handleTeleportPlayer = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const { keyAssetId } = req.body;
    credentials.assetId = keyAssetId;

    const world = World.create(urlSlug, { credentials });

    const keyAssets: DroppedAssetInterface[] = await world.fetchDroppedAssetsWithUniqueName({
      uniqueName: "LunchSwap_keyAsset",
      isPartial: false,
    });

    if (!keyAssets || keyAssets.length === 0) {
      return res.status(404).json({ success: false, message: "Food truck not found" });
    }

    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });

    await visitor.moveVisitor({
      shouldTeleportVisitor: false,
      x: keyAssets[0].position?.x,
      y: keyAssets[0].position?.y + 100,
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({ error, functionName: "handleTeleportPlayer", message: "Error teleporting player", req, res });
  }
};
