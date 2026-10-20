import type { CategoryDto, TransactionCreateInput, TransactionDto, TransactionType, TransactionUpdateInput } from "@cash/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";

export function useCategories(type: TransactionType) {
  const { api } = useSession();
  return useQuery({
    queryKey: ["categories", { type }],
    queryFn: () => api.request<CategoryDto[]>(`/categories?type=${type}`),
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
