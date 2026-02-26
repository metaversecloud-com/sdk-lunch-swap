import { Credentials, IKeyAsset } from "../../types/index.js";
import { DroppedAsset, initializeKeyAssetDataObject, standardizeError } from "../index.js";

export const getKeyAsset = async (credentials: Credentials): Promise<IKeyAsset> => {
  try {
    const { assetId, urlSlug } = credentials;

    const droppedAsset = (await DroppedAsset.get(assetId, urlSlug, { credentials })) as IKeyAsset;

    await initializeKeyAssetDataObject(droppedAsset);

    if (!droppedAsset) throw "Key asset not found";

    await droppedAsset.fetchDataObject();

    return droppedAsset;
  } catch (error) {
    throw standardizeError(error);
  }
};
