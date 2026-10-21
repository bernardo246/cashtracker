"use client";

import { formatBrl, type ByCategoryReport } from "@cash/shared";
import { useSyncExternalStore } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CategoryIcon } from "@/features/transactions/category-icon";
import { categoryLabel, formatShare } from "./format";

type Item = ByCategoryReport["items"][number];

interface CategoryBarChartProps {
  items: Item[];
  color: string;
}

const ROW_HEIGHT = 44;
const MAX_NAME = 18;

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribe(cb: () => void) {
  const mq = window.matchMedia?.(REDUCED);
  mq?.addEventListener("change", cb);
  return () => mq?.removeEventListener("change", cb);
}
const prefersReducedMotion = () => window.matchMedia?.(REDUCED).matches ?? false;

function truncate(s: string): string {
  return s.length > MAX_NAME ? `${s.slice(0, MAX_NAME - 1)}…` : s;
}

interface TickProps {
  x?: number;
  y?: number;
  payload?: { index: number };
  names: { name: string; iconName: string }[];
}

function Tick({ x = 0, y = 0, payload, names }: TickProps) {
  const d = names[payload?.index ?? 0];
  if (!d) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{d.name}</title>
      <svg x={-146} y={-9} width={18} height={18} fill="none" stroke="var(--color-text-secondary)" overflow="visible">
        <CategoryIcon name={d.iconName} className="size-[18px]" />
      </svg>
      <text x={-122} y={0} dy={4} fill="var(--color-text-secondary)" fontSize={13}>
        {truncate(d.name)}
      </text>
    </g>
  );
}

export function CategoryBarChart({ items, color }: CategoryBarChartProps) {
  const reduced = useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
  const data = items.map((i) => ({
    name: categoryLabel(i),
    iconName: i.icon,
    totalCents: i.totalCents,
    text: `${formatBrl(i.totalCents)} · ${formatShare(i.share)}`,
  }));

  return (
    <div style={{ height: items.length * ROW_HEIGHT, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 150, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="name" width={150} axisLine={false} tickLine={false} tick={<Tick names={data} />} interval={0} />
          <Tooltip
            cursor={{ fill: "var(--color-border)", opacity: 0.3 }}
            formatter={(v) => formatBrl(Number(v))}
            labelStyle={{ color: "var(--color-text-secondary)" }}
            contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8 }}
          />
          <Bar dataKey="totalCents" name="Total" radius={[0, 4, 4, 0]} isAnimationActive={!reduced}>
            {data.map((d) => (
              <Cell key={d.name} fill={color} />
            ))}
            <LabelList
              dataKey="text"
              position="right"
              fill="var(--color-text-secondary)"
              fontSize={13}
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
