import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { interviewKeys, interviewsApi, type CreateInterviewRequest, type UpdateInterviewRequest } from '../../api/interviews';
import { jobApplicationKeys } from '../../api/jobApplications';
import type { InterviewOutcome } from '../../api/types';

export function useInterviewsQuery() {
  return useQuery({ queryKey: interviewKeys.all, queryFn: interviewsApi.list });
}

/**
 * Mulakat degisiklikleri kart detayini da etkiler (detayda mulakat listesi var);
 * olusturma ise karti Interview sutununa tasiyabilir. Bu yuzden her islemden sonra ikisi de yenilenir.
 */
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: interviewKeys.all }),
      queryClient.invalidateQueries({ queryKey: jobApplicationKeys.all }),
    ]);
}

export function useSaveInterview() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (args: { id: null; body: CreateInterviewRequest } | { id: string; body: UpdateInterviewRequest }) =>
      args.id === null ? interviewsApi.create(args.body) : interviewsApi.update(args.id, args.body),
    onSuccess: invalidate,
  });
}

export function useSetInterviewOutcome() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: InterviewOutcome }) => interviewsApi.setOutcome(id, outcome),
    onSuccess: invalidate,
  });
}

export function useDeleteInterview() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => interviewsApi.remove(id),
    onSuccess: invalidate,
  });
}
