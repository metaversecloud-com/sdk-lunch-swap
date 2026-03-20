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
  generateMeal: jest.fn().mockResolvedValue([]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  getCurrentWeekMT: jest.fn().mockReturnValue("2026-W06"),
  getPreviousWeekMT: jest.fn().mockReturnValue("2026-W05"),
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
  dropFoodItem: jest.fn().mockResolvedValue(undefined),
  resolveFoodAsset: jest.fn(),
  pickupFoodAsset: jest.fn().mockResolvedValue({ pickedUp: true }),
  buildBagItemFromDef: jest.fn(),
  calculatePickupXp: jest.fn().mockReturnValue(10),
  grantXp: jest.fn().mockResolvedValue(0),
  updateWorldStats: jest.fn().mockResolvedValue(undefined),
  checkPickupBadges: jest.fn().mockResolvedValue(undefined),
  checkLevelBadges: jest.fn().mockResolvedValue(undefined),
  getVisitorBadges: jest.fn().mockReturnValue({ badges: {} }),
  World: { create: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("@utils/index.js"));

function setupMocks(
  opts: {
    brownBag?: any[];
    visitorData?: any;
    foodAssetExists?: boolean;
    foodAssetUniqueName?: string;
    pickupFails?: boolean;
  } = {},
) {
  const {
    brownBag = [],
    visitorData = {
      targetMeal: [{ itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" }],
      completedToday: false,
      pickupsToday: 0,
      totalPickups: 0,
    },
    foodAssetExists = true,
    foodAssetUniqueName = `LunchSwap_foodItem|apple|common|${Date.now()}`,
    pickupFails = false,
  } = opts;

  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getKeyAsset.mockResolvedValue({ id: "key-asset", position: { x: 0, y: 0 } });

  const mockFoodAsset = {
    id: "food-asset-1",
    uniqueName: foodAssetUniqueName,
    position: { x: 110, y: 210 },
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = { itemId: "apple", rarity: "common" };
      return Promise.resolve();
    }),
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: {},
  };

  const foodDef = { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", funFact: "Apple fact" };

  if (foodAssetExists) {
    mockUtils.resolveFoodAsset.mockResolvedValue({
      success: true,
      foodAsset: mockFoodAsset,
      foodDef,
      isMystery: false,
    });
  } else {
    mockUtils.resolveFoodAsset.mockResolvedValue({
      success: false,
      status: 409,
      message: "This item was already picked up",
    });
  }

  if (pickupFails) {
    mockUtils.pickupFoodAsset.mockResolvedValue({ pickedUp: false });
  } else {
    mockUtils.pickupFoodAsset.mockResolvedValue({ pickedUp: true });
  }

  const matchesTarget = visitorData.targetMeal?.some((i: any) => i.itemId === "apple") ?? false;

  mockUtils.buildBagItemFromDef.mockReturnValue({
    bagItem: { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", matchesTargetMeal: matchesTarget },
    matchesTargetMeal: matchesTarget,
  });

  mockUtils.calculatePickupXp.mockReturnValue(matchesTarget ? 35 : 10);

  const mockVisitor = {
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    dataObject: visitorData,
    fireToast: jest.fn().mockReturnValue(Promise.resolve()),
    fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
    inventoryItems: [],
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

  mockUtils.getVisitor.mockResolvedValue({ visitor: mockVisitor, visitorData, visitorInventory: [], brownBag });
  // After pickup, bag has the new item
  const pickedUpItem = {
    itemId: "apple",
    name: "Apple",
    foodGroup: "fruit",
    rarity: "common",
    matchesTargetMeal: matchesTarget,
  };
  mockUtils.getVisitorBag.mockResolvedValue([...brownBag, pickedUpItem]);
  mockUtils.World.create.mockReturnValue(mockWorld);

  return { mockFoodAsset, mockVisitor, mockWorld };
}

describe("POST /api/pickup-item", () => {
  beforeEach(() => jest.clearAllMocks());

  test("successful pickup: item added to bag, returns fun fact and XP", async () => {
    const { mockVisitor } = setupMocks();

    const app = makeApp();
    const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.brownBag).toHaveLength(1);
    expect(res.body.brownBag[0].itemId).toBe("apple");
    expect(res.body.brownBag[0].matchesTargetMeal).toBe(true);
    expect(res.body.matchesTargetMeal).toBe(true);
    expect(res.body.xpEarned).toBeGreaterThan(0);
    expect(res.body.funFact).toBeTruthy();
    expect(res.body.pickedUpItem).toBeDefined();
    expect(mockUtils.pickupFoodAsset).toHaveBeenCalled();
    expect(mockUtils.grantFoodToVisitor).toHaveBeenCalled();
    expect(mockVisitor.updateDataObject).toHaveBeenCalled();
  });

  test("XP includes COLLECT_TARGET_ITEM bonus when item matches target meal", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

    // PICKUP base = 10, common xpMultiplier = 1.0, COLLECT_TARGET_ITEM = 25
    // xpEarned = Math.round(10 * 1.0) + 25 = 35
    expect(res.body.xpEarned).toBe(35);
  });

  test("XP without target meal bonus for non-matching item", async () => {
    setupMocks({
      visitorData: {
        targetMeal: [{ itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" }],
        completedToday: false,
        pickupsToday: 0,
        totalPickups: 0,
      },
    });

    const app = makeApp();
    const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

    // PICKUP base = 10, common xpMultiplier = 1.0, no target meal bonus
    // xpEarned = Math.round(10 * 1.0) = 10
    expect(res.body.xpEarned).toBe(10);
    expect(res.body.matchesTargetMeal).toBe(false);
  });

  test("missing droppedAssetId returns 400", async () => {
    setupMocks();

    const app = makeApp();
    const res = await request(app).post("/api/pickup-item").query(baseCreds).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing droppedAssetId");
  });

  test("bag full before completion (8 items): returns 400 with dynamic message", async () => {
    const fullBag = Array.from({ length: 8 }, (_, i) => ({
      itemId: `item-${i}`,
      name: `Item ${i}`,
      foodGroup: "snack",
      rarity: "common",
      matchesTargetMeal: false,
    }));
    setupMocks({
      brownBag: fullBag,
      visitorData: { targetMeal: [], completedToday: false, pickupsToday: 5, totalPickups: 5 },
    });

    const app = makeApp();
    const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Bag is full (8/8)");
  });

  test("bag full after completion (3 items): returns 400 with 3/3", async () => {
    const postCompBag = Array.from({ length: 3 }, (_, i) => ({
      itemId: `item-${i}`,
      name: `Item ${i}`,
      foodGroup: "snack",
      rarity: "common",
      matchesTargetMeal: false,
    }));
    setupMocks({
      brownBag: postCompBag,
      visitorData: { targetMeal: [], completedToday: true, pickupsToday: 3, totalPickups: 3 },
    });

    const app = makeApp();
    const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Bag is full (3/3)");
  });

  test("item already gone (null asset): returns 409", async () => {
    setupMocks({ foodAssetExists: false });

    const app = makeApp();
    const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("This item was already picked up");
  });

  test("pickup race condition (pickupFoodAsset returns pickedUp: false): returns 409", async () => {
    setupMocks({ pickupFails: true });

    const app = makeApp();
    const res = await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("This item was already picked up");
  });

  test("fires toast with fun fact", async () => {
    const { mockVisitor } = setupMocks();

    const app = makeApp();
    await request(app).post("/api/pickup-item").query(baseCreds).send({ droppedAssetId: "food-asset-1" });

    expect(mockVisitor.fireToast).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.any(String),
      }),
    );
  });
});
