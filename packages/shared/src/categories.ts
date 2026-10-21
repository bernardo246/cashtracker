export const CATEGORY_ICONS = [
  "Bike", "Fuel", "ShoppingCart", "House", "Bus", "HeartPulse", "Gamepad2", "Repeat", "Ellipsis",
  "Briefcase", "Laptop", "TrendingUp", "Gift",
  "Car", "Utensils", "GraduationCap", "Shirt", "PiggyBank", "Wallet", "Plane", "Dog", "Baby",
  "Wrench", "Smartphone", "Coffee",
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

// Contraste AA sobre #111714
export const CATEGORY_COLORS = [
  "#3ECF8E", "#60A5FA", "#FBBF24", "#F87171", "#A78BFA",
  "#F472B6", "#34D399", "#FB923C", "#22D3EE", "#94A69C",
] as const;

export type TransactionType = "income" | "expense";

export const DEFAULT_CATEGORIES: ReadonlyArray<{
  name: string;
  type: TransactionType;
  icon: CategoryIcon;
  color: string;
}> = [
  { name: "Delivery", type: "expense", icon: "Bike", color: "#FB923C" },
  { name: "Combustível", type: "expense", icon: "Fuel", color: "#FBBF24" },
  { name: "Mercado", type: "expense", icon: "ShoppingCart", color: "#34D399" },
  { name: "Moradia", type: "expense", icon: "House", color: "#60A5FA" },
  { name: "Transporte", type: "expense", icon: "Bus", color: "#22D3EE" },
  { name: "Saúde", type: "expense", icon: "HeartPulse", color: "#F87171" },
  { name: "Lazer", type: "expense", icon: "Gamepad2", color: "#A78BFA" },
  { name: "Assinaturas", type: "expense", icon: "Repeat", color: "#F472B6" },
  { name: "Outros", type: "expense", icon: "Ellipsis", color: "#94A69C" },
  { name: "Salário", type: "income", icon: "Briefcase", color: "#3ECF8E" },
  { name: "Freelance", type: "income", icon: "Laptop", color: "#60A5FA" },
  { name: "Investimentos", type: "income", icon: "TrendingUp", color: "#34D399" },
  { name: "Presente", type: "income", icon: "Gift", color: "#F472B6" },
  { name: "Outros", type: "income", icon: "Ellipsis", color: "#94A69C" },
];
