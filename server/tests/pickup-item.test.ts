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
  getKeyAsset: jest.fn(),
  getVisitor: jest.fn(),
  getVisitorBag: jest.fn(),
  grantFoodToVisitor: jest.fn().mockResolvedValue(undefined),
  removeFoodFromVisitor: jest.fn().mockResolvedValue(undefined),
  dropFoodItem: jest.fn().mockResolvedValue(undefined),
  World: { create: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("../utils/index.js"));

function setupMocks(opts: {
  brownBag?: any[];
  visitorData?: any;
  foodAssetExists?: boolean;
  foodAssetUniqueName?: string;
  deleteThrows?: boolean;
} = {}) {
  const {
    brownBag = [],
    visitorData = {
      idealMeal: [{ itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", collected: false }],
      completedToday: false,
      pickupsToday: 0,
      totalPickups: 0,
    },
    foodAssetExists = true,
    foodAssetUniqueName = `lunch-swap-food|apple|common|${Date.now()}`,
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
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = {};
      return Promise.resolve();
    }),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: {},
  };

  mockUtils.getVisitor.mockResolvedValue({ visitor: mockVisitor, visitorData, brownBag });
  // After pickup, bag has the new item
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

describe("POST /api/pickup-item", () => {
  beforeEach(() => jest.clearAllMocks());

  test("successful pickup: item added to bag, returns fun fact and XP", async () => {
    const { mockFoodAsset, mockVisitor } = setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-1" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.brownBag).toHaveLength(1);
    expect(res.body.brownBag[0].itemId).toBe("apple");
    expect(res.body.brownBag[0].matchesIdealMeal).toBe(true);
    expect(res.body.matchesIdealMeal).toBe(true);
    expect(res.body.xpEarned).toBeGreaterThan(0);
    expect(res.body.funFact).toBeTruthy();
    expect(res.body.pickedUpItem).toBeDefined();
    expect(mockFoodAsset!.deleteDroppedAsset).toHaveBeenCalled();
    expect(mockUtils.grantFoodToVisitor).toHaveBeenCalled();
    expect(mockVisitor.updateDataObject).toHaveBeenCalled();
  });

  test("XP includes COLLECT_IDEAL_ITEM bonus when item matches ideal meal", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-1" });

    // PICKUP base = 10, common xpMultiplier = 1.0, COLLECT_IDEAL_ITEM = 25
    // xpEarned = Math.round(10 * 1.0) + 25 = 35
    expect(res.body.xpEarned).toBe(35);
  });

  test("XP without ideal meal bonus for non-matching item", async () => {
    setupMocks({
      visitorData: {
        idealMeal: [{ itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", collected: false }],
        completedToday: false,
        pickupsToday: 0,
        totalPickups: 0,
      },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-1" });

    // PICKUP base = 10, common xpMultiplier = 1.0, no ideal meal bonus
    // xpEarned = Math.round(10 * 1.0) = 10
    expect(res.body.xpEarned).toBe(10);
    expect(res.body.matchesIdealMeal).toBe(false);
  });

  test("updates ideal meal collected status when matching item picked up", async () => {
    setupMocks({
      visitorData: {
        idealMeal: [
          { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", collected: false },
          { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", collected: false },
        ],
        completedToday: false,
        pickupsToday: 0,
        totalPickups: 0,
      },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-1" });

    expect(res.body.idealMeal[0].collected).toBe(true);
    expect(res.body.idealMeal[1].collected).toBe(false);
  });

  test("missing droppedAssetId returns 400", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing droppedAssetId");
  });

  test("bag full before completion (8 items): returns 400 with dynamic message", async () => {
    const fullBag = Array.from({ length: 8 }, (_, i) => ({
      itemId: `item-${i}`,
      name: `Item ${i}`,
      foodGroup: "snack",
      rarity: "common",
      matchesIdealMeal: false,
    }));
    setupMocks({
      brownBag: fullBag,
      visitorData: { idealMeal: [], completedToday: false, pickupsToday: 5, totalPickups: 5 },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-1" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Bag is full (8/8)");
  });

  test("bag full after completion (3 items): returns 400 with 3/3", async () => {
    const postCompBag = Array.from({ length: 3 }, (_, i) => ({
      itemId: `item-${i}`,
      name: `Item ${i}`,
      foodGroup: "snack",
      rarity: "common",
      matchesIdealMeal: false,
    }));
    setupMocks({
      brownBag: postCompBag,
      visitorData: { idealMeal: [], completedToday: true, pickupsToday: 3, totalPickups: 3 },
    });

    const app = makeApp();
    const res = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-1" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Bag is full (3/3)");
  });

  test("item already gone (null asset): returns 409", async () => {
    setupMocks({ foodAssetExists: false });

    const app = makeApp();
    const res = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-1" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("This item was already picked up");
  });

  test("delete race condition (deleteDroppedAsset throws): returns 409", async () => {
    setupMocks({ deleteThrows: true });

    const app = makeApp();
    const res = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-1" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("This item was already picked up");
  });

  test("fires toast with fun fact", async () => {
    const { mockWorld } = setupMocks();

    const app = makeApp();
    await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-1" });

    expect(mockWorld.fireToast).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.any(String),
      }),
    );
  });
});
