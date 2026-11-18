// The food item page: what a player sees after clicking a food item in the world, picking it up,
// swapping for it when the bag is full, and walking back to the food truck.
import { expect, test } from "../../fixtures";
import { FoodId, KEY_ASSET, MEAL, foodAsset, foodInWorld, seedGame, visitorInventory } from "./lunch";

/** The item page as Topia opens it from a dropped food item (the asset's credentials replace the truck's). */
const itemUrl = (world: { url: (path: string, o?: Record<string, string>) => string }, assetId: string, itemId: FoodId, mystery = false, overrides: Record<string, string> = {}) =>
  world.url(`/item/${itemId}`, {
    assetId,
    uniqueName: `LunchSwap_foodItem_${itemId}_${mystery ? 1 : 0}`,
    ...overrides,
  });

test.describe("item page", () => {
  test("shows the food and picks it up into the bag", async ({ page, world }) => {
    await seedGame(world, { bag: ["milk"], xp: 10, assets: { "food-1": foodAsset("apple", { x: 300, y: 200 }) } });
    await page.goto(itemUrl(world, "food-1", "apple"));

    await expect(page.getByRole("heading", { name: "Apple" })).toBeVisible();
    await expect(page.getByText("fruit", { exact: true })).toBeVisible();
    await expect(page.getByText("Common", { exact: true })).toBeVisible();
    await expect(page.getByText("Matches your meal!")).toBeVisible();
    await expect(page.getByText("Apples float in water.")).toBeVisible();
    await expect(page.getByText("95 calories")).toBeVisible();

    await page.getByRole("button", { name: "Pick up Apple" }).click();

    await expect(page.getByRole("heading", { name: "Picked up Apple!" })).toBeVisible();
    // 10 for a common pickup + 25 for a meal item.
    await expect(page.getByText("+35 XP")).toBeVisible();
    await expect(page.getByText("Keep searching for your items to complete your meal!")).toBeVisible();

    expect(await visitorInventory(world)).toMatchObject({ bag: ["apple", "milk"], xp: 45 });
    expect((await world.state()).assets["food-1"]).toBeUndefined();
    expect(await world.visitorData()).toMatchObject({
      pickupsToday: 1,
      totalPickups: 1,
      pickupStreak: 1,
      hotStreakActive: false,
      totalItemsCollectedByRarity: { common: 1, rare: 0, epic: 0 },
    });
    expect((await world.state()).dataObject.totalPickups).toBe(1);
    expect(await world.events("fire-toast")).toContainEqual(
      expect.objectContaining({ title: "Picked up Apple! Perfect match! (+35 XP)", text: "Apples float in water." }),
    );
    expect(await world.events("particles")).toContainEqual(
      expect.objectContaining({ particleName: "blueSmoke_puff", position: { x: 300, y: 200 } }),
    );
    expect(await world.events("analytics")).toContainEqual(expect.objectContaining({ analyticName: "pickups" }));
  });

  test("an epic item that isn't in the meal earns the rarity XP only", async ({ request, world }) => {
    await seedGame(world, { assets: { "food-1": foodAsset("mango") } });

    const body = await (await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } })).json();

    expect(body).toMatchObject({ success: true, matchesTargetMeal: false, xpEarned: 25, pickupStreak: 0 });
    expect(await world.visitorData()).toMatchObject({ totalItemsCollectedByRarity: { common: 0, rare: 0, epic: 1 } });
  });

  test("the last meal item tells the player to head back and submit", async ({ page, world }) => {
    await seedGame(world, { bag: MEAL.slice(0, 5), assets: { "food-1": foodAsset("popcorn") } });
    await page.goto(itemUrl(world, "food-1", "popcorn"));

    await page.getByRole("button", { name: "Pick up Popcorn" }).click();

    await expect(page.getByText("Your meal is complete! Head back to the food truck to submit it.")).toBeVisible();
  });

  test("a mystery item hides what it is until it's picked up", async ({ page, world }) => {
    await seedGame(world, { assets: { "food-1": foodAsset("sushi-roll", { mystery: true }) } });
    await page.goto(itemUrl(world, "food-1", "sushi-roll", true));

    await expect(page.getByRole("heading", { name: "Mystery Item!" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sushi Roll" })).toHaveCount(0);
    await page.getByRole("button", { name: "Reveal and pick up this mystery item" }).click();

    await expect(page.getByRole("heading", { name: "Mystery revealed: Sushi Roll!" })).toBeVisible();
    expect((await visitorInventory(world)).bag).toEqual(["sushi-roll"]);
    expect((await world.visitorData()).totalMysteryItemsRevealed).toBe(1);
  });

  test("an item already in the bag can't be picked up again", async ({ page, request, world }) => {
    await seedGame(world, { bag: ["apple"], assets: { "food-1": foodAsset("apple") } });
    await page.goto(itemUrl(world, "food-1", "apple"));

    await expect(page.getByRole("button", { name: "Apple already in your bag" })).toBeDisabled();
    await expect(page.getByText("You already have this item in your bag.")).toBeVisible();

    const response = await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } });
    expect(response.status()).toBe(400);
    expect((await response.json()).message).toBe("You already have Apple in your bag!");
    expect((await visitorInventory(world)).quantities).toEqual({ apple: 1 });
    expect((await world.state()).assets["food-1"]).toBeDefined();
  });

  test("a player who hasn't started today is sent to the food truck", async ({ page, world }) => {
    await seedGame(world, { visitorData: { lastPlayedDate: "2020-01-01" }, assets: { "food-1": foodAsset("apple") } });
    await page.goto(itemUrl(world, "food-1", "apple"));

    await expect(page.getByText("You haven't started a meal yet today. Find the food truck to get started!")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pick up Apple" })).toHaveCount(0);
  });

  test("a player who finished today's meal can't pick up more", async ({ page, world }) => {
    await seedGame(world, { visitorData: { completedToday: true }, assets: { "food-1": foodAsset("apple") } });
    await page.goto(itemUrl(world, "food-1", "apple"));

    await expect(page.getByText(/You've already completed a meal today/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Pick up Apple" })).toHaveCount(0);
  });

  test("an item someone else already took shows as gone", async ({ page, world }) => {
    await seedGame(world);
    await page.goto(itemUrl(world, "food-gone", "apple"));

    await expect(page.getByRole("heading", { name: "Already Gone!" })).toBeVisible();
  });

  test("an asset that isn't a Lunch Swap food item is rejected", async ({ request, world }) => {
    await seedGame(world, { assets: { tree: { uniqueName: "LunchSwap_foodItem_pizza_0", position: { x: 0, y: 0 } } } });

    const response = await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "tree" } });

    expect(response.status()).toBe(400);
    expect((await response.json()).message).toBe("Invalid food item (definition not found)");
    expect((await visitorInventory(world)).bag).toEqual([]);
  });

  test("Return to Food Truck walks the player to the truck", async ({ page, world }) => {
    await seedGame(world, { assets: { "food-1": foodAsset("apple") } });
    await page.goto(itemUrl(world, "food-1", "apple"));

    await page.getByRole("button", { name: "Return to Food Truck" }).click();

    await expect
      .poll(() => world.events("move"))
      .toContainEqual(expect.objectContaining({ visitorId: "42", moveTo: { x: KEY_ASSET.position.x, y: KEY_ASSET.position.y + 100 } }));
  });
});

test.describe("full bag", () => {
  const FULL: FoodId[] = ["milk", "burrito", "apple", "carrots", "mango", "corn", "yogurt", "pasta"];

  test("swapping drops the chosen bag item and picks up the new one", async ({ page, world }) => {
    await seedGame(world, { bag: FULL, xp: 0, assets: { "food-1": foodAsset("granola-bar") } });
    await page.goto(itemUrl(world, "food-1", "granola-bar"));

    await expect(page.getByText("Your bag is full. Picking up will let you swap an item out.")).toBeVisible();
    await page.getByRole("button", { name: "Pick up Granola Bar" }).click();
    await page.getByRole("button", { name: /^Mango - fruit, Epic/ }).click();
    await page.getByRole("button", { name: "Confirm swap: drop Mango" }).click();

    await expect(page.getByRole("heading", { name: "Picked up Granola Bar!" })).toBeVisible();
    // 5 for the drop, 10 + 25 for the meal item.
    await expect(page.getByText("+40 XP")).toBeVisible();

    const { bag, xp } = await visitorInventory(world);
    expect(bag).toEqual([...FULL.filter((id) => id !== "mango"), "granola-bar"].sort());
    expect(xp).toBe(40);
    expect((await foodInWorld(world)).map((f) => f.itemId)).toEqual(["mango"]);
    expect(await world.visitorData()).toMatchObject({ pickupsToday: 1, dropsToday: 1, totalPickups: 1, totalDrops: 1 });
    expect((await world.state()).dataObject).toMatchObject({ totalPickups: 1, totalDrops: 1 });
    expect(await world.events("fire-toast")).toContainEqual(
      expect.objectContaining({ title: "Swapped!", text: "Dropped Mango, picked up Granola Bar!" }),
    );
  });

  test("a full bag can't take another item without a swap", async ({ request, world }) => {
    await seedGame(world, { bag: FULL, assets: { "food-1": foodAsset("granola-bar") } });

    const response = await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } });

    expect(response.status()).toBe(400);
    expect((await response.json()).message).toBe("Bag is full (8/8)");
    expect((await visitorInventory(world)).bag).toHaveLength(8);
  });

  test("the big-bag buff makes room for two more", async ({ request, world }) => {
    await seedGame(world, { bag: FULL, visitorData: { dailyBuff: "big-bag" }, assets: { "food-1": foodAsset("granola-bar") } });

    const response = await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } });

    expect(response.status()).toBe(200);
    expect((await visitorInventory(world)).bag).toHaveLength(9);
  });
});

test.describe("hot streak", () => {
  test("a third meal item in a row starts a hot streak that triples the next pickup", async ({ request, world }) => {
    await seedGame(world, {
      visitorData: { pickupStreak: 2 },
      assets: { "food-1": foodAsset("apple"), "food-2": foodAsset("mango") },
    });

    const first = await (await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } })).json();
    expect(first).toMatchObject({ hotStreakActive: true, pickupStreak: 3, xpEarned: 35, xpMultiplier: 1 });
    expect(await world.events("fire-toast")).toContainEqual(
      expect.objectContaining({ title: "HOT STREAK!", text: "Your next pickup gets 3x XP!" }),
    );

    const second = await (await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-2" } })).json();
    // Epic, not in the meal: 25 x 3.
    expect(second).toMatchObject({ hotStreakActive: false, pickupStreak: 0, xpEarned: 75, xpMultiplier: 3 });
    expect((await visitorInventory(world)).xp).toBe(110);
  });

  test("the double-XP buff doubles pickup XP", async ({ request, world }) => {
    await seedGame(world, { visitorData: { dailyBuff: "double-xp" }, assets: { "food-1": foodAsset("apple") } });

    const body = await (await request.post(world.api("/pickup-item"), { data: { droppedAssetId: "food-1" } })).json();

    expect(body.xpEarned).toBe(70);
  });
});
