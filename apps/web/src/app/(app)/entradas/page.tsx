"use client";

import { Suspense } from "react";
import { CategoryReportView } from "@/features/reports/CategoryReportView";

export default function Page() {
  return (
    <Suspense>
      <CategoryReportView type="income" />
    </Suspense>
  );
}
