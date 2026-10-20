import {
  Baby, Bike, Briefcase, Bus, Car, Coffee, Dog, Ellipsis, Fuel, Gamepad2, Gift, GraduationCap, HeartPulse,
  House, Laptop, PiggyBank, Plane, Repeat, Shirt, ShoppingCart, Smartphone, TrendingUp, Utensils, Wallet, Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CategoryIcon as IconName } from "@cash/shared";

// Mapa explícito (sem `import *`) para manter o bundle pequeno.
const ICONS: Record<IconName, LucideIcon> = {
  Bike, Fuel, ShoppingCart, House, Bus, HeartPulse, Gamepad2, Repeat, Ellipsis, Briefcase, Laptop, TrendingUp, Gift,
  Car, Utensils, GraduationCap, Shirt, PiggyBank, Wallet, Plane, Dog, Baby, Wrench, Smartphone, Coffee,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (ICONS as Record<string, LucideIcon>)[name] ?? Ellipsis;
  return <Icon className={className} aria-hidden="true" />;
}
