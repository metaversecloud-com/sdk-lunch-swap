import express from "express";
import request from "supertest";
import router from "../routes.js";

/**
 * Integration test: exercises the full game flow in sequence.
 *
 * 1. GET  /api/game-state  (new day)   -> generates target meal, bag starts empty
 * 2. POST /api/pickup-item             -> adds item to bag
 * 3. POST /api/drop-item               -> removes item from bag
 * 4. POST /api/submit-meal             -> completes the meal
 */

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

// --- Target meal (5 items from 5 food groups) ---
const targetMeal = [
  { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" },
  { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" },
  { itemId: "chicken_breast", name: "Chicken Breast", foodGroup: "main", rarity: "common" },
  { itemId: "carrot_sticks", name: "Carrot Sticks", foodGroup: "veggie", rarity: "common" },
  { itemId: "trail_mix", name: "Trail Mix", foodGroup: "snack", rarity: "common" },
];

// --- Mock game logic ---
jest.mock("@utils/gameLogic/index.js", () => ({
  generateMeal: jest.fn().mockResolvedValue([
    { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common" },
    { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common" },
    { itemId: "chicken_breast", name: "Chicken Breast", foodGroup: "main", rarity: "common" },
    { itemId: "carrot_sticks", name: "Carrot Sticks", foodGroup: "veggie", rarity: "common" },
    { itemId: "trail_mix", name: "Trail Mix", foodGroup: "snack", rarity: "common" },
  ]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  getCurrentWeekMT: jest.fn().mockReturnValue("2026-W06"),
  getPreviousWeekMT: jest.fn().mockReturnValue("2026-W05"),
  isNewDay: jest.fn().mockReturnValue(true),
  calculateNutritionScore: jest.fn().mockResolvedValue({
    score: 88,
    breakdown: { proteinScore: 22, fiberScore: 20, vitaminDiversity: 23, balanceScore: 23 },
    superCombos: [],
    totalXpEarned: 0,
    bonusXp: 50,
  }),
  detectSuperCombos: jest.fn().mockReturnValue([]),
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

const mockGameLogic = jest.mocked(require("@utils/gameLogic/index.js"));

// --- Mock SDK utils ---
jest.mock("@utils/index.js", () => ({
  errorHandler: jest.fn().mockImplementation(({ res }: any) => {
    if (res) return res.status(500).json({ error: "Internal server error" });
  }),
  getCredentials: jest.fn(),
  getKeyAsset: jest.fn(),
  getVisitor: jest.fn(),
  getVisitorBag: jest.fn(),
  getFoodItemsById: jest.fn().mockResolvedValue(new Map()),
  getAllFoodItems: jest.fn().mockResolvedValue([]),
  getFoodItemDefinition: jest.fn(),
  grantFoodToVisitor: jest.fn().mockResolvedValue(undefined),
  removeFoodFromVisitor: jest.fn().mockResolvedValue(undefined),
  dropFoodItem: jest.fn().mockResolvedValue({ id: "new-dropped" }),
  resolveFoodAsset: jest.fn(),
  pickupFoodAsset: jest.fn().mockResolvedValue({ pickedUp: true }),
  buildBagItemFromDef: jest.fn(),
  calculatePickupXp: jest.fn().mockReturnValue(10),
  grantXp: jest.fn().mockResolvedValue(10),
  updateWorldStats: jest.fn().mockResolvedValue(undefined),
  parseLeaderboard: jest.fn().mockReturnValue([]),
  updateLeaderboard: jest.fn().mockResolvedValue(undefined),
  checkSubmitMealBadges: jest.fn().mockResolvedValue(undefined),
  checkLevelBadges: jest.fn().mockResolvedValue(undefined),
  checkPickupBadges: jest.fn().mockResolvedValue(undefined),
  getVisitorBadges: jest.fn().mockReturnValue([]),
  getBadges: jest.fn().mockResolvedValue([]),
  getFoodItemsInWorld: jest.fn().mockResolvedValue([]),
  Visitor: { get: jest.fn(), create: jest.fn() },
  World: { create: jest.fn(), deleteDroppedAssets: jest.fn() },
  User: { create: jest.fn() },
  DroppedAsset: { get: jest.fn(), drop: jest.fn(), create: jest.fn() },
  Asset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("@utils/index.js"));

// -----------------------------------------------------------------------
// Shared mutable state that the mock objects read/write, simulating
// how the real visitor/user/world data objects evolve across requests.
// -----------------------------------------------------------------------

let visitorData: Record<string, any>;
let worldData: Record<string, any>;
let currentBag: any[];

function resetState() {
  visitorData = {
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    bestNutritionScore: 0,
    totalMealsCompleted: 0,
    totalPickups: 0,
    totalDrops: 0,
    totalSuperCombos: 0,
    pickupStreak: 0,
    hotStreakActive: false,
    completedToday: false,
    pickupsToday: 0,
    dropsToday: 0,
  };
  worldData = {};
  currentBag = [];
}

/**
 * Wire up all mocks so they behave like a coherent in-memory store.
 * Each request gets fresh mock function instances but they all read/write
 * the shared `visitorData`, `worldData`, `currentBag` objects above.
 */
function setupIntegrationMocks() {
  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getKeyAsset.mockResolvedValue({
    id: "key-asset-1",
    position: { x: 0, y: 0 },
    fetchDataObject: jest.fn().mockResolvedValue(undefined),
    dataObject: {},
  });

  // Visitor mock -------------------------------------------------------
  const makeVisitor = () => ({
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
    fireToast: jest.fn().mockResolvedValue(undefined),
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = { ...visitorData };
      return Promise.resolve();
    }),
    setDataObject: jest.fn().mockImplementation((data: any) => {
      visitorData = { ...data };
      return Promise.resolve();
    }),
    updateDataObject: jest.fn().mockImplementation((data: any) => {
      visitorData = { ...visitorData, ...data };
      return Promise.resolve();
    }),
    incrementDataObjectValue: jest.fn().mockImplementation((key: string, amount: number) => {
      visitorData[key] = (visitorData[key] || 0) + amount;
      return Promise.resolve();
    }),
    fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
    inventoryItems: [],
    dataObject: visitorData,
  });

  // getVisitor returns visitor + visitorData + brownBag + extra fields from shared state
  mockUtils.getVisitor.mockImplementation(() => {
    const visitor = makeVisitor();
    return Promise.resolve({
      visitor,
      visitorData: { ...visitorData },
      brownBag: [...currentBag],
      visitorInventory: [],
      xp: visitorData.totalXp || 0,
      level: visitorData.level || 1,
      newDay: mockGameLogic.isNewDay(),
    });
  });

  // getVisitorBag returns current bag state
  mockUtils.getVisitorBag.mockImplementation(() => {
    return Promise.resolve([...currentBag]);
  });

  // grantFoodToVisitor adds item to bag
  mockUtils.grantFoodToVisitor.mockImplementation((_visitor: any, _creds: any, bagItem: any) => {
    currentBag.push({ ...bagItem });
    return Promise.resolve();
  });

  // removeFoodFromVisitor removes item from bag
  mockUtils.removeFoodFromVisitor.mockImplementation((_visitor: any, _creds: any, itemId: string) => {
    const idx = currentBag.findIndex((i: any) => i.itemId === itemId);
    if (idx >= 0) currentBag.splice(idx, 1);
    return Promise.resolve();
  });

  // dropFoodItem
  mockUtils.dropFoodItem.mockResolvedValue({ id: "new-dropped" });

  // resolveFoodAsset mock
  mockUtils.resolveFoodAsset.mockResolvedValue({
    success: true,
    foodAsset: {
      id: "food-asset-pickup",
      updateDataObject: jest.fn().mockResolvedValue(undefined),
      deleteDroppedAsset: jest.fn().mockResolvedValue(undefined),
    },
    foodDef: {
      itemId: "apple",
      name: "Apple",
      foodGroup: "fruit",
      rarity: "common",
      funFact: "Apple fact",
      nutrition: { calories: 95, protein: 0, carbs: 25, fiber: 4, vitamins: ["C", "K"] },
    },
    isMystery: false,
  });

  // buildBagItemFromDef mock
  mockUtils.buildBagItemFromDef.mockImplementation((foodDef: any, tMeal: any) => {
    const matches = (tMeal || []).some((m: any) => m.itemId === foodDef.itemId);
    return {
      bagItem: {
        itemId: foodDef.itemId,
        name: foodDef.name,
        foodGroup: foodDef.foodGroup,
        rarity: foodDef.rarity,
        matchesTargetMeal: matches,
      },
      matchesTargetMeal: matches,
    };
  });

  // pickupFoodAsset mock
  mockUtils.pickupFoodAsset.mockResolvedValue({ pickedUp: true });

  // calculatePickupXp mock
  mockUtils.calculatePickupXp.mockReturnValue(10);

  // grantXp mock
  mockUtils.grantXp.mockImplementation((_visitor: any, _creds: any, xpAmount: number) => {
    visitorData.totalXp = (visitorData.totalXp || 0) + xpAmount;
    return Promise.resolve(visitorData.totalXp);
  });

  // World mock ---------------------------------------------------------
  const makeWorld = () => ({
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = { ...worldData };
      return Promise.resolve();
    }),
    fetchDetails: jest.fn().mockResolvedValue(undefined),
    updateDataObject: jest.fn().mockImplementation((data: any) => {
      worldData = { ...worldData, ...data };
      return Promise.resolve();
    }),
    incrementDataObjectValue: jest.fn().mockImplementation((key: string, amount: number) => {
      worldData[key] = (worldData[key] || 0) + amount;
      return Promise.resolve();
    }),
    fetchDroppedAssetsWithUniqueName: jest.fn().mockResolvedValue([]),
    fireToast: jest.fn().mockResolvedValue(undefined),
    dataObject: worldData,
  });
  mockUtils.World.create.mockImplementation(() => makeWorld());
}

// -----------------------------------------------------------------------
// Integration test suite
// -----------------------------------------------------------------------

describe("Integration: Full Game Flow", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    resetState();
    setupIntegrationMocks();

    // Ensure isNewDay returns true for the first call
    mockGameLogic.isNewDay.mockReturnValue(true);

    app = makeApp();
  });

  test("Step 1: GET /api/game-state (new day) returns empty bag and target meal", async () => {
    const res = await request(app).get("/api/game-state").query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isNewDay).toBe(true);

    // Brown bag should be empty on new day (no brown bag generation)
    expect(res.body.brownBag).toBeInstanceOf(Array);
    expect(res.body.brownBag).toHaveLength(0);

    // Target meal should have 5 items
    expect(res.body.targetMeal).toBeInstanceOf(Array);
    expect(res.body.targetMeal).toHaveLength(5);

    // Not completed yet
    expect(res.body.completedToday).toBe(false);

    // XP and level are numbers
    expect(typeof res.body.xp).toBe("number");
    expect(typeof res.body.level).toBe("number");

    // Additional response fields
    expect(res.body).toHaveProperty("badges");
    expect(res.body).toHaveProperty("visitorInventory");
    expect(res.body).toHaveProperty("leaderboard");
    expect(res.body).toHaveProperty("foodItemsInWorld");
  });

  test("Step 2: POST /api/pickup-item adds item to bag", async () => {
    // First, initialize the game state (new day)
    await request(app).get("/api/game-state").query(baseCreds);

    // Set up a resolve food asset mock for pickup
    visitorData.pickupsToday = 0;
    visitorData.targetMeal = targetMeal;

    const res = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-pickup" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Bag should have 1 item (started empty, picked up 1)
    expect(res.body.brownBag).toHaveLength(1);

    // XP earned > 0
    expect(res.body.xpEarned).toBeGreaterThan(0);

    // matchesTargetMeal boolean is present
    expect(typeof res.body.matchesTargetMeal).toBe("boolean");
  });

  test("Step 3: POST /api/drop-item removes item from bag", async () => {
    // Initialize game state
    await request(app).get("/api/game-state").query(baseCreds);

    // Add some items to the bag for the drop test
    currentBag.push(
      { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", matchesTargetMeal: true },
      { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesTargetMeal: false },
    );

    // Ensure dropsToday is set
    visitorData.dropsToday = 0;
    const bagSizeBefore = currentBag.length;

    // Drop banana from the bag
    const res = await request(app).post("/api/drop-item").query(baseCreds).send({ itemId: "banana" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Bag should have shrunk by 1
    expect(res.body.brownBag).toHaveLength(bagSizeBefore - 1);

    // Dropped item is returned
    expect(res.body.droppedItem).toBeDefined();
    expect(res.body.droppedItem.itemId).toBe("banana");
  });

  test("Step 4: POST /api/submit-meal completes the meal", async () => {
    // Initialize game state (new day)
    await request(app).get("/api/game-state").query(baseCreds);

    // Pre-populate bag with all target meal items (since bag starts empty on new day)
    for (const item of targetMeal) {
      currentBag.push({ ...item, matchesTargetMeal: true });
    }
    visitorData.targetMeal = targetMeal;

    const res = await request(app).post("/api/submit-meal").query(baseCreds).send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.completedToday).toBe(true);

    // Nutrition score is a number
    expect(typeof res.body.nutritionScore).toBe("number");

    // Total XP earned > 0
    expect(res.body.totalXpEarned).toBeGreaterThan(0);
  });

  test("Full sequential flow: game-state -> pickup -> drop -> submit", async () => {
    // ---- STEP 1: New Day ----
    const stateRes = await request(app).get("/api/game-state").query(baseCreds);
    expect(stateRes.status).toBe(200);
    expect(stateRes.body.isNewDay).toBe(true);
    expect(stateRes.body.brownBag).toHaveLength(0);
    expect(stateRes.body.targetMeal).toHaveLength(5);
    expect(stateRes.body.completedToday).toBe(false);

    // ---- STEP 2: Pick up a food item ----
    visitorData.targetMeal = targetMeal;
    visitorData.pickupsToday = 0;

    const pickupRes = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-seq" });
    expect(pickupRes.status).toBe(200);
    expect(pickupRes.body.success).toBe(true);
    expect(pickupRes.body.brownBag).toHaveLength(1);
    expect(pickupRes.body.xpEarned).toBeGreaterThan(0);
    expect(typeof pickupRes.body.matchesTargetMeal).toBe("boolean");

    // ---- STEP 3: Drop the item ----
    visitorData.dropsToday = 0;
    const dropRes = await request(app).post("/api/drop-item").query(baseCreds).send({ itemId: "apple" });
    expect(dropRes.status).toBe(200);
    expect(dropRes.body.success).toBe(true);
    expect(dropRes.body.brownBag).toHaveLength(0);
    expect(dropRes.body.droppedItem.itemId).toBe("apple");

    // ---- STEP 4: Submit meal (pre-populate bag with all target items) ----
    for (const item of targetMeal) {
      currentBag.push({ ...item, matchesTargetMeal: true });
    }
    visitorData.targetMeal = targetMeal;

    const submitRes = await request(app).post("/api/submit-meal").query(baseCreds).send({});
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.completedToday).toBe(true);
    expect(typeof submitRes.body.nutritionScore).toBe("number");
    expect(submitRes.body.totalXpEarned).toBeGreaterThan(0);
    expect(typeof submitRes.body.newTotalXp).toBe("number");
    expect(submitRes.body.newTotalXp).toBeGreaterThan(0);
    expect(typeof submitRes.body.currentStreak).toBe("number");
    expect(submitRes.body.currentStreak).toBeGreaterThanOrEqual(1);
  });
});
