import { DroppedAssetInterface } from "@rtsdk/topia";
import { KeyAssetData } from "@shared/types/DataObjects.js";

export interface IKeyAsset extends DroppedAssetInterface {
  dataObject: KeyAssetData;
}
