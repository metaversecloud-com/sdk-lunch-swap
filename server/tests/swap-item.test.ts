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
    deleteThrows?: boolean;
  } = {},
) {
  const {
    brownBag = [
      { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common", matchesTargetMeal: false },
      { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", matchesTargetMeal: false },
    ],
    visitorData = {
      targetMeal: [
        { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common" },
        { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" },
      ],
      completedToday: false,
      pickupsToday: 2,
      dropsToday: 0,
    },
    foodAssetExists = true,
    foodAssetUniqueName = `LunchSwap_foodItem|banana|common|${Date.now()}`,
    deleteThrows = false,
  } = opts;

  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getKeyAsset.mockResolvedValue({ id: "key-asset", position: { x: 0, y: 0 } });

  const mockFoodAsset = foodAssetExists
    ? {
        id: "food-asset-1",
        uniqueName: foodAssetUniqueName,
        position: { x: 110, y: 210 },
        updateDataObject: jest.fn().mockResolvedValue(undefined),
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

  const foodDef = {
    itemId: "banana",
    name: "Banana",
    foodGroup: "fruit",
    rarity: "common",
    funFact: "Banana fact",
  };

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

  if (deleteThrows) {
    mockUtils.pickupFoodAsset.mockResolvedValue({ pickedUp: false });
  } else {
    mockUtils.pickupFoodAsset.mockResolvedValue({ pickedUp: true });
  }

  // Default: buildBagItemFromDef returns a matching item
  mockUtils.buildBagItemFromDef.mockReturnValue({
    bagItem: { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesTargetMeal: true },
    matchesTargetMeal: true,
  });

  // Default: calculatePickupXp returns 35 (PICKUP 10 + COLLECT_TARGET_ITEM 25)
  mockUtils.calculatePickupXp.mockReturnValue(35);

  mockUtils.dropFoodItem.mockResolvedValue(undefined);

  // Default: grantXp returns the new total
  mockUtils.grantXp.mockResolvedValue(40);

  const mockVisitor = {
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
    updateDataObject: jest.fn().mockResolvedValue(undefined),
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
    dataObject: visitorData,
    fireToast: jest.fn().mockResolvedValue(undefined),
    fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
    inventoryItems: [],
  };

  const mockUser = {
    incrementDataObjectValue: jest.fn().mockResolvedValue(undefined),
  };

  const mockWorld = {
    fireToast: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: {},
  };

  mockUtils.getVisitor.mockResolvedValue({ visitor: mockVisitor, visitorData, brownBag, visitorInventory: [] });
  // After swap: sandwich removed, banana added, water stays
  mockUtils.getVisitorBag.mockResolvedValue([
    { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", matchesTargetMeal: false },
    { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesTargetMeal: true },
  ]);
  mockUtils.User.create.mockReturnValue(mockUser);
  mockUtils.World.create.mockReturnValue(mockWorld);

  return { mockFoodAsset, mockVisitor, mockUser, mockWorld };
}

describe("POST /api/swap-item", () => {
  beforeEach(() => jest.clearAllMocks());

  test("successful swap: old item dropped into world, new item picked up, bag stays same size", async () => {
    const { mockVisitor } = setupMocks();

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
    expect(res.body.matchesTargetMeal).toBe(true);
    expect(res.body.xpEarned).toBeGreaterThan(0);
    // Verify the food asset was picked up
    expect(mockUtils.pickupFoodAsset).toHaveBeenCalled();
    // Verify inventory operations
    expect(mockUtils.removeFoodFromVisitor).toHaveBeenCalledWith(mockVisitor, baseCreds, "sandwich");
    expect(mockUtils.dropFoodItem).toHaveBeenCalled();
    expect(mockUtils.grantFoodToVisitor).toHaveBeenCalled();
    // Verify visitor data was updated
    expect(mockVisitor.updateDataObject).toHaveBeenCalled();
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

  test("XP includes DROP + PICKUP with rarity multiplier + COLLECT_TARGET_ITEM bonus for matching item", async () => {
    // calculatePickupXp returns 35 (PICKUP 10 + COLLECT_TARGET_ITEM 25)
    // Total swap XP = DROP(5) + 35 = 40
    setupMocks();
    mockUtils.calculatePickupXp.mockReturnValue(35);

    const app = makeApp();
    const res = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    // DROP = 5, calculatePickupXp = 35
    // xpEarned = 5 + 35 = 40
    expect(res.body.xpEarned).toBe(40);
  });

  test("XP without target meal bonus for non-matching item", async () => {
    setupMocks({
      brownBag: [
        { itemId: "sandwich", name: "Sandwich", foodGroup: "main", rarity: "common", matchesTargetMeal: false },
      ],
      visitorData: {
        targetMeal: [{ itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" }],
        completedToday: false,
        pickupsToday: 1,
        dropsToday: 0,
      },
    });

    // Non-matching: calculatePickupXp returns 10 (PICKUP only)
    mockUtils.calculatePickupXp.mockReturnValue(10);

    // buildBagItemFromDef returns non-matching item
    mockUtils.buildBagItemFromDef.mockReturnValue({
      bagItem: { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesTargetMeal: false },
      matchesTargetMeal: false,
    });

    // Update getVisitorBag for this test case
    mockUtils.getVisitorBag.mockResolvedValue([
      { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesTargetMeal: false },
    ]);

    const app = makeApp();
    const res = await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    // DROP = 5, calculatePickupXp = 10
    // xpEarned = 5 + 10 = 15
    expect(res.body.xpEarned).toBe(15);
    expect(res.body.matchesTargetMeal).toBe(false);
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

  test("delete race condition (pickupFoodAsset returns not picked up): returns 409", async () => {
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
    const res1 = await request(app).post("/api/swap-item").query(baseCreds).send({});
    expect(res1.status).toBe(400);
    expect(res1.body.message).toBe("Missing dropItemId or pickupDroppedAssetId");

    // Missing pickupDroppedAssetId
    const res2 = await request(app).post("/api/swap-item").query(baseCreds).send({ dropItemId: "sandwich" });
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

  test("updates world stats for pickups and drops", async () => {
    setupMocks();

    const app = makeApp();
    await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    expect(mockUtils.updateWorldStats).toHaveBeenCalledWith("my-world", baseCreds, { pickups: 1, drops: 1 });
  });

  test("fires toast with swap message", async () => {
    const { mockVisitor } = setupMocks();

    const app = makeApp();
    await request(app)
      .post("/api/swap-item")
      .query(baseCreds)
      .send({ dropItemId: "sandwich", pickupDroppedAssetId: "food-asset-1" });

    expect(mockVisitor.fireToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Swapped!",
        text: expect.stringContaining("Sandwich"),
      }),
    );
  });
});
