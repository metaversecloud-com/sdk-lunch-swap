// The main game page (food truck): daily meal, bag, drops, meal submission, streaks, bonus wheel.
import { expect, test } from "../../fixtures";
import {
  FOOD_IDS,
  KEY_ASSET,
  KEY_ASSET_DATA,
  BADGE_NAMES,
  MEAL,
  foodInWorld,
  meal,
  seedGame,
  todayMT,
  visitorInventory,
  weekMT,
} from "./lunch";

const GROUPS = ["drink", "main", "fruit", "veggie", "snack"];

test.describe("daily meal", () => {
  test("a first-time player gets a six-item meal and the instructions", async ({ page, world }) => {
    await world.seed({ asset: KEY_ASSET, worldData: { lastReplenishedDate: new Date().toISOString() } });
    await page.goto(world.url("/"));

    await expect(page.getByRole("button", { name: "Close instructions" })).toBeVisible();
    await page.getByRole("button", { name: "Close instructions" }).click();
    await expect(page.getByRole("heading", { name: "Today's Perfect Lunch" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Target meal items" }).getByRole("listitem")).toHaveCount(6);
    await expect(page.getByText("0/8 items")).toBeVisible();

    const data = await world.visitorData();
    expect(data.lastPlayedDate).toBe(todayMT());
    expect(data.completedToday).toBe(false);
    expect(data.targetMeal).toHaveLength(6);
    // One item of every food group, plus a bonus fruit, veggie or snack that isn't already in it.
    expect(data.targetMeal.slice(0, 5).map((i: any) => i.foodGroup)).toEqual(GROUPS);
    expect(["fruit", "veggie", "snack"]).toContain(data.targetMeal[5].foodGroup);
    expect(new Set(data.targetMeal.map((i: any) => i.itemId)).size).toBe(6);
    for (const item of data.targetMeal) expect(FOOD_IDS).toContain(item.itemId);

    expect(await world.events("analytics")).toContainEqual(
      expect.objectContaining({ analyticName: "starts", profileId: world.profileId }),
    );
    const worldData = (await world.state()).dataObject;
    expect(worldData).toMatchObject({ currentDate: todayMT(), totalStartsToday: 1, totalCompletionsToday: 0 });
    expect(await world.assetData()).toMatchObject({ appName: "lunch-swap", initialized: true });
  });

  test("a returning player sees today's meal, bag, XP and level", async ({ page, world }) => {
    await seedGame(world, { bag: ["milk", "apple", "mango"], xp: 350 });
    await page.goto(world.url("/"));

    await expect(page.getByText("3/8 items")).toBeVisible();
    await expect(page.getByText("350 XP")).toBeVisible();
    // 300 XP is level 3, "First-Time Luncher" until level 4.
    await expect(page.getByText("First-Time Luncher")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Target meal progress: 2 of 6 items collected" })).toBeVisible();
    await expect(page.getByLabel(/^Milk - drink, Common rarity, matches your target meal/)).toBeVisible();
    await expect(page.getByLabel(/^Mango - fruit, Epic rarity\. Tap/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Close instructions" })).toHaveCount(0);

    expect(await world.events("analytics")).toContainEqual(
      expect.objectContaining({ analyticName: "joins", profileId: world.profileId }),
    );
    expect((await world.visitorData()).targetMeal).toEqual(meal(MEAL));
  });

  test("a new day empties yesterday's bag and deals a new meal", async ({ page, world }) => {
    await seedGame(world, {
      bag: ["milk", "mango"],
      xp: 120,
      visitorData: { lastPlayedDate: todayMT(-1), completedToday: true, dailyBuff: "double-xp", nutritionScore: 80 },
    });
    await page.goto(world.url("/"));

    await expect(page.getByText("0/8 items")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open bonus wheel" })).toBeVisible();

    const { bag, xp } = await visitorInventory(world);
    expect(bag).toEqual([]);
    expect(xp).toBe(120);
    const data = await world.visitorData();
    expect(data).toMatchObject({ lastPlayedDate: todayMT(), completedToday: false, dailyBuff: null, nutritionScore: null });
    expect(data.targetMeal).toHaveLength(6);
  });

  test("keeps exactly one of every food item in the world", async ({ page, world }) => {
    await world.seed({
      asset: KEY_ASSET,
      assetData: KEY_ASSET_DATA,
      extraAssets: {
        "apple-1": { id: "apple-1", uniqueName: "LunchSwap_foodItem_apple_0", position: { x: 0, y: 0 } },
        "apple-2": { id: "apple-2", uniqueName: "LunchSwap_foodItem_apple_1", position: { x: 10, y: 0 } },
        decoration: { id: "decoration", uniqueName: "tree", position: { x: 0, y: 0 } },
      },
    });
    await page.goto(world.url("/"));
    await page.getByRole("button", { name: "Close instructions" }).click();

    await expect
      .poll(async () => (await foodInWorld(world)).map((f) => f.itemId).sort(), { timeout: 10_000 })
      .toEqual([...FOOD_IDS].sort());
    const dropped = (await foodInWorld(world)).find((f) => f.itemId === "milk")!.asset;
    expect(dropped).toMatchObject({
      isInteractive: true,
      interactivePublicKey: "e2e-public-key",
      clickableLink: expect.stringMatching(/\/item\/milk\?mystery=[01]$/),
      isOpenLinkInDrawer: true,
    });
    expect((await world.state()).assets.decoration).toBeDefined();
    await expect.poll(async () => (await world.state()).dataObject.lastReplenishedDate).toBeTruthy();
  });
});

test.describe("bag", () => {
  test("dropping an item puts it back in the world next to the player", async ({ page, world }) => {
    await seedGame(world, { bag: ["milk", "mango"], xp: 50, visitorData: { pickupStreak: 2 } });
    await page.goto(world.url("/"));

    await page.getByLabel(/^Mango - fruit/).click();
    await page.getByRole("button", { name: "Drop Mango from your bag" }).click();

    await expect(page.getByRole("status")).toHaveText("Dropped Mango (+5 XP)");
    await expect(page.getByText("1/8 items")).toBeVisible();
    await expect(page.getByText("55 XP")).toBeVisible();

    expect(await visitorInventory(world)).toMatchObject({ bag: ["milk"], xp: 55 });
    const [dropped] = await foodInWorld(world);
    expect(dropped.itemId).toBe("mango");
    // Within the drop range (100px square) of the player at (640, 480).
    expect(Math.abs(dropped.asset.position.x - 640)).toBeLessThanOrEqual(50);
    expect(Math.abs(dropped.asset.position.y - 480)).toBeLessThanOrEqual(50);
    expect(await world.visitorData()).toMatchObject({ pickupStreak: 0, dropsToday: 1, totalDrops: 1 });
    expect((await world.state()).dataObject.totalDrops).toBe(1);
    expect(await world.events("analytics")).toContainEqual(expect.objectContaining({ analyticName: "drops" }));
    expect(await world.events("particles")).toContainEqual(expect.objectContaining({ particleName: "sparkles_float" }));
  });

  test("drop all non-matching items keeps the meal items", async ({ page, world }) => {
    await seedGame(world, { bag: ["milk", "apple", "mango", "corn", "yogurt"] });
    await page.goto(world.url("/"));

    await page.getByRole("button", { name: "Drop all non-matching items from your bag" }).click();

    await expect(page.getByRole("status")).toHaveText("Dropped 3 non-matching items (+15 XP)");
    await expect(page.getByText("2/8 items")).toBeVisible();
    expect(await visitorInventory(world)).toMatchObject({ bag: ["apple", "milk"], xp: 15 });
    expect((await foodInWorld(world)).map((f) => f.itemId).sort()).toEqual(["corn", "mango", "yogurt"]);
    expect(await world.visitorData()).toMatchObject({ dropsToday: 3, totalDrops: 3 });
  });

  test("can't drop an item that isn't in the bag", async ({ request, world }) => {
    await seedGame(world, { bag: ["milk"] });

    const response = await request.post(world.api("/drop-item"), { data: { itemId: "mango" } });

    expect(response.status()).toBe(400);
    expect((await response.json()).message).toBe("Item not found in bag");
    expect(await foodInWorld(world)).toEqual([]);
  });

  test("the double-XP buff doubles drop XP", async ({ request, world }) => {
    await seedGame(world, { bag: ["mango"], visitorData: { dailyBuff: "double-xp" } });

    const response = await request.post(world.api("/drop-item"), { data: { itemId: "mango" } });

    expect((await response.json()).xpEarned).toBe(10);
    expect((await visitorInventory(world)).xp).toBe(10);
  });

  test("the big-bag buff shows ten slots", async ({ page, world }) => {
    await seedGame(world, { bag: ["milk"], visitorData: { dailyBuff: "big-bag" } });
    await page.goto(world.url("/"));

    await expect(page.getByText("1/10 items")).toBeVisible();
    await expect(page.getByText("Big Bag")).toBeVisible();
  });
});

test.describe("submitting the meal", () => {
  test("a complete meal scores, awards XP, a badge and a leaderboard entry", async ({ page, world }) => {
    await seedGame(world, { bag: [...MEAL, "mango"], xp: 40 });
    await page.goto(world.url("/"));

    await page.getByRole("button", { name: "Submit your completed meal" }).click();

    await expect(page.getByRole("region", { name: "Meal completion summary" })).toBeVisible();
    await expect(page.getByText("Come back tomorrow for a new meal.")).toBeVisible();
    // milk + granola-bar in the bag: "Breakfast Bowl".
    await expect(page.getByRole("list", { name: "Super combos found" })).toContainText("Breakfast Bowl");

    // 100 for the meal, no rarity bonus (all common), 30 for the combo, 10 for a 1-week streak.
    const { xp, badges } = await visitorInventory(world);
    expect(xp).toBe(40 + 140);
    expect(badges).toContain("Brown Bag Beginner");
    const data = await world.visitorData();
    expect(data).toMatchObject({
      completedToday: true,
      currentStreak: 1,
      longestStreak: 1,
      totalMealsCompleted: 1,
      lastCompletionDate: todayMT(),
      lastCompletionWeek: weekMT(),
      superCombosFound: ["Breakfast Bowl"],
      totalSuperCombos: 1,
    });
    expect(data.nutritionScore).toBeGreaterThan(0);
    expect(data.bestNutritionScore).toBe(data.nutritionScore);
    expect((await world.assetData()).leaderboard).toEqual({ [world.profileId]: "E2E Player|1|1" });
    expect((await world.state()).dataObject.totalCompletionsToday).toBe(1);
    expect(await world.events("world-toast")).toEqual([]);
    expect(await world.events("fire-toast")).toContainEqual(expect.objectContaining({ title: "Meal Complete!", text: "+140 XP | 1 combo(s)!" }));
    expect((await world.events("analytics")).map((a) => a.analyticName)).toEqual(
      expect.arrayContaining(["completions", "mealSubmissions"]),
    );

    // The leaderboard tab shows the entry.
    await page.getByRole("button", { name: "Leaderboard" }).click();
    await expect(page.getByRole("row", { name: "1 E2E Player 1 1" })).toBeVisible();
  });

  test("the submit button only appears once every meal item is in the bag", async ({ page, world }) => {
    await seedGame(world, { bag: MEAL.slice(0, 5) });
    await page.goto(world.url("/"));

    await expect(page.getByText("5/8 items")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit your completed meal" })).toHaveCount(0);
  });

  test("an incomplete meal is rejected with the missing items", async ({ request, world }) => {
    await seedGame(world, { bag: MEAL.slice(0, 4) });

    const response = await request.post(world.api("/submit-meal"));

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      message: "Meal incomplete",
      missingItems: [
        { itemId: "granola-bar", name: "Granola Bar", foodGroup: "snack" },
        { itemId: "popcorn", name: "Popcorn", foodGroup: "snack" },
      ],
    });
    expect((await world.visitorData()).completedToday).toBe(false);
    expect((await world.state()).dataObject.totalMealSubmissions).toBe(1);
  });

  test("a second submission the same day is rejected", async ({ request, world }) => {
    await seedGame(world, { bag: MEAL, visitorData: { completedToday: true, totalMealsCompleted: 1 } });

    const response = await request.post(world.api("/submit-meal"));

    expect(response.status()).toBe(400);
    expect((await response.json()).message).toBe("Already completed meal today");
    expect((await visitorInventory(world)).xp).toBe(0);
  });

  test("a player who already finished today sees the summary", async ({ page, world }) => {
    await seedGame(world, { bag: MEAL, visitorData: { completedToday: true, nutritionScore: 77, currentStreak: 2 } });
    await page.goto(world.url("/"));

    await expect(page.getByRole("region", { name: "Meal completion summary" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit your completed meal" })).toHaveCount(0);
  });

  test("completing in consecutive weeks grows the streak", async ({ request, world }) => {
    await seedGame(world, {
      bag: MEAL,
      visitorData: { currentStreak: 2, longestStreak: 2, lastCompletionWeek: weekMT(1), totalMealsCompleted: 5 },
    });

    const response = await request.post(world.api("/submit-meal"));

    const body = await response.json();
    expect(body).toMatchObject({ currentStreak: 3, longestStreak: 3, isNewStreakRecord: true });
    // 100 + 30 (Breakfast Bowl) + 3 weeks x 10.
    expect(body.totalXpEarned).toBe(160);
    expect((await visitorInventory(world)).badges).toEqual(expect.arrayContaining(["Brown Bag Beginner", "Streak Starter"]));
  });

  test("a gap of more than a week restarts the streak", async ({ request, world }) => {
    await seedGame(world, {
      bag: MEAL,
      visitorData: { currentStreak: 4, longestStreak: 4, lastCompletionWeek: weekMT(3) },
    });

    const body = await (await request.post(world.api("/submit-meal"))).json();

    expect(body).toMatchObject({ currentStreak: 1, longestStreak: 4, isNewStreakRecord: false });
  });

  test("rare and epic meal items and double XP add to the meal XP", async ({ request, world }) => {
    const rareMeal = ["coconut-water", "sushi-roll", "mango", "corn", "yogurt", "popcorn"] as const;
    await seedGame(world, {
      bag: [...rareMeal],
      visitorData: { targetMeal: meal([...rareMeal]), dailyBuff: "double-xp" },
    });

    const body = await (await request.post(world.api("/submit-meal"))).json();

    // 100 + rare 12.5->13 x3 (coconut-water, corn, yogurt) + epic 37.5->38 x2 (sushi, mango) + streak 10, doubled.
    expect(body.totalXpEarned).toBe((100 + 13 * 3 + 38 * 2 + 10) * 2);
    expect(body.superCombosFound).toEqual([]);
  });
});

test.describe("leaderboard", () => {
  test("ranks players by meals completed, then streak", async ({ page, world }) => {
    await world.seed({
      asset: KEY_ASSET,
      assetData: {
        ...KEY_ASSET_DATA,
        leaderboard: { a: "Ana|3|1", b: "Ben|5|1", c: "Cy|3|4" },
      },
      worldData: { lastReplenishedDate: new Date().toISOString() },
      visitorData: { lastPlayedDate: todayMT(), targetMeal: meal(MEAL) },
    });
    await page.goto(world.url("/"));

    await page.getByRole("button", { name: "Leaderboard" }).click();

    const rows = page.getByRole("row");
    await expect(rows.nth(1)).toHaveText("1Ben51");
    await expect(rows.nth(2)).toHaveText("2Cy34");
    await expect(rows.nth(3)).toHaveText("3Ana31");
  });

  test("shows an empty state before anyone finishes a meal", async ({ page, world }) => {
    await seedGame(world);
    await page.goto(world.url("/"));

    await page.getByRole("button", { name: "Leaderboard" }).click();

    await expect(page.getByText("No results yet. Complete a meal to join the leaderboard!")).toBeVisible();
  });
});

test.describe("badges", () => {
  test("lists the app's badges in catalog order, owned ones in color", async ({ page, world }) => {
    await seedGame(world, { badges: ["Brown Bag Beginner"] });
    await page.goto(world.url("/"));

    await page.getByRole("button", { name: "Badges" }).click();

    await expect(page.locator(".tooltip > p")).toHaveText(BADGE_NAMES);
    await expect(page.getByRole("img", { name: "Brown Bag Beginner" })).toHaveCSS("filter", "none");
    await expect(page.getByRole("img", { name: "Cafeteria Boss" })).toHaveCSS("filter", "grayscale(1)");
  });
});

test.describe("bonus wheel", () => {
  test("spinning gives one daily buff", async ({ page, world }) => {
    await seedGame(world, { bag: ["milk"] });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(world.url("/"));

    await page.getByRole("button", { name: "Open bonus wheel" }).click();
    await page.getByRole("button", { name: "Spin the bonus wheel" }).click();
    const claim = page.getByRole("button", { name: /^Claim your .* buff$/ });
    await expect(claim).toBeVisible();
    const buffName = (await claim.getAttribute("aria-label"))!.replace(/^Claim your | buff$/g, "");
    await claim.click();

    await expect(page.getByRole("button", { name: "Open bonus wheel" })).toHaveCount(0);
    await expect(page.getByText(buffName, { exact: true })).toBeVisible();
    const { dailyBuff } = await world.visitorData();
    expect(["big-bag", "combo-finder", "epic-drop", "double-xp", "target-item"]).toContain(dailyBuff);

    const again = await page.request.post(world.api("/spin-wheel"));
    expect(again.status()).toBe(400);
    expect((await again.json()).message).toBe("Already spun today");
  });

  test("a buff already spun today can't be replaced", async ({ request, world }) => {
    await seedGame(world, { visitorData: { dailyBuff: "big-bag" } });

    const response = await request.post(world.api("/spin-wheel"));

    expect(response.status()).toBe(400);
    expect((await world.visitorData()).dailyBuff).toBe("big-bag");
  });
});

test("a bag card opens the food's nutrition and drop button", async ({ page, world }) => {
  await seedGame(world, { bag: ["apple"] });
  await page.goto(world.url("/"));
  const card = page.getByLabel(/^Apple - fruit, Common rarity/);

  await expect(page.getByRole("button", { name: "Drop Apple from your bag" })).toHaveCount(0);
  await card.click();

  await expect(card).toHaveAttribute("aria-expanded", "true");
  await expect(card.getByText("Nutrition")).toBeVisible();
  await expect(page.getByRole("button", { name: "Drop Apple from your bag" })).toBeVisible();
});
