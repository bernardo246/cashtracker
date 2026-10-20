import { ArrowLeftRight, LayoutDashboard, Settings2, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Visão geral", href: "/visao-geral", icon: LayoutDashboard },
  { label: "Lançamentos", href: "/lancamentos", icon: ArrowLeftRight },
  { label: "Gastos", href: "/gastos", icon: TrendingDown },
  { label: "Entradas", href: "/entradas", icon: TrendingUp },
  { label: "Ajustes", href: "/ajustes", icon: Settings2 },
];

export function isActive(pathname: string | null, href: string): boolean {
  return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
}
