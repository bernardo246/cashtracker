import type { CategoryCreateInput, CategoryDto, CategoryUpdateInput, TransactionType, UserDto } from "@cash/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";

/** Categorias do tipo, inclusive arquivadas (tela de gestão). */
export function useManagedCategories(type: TransactionType) {
  const { api } = useSession();
  return useQuery({
    queryKey: ["categories", { type, managed: true }],
    queryFn: () => api.request<CategoryDto[]>(`/categories?type=${type}&includeArchived=true`),
  });
}

// Relatórios e lançamentos exibem nome/ícone/cor da categoria.
function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ["categories", "reports", "transactions"].map((key) => qc.invalidateQueries({ queryKey: [key] })),
    );
}

export function useCreateCategory() {
  const { api } = useSession();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CategoryCreateInput) => api.request<CategoryDto>("/categories", { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const { api } = useSession();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryUpdateInput }) =>
      api.request<CategoryDto>(`/categories/${id}`, { method: "PATCH", json: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const { api } = useSession();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.request<void>(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useUpdateProfile() {
  const { api, updateUser } = useSession();
  return useMutation({
    mutationFn: (name: string) => api.request<UserDto>("/me", { method: "PATCH", json: { name } }),
    onSuccess: (u) => updateUser(u),
  });
}
