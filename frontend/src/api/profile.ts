import { isAxiosError } from 'axios';
import { api } from './client';
import type {
  AutofillPolicy,
  CertificateItem,
  CustomField,
  EducationItem,
  LanguageItem,
  PolicyField,
  Profile,
  ProfileMainFields,
  ReferenceItem,
  ScreeningAnswer,
  WorkExperience,
} from './types';

export const profileKeys = {
  all: ['profile'] as const,
};

/** Alt listelerin backend yollari. */
export type ProfileCollection =
  | 'experiences'
  | 'educations'
  | 'languages'
  | 'screening-answers'
  | 'certificates'
  | 'references'
  | 'custom-fields';

/** Her koleksiyonun kayit tipi (Id haric alanlar istek govdesi olarak gonderilir). */
export interface ProfileCollectionItems {
  experiences: WorkExperience;
  educations: EducationItem;
  languages: LanguageItem;
  'screening-answers': ScreeningAnswer;
  certificates: CertificateItem;
  references: ReferenceItem;
  'custom-fields': CustomField;
}

export const profileApi = {
  /** Profil henuz yoksa backend 404 doner; bunu hata degil "bos profil" (null) olarak ele aliyoruz. */
  get: async (): Promise<Profile | null> => {
    try {
      return (await api.get<Profile>('/profile')).data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },

  upsert: (body: ProfileMainFields) => api.put<Profile>('/profile', body).then((r) => r.data),

  updatePolicies: (policies: Partial<Record<PolicyField, AutofillPolicy>>) =>
    api.put<Record<PolicyField, AutofillPolicy>>('/profile/field-policies', { policies }).then((r) => r.data),

  // Alt listeler icin tek bir genel CRUD: yollar ayni kaliba uyuyor (/profile/{koleksiyon}/{id}).
  addItem: <C extends ProfileCollection>(collection: C, body: Omit<ProfileCollectionItems[C], 'id'>) =>
    api.post<ProfileCollectionItems[C]>(`/profile/${collection}`, body).then((r) => r.data),

  updateItem: <C extends ProfileCollection>(collection: C, id: string, body: Omit<ProfileCollectionItems[C], 'id'>) =>
    api.put<ProfileCollectionItems[C]>(`/profile/${collection}/${id}`, body).then((r) => r.data),

  removeItem: (collection: ProfileCollection, id: string) =>
    api.delete(`/profile/${collection}/${id}`).then(() => undefined),
};

/** Profil cevabindan PUT govdesini cikarir (alt listeler ve salt-okunur alanlar haric). */
export function toMainFields(p: Profile | null): ProfileMainFields {
  return {
    headline: p?.headline ?? null,
    summary: p?.summary ?? null,
    phoneNumber: p?.phoneNumber ?? null,
    city: p?.city ?? null,
    country: p?.country ?? null,
    linkedInUrl: p?.linkedInUrl ?? null,
    gitHubUrl: p?.gitHubUrl ?? null,
    portfolioUrl: p?.portfolioUrl ?? null,
    yearsOfExperience: p?.yearsOfExperience ?? null,
    expectedSalary: p?.expectedSalary ?? null,
    salaryCurrency: p?.salaryCurrency ?? null,
    noticePeriodDays: p?.noticePeriodDays ?? null,
    preferredWorkMode: p?.preferredWorkMode ?? null,
    openToRelocation: p?.openToRelocation ?? false,
    requiresVisaSponsorship: p?.requiresVisaSponsorship ?? false,
    workAuthorization: p?.workAuthorization ?? null,
    skills: p?.skills ?? [],
    defaultCvId: p?.defaultCvId ?? null,
    district: p?.district ?? null,
    addressLine: p?.addressLine ?? null,
    postalCode: p?.postalCode ?? null,
    dateOfBirth: p?.dateOfBirth ?? null,
    gender: p?.gender ?? null,
    maritalStatus: p?.maritalStatus ?? null,
    nationality: p?.nationality ?? null,
    militaryServiceStatus: p?.militaryServiceStatus ?? null,
    militaryPostponedUntil: p?.militaryPostponedUntil ?? null,
    driverLicenseClasses: p?.driverLicenseClasses ?? [],
    driverLicenseYear: p?.driverLicenseYear ?? null,
    canTravel: p?.canTravel ?? null,
    isSmoker: p?.isSmoker ?? null,
    hasDisability: p?.hasDisability ?? null,
  };
}
