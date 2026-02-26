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
jest.mock("../utils/gameLogic/index.js", () => ({
  generateIdealMeal: jest.fn().mockReturnValue([]),
  generateBrownBag: jest.fn().mockReturnValue([]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  isNewDay: jest.fn().mockReturnValue(false),
}));

jest.mock("../utils/index.js", () => ({
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

const mockUtils = jest.mocked(require("../utils/index.js"));

function setupMocks(opts: {
  visitorData?: any;
  foodAssetExists?: boolean;
  foodAssetUniqueName?: string;
  deleteThrows?: boolean;
} = {}) {
  const {
    visitorData = {
      brownBag: [
        { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common", matchesIdealMeal: false },
        { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", matchesIdealMeal: false },
      ],
      idealMeal: [
        { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", collected: false },
        { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", collected: true },
      ],
      completedToday: false,
      pickupsToday: 2,
      dropsToday: 0,
    },
    foodAssetExists = true,
    foodAssetUniqueName = `lunch-swap-food|banana|common|${Date.now()}`,
    deleteThrows = false,
  } = opts;

  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getDroppedAsset.mockResolvedValue({ id: "key-asset", position: { x: 0, y: 0 } });

  const mockFoodAsset = foodAssetExists
    ? {
        id: "food-asset-1",
        uniqueName: foodAssetUniqueName,
        position: { x: 110, y: 210 },
        fetchDataObject: jest.fn().mockImplementation(function (this: any) {
          this.dataObject = { itemId: "banana", rarity: "common" };
          return Promise.resolve();
        }),
        deleteDroppedAsset: deleteThrows
          ? jest.fn().mockRejectedValue(new Error("Already deleted"))
          : jest.fn().mockResolvedValue(undefined),
        dataObject: {},
      }
    : null;

  mockUtils.DroppedAsset.get.mockResolvedValue(mockFoodAsset);
  mockUtils.DroppedAsset.drop.mockResolvedValue(undefined as any);
  mockUtils.Asset.create.mockResolvedValue({ id: "new-asset-id" } as any);

  const mockVisitor = {
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = visitorData;
      return Promise.resolve();
    }),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    dataObject: visitorData,
  };

  const mockUser = {
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
  };

  const mockWorld = {
    fireToast: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: {},
  };

  mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
  mockUtils.User.create.mockReturnValue(mockUser);
  mockUtils.World.create.mockReturnValue(mockWorld);

  return { mockFoodAsset, mockVisitor, mockUser, mockWorld };
}

describe("POST /api/swap-item", () => {
  beforeEach(() => jest.clearAllMocks());

  test("successful swap: old item dropped into world, new item picked up, bag stays same size", async () => {
    const { mockFoodAsset, mockVisitor } = setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Bag should stay same size (2): sandwich removed, banana added
    expect(res.body.brownBag).toHaveLength(2);
    expect(res.body.pickedUpItem.itemId).toBe("banana");
    expect(res.body.pickedUpItem.name).toBe("Banana");
    expect(res.body.droppedItem.itemId).toBe("sandwich");
    expect(res.body.droppedItem.name).toBe("Sandwich");
    expect(res.body.matchesIdealMeal).toBe(true);
    expect(res.body.xpEarned).toBeGreaterThan(0);
    // Verify the food asset was deleted (pickup)
    expect(mockFoodAsset!.deleteDroppedAsset).toHaveBeenCalled();
    // Verify a new asset was dropped into the world
    expect(mockUtils.Asset.create).toHaveBeenCalled();
    expect(mockUtils.DroppedAsset.drop).toHaveBeenCalled();
    // Verify visitor data was updated
    expect(mockVisitor.updateDataObject).toHaveBeenCalled();
    expect(mockVisitor.incrementDataObjectValue).toHaveBeenCalledWith("pickupsToday", 1);
    expect(mockVisitor.incrementDataObjectValue).toHaveBeenCalledWith("dropsToday", 1);
  });

  test("returns updated bag with dropped item removed and picked up item added", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    expect(res.status).toBe(200);
    const bagItemIds = res.body.brownBag.map((i: any) => i.itemId);
    // Sandwich should be gone, banana should be added, water should remain
    expect(bagItemIds).not.toContain("sandwich");
    expect(bagItemIds).toContain("banana");
    expect(bagItemIds).toContain("water");
  });

  test("XP includes DROP + PICKUP with rarity multiplier + COLLECT_IDEAL_ITEM bonus for matching item", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    // DROP = 5, PICKUP = 10, common xpMultiplier = 1.0, COLLECT_IDEAL_ITEM = 25
    // xpEarned = 5 + Math.round(10 * 1.0) + 25 = 40
    expect(res.body.xpEarned).toBe(40);
  });

  test("XP without ideal meal bonus for non-matching item", async () => {
    setupMocks({
      visitorData: {
        brownBag: [
          { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common", matchesIdealMeal: false },
        ],
        idealMeal: [
          { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", collected: false },
        ],
        completedToday: false,
        pickupsToday: 1,
        dropsToday: 0,
      },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    // DROP = 5, PICKUP = 10, common xpMultiplier = 1.0, no ideal meal bonus
    // xpEarned = 5 + Math.round(10 * 1.0) = 15
    expect(res.body.xpEarned).toBe(15);
    expect(res.body.matchesIdealMeal).toBe(false);
  });

  test("drop item not in bag: returns 400 with 'Item not found in bag'", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "nonexistent-item", pickupDroppedAssetId: "food-asset-1" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Item not found in bag");
  });

  test("pickup target already gone (null asset): returns 409", async () => {
    setupMocks({ foodAssetExists: false });

    const app = makeApp();
    const res = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("This item was already picked up");
  });

  test("delete race condition (deleteDroppedAsset throws): returns 409", async () => {
    setupMocks({ deleteThrows: true });

    const app = makeApp();
    const res = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("This item was already picked up");
  });

  test("missing required fields: returns 400", async () => {
    setupMocks();

    const app = makeApp();

    // Missing both
    const res1 = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({});
    expect(res1.status).toBe(400);
    expect(res1.body.message).toBe("Missing dropItemId or pickupDroppedAssetId");

    // Missing pickupDroppedAssetId
    const res2 = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich" });
    expect(res2.status).toBe(400);
    expect(res2.body.message).toBe("Missing dropItemId or pickupDroppedAssetId");

    // Missing dropItemId
    const res3 = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ pickupDroppedAssetId: "food-asset-1" });
    expect(res3.status).toBe(400);
    expect(res3.body.message).toBe("Missing dropItemId or pickupDroppedAssetId");
  });

  test("increments user totalPickups and totalDrops", async () => {
    const { mockUser } = setupMocks();

    const app = makeApp();
    await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    expect(mockUser.incrementDataObjectValue).toHaveBeenCalledWith("totalPickups", 1);
    expect(mockUser.incrementDataObjectValue).toHaveBeenCalledWith("totalDrops", 1);
  });

  test("fires toast with swap message", async () => {
    const { mockWorld } = setupMocks();

    const app = makeApp();
    await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    expect(mockWorld.fireToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Swapped!",
        text: expect.stringContaining("Sandwich"),
      }),
    );
  });

  test("updates ideal meal collected status when matching item picked up", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    // banana matches ideal meal, so it should be marked as collected
    const bananaIdeal = res.body.idealMeal.find((i: any) => i.itemId === "banana");
    expect(bananaIdeal.collected).toBe(true);
    // water was already collected, should remain collected
    const waterIdeal = res.body.idealMeal.find((i: any) => i.itemId === "water");
    expect(waterIdeal.collected).toBe(true);
  });
});
