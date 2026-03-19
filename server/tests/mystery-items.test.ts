import express from "express";
import request from "supertest";
import router from "../routes.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

const baseCreds = {
  assetId: "asset-123",
  interactivePublicKey: process.env.INTERACTIVE_KEY,
  interactiveNonce: "nonce-xyz",
  visitorId: 1,
  urlSlug: "my-world",
  profileId: "profile-1",
};

// Mock game logic (required by handleGetGameState which shares the route file)
jest.mock("@utils/gameLogic/index.js", () => ({
  generateIdealMeal: jest.fn().mockResolvedValue([]),
  generateBrownBag: jest.fn().mockResolvedValue([]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  isNewDay: jest.fn().mockReturnValue(false),
}));

jest.mock("@utils/foodItemLookup.js", () => ({
  getFoodItemsById: jest.fn().mockResolvedValue(
    new Map([
      [
        "apple",
        {
          itemId: "apple",
          name: "Apple",
          foodGroup: "fruit",
          rarity: "common",
          nutrition: { calories: 95, protein: 0, carbs: 25, fiber: 4, vitamins: ["C", "K"] },
          funFact: "Apple fact",
          superComboPairs: [],
        },
      ],
      [
        "banana",
        {
          itemId: "banana",
          name: "Banana",
          foodGroup: "fruit",
          rarity: "common",
          nutrition: { calories: 105, protein: 1, carbs: 27, fiber: 3, vitamins: ["B6", "C"] },
          funFact: "Banana fact",
          superComboPairs: [],
        },
      ],
      [
        "water",
        {
          itemId: "water",
          name: "Water",
          foodGroup: "drink",
          rarity: "common",
          nutrition: { calories: 0, protein: 0, carbs: 0, fiber: 0, vitamins: [] },
          funFact: "Water fact",
          superComboPairs: [],
        },
      ],
      [
        "milk",
        {
          itemId: "milk",
          name: "Milk",
          foodGroup: "drink",
          rarity: "common",
          nutrition: { calories: 150, protein: 8, carbs: 12, fiber: 0, vitamins: ["D", "B12", "A"] },
          funFact: "Milk fact",
          superComboPairs: [],
        },
      ],
      [
        "sandwich",
        {
          itemId: "sandwich",
          name: "Sandwich",
          foodGroup: "main",
          rarity: "common",
          nutrition: { calories: 350, protein: 18, carbs: 35, fiber: 3, vitamins: ["B1", "B3", "Iron"] },
          funFact: "Sandwich fact",
          superComboPairs: [],
        },
      ],
      [
        "granola-bar",
        {
          itemId: "granola-bar",
          name: "Granola Bar",
          foodGroup: "snack",
          rarity: "common",
          nutrition: { calories: 190, protein: 4, carbs: 29, fiber: 3, vitamins: ["E", "B1", "Iron"] },
          funFact: "Granola fact",
          superComboPairs: [],
        },
      ],
    ]),
  ),
  getFoodItemsByGroup: jest.fn().mockResolvedValue({
    drink: [
      { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" },
      { itemId: "milk", name: "Milk", foodGroup: "drink", rarity: "common" },
    ],
    fruit: [
      { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" },
      { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common" },
    ],
    veggie: [{ itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common" }],
    main: [{ itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common" }],
    snack: [{ itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common" }],
  }),
  getAllFoodItems: jest.fn().mockResolvedValue([]),
}));

jest.mock("@utils/index.js", () => ({
  errorHandler: jest.fn().mockImplementation(({ res }: any) => {
    if (res) return res.status(500).json({ error: "Internal server error" });
  }),
  getCredentials: jest.fn(),
  getKeyAsset: jest.fn(),
  getVisitor: jest.fn(),
  getVisitorBag: jest.fn(),
  grantFoodToVisitor: jest.fn().mockResolvedValue(undefined),
  removeFoodFromVisitor: jest.fn().mockResolvedValue(undefined),
  dropFoodItem: jest.fn().mockResolvedValue({ id: "new-dropped" }),
  Visitor: { get: jest.fn(), create: jest.fn() },
  World: { create: jest.fn(), deleteDroppedAssets: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("@utils/index.js"));

// --- Helpers for nearby-items tests ---

function setupNearbyMocks(opts: { foodAssets?: any[]; visitorData?: any; worldData?: any } = {}) {
  const { foodAssets = [], visitorData = {}, worldData = {} } = opts;

  mockUtils.getCredentials.mockReturnValue(baseCreds);

  const mockVisitor = {
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = visitorData;
      return Promise.resolve();
    }),
    dataObject: visitorData,
  };

  const mockWorld = {
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = worldData;
      return Promise.resolve();
    }),
    fetchDroppedAssetsWithUniqueName: jest.fn().mockResolvedValue(foodAssets),
    dataObject: worldData,
  };

  mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
  mockUtils.World.create.mockReturnValue(mockWorld);

  return { mockVisitor, mockWorld };
}

// --- Helpers for pickup-item tests ---

function setupPickupMocks(
  opts: {
    brownBag?: any[];
    visitorData?: any;
    foodAssetExists?: boolean;
    foodAssetUniqueName?: string;
    deleteThrows?: boolean;
  } = {},
) {
  const {
    brownBag = [],
    visitorData = {
      idealMeal: [{ itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" }],
      completedToday: false,
      pickupsToday: 0,
      pickupStreak: 0,
      hotStreakActive: false,
    },
    foodAssetExists = true,
    foodAssetUniqueName = `LunchSwap_foodItem|apple|common|${Date.now()}|1`,
    deleteThrows = false,
  } = opts;

  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getKeyAsset.mockResolvedValue({ id: "key-asset", position: { x: 0, y: 0 } });

  const mockFoodAsset = foodAssetExists
    ? {
        id: "food-asset-1",
        uniqueName: foodAssetUniqueName,
        position: { x: 110, y: 210 },
        fetchDataObject: jest.fn().mockImplementation(function (this: any) {
          this.dataObject = { itemId: "apple", rarity: "common" };
          return Promise.resolve();
        }),
        deleteDroppedAsset: deleteThrows
          ? jest.fn().mockRejectedValue(new Error("Already deleted"))
          : jest.fn().mockResolvedValue(undefined),
        dataObject: {},
      }
    : null;

  mockUtils.DroppedAsset.get.mockResolvedValue(mockFoodAsset);

  const mockVisitor = {
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    dataObject: visitorData,
  };

  const mockWorld = {
    fireToast: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockResolvedValue(undefined),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: {},
  };

  mockUtils.getVisitor.mockResolvedValue({ visitor: mockVisitor, visitorData, brownBag });

  const matchesIdeal = visitorData.idealMeal?.some((i: any) => i.itemId === "apple") ?? false;
  const pickedUpItem = {
    itemId: "apple",
    name: "Apple",
    foodGroup: "fruit",
    rarity: "common",
    matchesIdealMeal: matchesIdeal,
  };
  mockUtils.getVisitorBag.mockResolvedValue([...brownBag, pickedUpItem]);

  mockUtils.World.create.mockReturnValue(mockWorld);

  return { mockFoodAsset, mockVisitor, mockWorld };
}

describe("Mystery Items", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("GET /api/nearby-items — mystery item display", () => {
    test("mystery items show '???' for name and 'mystery' for rarity", async () => {
      const now = Date.now();
      setupNearbyMocks({
        foodAssets: [
          {
            id: "fa-1",
            uniqueName: `LunchSwap_foodItem|apple|common|${now}|1`,
            position: { x: 110, y: 210 },
            deleteDroppedAsset: jest.fn(),
          },
        ],
        visitorData: { idealMeal: [{ itemId: "apple" }] },
        worldData: { proximityRadius: 500 },
      });

      const app = makeApp();
      const res = await request(app).get("/api/nearby-items").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.nearbyItems).toHaveLength(1);
      const item = res.body.nearbyItems[0];
      expect(item.name).toBe("???");
      expect(item.rarity).toBe("mystery");
      expect(item.isMystery).toBe(true);
    });

    test("mystery items still show correct foodGroup as a hint", async () => {
      const now = Date.now();
      setupNearbyMocks({
        foodAssets: [
          {
            id: "fa-1",
            uniqueName: `LunchSwap_foodItem|apple|common|${now}|1`,
            position: { x: 110, y: 210 },
            deleteDroppedAsset: jest.fn(),
          },
        ],
        visitorData: { idealMeal: [] },
        worldData: { proximityRadius: 500 },
      });

      const app = makeApp();
      const res = await request(app).get("/api/nearby-items").query(baseCreds);

      expect(res.body.nearbyItems[0].foodGroup).toBe("fruit");
    });

    test("non-mystery items show real name and rarity with isMystery false", async () => {
      const now = Date.now();
      setupNearbyMocks({
        foodAssets: [
          {
            id: "fa-1",
            uniqueName: `LunchSwap_foodItem|apple|common|${now}|0`,
            position: { x: 110, y: 210 },
            deleteDroppedAsset: jest.fn(),
          },
        ],
        visitorData: { idealMeal: [] },
        worldData: { proximityRadius: 500 },
      });

      const app = makeApp();
      const res = await request(app).get("/api/nearby-items").query(baseCreds);

      expect(res.body.nearbyItems).toHaveLength(1);
      const item = res.body.nearbyItems[0];
      expect(item.name).toBe("Apple");
      expect(item.rarity).toBe("common");
      expect(item.isMystery).toBe(false);
    });

    test("legacy 4-segment uniqueName treated as non-mystery", async () => {
      const now = Date.now();
      setupNearbyMocks({
        foodAssets: [
          {
            id: "fa-1",
            uniqueName: `LunchSwap_foodItem|apple|common|${now}`,
            position: { x: 110, y: 210 },
            deleteDroppedAsset: jest.fn(),
          },
        ],
        visitorData: { idealMeal: [] },
        worldData: { proximityRadius: 500 },
      });

      const app = makeApp();
      const res = await request(app).get("/api/nearby-items").query(baseCreds);

      expect(res.body.nearbyItems[0].name).toBe("Apple");
      expect(res.body.nearbyItems[0].isMystery).toBe(false);
    });

    test("mystery items show matchesIdealMeal as false (hidden)", async () => {
      const now = Date.now();
      setupNearbyMocks({
        foodAssets: [
          {
            id: "fa-1",
            uniqueName: `LunchSwap_foodItem|apple|common|${now}|1`,
            position: { x: 110, y: 210 },
            deleteDroppedAsset: jest.fn(),
          },
        ],
        visitorData: { idealMeal: [{ itemId: "apple" }] },
        worldData: { proximityRadius: 500 },
      });

      const app = makeApp();
      const res = await request(app).get("/api/nearby-items").query(baseCreds);

      // Even though apple matches ideal meal, mystery hides this
      expect(res.body.nearbyItems[0].matchesIdealMeal).toBe(false);
    });
  });

  describe("POST /api/pickup-item — mystery item reveal", () => {
    test("pickup of mystery item has isMystery: true and reveals real item data", async () => {
      setupPickupMocks({
        foodAssetUniqueName: `LunchSwap_foodItem|apple|common|${Date.now()}|1`,
      });

      const app = makeApp();
      const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isMystery).toBe(true);
      // Real identity is revealed in the bag
      expect(res.body.pickedUpItem.itemId).toBe("apple");
      expect(res.body.pickedUpItem.name).toBe("Apple");
      expect(res.body.pickedUpItem.rarity).toBe("common");
    });

    test("pickup of non-mystery item has isMystery: false", async () => {
      setupPickupMocks({
        foodAssetUniqueName: `LunchSwap_foodItem|apple|common|${Date.now()}|0`,
      });

      const app = makeApp();
      const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

      expect(res.status).toBe(200);
      expect(res.body.isMystery).toBe(false);
      expect(res.body.pickedUpItem.itemId).toBe("apple");
    });

    test("legacy 4-segment uniqueName pickup has isMystery: false", async () => {
      setupPickupMocks({
        foodAssetUniqueName: `LunchSwap_foodItem|apple|common|${Date.now()}`,
      });

      const app = makeApp();
      const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

      expect(res.status).toBe(200);
      expect(res.body.isMystery).toBe(false);
    });
  });
});
