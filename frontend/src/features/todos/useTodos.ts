import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobApplicationKeys } from '../../api/jobApplications';
import { todoKeys, todosApi, type TodoRequest } from '../../api/todos';
import type { Todo } from '../../api/types';

export function useTodosQuery() {
  return useQuery({ queryKey: todoKeys.all, queryFn: todosApi.list });
}

/** Gorevler kart detayinda da listeleniyor; bu yuzden her degisiklikten sonra ikisi de yenilenir. */
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: todoKeys.all }),
      queryClient.invalidateQueries({ queryKey: jobApplicationKeys.all }),
    ]);
}

export function useSaveTodo() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: TodoRequest }) =>
      id === null ? todosApi.create(body) : todosApi.update(id, body),
    onSuccess: invalidate,
  });
}

/**
 * Tamamla / geri al. "Iyimser guncelleme" (optimistic update): onay kutusu sunucu cevabini beklemeden
 * hemen isaretlenir; istek basarisiz olursa eski listeye geri donulur. Liste tiklamalarda gecikmesiz hissettirir.
 */
export function useToggleTodo() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) => todosApi.setCompletion(id, isCompleted),
    onMutate: async ({ id, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.all });
      const previous = queryClient.getQueryData<Todo[]>(todoKeys.all);
      queryClient.setQueryData<Todo[]>(todoKeys.all, (old) =>
        old?.map((t) =>
          t.id === id ? { ...t, isCompleted, completedAt: isCompleted ? new Date().toISOString() : null } : t,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(todoKeys.all, context.previous);
    },
    onSettled: invalidate,
  });
}

export function useDeleteTodo() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => todosApi.remove(id),
    onSuccess: invalidate,
  });
}
