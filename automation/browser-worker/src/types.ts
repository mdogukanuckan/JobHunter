// Backend'in veri paketi (AutomationPayload, C#) — sadece worker'in kullandigi alanlar.
// Alan adlari camelCase, enum'lar metin ("Auto", "Male", "B2"...).

export type AutomationMode = 'HumanApproval' | 'Automatic';
export type AutofillPolicy = 'Auto' | 'AskFirst' | 'Never';

export interface PolicyField<T = unknown> {
  policy: AutofillPolicy;
  /** Never ise her zaman null. Kullanici girmemisse de null. */
  value: T | null;
}

export interface Payload {
  job: { id: string; attemptNumber: number; mode: AutomationMode };
  application: { companyName: string; jobTitle: string; jobUrl: string | null };
  candidate: {
    fullName: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNumber: string | null;
    headline: string | null;
    summary: string | null;
    city: string | null;
    country: string | null;
    linkedInUrl: string | null;
    gitHubUrl: string | null;
    portfolioUrl: string | null;
    yearsOfExperience: number | null;
    noticePeriodDays: number | null;
    preferredWorkMode: 'Remote' | 'Hybrid' | 'OnSite' | 'Flexible' | null;
    openToRelocation: boolean;
    skills: string[];
  };
  /** Anahtarlar: dateOfBirth, gender, maritalStatus, nationality, militaryService, driverLicense, address, travel, smoking, disability, expectedSalary, references */
  policyFields: Record<string, PolicyField>;
  languages: { name: string; level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native' }[];
  screeningAnswers: { question: string; answer: string; tags: string[] }[];
  customFields: { label: string; value: string; policy: AutofillPolicy }[];
  cv: { name: string; fileName: string; contentType: string; sizeBytes: number; downloadUrl: string } | null;
  warnings: string[];
}

/** n8n → worker istegi (POST /apply). Kisisel veri yok; worker paketi ve CV'yi backend'den kendisi ceker. */
export interface ApplyRequest {
  jobId: string;
  mode: AutomationMode;
  jobUrl: string;
  payloadUrl: string;
  eventsUrl: string;
}

/**
 * Worker'in sonucu. n8n buna gore isin son durumunu belirler:
 *   Submitted        → Completed (basvuru gonderildi)
 *   ReadyForApproval → AwaitingApproval (form dolu, Gonder'e basilmadi)
 *   NeedsInput       → AwaitingApproval (zorunlu alan(lar) doldurulamadi / once sorulmali)
 *   Closed           → Failed (ilan basvuruya kapali)
 *   Failed           → Failed (form bulunamadi, gonderim reddedildi...)
 *   Cancelled        → kullanici iptal etti; n8n bir sey yapmaz
 */
export type Outcome = 'Submitted' | 'ReadyForApproval' | 'NeedsInput' | 'Closed' | 'Failed' | 'Cancelled';

export interface FieldReport {
  label: string;
  name: string;
  /** Hangi profil bilgisinden dolduruldu (orn. "candidate.email", "screening: Neden bu pozisyon?"). */
  source?: string;
  reason?: string;
  required: boolean;
}

export interface ApplyResult {
  outcome: Outcome;
  message: string;
  referenceNumber?: string;
  filled: FieldReport[];
  /** Doldurulmadi: once sorulmali (AskFirst), asla (Never) ya da profilde karsiligi yok. */
  skipped: FieldReport[];
  /** Zorunlu olup doldurulamayanlar (skipped'in alt kumesi). */
  missingRequired: FieldReport[];
  screenshots: string[];
  durationMs: number;
}
