export type Tab = "ai" | "barcode";

export type FoodItem = {
  name: string;
  grams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  enabled: boolean;
};

export type ScanResult = {
  dish: string;
  items: FoodItem[];
};

export type BarcodeProduct = {
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingG: number | null;
};

export type MacroTotal = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
