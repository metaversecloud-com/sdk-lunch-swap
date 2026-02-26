import express from "express";
import request from "supertest";
import router from "../routes.js";

/**
 * Integration test: exercises the full game flow in sequence.
 *
 * 1. GET  /api/game-state  (new day)   -> generates ideal meal + brown bag
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

// --- Ideal meal (5 items from 5 food groups) ---
const idealMeal = [
  { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", collected: false },
  { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", collected: false },
  { itemId: "chicken_breast", name: "Chicken Breast", foodGroup: "main", rarity: "common", collected: false },
  { itemId: "carrot_sticks", name: "Carrot Sticks", foodGroup: "veggie", rarity: "common", collected: false },
  { itemId: "trail_mix", name: "Trail Mix", foodGroup: "snack", rarity: "common", collected: false },
];

// --- Brown bag: 8 items = all 5 ideal + 3 extras ---
const brownBag = [
  { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", matchesIdealMeal: true },
  { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", matchesIdealMeal: true },
  { itemId: "chicken_breast", name: "Chicken Breast", foodGroup: "main", rarity: "common", matchesIdealMeal: true },
  { itemId: "carrot_sticks", name: "Carrot Sticks", foodGroup: "veggie", rarity: "common", matchesIdealMeal: true },
  { itemId: "trail_mix", name: "Trail Mix", foodGroup: "snack", rarity: "common", matchesIdealMeal: true },
  { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesIdealMeal: false },
  { itemId: "popcorn", name: "Popcorn", foodGroup: "snack", rarity: "common", matchesIdealMeal: false },
  { itemId: "orange_juice", name: "Orange Juice", foodGroup: "drink", rarity: "common", matchesIdealMeal: false },
];

// --- Mock game logic ---
jest.mock("../utils/gameLogic/index.js", () => ({
  generateIdealMeal: jest.fn().mockReturnValue([
    { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", collected: false },
    { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", collected: false },
    { itemId: "chicken_breast", name: "Chicken Breast", foodGroup: "main", rarity: "common", collected: false },
    { itemId: "carrot_sticks", name: "Carrot Sticks", foodGroup: "veggie", rarity: "common", collected: false },
    { itemId: "trail_mix", name: "Trail Mix", foodGroup: "snack", rarity: "common", collected: false },
  ]),
  generateBrownBag: jest.fn().mockReturnValue([
    { itemId: "apple", name: "Apple", foodGroup: "fruit", rarity: "common", matchesIdealMeal: true },
    { itemId: "water", name: "Water", foodGroup: "drink", rarity: "common", matchesIdealMeal: true },
    { itemId: "chicken_breast", name: "Chicken Breast", foodGroup: "main", rarity: "common", matchesIdealMeal: true },
    { itemId: "carrot_sticks", name: "Carrot Sticks", foodGroup: "veggie", rarity: "common", matchesIdealMeal: true },
    { itemId: "trail_mix", name: "Trail Mix", foodGroup: "snack", rarity: "common", matchesIdealMeal: true },
    { itemId: "banana", name: "Banana", foodGroup: "fruit", rarity: "common", matchesIdealMeal: false },
    { itemId: "popcorn", name: "Popcorn", foodGroup: "snack", rarity: "common", matchesIdealMeal: false },
    { itemId: "orange_juice", name: "Orange Juice", foodGroup: "drink", rarity: "common", matchesIdealMeal: false },
  ]),
  getCurrentDateMT: jest.fn().mockReturnValue("2026-02-07"),
  isNewDay: jest.fn().mockReturnValue(true),
  calculateNutritionScore: jest.fn().mockReturnValue({
    score: 88,
    breakdown: { proteinScore: 22, fiberScore: 20, vitaminDiversity: 23, balanceScore: 23 },
    superCombos: [],
    totalXpEarned: 0,
    bonusXp: 50,
  }),
  detectSuperCombos: jest.fn().mockReturnValue([]),
}));

const mockGameLogic = jest.mocked(require("../utils/gameLogic/index.js"));

// --- Mock SDK utils ---
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

// -----------------------------------------------------------------------
// Shared mutable state that the mock objects read/write, simulating
// how the real visitor/user/world data objects evolve across requests.
// -----------------------------------------------------------------------

let visitorData: Record<string, any>;
let userData: Record<string, any>;
let worldData: Record<string, any>;

function resetState() {
  visitorData = {};
  userData = {};
  worldData = {};
}

/**
 * Wire up all mocks so they behave like a coherent in-memory store.
 * Each request gets fresh mock function instances but they all read/write
 * the shared `visitorData`, `userData`, `worldData` objects above.
 */
function setupIntegrationMocks() {
  mockUtils.getCredentials.mockReturnValue(baseCreds);
  mockUtils.getDroppedAsset.mockResolvedValue({
    id: "key-asset-1",
    position: { x: 0, y: 0 },
  });

  // Visitor mock -------------------------------------------------------
  const makeVisitor = () => ({
    isAdmin: false,
    moveTo: { x: 100, y: 200 },
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
    dataObject: visitorData,
  });
  mockUtils.Visitor.get.mockImplementation(() => Promise.resolve(makeVisitor()));

  // User mock ----------------------------------------------------------
  const makeUser = () => ({
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = { ...userData };
      return Promise.resolve();
    }),
    updateDataObject: jest.fn().mockImplementation((data: any) => {
      userData = { ...userData, ...data };
      return Promise.resolve();
    }),
    incrementDataObjectValue: jest.fn().mockImplementation((key: string, amount: number) => {
      userData[key] = (userData[key] || 0) + amount;
      return Promise.resolve();
    }),
    dataObject: userData,
  });
  mockUtils.User.create.mockImplementation(() => makeUser());

  // World mock ---------------------------------------------------------
  const makeWorld = () => ({
    fetchDataObject: jest.fn().mockImplementation(function (this: any) {
      this.dataObject = { ...worldData };
      return Promise.resolve();
    }),
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

  // Asset create / drop (used during new-day spawn & submit auto-drop) -
  mockUtils.Asset.create.mockResolvedValue({ id: "new-asset" });
  mockUtils.DroppedAsset.drop.mockResolvedValue({ id: "new-dropped" });
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

  test("Step 1: GET /api/game-state (new day) returns generated bag and meal", async () => {
    const res = await request(app).get("/api/game-state").query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isNewDay).toBe(true);

    // Brown bag should have 8 items
    expect(res.body.brownBag).toBeInstanceOf(Array);
    expect(res.body.brownBag).toHaveLength(8);

    // Ideal meal should have 5 items
    expect(res.body.idealMeal).toBeInstanceOf(Array);
    expect(res.body.idealMeal).toHaveLength(5);

    // Not completed yet
    expect(res.body.completedToday).toBe(false);

    // XP and level are numbers
    expect(typeof res.body.xp).toBe("number");
    expect(typeof res.body.level).toBe("number");
  });

  test("Step 2: POST /api/pickup-item adds item to bag", async () => {
    // First, initialize the game state (new day)
    await request(app).get("/api/game-state").query(baseCreds);

    // Now simulate picking up a food item from the world.
    // We need the visitor data to already have the bag from step 1,
    // which our mock store handles.

    // Set up a food asset that exists in the world
    const foodAssetUniqueName = `lunch-swap-food|apple|common|${Date.now()}|0`;
    const mockFoodAsset = {
      id: "food-asset-pickup",
      uniqueName: foodAssetUniqueName,
      position: { x: 110, y: 210 },
      fetchDataObject: jest.fn().mockImplementation(function (this: any) {
        this.dataObject = { itemId: "apple", rarity: "common" };
        return Promise.resolve();
      }),
      deleteDroppedAsset: jest.fn().mockResolvedValue(undefined),
      dataObject: {},
    };
    mockUtils.DroppedAsset.get.mockResolvedValue(mockFoodAsset);

    // The visitor already has 8 items from the new-day state,
    // so we need to simulate that bag has space. Let's trim the bag to 4 items
    // by directly mutating the shared state (simulating the player dropped some items).
    visitorData.brownBag = visitorData.brownBag.slice(0, 4);
    visitorData.pickupsToday = 0;

    const res = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-pickup" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Bag should have grown by 1 (from 4 to 5)
    expect(res.body.brownBag).toHaveLength(5);

    // XP earned > 0
    expect(res.body.xpEarned).toBeGreaterThan(0);

    // matchesIdealMeal boolean is present
    expect(typeof res.body.matchesIdealMeal).toBe("boolean");

    // The food asset should have been deleted from the world
    expect(mockFoodAsset.deleteDroppedAsset).toHaveBeenCalled();
  });

  test("Step 3: POST /api/drop-item removes item from bag", async () => {
    // Initialize game state
    await request(app).get("/api/game-state").query(baseCreds);

    // Ensure the bag has items and dropsToday is set
    visitorData.dropsToday = 0;
    const bagSizeBefore = visitorData.brownBag.length;

    // Drop an extra item (banana) that is in the bag
    const res = await request(app)
      .post("/api/drop-item")
      .query(baseCreds)
      .send({ itemId: "banana" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Bag should have shrunk by 1
    expect(res.body.brownBag).toHaveLength(bagSizeBefore - 1);

    // Dropped item is returned
    expect(res.body.droppedItem).toBeDefined();
    expect(res.body.droppedItem.itemId).toBe("banana");
  });

  test("Step 4: POST /api/submit-meal completes the meal", async () => {
    // Initialize game state (new day, bag has all 5 ideal + 3 extras)
    await request(app).get("/api/game-state").query(baseCreds);

    // The bag already contains all 5 ideal meal items, so submission should succeed.
    const res = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});

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
    expect(stateRes.body.brownBag).toHaveLength(8);
    expect(stateRes.body.idealMeal).toHaveLength(5);
    expect(stateRes.body.completedToday).toBe(false);

    // ---- STEP 2: Drop an extra item to make room ----
    visitorData.dropsToday = 0;
    const dropRes = await request(app)
      .post("/api/drop-item")
      .query(baseCreds)
      .send({ itemId: "popcorn" });
    expect(dropRes.status).toBe(200);
    expect(dropRes.body.success).toBe(true);
    expect(dropRes.body.brownBag).toHaveLength(7);
    expect(dropRes.body.droppedItem.itemId).toBe("popcorn");

    // ---- STEP 3: Pick up a new food item ----
    const foodAssetUniqueName = `lunch-swap-food|apple|common|${Date.now()}|0`;
    mockUtils.DroppedAsset.get.mockResolvedValue({
      id: "food-asset-seq",
      uniqueName: foodAssetUniqueName,
      position: { x: 110, y: 210 },
      fetchDataObject: jest.fn().mockImplementation(function (this: any) {
        this.dataObject = { itemId: "apple", rarity: "common" };
        return Promise.resolve();
      }),
      deleteDroppedAsset: jest.fn().mockResolvedValue(undefined),
      dataObject: {},
    });

    const pickupRes = await request(app)
      .post("/api/pickup-item")
      .query(baseCreds)
      .send({ droppedAssetId: "food-asset-seq" });
    expect(pickupRes.status).toBe(200);
    expect(pickupRes.body.success).toBe(true);
    expect(pickupRes.body.brownBag).toHaveLength(8);
    expect(pickupRes.body.xpEarned).toBeGreaterThan(0);
    expect(typeof pickupRes.body.matchesIdealMeal).toBe("boolean");

    // ---- STEP 4: Submit meal ----
    const submitRes = await request(app)
      .post("/api/submit-meal")
      .query(baseCreds)
      .send({});
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
