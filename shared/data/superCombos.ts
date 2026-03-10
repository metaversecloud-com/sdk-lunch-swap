export interface SuperComboDefinition {
  name: string;
  items: [string, string];
  bonusXp: number;
  description: string;
}

export const SUPER_COMBOS: SuperComboDefinition[] = [
  {
    name: "Breakfast Bowl",
    items: ["milk", "granola-bar"],
    bonusXp: 30,
    description:
      "Milk and granola make the perfect morning combo — calcium for strong bones and whole grains for lasting energy!",
  },
  {
    name: "Mediterranean Dip",
    items: ["hummus", "carrots"],
    bonusXp: 30,
    description:
      "Crunchy carrots with creamy hummus — a protein-packed snack with tons of vitamin A for healthy eyesight!",
  },
  {
    name: "Classic Snack Pack",
    items: ["apple", "cheese-stick"],
    bonusXp: 30,
    description:
      "Apples and cheese are a perfect pair — the fiber from the fruit and protein from the cheese keep you full longer!",
  },
  {
    name: "Smoothie Base",
    items: ["banana", "yogurt"],
    bonusXp: 30,
    description:
      "Banana and yogurt together give you potassium, protein, and probiotics — blend them up and you've got a smoothie!",
  },
  {
    name: "Guac Wrap",
    items: ["avocado", "burrito"],
    bonusXp: 30,
    description:
      "Adding avocado to a burrito gives you healthy fats that help your body absorb vitamins from other ingredients!",
  },
  {
    name: "Power Plate",
    items: ["grilled-salmon", "broccoli"],
    bonusXp: 30,
    description:
      "Salmon's omega-3 fats and broccoli's vitamin K work together to build strong bones and a sharp brain!",
  },
  {
    name: "Hiker's Fuel",
    items: ["trail-mix", "coconut-water"],
    bonusXp: 30,
    description:
      "Trail mix gives you energy from nuts and dried fruit, while coconut water replaces electrolytes — perfect for adventure!",
  },
  {
    name: "Berry Bliss",
    items: ["strawberry", "dark-chocolate"],
    bonusXp: 30,
    description:
      "Strawberries dipped in dark chocolate — the vitamin C in berries helps your body absorb the iron in chocolate!",
  },
  {
    name: "Zen Meal",
    items: ["sushi-roll", "green-smoothie"],
    bonusXp: 30,
    description:
      "Sushi rice provides quick energy while the green smoothie adds a vitamin boost — a balanced, mindful meal!",
  },
  {
    name: "Harvest Plate",
    items: ["chicken-nuggets", "sweet-potato"],
    bonusXp: 30,
    description:
      "Chicken protein plus sweet potato's vitamin A and complex carbs — fuel for growing muscles and sharp eyesight!",
  },
  {
    name: "Tropical Blast",
    items: ["mango", "acai-smoothie"],
    bonusXp: 30,
    description:
      "Two tropical superfruits loaded with vitamins A and C — this combo is like a vacation for your immune system!",
  },
  {
    name: "Mediterranean Feast",
    items: ["falafel-wrap", "bell-pepper"],
    bonusXp: 30,
    description: "Falafel's plant protein from chickpeas pairs perfectly with bell pepper's mega dose of vitamin C!",
  },
  {
    name: "Island Bowl",
    items: ["pineapple", "rice-bowl"],
    bonusXp: 30,
    description:
      "Pineapple has an enzyme called bromelain that helps you digest proteins — it's a natural boost for your rice bowl!",
  },
  {
    name: "Movie Night",
    items: ["popcorn", "apple-juice"],
    bonusXp: 30,
    description:
      "Popcorn is actually a whole grain packed with fiber, and apple juice adds a refreshing vitamin C kick!",
  },
  {
    name: "Cornfield Pasta",
    items: ["pasta", "corn"],
    bonusXp: 30,
    description:
      "Pasta gives you sustained energy from complex carbs, and corn adds fiber and B vitamins to keep you going!",
  },
];
