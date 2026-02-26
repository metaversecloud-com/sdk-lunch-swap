// ---- Shared mock state ----
const mockVisitorData: Record<string, any> = {};
const mockUserData: Record<string, any> = {};
const mockWorldData: Record<string, any> = {};
const mockDroppedAssetData: Record<string, any> = {};

// ---- Mock method factories ----
function createMockVisitor() {
  return {
    isAdmin: false,
    profileId: "visitor-1",
    displayName: "Test Player",
    moveTo: { x: 100, y: 200 },
    get: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = mockVisitorData;
      return Promise.resolve(mockVisitorData);
    }),
    updateDataObject: jest.fn().mockImplementation(function (this: any, data: any) {
      Object.assign(mockVisitorData, data);
      this.dataObject = mockVisitorData;
      return Promise.resolve(mockVisitorData);
    }),
    setDataObject: jest.fn().mockImplementation(function (this: any, data: any) {
      Object.keys(mockVisitorData).forEach(k => delete mockVisitorData[k]);
      Object.assign(mockVisitorData, data);
      this.dataObject = mockVisitorData;
      return Promise.resolve(mockVisitorData);
    }),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    fireToast: jest.fn().mockResolvedValue(undefined),
    triggerParticle: jest.fn().mockResolvedValue(undefined),
    grantInventoryItem: jest.fn().mockResolvedValue(undefined),
    dataObject: mockVisitorData,
  };
}

function createMockUser() {
  return {
    profileId: "user-1",
    get: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = mockUserData;
      return Promise.resolve(mockUserData);
    }),
    updateDataObject: jest.fn().mockImplementation(function (this: any, data: any) {
      Object.assign(mockUserData, data);
      this.dataObject = mockUserData;
      return Promise.resolve(mockUserData);
    }),
    setDataObject: jest.fn().mockImplementation(function (this: any, data: any) {
      Object.keys(mockUserData).forEach(k => delete mockUserData[k]);
      Object.assign(mockUserData, data);
      this.dataObject = mockUserData;
      return Promise.resolve(mockUserData);
    }),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    dataObject: mockUserData,
  };
}

function createMockWorld() {
  return {
    urlSlug: "test-world",
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = mockWorldData;
      return Promise.resolve(mockWorldData);
    }),
    updateDataObject: jest.fn().mockImplementation(function (this: any, data: any) {
      Object.assign(mockWorldData, data);
      this.dataObject = mockWorldData;
      return Promise.resolve(mockWorldData);
    }),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    fetchDroppedAssetsWithUniqueName: jest.fn().mockResolvedValue([]),
    triggerParticle: jest.fn().mockResolvedValue(undefined),
    fireToast: jest.fn().mockResolvedValue(undefined),
    dataObject: mockWorldData,
  };
}

function createMockDroppedAsset() {
  return {
    id: "dropped-asset-1",
    uniqueName: "",
    position: { x: 100, y: 200 },
    get: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = mockDroppedAssetData;
      return Promise.resolve(mockDroppedAssetData);
    }),
    setDataObject: jest.fn().mockImplementation(function (this: any, data: any) {
      Object.keys(mockDroppedAssetData).forEach(k => delete mockDroppedAssetData[k]);
      Object.assign(mockDroppedAssetData, data);
      this.dataObject = mockDroppedAssetData;
      return Promise.resolve(mockDroppedAssetData);
    }),
    updateDataObject: jest.fn().mockImplementation(function (this: any, data: any) {
      Object.assign(mockDroppedAssetData, data);
      this.dataObject = mockDroppedAssetData;
      return Promise.resolve(mockDroppedAssetData);
    }),
    deleteDroppedAsset: jest.fn().mockResolvedValue(undefined),
    dataObject: mockDroppedAssetData,
  };
}

// ---- Singleton instances (reused across tests, reset in __mock.reset()) ----
let _visitor = createMockVisitor();
let _user = createMockUser();
let _world = createMockWorld();
let _droppedAsset = createMockDroppedAsset();

// ---- SDK Factory classes ----
export class Topia {
  constructor(_opts: any) {}
}

export class AssetFactory {
  constructor(_topia: any) {}
  create = jest.fn().mockResolvedValue({ id: "new-asset-id" });
}

export class DroppedAssetFactory {
  constructor(_topia: any) {}
  create = jest.fn().mockReturnValue(_droppedAsset);
  get = jest.fn().mockReturnValue(_droppedAsset);
  drop = jest.fn().mockResolvedValue(_droppedAsset);
}

export class UserFactory {
  constructor(_topia: any) {}
  create = jest.fn().mockReturnValue(_user);
}

export class VisitorFactory {
  constructor(_topia: any) {}
  create = jest.fn().mockReturnValue(_visitor);
  get = jest.fn().mockReturnValue(_visitor);
}

export class WorldFactory {
  constructor(_topia: any) {}
  create = jest.fn().mockReturnValue(_world);
  // Static method for bulk delete
  static deleteDroppedAssets = jest.fn().mockResolvedValue(undefined);
}

export class EcosystemFactory {
  constructor(_topia: any) {}
  fetchInventoryItems = jest.fn().mockResolvedValue([]);
}

// ---- DroppedAssetInterface (type stub for IDroppedAsset) ----
export interface DroppedAssetInterface {
  id: string;
  uniqueName?: string;
  position?: { x: number; y: number };
  dataObject?: any;
  [key: string]: any;
}

// ---- Test control ----
export const __mock = {
  get visitor() { return _visitor; },
  get user() { return _user; },
  get world() { return _world; },
  get droppedAsset() { return _droppedAsset; },
  get visitorData() { return mockVisitorData; },
  get userData() { return mockUserData; },
  get worldData() { return mockWorldData; },
  get droppedAssetData() { return mockDroppedAssetData; },
  setVisitorData(data: any) {
    Object.keys(mockVisitorData).forEach(k => delete mockVisitorData[k]);
    Object.assign(mockVisitorData, data);
    _visitor.dataObject = mockVisitorData;
  },
  setUserData(data: any) {
    Object.keys(mockUserData).forEach(k => delete mockUserData[k]);
    Object.assign(mockUserData, data);
    _user.dataObject = mockUserData;
  },
  setWorldData(data: any) {
    Object.keys(mockWorldData).forEach(k => delete mockWorldData[k]);
    Object.assign(mockWorldData, data);
    _world.dataObject = mockWorldData;
  },
  setDroppedAssetData(data: any) {
    Object.keys(mockDroppedAssetData).forEach(k => delete mockDroppedAssetData[k]);
    Object.assign(mockDroppedAssetData, data);
    _droppedAsset.dataObject = mockDroppedAssetData;
  },
  reset() {
    // Clear all data
    Object.keys(mockVisitorData).forEach(k => delete mockVisitorData[k]);
    Object.keys(mockUserData).forEach(k => delete mockUserData[k]);
    Object.keys(mockWorldData).forEach(k => delete mockWorldData[k]);
    Object.keys(mockDroppedAssetData).forEach(k => delete mockDroppedAssetData[k]);
    // Recreate instances
    _visitor = createMockVisitor();
    _user = createMockUser();
    _world = createMockWorld();
    _droppedAsset = createMockDroppedAsset();
  },
};
