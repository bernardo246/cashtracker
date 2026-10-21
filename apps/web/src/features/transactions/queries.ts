import type {
  CategoryDto, TransactionCreateInput, TransactionDto, TransactionPage, TransactionType, TransactionUpdateInput,
} from "@cash/shared";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";

export function useCategories(type: TransactionType) {
  const { api } = useSession();
  return useQuery({
    queryKey: ["categories", { type }],
    queryFn: () => api.request<CategoryDto[]>(`/categories?type=${type}`),
  });
}

/** Todas as categorias (inclusive arquivadas) para filtrar lançamentos antigos. */
export function useAllCategories() {
  const { api } = useSession();
  return useQuery({
    queryKey: ["categories", { all: true }],
    queryFn: () => api.request<CategoryDto[]>("/categories?includeArchived=true"),
  });
}

export interface TransactionFilters {
  month: string;
  type?: TransactionType;
  categoryId?: string;
}

const PAGE_SIZE = 30;

export function useTransactions(filters: TransactionFilters) {
  const { api } = useSession();
  return useInfiniteQuery({
    queryKey: ["transactions", filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams({ month: filters.month });
      if (filters.type) qs.set("type", filters.type);
      if (filters.categoryId) qs.set("categoryId", filters.categoryId);
      qs.set("limit", String(PAGE_SIZE));
      if (pageParam) qs.set("cursor", pageParam);
      return api.request<TransactionPage>(`/transactions?${qs.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}

/** Últimos lançamentos de todo o histórico (mais novos primeiro). */
export function useRecentTransactions(limit = 5) {
  const { api } = useSession();
  return useQuery({
    queryKey: ["transactions", "recent", limit],
    queryFn: () => api.request<TransactionPage>(`/transactions?limit=${limit}`),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: ["transactions"] }), qc.invalidateQueries({ queryKey: ["reports"] })]);
}

export function useCreateTransaction() {
  const { api } = useSession();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: TransactionCreateInput) =>
      api.request<TransactionDto>("/transactions", { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const { api } = useSession();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionUpdateInput }) =>
      api.request<TransactionDto>(`/transactions/${id}`, { method: "PATCH", json: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const { api } = useSession();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.request<void>(`/transactions/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
