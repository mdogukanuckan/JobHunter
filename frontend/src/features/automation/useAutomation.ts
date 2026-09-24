import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { automationApi, automationKeys } from '../../api/automation';
import { isActiveAutomation, type AutomationJob, type AutomationMode } from '../../api/types';

/*
 * Otomasyonun durumu backend'de n8n tarafindan degistirilir; tarayiciya "haber veren" bir kanal (SignalR vb.)
 * henuz yok. Bu yuzden POLLING kullaniyoruz: aktif (bitmemis) bir deneme varken veriyi birkac saniyede bir
 * yeniden cekiyoruz; her sey bittiginde yenileme kendiliginden durur (refetchInterval false doner).
 */
const LIST_POLL_MS = 3000;
const DETAIL_POLL_MS = 2000;

/** Tum denemeler. Pano rozetleri ve detay paneli ayni cache'i paylasir (tek istek). */
export function useAutomationJobsQuery() {
  return useQuery({
    queryKey: automationKeys.list(),
    queryFn: automationApi.list,
    refetchInterval: (query) => (query.state.data?.some((j) => isActiveAutomation(j.status)) ? LIST_POLL_MS : false),
  });
}

/** Bir basvurunun denemeleri (en yeni ilk). Liste API'si zaten en yeniyi ustte dondurur. */
export function useApplicationAutomationJobs(jobApplicationId: string): AutomationJob[] {
  const { data } = useAutomationJobsQuery();
  return (data ?? []).filter((j) => j.jobApplicationId === jobApplicationId);
}

/** Kart rozeti icin: basvurunun en son denemesi (yoksa undefined). */
export function useLatestAutomationJob(jobApplicationId: string): AutomationJob | undefined {
  return useApplicationAutomationJobs(jobApplicationId)[0];
}

/** Deneme detayi + gunluk. Deneme aktifken 2 sn'de bir yenilenir. */
export function useAutomationJobQuery(id: string | null) {
  return useQuery({
    queryKey: automationKeys.detail(id ?? ''),
    queryFn: () => automationApi.getById(id!),
    enabled: id !== null,
    refetchInterval: (query) => (query.state.data && isActiveAutomation(query.state.data.status) ? DETAIL_POLL_MS : false),
  });
}

export function useStartAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobApplicationId, mode }: { jobApplicationId: string; mode: AutomationMode }) =>
      automationApi.start(jobApplicationId, mode),
    // Liste yenilenince yeni deneme "aktif" gorunur ve polling kendiliginden baslar.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: automationKeys.all }),
  });
}

export function useCancelAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationApi.cancel(id),
    onSuccess: (job) => {
      queryClient.setQueryData(automationKeys.detail(job.id), job);
      return queryClient.invalidateQueries({ queryKey: automationKeys.all });
    },
  });
}
