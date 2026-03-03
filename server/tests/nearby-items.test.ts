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

jest.mock("@utils/index.js", () => ({
  errorHandler: jest.fn().mockImplementation(({ res }: any) => {
    if (res) return res.status(500).json({ error: "Internal server error" });
  }),
  getCredentials: jest.fn(),
  getDroppedAsset: jest.fn(),
  Visitor: { get: jest.fn() },
  World: { create: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn() },
  Asset: { create: jest.fn() },
}));

// Mock game logic to prevent import errors in handleGetGameState
jest.mock("@utils/gameLogic/index.js", () => ({
  generateIdealMeal: jest.fn().mockResolvedValue([]),
  generateBrownBag: jest.fn().mockResolvedValue([]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  isNewDay: jest.fn().mockReturnValue(false),
}));

jest.mock("@utils/foodItemLookup.js", () => ({
  getFoodItemsById: jest.fn().mockResolvedValue(new Map([
    ["apple", { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", nutrition: { calories: 95, protein: 0, carbs: 25, fiber: 4, vitamins: ["C", "K"] }, funFact: "Apple fact", superComboPairs: [] }],
    ["banana", { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", nutrition: { calories: 105, protein: 1, carbs: 27, fiber: 3, vitamins: ["B6", "C"] }, funFact: "Banana fact", superComboPairs: [] }],
    ["water", { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", nutrition: { calories: 0, protein: 0, carbs: 0, fiber: 0, vitamins: [] }, funFact: "Water fact", superComboPairs: [] }],
    ["milk", { itemId: "milk", name: "Milk", foodGroup: "drink", rarity: "common", nutrition: { calories: 150, protein: 8, carbs: 12, fiber: 0, vitamins: ["D", "B12", "A"] }, funFact: "Milk fact", superComboPairs: [] }],
    ["sandwich", { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common", nutrition: { calories: 350, protein: 18, carbs: 35, fiber: 3, vitamins: ["B1", "B3", "Iron"] }, funFact: "Sandwich fact", superComboPairs: [] }],
    ["granola-bar", { itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common", nutrition: { calories: 190, protein: 4, carbs: 29, fiber: 3, vitamins: ["E", "B1", "Iron"] }, funFact: "Granola fact", superComboPairs: [] }],
  ])),
  getFoodItemsByGroup: jest.fn().mockResolvedValue({
    drink: [{ itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" }, { itemId: "milk", name: "Milk", foodGroup: "drink", rarity: "common" }],
    fruit: [{ itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" }, { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common" }],
    veggie: [{ itemId: "carrots", name: "Carrots", foodGroup: "veggie", rarity: "common" }],
    main: [{ itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common" }],
    snack: [{ itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack", rarity: "common" }],
  }),
  getAllFoodItems: jest.fn().mockResolvedValue([]),
}));

const mockUtils = jest.mocked(require("@utils/index.js"));

function setupMocks(opts: { foodAssets?: any[]; visitorData?: any; worldData?: any } = {}) {
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

describe("GET /api/nearby-items", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns nearby items sorted by distance", async () => {
    const now = Date.now();
    setupMocks({
      foodAssets: [
        { id: "fa-1", uniqueName: `lunch-swap-food|apple|common|${now}`, position: { x: 120, y: 210 }, deleteDroppedAsset: jest.fn() },
        { id: "fa-2", uniqueName: `lunch-swap-food|banana|common|${now}`, position: { x: 105, y: 205 }, deleteDroppedAsset: jest.fn() },
      ],
      visitorData: { idealMeal: [{ itemId: "apple" }] },
      worldData: { proximityRadius: 500 },
    });

    const app = makeApp();
    const res = await request(app).get("/api/nearby-items").query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.nearbyItems).toHaveLength(2);
    // Closer item first (banana at (105,205) is closer to visitor at (100,200) than apple at (120,210))
    expect(res.body.nearbyItems[0].itemId).toBe("banana");
    expect(res.body.nearbyItems[1].itemId).toBe("apple");
  });

  test("filters out expired items (>24h) and deletes them", async () => {
    const expired = Date.now() - 25 * 60 * 60 * 1000;
    const fresh = Date.now();
    const deleteExpired = jest.fn().mockResolvedValue(undefined);

    setupMocks({
      foodAssets: [
        { id: "fa-1", uniqueName: `lunch-swap-food|apple|common|${expired}`, position: { x: 110, y: 210 }, deleteDroppedAsset: deleteExpired },
        { id: "fa-2", uniqueName: `lunch-swap-food|banana|common|${fresh}`, position: { x: 110, y: 210 }, deleteDroppedAsset: jest.fn() },
      ],
      worldData: { proximityRadius: 500 },
    });

    const app = makeApp();
    const res = await request(app).get("/api/nearby-items").query(baseCreds);

    expect(res.body.success).toBe(true);
    expect(res.body.nearbyItems).toHaveLength(1);
    expect(res.body.nearbyItems[0].itemId).toBe("banana");
    expect(deleteExpired).toHaveBeenCalled();
  });

  test("marks items that match ideal meal", async () => {
    const now = Date.now();
    setupMocks({
      foodAssets: [
        { id: "fa-1", uniqueName: `lunch-swap-food|apple|common|${now}`, position: { x: 110, y: 210 }, deleteDroppedAsset: jest.fn() },
        { id: "fa-2", uniqueName: `lunch-swap-food|banana|common|${now}`, position: { x: 105, y: 205 }, deleteDroppedAsset: jest.fn() },
      ],
      visitorData: { idealMeal: [{ itemId: "apple" }, { itemId: "water" }] },
      worldData: { proximityRadius: 500 },
    });

    const app = makeApp();
    const res = await request(app).get("/api/nearby-items").query(baseCreds);

    const appleItem = res.body.nearbyItems.find((i: any) => i.itemId === "apple");
    const bananaItem = res.body.nearbyItems.find((i: any) => i.itemId === "banana");
    expect(appleItem.matchesIdealMeal).toBe(true);
    expect(bananaItem.matchesIdealMeal).toBe(false);
  });

  test("returns empty array if no items nearby", async () => {
    setupMocks({ foodAssets: [], worldData: { proximityRadius: 150 } });

    const app = makeApp();
    const res = await request(app).get("/api/nearby-items").query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.nearbyItems).toEqual([]);
  });

  test("filters out items beyond proximity radius", async () => {
    const now = Date.now();
    setupMocks({
      foodAssets: [
        { id: "fa-1", uniqueName: `lunch-swap-food|apple|common|${now}`, position: { x: 110, y: 210 }, deleteDroppedAsset: jest.fn() },
        { id: "fa-2", uniqueName: `lunch-swap-food|banana|common|${now}`, position: { x: 9999, y: 9999 }, deleteDroppedAsset: jest.fn() },
      ],
      worldData: { proximityRadius: 50 },
    });

    const app = makeApp();
    const res = await request(app).get("/api/nearby-items").query(baseCreds);

    expect(res.body.nearbyItems).toHaveLength(1);
    expect(res.body.nearbyItems[0].itemId).toBe("apple");
  });

  test("skips items with malformed uniqueName", async () => {
    const now = Date.now();
    setupMocks({
      foodAssets: [
        { id: "fa-1", uniqueName: "lunch-swap-food|apple", position: { x: 110, y: 210 }, deleteDroppedAsset: jest.fn() },
        { id: "fa-2", uniqueName: `lunch-swap-food|banana|common|${now}`, position: { x: 105, y: 205 }, deleteDroppedAsset: jest.fn() },
      ],
      worldData: { proximityRadius: 500 },
    });

    const app = makeApp();
    const res = await request(app).get("/api/nearby-items").query(baseCreds);

    expect(res.body.nearbyItems).toHaveLength(1);
    expect(res.body.nearbyItems[0].itemId).toBe("banana");
  });

  test("skips items with unknown itemId not in inventory cache", async () => {
    const now = Date.now();
    setupMocks({
      foodAssets: [
        { id: "fa-1", uniqueName: `lunch-swap-food|unknown-food-xyz|common|${now}`, position: { x: 110, y: 210 }, deleteDroppedAsset: jest.fn() },
        { id: "fa-2", uniqueName: `lunch-swap-food|apple|common|${now}`, position: { x: 105, y: 205 }, deleteDroppedAsset: jest.fn() },
      ],
      worldData: { proximityRadius: 500 },
    });

    const app = makeApp();
    const res = await request(app).get("/api/nearby-items").query(baseCreds);

    expect(res.body.nearbyItems).toHaveLength(1);
    expect(res.body.nearbyItems[0].itemId).toBe("apple");
  });

  test("includes correct food item details from inventory cache", async () => {
    const now = Date.now();
    setupMocks({
      foodAssets: [
        { id: "fa-1", uniqueName: `lunch-swap-food|apple|common|${now}`, position: { x: 100, y: 200 }, deleteDroppedAsset: jest.fn() },
      ],
      worldData: { proximityRadius: 500 },
    });

    const app = makeApp();
    const res = await request(app).get("/api/nearby-items").query(baseCreds);

    expect(res.body.nearbyItems).toHaveLength(1);
    const item = res.body.nearbyItems[0];
    expect(item.droppedAssetId).toBe("fa-1");
    expect(item.name).toBe("Apple");
    expect(item.foodGroup).toBe("fruit");
    expect(item.rarity).toBe("common");
    expect(item.distance).toBe(0);
  });

  test("handles errors gracefully via errorHandler", async () => {
    mockUtils.getCredentials.mockReturnValue(baseCreds);
    mockUtils.Visitor.get.mockRejectedValue(new Error("Visitor not found"));

    const app = makeApp();
    await request(app).get("/api/nearby-items").query(baseCreds);

    expect(mockUtils.errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "handleGetNearbyItems",
        message: "Error getting nearby items",
      }),
    );
  });

  test("uses default proximityRadius of 150 when not set in world data", async () => {
    const now = Date.now();
    setupMocks({
      foodAssets: [
        // 22.36 units away (within 150)
        { id: "fa-1", uniqueName: `lunch-swap-food|apple|common|${now}`, position: { x: 120, y: 210 }, deleteDroppedAsset: jest.fn() },
        // ~13900 units away (outside 150)
        { id: "fa-2", uniqueName: `lunch-swap-food|banana|common|${now}`, position: { x: 9999, y: 9999 }, deleteDroppedAsset: jest.fn() },
      ],
      worldData: {}, // no proximityRadius set
    });

    const app = makeApp();
    const res = await request(app).get("/api/nearby-items").query(baseCreds);

    expect(res.body.nearbyItems).toHaveLength(1);
    expect(res.body.nearbyItems[0].itemId).toBe("apple");
  });
});
