import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi, profileKeys, type ProfileCollection, type ProfileCollectionItems } from '../../api/profile';
import type { AutofillPolicy, PolicyField, Profile, ProfileMainFields } from '../../api/types';

/** Backend'deki ProfileFields.Defaults ile ayni. Profil henuz yokken gosterilecek degerler. */
export const DEFAULT_POLICIES: Record<PolicyField, AutofillPolicy> = {
  DateOfBirth: 'Auto',
  Gender: 'AskFirst',
  MaritalStatus: 'AskFirst',
  Nationality: 'Auto',
  MilitaryService: 'Auto',
  DriverLicense: 'Auto',
  Address: 'Auto',
  Travel: 'Auto',
  Smoking: 'AskFirst',
  Disability: 'Never',
  ExpectedSalary: 'AskFirst',
  References: 'AskFirst',
};

export function useProfileQuery() {
  return useQuery({ queryKey: profileKeys.all, queryFn: profileApi.get });
}

export function useUpsertProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileMainFields) => profileApi.upsert(body),
    // PUT cevabi profilin tamami: cache'e dogrudan yaz, ekstra GET atma.
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.all, profile),
  });
}

/**
 * Politika degisikligi: optimistic update ile ikon aninda degisir; hata olursa eski haline doner.
 * Profil henuz yoksa backend bos bir profil olusturur -> o durumda profili yeniden cekeriz.
 */
export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ field, policy }: { field: PolicyField; policy: AutofillPolicy }) =>
      profileApi.updatePolicies({ [field]: policy }),
    onMutate: async ({ field, policy }) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.all });
      const previous = queryClient.getQueryData<Profile | null>(profileKeys.all);
      if (previous) {
        queryClient.setQueryData<Profile>(profileKeys.all, {
          ...previous,
          fieldPolicies: { ...previous.fieldPolicies, [field]: policy },
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(profileKeys.all, context.previous);
    },
    onSuccess: (policies) => {
      const current = queryClient.getQueryData<Profile | null>(profileKeys.all);
      if (current) queryClient.setQueryData<Profile>(profileKeys.all, { ...current, fieldPolicies: policies });
      else void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

/** Bir alt liste (deneyim, egitim...) icin ekle/guncelle/sil. Her basarili islemden sonra profil yenilenir. */
export function useProfileItemMutations<C extends ProfileCollection>(collection: C) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: profileKeys.all });
  type Body = Omit<ProfileCollectionItems[C], 'id'>;

  const save = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: Body }) =>
      id ? profileApi.updateItem(collection, id, body) : profileApi.addItem(collection, body),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => profileApi.removeItem(collection, id),
    onSuccess: invalidate,
  });

  return { save, remove };
}
