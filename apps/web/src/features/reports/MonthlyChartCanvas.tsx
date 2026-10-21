"use client";

import { formatBrl, monthLabel } from "@cash/shared";
import { useEffect, useRef, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from "recharts";
import { useMediaQuery } from "@/lib/use-media-query";
import type { ChartDatum } from "./monthly-data";

const HEIGHT = 240;
const MIN_PER_MONTH = 56;

const AXIS = { fill: "var(--color-text-secondary)", fontSize: 12 };

/** Gráfico de 12 meses; largura fixa em px dentro de um contêiner rolável (no mobile mostra os meses recentes). */
export default function MonthlyChartCanvas({ data }: { data: ChartDatum[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const minWidth = data.length * MIN_PER_MONTH;
  const [containerWidth, setContainerWidth] = useState(0);
  const showYAxis = useMediaQuery("(min-width: 768px)");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = Math.max(containerWidth, minWidth);

  // após o primeiro layout com largura final, deixa os meses recentes à vista
  const scrolled = useRef(false);
  useEffect(() => {
    const el = scroller.current;
    if (el && !scrolled.current) {
      el.scrollLeft = el.scrollWidth;
      scrolled.current = true;
    }
  }, [width]);

  return (
    <div ref={scroller} className="overflow-x-auto" style={{ height: HEIGHT + 8 }}>
      <ComposedChart width={width} height={HEIGHT} data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
        {showYAxis && (
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={80} tickFormatter={(v: number) => formatBrl(v)} />
        )}
        <Tooltip
          cursor={{ fill: "var(--color-surface-elevated)", opacity: 0.4 }}
          formatter={(v) => formatBrl(Number(v))}
          labelFormatter={(_, p) => {
            const month = (p[0]?.payload as ChartDatum | undefined)?.month;
            return month ? monthLabel(month) : "";
          }}
          contentStyle={{
            background: "color-mix(in srgb, var(--color-surface-elevated) 80%, transparent)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            color: "var(--color-text-primary)",
          }}
          itemStyle={{ color: "var(--color-text-primary)" }}
        />
        <Bar dataKey="income" name="Ganhos" fill="var(--color-success)" radius={[3, 3, 0, 0]} isAnimationActive={!reduceMotion} />
        <Bar dataKey="expense" name="Gastos" fill="var(--color-danger)" radius={[3, 3, 0, 0]} isAnimationActive={!reduceMotion} />
        <Line
          dataKey="balance"
          name="Diferença"
          type="monotone"
          stroke="var(--color-info)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-info)" }}
          isAnimationActive={!reduceMotion}
        />
      </ComposedChart>
    </div>
  );
}
