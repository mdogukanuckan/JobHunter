import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cvKeys, cvsApi } from '../../api/cvs';
import { jobApplicationKeys } from '../../api/jobApplications';
import { profileKeys } from '../../api/profile';

export { useCvsQuery } from '../board/useBoard';

export function useUploadCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress: (p: number) => void }) =>
      cvsApi.upload(file, null, onProgress),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cvKeys.all }),
  });
}

export function useRenameCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => cvsApi.rename(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.all }); // varsayilan CV adi profilde de gorunuyor
      return queryClient.invalidateQueries({ queryKey: cvKeys.all });
    },
  });
}

export function useDeleteCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cvsApi.remove(id),
    onSuccess: () => {
      // Silinen CV varsayilansa profilden de kalkar; basvuru detaylarinda "(silinmis)" olarak gorunur.
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
      void queryClient.invalidateQueries({ queryKey: jobApplicationKeys.all });
      return queryClient.invalidateQueries({ queryKey: cvKeys.all });
    },
  });
}

/** Dosyayi indirir: Blob'u gecici bir URL'e cevirip gorunmez bir <a download> ile tiklatir. */
export async function downloadCv(id: string, fileName: string) {
  const blob = await cvsApi.downloadBlob(id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Tarayici indirmeyi baslattiktan sonra bellegi serbest birak.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
