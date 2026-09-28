import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { automationApi, automationKeys } from '../../api/automation';
import { isActiveAutomation, type ApproveAutomationPayload, type AutomationJob, type AutomationMode } from '../../api/types';

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

/** Faz 11: onay ekranindaki inceleme raporu. Sadece is AwaitingApproval'a gectiginde anlamli; tekrar yenilenmesi gerekmez. */
export function useAutomationReviewQuery(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: automationKeys.review(id ?? ''),
    queryFn: () => automationApi.getReview(id!),
    enabled: enabled && id !== null,
  });
}

/**
 * Inceleme ekran goruntusu JWT ile korunan bir uc, bu yuzden dogrudan <img src="..."> calismaz
 * (Authorization header eklenmez). Blob olarak cekilip gecici bir object URL uretilir; degisince/
 * unmount'ta eski URL serbest birakilir.
 */
export function useReviewScreenshotUrl(id: string | null, hasScreenshot: boolean): { url: string | null; isLoading: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id || !hasScreenshot) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setIsLoading(true);
    automationApi
      .getReviewScreenshot(id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, hasScreenshot]);

  return { url, isLoading };
}

/** Onay ekranindan cevaplari + KVKK onayini gonderir. Basarili olursa is Submit icin n8n'e tekrar dusurulur. */
export function useApproveAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ApproveAutomationPayload }) => automationApi.approve(id, body),
    onSuccess: (job) => {
      queryClient.setQueryData(automationKeys.detail(job.id), job);
      return queryClient.invalidateQueries({ queryKey: automationKeys.all });
    },
  });
}
