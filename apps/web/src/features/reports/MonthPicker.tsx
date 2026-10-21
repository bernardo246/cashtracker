"use client";

import { currentMonthSaoPaulo, monthLabel, shiftMonth } from "@cash/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
  allowYear?: boolean;
  yearSelected?: boolean;
  onYearToggle?: () => void;
}

export function MonthPicker({ value, onChange, allowYear, yearSelected, onYearToggle }: MonthPickerProps) {
  const label = monthLabel(value);
  const atCurrent = value >= currentMonthSaoPaulo();
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => onChange(shiftMonth(value, -1))}>
        <ChevronLeft />
      </Button>
      <span className={cn("min-w-36 text-center font-medium", yearSelected && "text-text-secondary")}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Próximo mês"
        disabled={atCurrent}
        onClick={() => onChange(shiftMonth(value, 1))}
      >
        <ChevronRight />
      </Button>
      {allowYear && (
        <Button variant={yearSelected ? "primary" : "secondary"} size="sm" aria-pressed={!!yearSelected} onClick={onYearToggle}>
          Ano todo
        </Button>
      )}
    </div>
  );
}
