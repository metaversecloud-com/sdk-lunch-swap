import { DroppedAssetInterface } from "@rtsdk/topia";

export interface IDroppedAsset extends DroppedAssetInterface {
  dataObject: {
    droppedAssetCount?: number;
  };
}
