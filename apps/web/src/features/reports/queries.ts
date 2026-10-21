import type { ByCategoryReport, TransactionType } from "@cash/shared";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/session";

export type ReportPeriod = { month: string } | { year: number };

export function useByCategory(type: TransactionType, period: ReportPeriod) {
  const { api } = useSession();
  return useQuery({
    queryKey: ["reports", "by-category", type, period],
    queryFn: () => {
      const qs = "month" in period ? `month=${period.month}` : `year=${period.year}`;
      return api.request<ByCategoryReport>(`/reports/by-category?type=${type}&${qs}`);
    },
  });
}
