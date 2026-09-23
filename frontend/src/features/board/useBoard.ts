import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cvKeys, cvsApi } from '../../api/cvs';
import { jobApplicationKeys, jobApplicationsApi } from '../../api/jobApplications';
import type {
  CreateJobApplicationRequest,
  JobApplicationSummary,
  MoveJobApplicationRequest,
  UpdateJobApplicationRequest,
} from '../../api/types';

/*
 * Pano ile ilgili tum sunucu islemleri (query + mutation) burada toplanir.
 * Bilesenler API'yi dogrudan cagirmaz; bu hook'lari kullanir. Boylece cache yenileme kurallari tek yerde kalir.
 */

export function useBoardQuery() {
  return useQuery({ queryKey: jobApplicationKeys.board(), queryFn: jobApplicationsApi.getBoard });
}

export function useJobApplicationQuery(id: string | null) {
  return useQuery({
    queryKey: jobApplicationKeys.detail(id ?? ''),
    queryFn: () => jobApplicationsApi.getById(id!),
    enabled: id !== null,
  });
}

export function useCvsQuery(enabled = true) {
  return useQuery({ queryKey: cvKeys.all, queryFn: cvsApi.list, enabled });
}

export function useCreateJobApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateJobApplicationRequest) => jobApplicationsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobApplicationKeys.board() }),
  });
}

export function useUpdateJobApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateJobApplicationRequest }) => jobApplicationsApi.update(id, body),
    onSuccess: (detail) => {
      // Detay cevabi zaten elimizde: detay cache'ini dogrudan yaz, panoyu yenile.
      queryClient.setQueryData(jobApplicationKeys.detail(detail.id), detail);
      return queryClient.invalidateQueries({ queryKey: jobApplicationKeys.board() });
    },
  });
}

export function useDeleteJobApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobApplicationsApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: jobApplicationKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: jobApplicationKeys.board() });
    },
  });
}

/**
 * Kart tasima. Pano cache'i suruklemenin bittigi anda (mutation'dan ONCE) BoardPage tarafindan guncellenir
 * (optimistic update), bu yuzden kart ekranda aninda yerinde kalir. Hata olursa onError ile eski listeye donulur.
 */
export function useMoveJobApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MoveJobApplicationRequest; previous?: JobApplicationSummary[] }) =>
      jobApplicationsApi.move(id, body),
    onError: (_error, variables) => {
      if (variables.previous) queryClient.setQueryData(jobApplicationKeys.board(), variables.previous);
    },
    // Basarili da olsa hatali da olsa sunucudaki gercek hali cek (appliedAt, durum gecmisi vb.).
    onSettled: () => queryClient.invalidateQueries({ queryKey: jobApplicationKeys.all }),
  });
}
