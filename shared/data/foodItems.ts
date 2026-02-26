import { FoodItemDefinition } from "../types/FoodItem.js";

export const FOOD_ITEMS: FoodItemDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // DRINKS (12): 7 common, 3 rare, 2 epic
  // ═══════════════════════════════════════════════════════════════
  {
    itemId: "water",
    name: "Water",
    foodGroup: "drink",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 0, protein: 0, carbs: 0, fiber: 0, vitamins: [] },
    funFact: "Your brain is about 75% water — staying hydrated helps you think faster and focus better in school!",
    superComboPairs: [],
  },
  {
    itemId: "milk",
    name: "Milk",
    foodGroup: "drink",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 150, protein: 8, carbs: 12, fiber: 0, vitamins: ["D", "B12", "A"] },
    funFact: "A single cow produces about 6 gallons of milk per day — that's enough to fill almost 100 glasses!",
    superComboPairs: ["granola-bar"],
  },
  {
    itemId: "orange-juice",
    name: "Orange Juice",
    foodGroup: "drink",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 110, protein: 2, carbs: 26, fiber: 0, vitamins: ["C", "A"] },
    funFact: "It takes about 3 whole oranges to make just one glass of orange juice!",
    superComboPairs: [],
  },
  {
    itemId: "apple-juice",
    name: "Apple Juice",
    foodGroup: "drink",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 120, protein: 0, carbs: 28, fiber: 0, vitamins: ["C"] },
    funFact:
      "Apple juice was one of the first fruit juices made in ancient history — people have been drinking it for over 1,000 years!",
    superComboPairs: ["popcorn"],
  },
  {
    itemId: "chocolate-milk",
    name: "Chocolate Milk",
    foodGroup: "drink",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 190, protein: 8, carbs: 26, fiber: 1, vitamins: ["D", "B12", "A"] },
    funFact:
      "Many athletes drink chocolate milk after workouts because it has the perfect mix of protein and carbs for recovery!",
    superComboPairs: [],
  },
  {
    itemId: "smoothie",
    name: "Fruit Smoothie",
    foodGroup: "drink",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 160, protein: 4, carbs: 32, fiber: 3, vitamins: ["C", "A", "B6"] },
    funFact:
      "The first smoothies were made in the 1930s — back then they were called 'health shakes' and sold at health food stores!",
    superComboPairs: [],
  },
  {
    itemId: "coconut-water",
    name: "Coconut Water",
    foodGroup: "drink",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 45, protein: 2, carbs: 9, fiber: 0, vitamins: ["C", "B6"] },
    funFact: "Coconut water is naturally sterile and has been used as emergency IV fluid in tropical countries!",
    superComboPairs: ["trail-mix"],
  },
  {
    itemId: "green-smoothie",
    name: "Green Smoothie",
    foodGroup: "drink",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 140, protein: 5, carbs: 24, fiber: 4, vitamins: ["K", "C", "A", "Iron"] },
    funFact:
      "Green smoothies get their color from chlorophyll — the same molecule that helps plants turn sunlight into energy!",
    superComboPairs: ["sushi-roll"],
  },
  {
    itemId: "pomegranate-juice",
    name: "Pomegranate Juice",
    foodGroup: "drink",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 130, protein: 0, carbs: 32, fiber: 0, vitamins: ["C", "K"] },
    funFact:
      "A single pomegranate contains about 600 to 800 tiny seeds called arils — each one is like a little juice bubble!",
    superComboPairs: [],
  },
  {
    itemId: "acai-smoothie",
    name: "Acai Smoothie",
    foodGroup: "drink",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 170, protein: 3, carbs: 30, fiber: 4, vitamins: ["C", "A", "E"] },
    funFact:
      "Acai berries grow at the top of tall palm trees in the Amazon rainforest and must be hand-harvested by skilled climbers!",
    superComboPairs: ["mango"],
  },
  {
    itemId: "golden-milk",
    name: "Golden Milk",
    foodGroup: "drink",
    rarity: "epic",
    imageUrl: "",
    nutrition: { calories: 130, protein: 5, carbs: 16, fiber: 0, vitamins: ["D", "B12"] },
    funFact:
      "Golden milk gets its bright yellow color from turmeric, a spice that has been used in cooking and medicine for over 4,000 years!",
    superComboPairs: [],
  },

  // ═══════════════════════════════════════════════════════════════
  // FRUITS (12): 7 common, 3 rare, 2 epic
  // ═══════════════════════════════════════════════════════════════
  {
    itemId: "apple",
    name: "Apple",
    foodGroup: "fruit",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 95, protein: 0, carbs: 25, fiber: 4, vitamins: ["C", "K"] },
    funFact:
      "There are over 7,500 varieties of apples grown around the world — if you tried a new one every day, it would take over 20 years!",
    superComboPairs: ["cheese-stick"],
  },
  {
    itemId: "banana",
    name: "Banana",
    foodGroup: "fruit",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 105, protein: 1, carbs: 27, fiber: 3, vitamins: ["B6", "C"] },
    funFact: "Bananas are technically berries, but strawberries aren't — the world of fruit classification is wild!",
    superComboPairs: ["yogurt"],
  },
  {
    itemId: "grapes",
    name: "Grapes",
    foodGroup: "fruit",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 62, protein: 1, carbs: 16, fiber: 1, vitamins: ["C", "K"] },
    funFact: "Grapes are one of the oldest cultivated fruits — people have been growing them for over 8,000 years!",
    superComboPairs: [],
  },
  {
    itemId: "strawberry",
    name: "Strawberry",
    foodGroup: "fruit",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 50, protein: 1, carbs: 12, fiber: 3, vitamins: ["C", "B9"] },
    funFact: "Strawberries are the only fruit with seeds on the outside — each one has about 200 tiny seeds!",
    superComboPairs: ["dark-chocolate"],
  },
  {
    itemId: "orange",
    name: "Orange",
    foodGroup: "fruit",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 62, protein: 1, carbs: 15, fiber: 3, vitamins: ["C", "A", "B1"] },
    funFact:
      "The color orange was actually named after the fruit, not the other way around — before that, people just called it 'red-yellow'!",
    superComboPairs: [],
  },
  {
    itemId: "watermelon",
    name: "Watermelon",
    foodGroup: "fruit",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 86, protein: 2, carbs: 22, fiber: 1, vitamins: ["C", "A"] },
    funFact:
      "Watermelons are about 92% water, which is why they're so refreshing on a hot day — it's like eating a delicious drink!",
    superComboPairs: [],
  },
  {
    itemId: "blueberries",
    name: "Blueberries",
    foodGroup: "fruit",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 85, protein: 1, carbs: 21, fiber: 4, vitamins: ["C", "K", "E"] },
    funFact:
      "Blueberries are one of the only naturally blue foods — their color comes from a pigment called anthocyanin that's also a powerful antioxidant!",
    superComboPairs: [],
  },
  {
    itemId: "mango",
    name: "Mango",
    foodGroup: "fruit",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 100, protein: 1, carbs: 25, fiber: 3, vitamins: ["C", "A", "B6"] },
    funFact:
      "Mangoes are the most popular fruit in the world — over 3 billion people eat them, and in India they're called the 'king of fruits'!",
    superComboPairs: ["acai-smoothie"],
  },
  {
    itemId: "kiwi",
    name: "Kiwi",
    foodGroup: "fruit",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 42, protein: 1, carbs: 10, fiber: 2, vitamins: ["C", "K", "E"] },
    funFact:
      "One kiwi has more vitamin C than an orange! They were originally called 'Chinese gooseberries' before being renamed in New Zealand.",
    superComboPairs: [],
  },
  {
    itemId: "pineapple",
    name: "Pineapple",
    foodGroup: "fruit",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 82, protein: 1, carbs: 22, fiber: 2, vitamins: ["C", "B6"] },
    funFact:
      "Pineapples take about 2 years to grow — each plant only produces one pineapple at a time, making each one extra special!",
    superComboPairs: ["rice-bowl"],
  },
  {
    itemId: "dragon-fruit",
    name: "Dragon Fruit",
    foodGroup: "fruit",
    rarity: "epic",
    imageUrl: "",
    nutrition: { calories: 60, protein: 1, carbs: 13, fiber: 3, vitamins: ["C", "E", "Iron"] },
    funFact:
      "Dragon fruit grows on a cactus that only blooms at night! Its flowers are pollinated by bats and moths in the moonlight.",
    superComboPairs: [],
  },
  {
    itemId: "passion-fruit",
    name: "Passion Fruit",
    foodGroup: "fruit",
    rarity: "epic",
    imageUrl: "",
    nutrition: { calories: 17, protein: 1, carbs: 4, fiber: 2, vitamins: ["C", "A", "Iron"] },
    funFact:
      "Passion fruit got its name from Spanish missionaries who thought the flower looked like a symbol of their religious stories — not because of its taste!",
    superComboPairs: [],
  },

  // ═══════════════════════════════════════════════════════════════
  // VEGGIES (12): 7 common, 3 rare, 2 epic
  // ═══════════════════════════════════════════════════════════════
  {
    itemId: "carrots",
    name: "Carrots",
    foodGroup: "veggie",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 35, protein: 1, carbs: 8, fiber: 3, vitamins: ["A", "K", "B6"] },
    funFact:
      "Carrots were originally purple, not orange! Orange carrots were bred in the Netherlands in the 1600s to honor the royal family.",
    superComboPairs: ["hummus"],
  },
  {
    itemId: "broccoli",
    name: "Broccoli",
    foodGroup: "veggie",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 55, protein: 4, carbs: 11, fiber: 5, vitamins: ["C", "K", "A"] },
    funFact:
      "Broccoli is related to cabbage, cauliflower, and Brussels sprouts — they're all part of the same plant family called 'brassicas'!",
    superComboPairs: ["grilled-salmon"],
  },
  {
    itemId: "corn",
    name: "Corn",
    foodGroup: "veggie",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 90, protein: 3, carbs: 19, fiber: 2, vitamins: ["B1", "B5", "C"] },
    funFact:
      "Each ear of corn has about 800 kernels arranged in 16 rows, and every kernel started as a separate tiny flower!",
    superComboPairs: ["pasta"],
  },
  {
    itemId: "celery",
    name: "Celery",
    foodGroup: "veggie",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 10, protein: 0, carbs: 3, fiber: 2, vitamins: ["K", "A", "C"] },
    funFact:
      "Celery is about 95% water, making it one of the most hydrating vegetables you can eat — it's almost like crunchy water!",
    superComboPairs: [],
  },
  {
    itemId: "cucumber",
    name: "Cucumber",
    foodGroup: "veggie",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 16, protein: 1, carbs: 4, fiber: 1, vitamins: ["K", "C"] },
    funFact:
      "Cucumbers are technically fruits because they grow from flowers and contain seeds, but we eat them like veggies!",
    superComboPairs: [],
  },
  {
    itemId: "green-beans",
    name: "Green Beans",
    foodGroup: "veggie",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 31, protein: 2, carbs: 7, fiber: 3, vitamins: ["C", "K", "A"] },
    funFact:
      "Green beans snap when you break them because they're full of water — that's why they're also called 'snap beans'!",
    superComboPairs: [],
  },
  {
    itemId: "peas",
    name: "Peas",
    foodGroup: "veggie",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 62, protein: 4, carbs: 11, fiber: 4, vitamins: ["C", "K", "A", "B1"] },
    funFact:
      "Peas were the first vegetable to be canned and the first to be frozen commercially — they've been pioneers of food technology!",
    superComboPairs: [],
  },
  {
    itemId: "bell-pepper",
    name: "Bell Pepper",
    foodGroup: "veggie",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 30, protein: 1, carbs: 7, fiber: 2, vitamins: ["C", "A", "B6"] },
    funFact:
      "A red bell pepper has almost 3 times more vitamin C than an orange! Green, yellow, and red peppers are actually the same plant at different stages of ripeness.",
    superComboPairs: ["falafel-wrap"],
  },
  {
    itemId: "sweet-potato",
    name: "Sweet Potato",
    foodGroup: "veggie",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 103, protein: 2, carbs: 24, fiber: 4, vitamins: ["A", "C", "B6"] },
    funFact:
      "Sweet potatoes are one of the oldest vegetables known to humans — they've been eaten for over 5,000 years! NASA has studied growing them in space.",
    superComboPairs: ["chicken-nuggets"],
  },
  {
    itemId: "avocado",
    name: "Avocado",
    foodGroup: "veggie",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 160, protein: 2, carbs: 9, fiber: 7, vitamins: ["K", "C", "B5", "B6", "E"] },
    funFact:
      "Avocados are actually a berry! They also have more potassium than bananas, which helps your muscles and heart work properly.",
    superComboPairs: ["burrito"],
  },
  {
    itemId: "artichoke",
    name: "Artichoke",
    foodGroup: "veggie",
    rarity: "epic",
    imageUrl: "",
    nutrition: { calories: 60, protein: 3, carbs: 13, fiber: 7, vitamins: ["C", "K", "B9", "B6"] },
    funFact:
      "An artichoke is actually a flower bud — if you don't pick it, it blooms into a beautiful purple thistle as big as a softball!",
    superComboPairs: [],
  },
  {
    itemId: "purple-cauliflower",
    name: "Purple Cauliflower",
    foodGroup: "veggie",
    rarity: "epic",
    imageUrl: "",
    nutrition: { calories: 25, protein: 2, carbs: 5, fiber: 2, vitamins: ["C", "K", "B6"] },
    funFact:
      "Purple cauliflower gets its color from the same antioxidant found in blueberries — anthocyanin! It turns green when you cook it.",
    superComboPairs: [],
  },

  // ═══════════════════════════════════════════════════════════════
  // MAINS (12): 7 common, 3 rare, 2 epic
  // ═══════════════════════════════════════════════════════════════
  {
    itemId: "sandwich",
    name: "Sandwich",
    foodGroup: "main",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 350, protein: 18, carbs: 35, fiber: 3, vitamins: ["B1", "B3", "Iron"] },
    funFact:
      "The sandwich was invented in the 1760s by the Earl of Sandwich, who wanted to eat without leaving his card game — so he put meat between bread!",
    superComboPairs: [],
  },
  {
    itemId: "pizza-slice",
    name: "Pizza Slice",
    foodGroup: "main",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 285, protein: 12, carbs: 36, fiber: 2, vitamins: ["A", "B12", "Iron"] },
    funFact:
      "Americans eat about 3 billion pizzas every year — that's 100 acres of pizza per day, roughly the size of 75 football fields!",
    superComboPairs: [],
  },
  {
    itemId: "mac-and-cheese",
    name: "Mac & Cheese",
    foodGroup: "main",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 310, protein: 12, carbs: 40, fiber: 1, vitamins: ["A", "B12", "D"] },
    funFact:
      "Mac and cheese has been around since the 1300s! Thomas Jefferson loved it so much he brought a pasta machine back from Italy to America.",
    superComboPairs: [],
  },
  {
    itemId: "chicken-nuggets",
    name: "Chicken Nuggets",
    foodGroup: "main",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 270, protein: 16, carbs: 16, fiber: 0, vitamins: ["B3", "B6", "Iron"] },
    funFact:
      "Chicken nuggets were invented by a food scientist named Robert Baker in the 1950s — he figured out how to make ground chicken keep its shape when cooked!",
    superComboPairs: ["sweet-potato"],
  },
  {
    itemId: "pasta",
    name: "Pasta",
    foodGroup: "main",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 220, protein: 8, carbs: 43, fiber: 3, vitamins: ["B1", "B9", "Iron"] },
    funFact:
      "There are over 600 different shapes of pasta in the world, and each shape is designed to hold different types of sauce!",
    superComboPairs: ["corn"],
  },
  {
    itemId: "rice-bowl",
    name: "Rice Bowl",
    foodGroup: "main",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 240, protein: 5, carbs: 53, fiber: 1, vitamins: ["B1", "B3", "Iron"] },
    funFact:
      "Rice feeds more than half the world's population every single day — it's been cultivated for over 9,000 years!",
    superComboPairs: ["pineapple"],
  },
  {
    itemId: "burrito",
    name: "Burrito",
    foodGroup: "main",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 400, protein: 20, carbs: 45, fiber: 5, vitamins: ["A", "C", "Iron", "B12"] },
    funFact:
      "The word 'burrito' means 'little donkey' in Spanish, possibly because the rolled-up tortilla looks like a donkey's packed saddlebag!",
    superComboPairs: ["avocado"],
  },
  {
    itemId: "sushi-roll",
    name: "Sushi Roll",
    foodGroup: "main",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 255, protein: 9, carbs: 38, fiber: 2, vitamins: ["B12", "A", "Iron"] },
    funFact:
      "Sushi originally started as a way to preserve fish in fermented rice — the rice was thrown away and only the fish was eaten!",
    superComboPairs: ["green-smoothie"],
  },
  {
    itemId: "grilled-salmon",
    name: "Grilled Salmon",
    foodGroup: "main",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 280, protein: 30, carbs: 0, fiber: 0, vitamins: ["D", "B12", "B6"] },
    funFact:
      "Salmon can jump up to 12 feet high to get over waterfalls during their upstream migration — they're the Olympic athletes of the fish world!",
    superComboPairs: ["broccoli"],
  },
  {
    itemId: "falafel-wrap",
    name: "Falafel Wrap",
    foodGroup: "main",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 330, protein: 13, carbs: 42, fiber: 5, vitamins: ["C", "B6", "Iron"] },
    funFact:
      "Falafel is made from chickpeas, which are one of the earliest cultivated crops — people in the Middle East have been eating them for over 7,000 years!",
    superComboPairs: ["bell-pepper"],
  },
  {
    itemId: "lobster-roll",
    name: "Lobster Roll",
    foodGroup: "main",
    rarity: "epic",
    imageUrl: "",
    nutrition: { calories: 360, protein: 22, carbs: 28, fiber: 1, vitamins: ["B12", "E", "Iron"] },
    funFact:
      "Lobsters used to be so common in colonial America that they were considered food for the poor — now they're a fancy delicacy!",
    superComboPairs: [],
  },
  {
    itemId: "wagyu-slider",
    name: "Wagyu Slider",
    foodGroup: "main",
    rarity: "epic",
    imageUrl: "",
    nutrition: { calories: 320, protein: 18, carbs: 20, fiber: 1, vitamins: ["B12", "B6", "Iron"] },
    funFact:
      "Wagyu cattle in Japan are sometimes brushed with sake and listened to classical music — farmers believe happy cows make better-tasting beef!",
    superComboPairs: [],
  },

  // ═══════════════════════════════════════════════════════════════
  // SNACKS (12): 7 common, 3 rare, 2 epic
  // ═══════════════════════════════════════════════════════════════
  {
    itemId: "granola-bar",
    name: "Granola Bar",
    foodGroup: "snack",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 190, protein: 4, carbs: 29, fiber: 3, vitamins: ["E", "B1", "Iron"] },
    funFact:
      "Granola was invented in the 1860s as a health food — the original version was so hard you had to soak it overnight before eating!",
    superComboPairs: ["milk"],
  },
  {
    itemId: "crackers",
    name: "Crackers",
    foodGroup: "snack",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 120, protein: 3, carbs: 20, fiber: 1, vitamins: ["B1", "Iron"] },
    funFact:
      "Graham crackers were invented in the 1800s by Sylvester Graham, a minister who believed plain food would make people healthier and more well-behaved!",
    superComboPairs: [],
  },
  {
    itemId: "popcorn",
    name: "Popcorn",
    foodGroup: "snack",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 93, protein: 3, carbs: 19, fiber: 4, vitamins: ["B1", "B3", "B6"] },
    funFact:
      "Popcorn pops because each kernel has a tiny drop of water inside — when heated, it turns to steam and explodes the kernel inside out!",
    superComboPairs: ["apple-juice"],
  },
  {
    itemId: "trail-mix",
    name: "Trail Mix",
    foodGroup: "snack",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 175, protein: 5, carbs: 17, fiber: 2, vitamins: ["E", "B3", "Iron"] },
    funFact:
      "Trail mix was created for hikers because it's lightweight and packed with energy — the mix of nuts, dried fruit, and chocolate gives you quick and lasting fuel!",
    superComboPairs: ["coconut-water"],
  },
  {
    itemId: "pretzels",
    name: "Pretzels",
    foodGroup: "snack",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 110, protein: 3, carbs: 23, fiber: 1, vitamins: ["B1", "B3", "Iron"] },
    funFact:
      "Pretzels are one of the oldest snack foods — monks in the 600s gave them as rewards to children who learned their prayers!",
    superComboPairs: [],
  },
  {
    itemId: "cheese-stick",
    name: "Cheese Stick",
    foodGroup: "snack",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 80, protein: 7, carbs: 1, fiber: 0, vitamins: ["A", "B12", "D"] },
    funFact:
      "Cheese is one of the most stolen foods in the world! About 4% of all cheese produced globally ends up being stolen.",
    superComboPairs: ["apple"],
  },
  {
    itemId: "yogurt",
    name: "Yogurt",
    foodGroup: "snack",
    rarity: "common",
    imageUrl: "",
    nutrition: { calories: 150, protein: 12, carbs: 17, fiber: 0, vitamins: ["B12", "B2", "D"] },
    funFact:
      "Yogurt has been eaten for over 5,000 years! It contains billions of live bacteria called probiotics that help keep your gut healthy.",
    superComboPairs: ["banana"],
  },
  {
    itemId: "hummus",
    name: "Hummus",
    foodGroup: "snack",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 160, protein: 8, carbs: 15, fiber: 6, vitamins: ["B6", "C", "Iron"] },
    funFact:
      "Hummus means 'chickpea' in Arabic. The world's largest hummus plate weighed over 23,000 pounds — that's heavier than two elephants!",
    superComboPairs: ["carrots"],
  },
  {
    itemId: "dark-chocolate",
    name: "Dark Chocolate",
    foodGroup: "snack",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 170, protein: 2, carbs: 13, fiber: 3, vitamins: ["Iron", "E"] },
    funFact:
      "Dark chocolate contains natural chemicals that trigger the same feelings of happiness as being in love — no wonder it's such a popular treat!",
    superComboPairs: ["strawberry"],
  },
  {
    itemId: "acai-bowl",
    name: "Acai Bowl",
    foodGroup: "snack",
    rarity: "rare",
    imageUrl: "",
    nutrition: { calories: 210, protein: 4, carbs: 35, fiber: 5, vitamins: ["C", "A", "E"] },
    funFact:
      "Acai bowls started as a post-surf snack in Brazil. Surfers in Rio would blend frozen acai with guarana syrup for a quick energy boost after riding waves!",
    superComboPairs: [],
  },
  {
    itemId: "truffle-fries",
    name: "Truffle Fries",
    foodGroup: "snack",
    rarity: "epic",
    imageUrl: "",
    nutrition: { calories: 320, protein: 4, carbs: 38, fiber: 3, vitamins: ["C", "B6"] },
    funFact:
      "Truffles are the most expensive food in the world by weight — some sell for over $3,000 per pound! They grow underground and are found by trained dogs or pigs.",
    superComboPairs: [],
  },
  {
    itemId: "cheese-board",
    name: "Cheese Board",
    foodGroup: "snack",
    rarity: "epic",
    imageUrl: "",
    nutrition: { calories: 350, protein: 18, carbs: 15, fiber: 2, vitamins: ["A", "B12", "D", "K"] },
    funFact:
      "There are over 1,800 different types of cheese in the world! France alone makes more than 400 varieties — almost a different cheese for every day of the year.",
    superComboPairs: [],
  },
];

export const FOOD_ITEMS_BY_ID = new Map(FOOD_ITEMS.map((item) => [item.itemId, item]));

export const FOOD_ITEMS_BY_GROUP = {
  drink: FOOD_ITEMS.filter((i) => i.foodGroup === "drink"),
  fruit: FOOD_ITEMS.filter((i) => i.foodGroup === "fruit"),
  veggie: FOOD_ITEMS.filter((i) => i.foodGroup === "veggie"),
  main: FOOD_ITEMS.filter((i) => i.foodGroup === "main"),
  snack: FOOD_ITEMS.filter((i) => i.foodGroup === "snack"),
};
