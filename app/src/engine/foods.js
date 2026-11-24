// Built-in food list. Values are per listed serving and are rounded averages from
// standard nutrition tables (USDA-style); home recipes vary, so treat them as estimates.
// tag: "veg" (vegetarian), "egg", "meat". slot hints drive meal recommendations.
export const FOODS = [
  { id: "egg", name: "Egg, whole", serving: "1 large", kcal: 72, p: 6.3, c: 0.4, f: 4.8, tag: "egg" },
  { id: "eggwhite", name: "Egg white", serving: "1 large", kcal: 17, p: 3.6, c: 0.2, f: 0.1, tag: "egg" },
  { id: "chicken", name: "Chicken breast, cooked", serving: "100 g", kcal: 165, p: 31, c: 0, f: 3.6, tag: "meat" },
  { id: "chickencurry", name: "Chicken curry", serving: "1 cup", kcal: 290, p: 28, c: 8, f: 16, tag: "meat" },
  { id: "salmon", name: "Salmon, cooked", serving: "100 g", kcal: 206, p: 22, c: 0, f: 12, tag: "meat" },
  { id: "tuna", name: "Tuna in water", serving: "1 can, drained", kcal: 130, p: 28, c: 0, f: 1, tag: "meat" },
  { id: "paneer", name: "Paneer", serving: "100 g", kcal: 290, p: 18, c: 4, f: 22, tag: "veg" },
  { id: "tofu", name: "Tofu, firm", serving: "100 g", kcal: 144, p: 17, c: 3, f: 9, tag: "veg" },
  { id: "dal", name: "Dal, cooked", serving: "1 cup", kcal: 200, p: 12, c: 30, f: 4, tag: "veg" },
  { id: "rajma", name: "Rajma / kidney beans", serving: "1 cup", kcal: 225, p: 15, c: 40, f: 1, tag: "veg" },
  { id: "chana", name: "Chickpeas, cooked", serving: "1 cup", kcal: 269, p: 14.5, c: 45, f: 4.2, tag: "veg" },
  { id: "rice", name: "Rice, cooked", serving: "1 cup", kcal: 205, p: 4.3, c: 45, f: 0.4, tag: "veg" },
  { id: "roti", name: "Roti / chapati", serving: "1 medium", kcal: 110, p: 3, c: 18, f: 3, tag: "veg" },
  { id: "bread", name: "Whole wheat bread", serving: "1 slice", kcal: 80, p: 4, c: 14, f: 1, tag: "veg" },
  { id: "oats", name: "Oats, dry", serving: "1/2 cup (40 g)", kcal: 150, p: 5, c: 27, f: 3, tag: "veg" },
  { id: "idli", name: "Idli", serving: "1 piece", kcal: 60, p: 2, c: 12, f: 0.2, tag: "veg" },
  { id: "dosa", name: "Dosa, plain", serving: "1 piece", kcal: 135, p: 3, c: 22, f: 4, tag: "veg" },
  { id: "sweetpotato", name: "Sweet potato, baked", serving: "1 medium", kcal: 112, p: 2, c: 26, f: 0.1, tag: "veg" },
  { id: "sabzi", name: "Vegetable sabzi", serving: "1 cup", kcal: 120, p: 3, c: 14, f: 6, tag: "veg" },
  { id: "salad", name: "Salad, no dressing", serving: "1 bowl", kcal: 35, p: 2, c: 7, f: 0.3, tag: "veg" },
  { id: "greekyogurt", name: "Greek yogurt, nonfat", serving: "170 g", kcal: 100, p: 17, c: 6, f: 0.7, tag: "veg" },
  { id: "curd", name: "Curd / plain yogurt", serving: "1 cup", kcal: 150, p: 8.5, c: 11, f: 8, tag: "veg" },
  { id: "milk", name: "Milk, 2%", serving: "1 cup", kcal: 122, p: 8, c: 12, f: 4.8, tag: "veg" },
  { id: "whey", name: "Whey protein", serving: "1 scoop (30 g)", kcal: 120, p: 24, c: 3, f: 1.5, tag: "veg" },
  { id: "cottage", name: "Cottage cheese, low-fat", serving: "1/2 cup", kcal: 90, p: 12, c: 5, f: 2.5, tag: "veg" },
  { id: "banana", name: "Banana", serving: "1 medium", kcal: 105, p: 1.3, c: 27, f: 0.4, tag: "veg" },
  { id: "apple", name: "Apple", serving: "1 medium", kcal: 95, p: 0.5, c: 25, f: 0.3, tag: "veg" },
  { id: "berries", name: "Berries", serving: "1 cup", kcal: 85, p: 1, c: 21, f: 0.5, tag: "veg" },
  { id: "dates", name: "Dates", serving: "2 pieces", kcal: 133, p: 0.8, c: 36, f: 0.1, tag: "veg" },
  { id: "almonds", name: "Almonds", serving: "28 g", kcal: 164, p: 6, c: 6, f: 14, tag: "veg" },
  { id: "pb", name: "Peanut butter", serving: "1 tbsp", kcal: 95, p: 3.5, c: 3.5, f: 8, tag: "veg" },
  { id: "makhana", name: "Makhana, roasted", serving: "30 g", kcal: 105, p: 3, c: 23, f: 0.2, tag: "veg" },
  { id: "ghee", name: "Ghee or oil", serving: "1 tsp", kcal: 40, p: 0, c: 0, f: 4.5, tag: "veg" },
  { id: "sportsdrink", name: "Sports drink", serving: "500 ml", kcal: 125, p: 0, c: 32, f: 0, tag: "veg" },
];
export const foodById = Object.fromEntries(FOODS.map((x) => [x.id, x]));

// Meal templates: [foodId, servings]. Portions are scaled to the day's target.
// diet: "any" needs meat, "egg" is vegetarian plus eggs, "veg" is vegetarian.
export const MEALS = {
  breakfast: [
    { name: "Eggs, toast and fruit", diet: "egg", items: [["egg", 2], ["eggwhite", 2], ["bread", 2], ["banana", 1]] },
    { name: "Protein oats", diet: "veg", items: [["oats", 1], ["milk", 1], ["whey", 1], ["berries", 0.5]] },
    { name: "Idli, dal and curd", diet: "veg", items: [["idli", 3], ["dal", 0.75], ["curd", 0.5]] },
    { name: "Greek yogurt bowl", diet: "veg", items: [["greekyogurt", 1.5], ["oats", 0.5], ["berries", 1], ["almonds", 0.5]] },
  ],
  lunch: [
    { name: "Chicken, rice and sabzi", diet: "any", items: [["chicken", 1.5], ["rice", 1], ["sabzi", 1], ["salad", 1]] },
    { name: "Dal, roti and paneer", diet: "veg", items: [["dal", 1], ["roti", 2], ["paneer", 0.75], ["salad", 1]] },
    { name: "Rajma rice with curd", diet: "veg", items: [["rajma", 1], ["rice", 1], ["curd", 0.5], ["salad", 1]] },
    { name: "Egg curry style bowl", diet: "egg", items: [["egg", 3], ["rice", 1], ["sabzi", 1], ["salad", 1]] },
  ],
  snack: [
    { name: "Whey and a banana", diet: "veg", items: [["whey", 1], ["banana", 1]] },
    { name: "Greek yogurt and almonds", diet: "veg", items: [["greekyogurt", 1], ["almonds", 0.5]] },
    { name: "Makhana and milk", diet: "veg", items: [["makhana", 1], ["milk", 1]] },
    { name: "Apple and peanut butter", diet: "veg", items: [["apple", 1], ["pb", 1.5]] },
  ],
  dinner: [
    { name: "Chicken curry, roti and salad", diet: "any", items: [["chickencurry", 1], ["roti", 2], ["salad", 1]] },
    { name: "Salmon, sweet potato and sabzi", diet: "any", items: [["salmon", 1.5], ["sweetpotato", 1], ["sabzi", 1]] },
    { name: "Paneer, dal and roti", diet: "veg", items: [["paneer", 1], ["dal", 0.75], ["roti", 2], ["salad", 1]] },
    { name: "Tofu, rice and sabzi", diet: "veg", items: [["tofu", 1.5], ["rice", 1], ["sabzi", 1]] },
    { name: "Chana, roti and curd", diet: "veg", items: [["chana", 1], ["roti", 2], ["curd", 0.5], ["salad", 1]] },
  ],
};
export const SLOTS = [
  { key: "breakfast", label: "Breakfast", share: 0.25 },
  { key: "lunch", label: "Lunch", share: 0.32 },
  { key: "snack", label: "Snack", share: 0.13 },
  { key: "dinner", label: "Dinner", share: 0.3 },
];
