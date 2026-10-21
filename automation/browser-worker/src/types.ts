// Backend'in veri paketi (AutomationPayload, C#) — sadece worker'in kullandigi alanlar.
// Alan adlari camelCase, enum'lar metin ("Auto", "Male", "B2"...).

export type AutomationMode = 'HumanApproval' | 'Automatic';
export type AutofillPolicy = 'Auto' | 'AskFirst' | 'Never';

/** Faz 11: doldurma (Fill, gonderilmez) ve gonderme (Submit, onaydan sonra) turlari. */
export type AutomationDispatchPhase = 'Fill' | 'Submit';

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
    /** Faz 10b menusunde de var: AI eslestirmesi bu alanlara da erisebilir. */
    requiresVisaSponsorship: boolean;
    workAuthorization: string | null;
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

/**
 * Faz 11: kullanicinin onay ekranindan gonderdigi cevaplar (backend: ApproveAutomationRequest).
 * answers anahtarlari form alaninin "name"ine (yoksa etikete) karsilik gelir. answers null ise
 * henuz onay verilmemis demektir (Submit turu baslamadan once beklenmez, ama guvenlik icin kontrol edilir).
 */
export interface ApprovalAnswers {
  answers: Record<string, string> | null;
  kvkkAccepted: boolean;
}

/** n8n → worker istegi (POST /apply). Kisisel veri yok; worker paketi ve CV'yi backend'den kendisi ceker. */
export interface ApplyRequest {
  jobId: string;
  mode: AutomationMode;
  jobUrl: string;
  payloadUrl: string;
  eventsUrl: string;
  /** Faz 11: hangi tur. Fill → asla gonderilmez (inceleme raporu cikar). Submit → onaydan sonra gonderilir. */
  phase: AutomationDispatchPhase;
  reviewUrl: string;
  screenshotUrl: string;
  approvalAnswersUrl: string;
  /** Faz 10b: kural tabanli motorun cozemedigi alanlar icin Claude API'ye toplu danisma ucu. Yoksa AI atlanir. */
  mappingUrl?: string;
}

/**
 * Worker'in sonucu. n8n buna gore isin son durumunu belirler:
 *   Submitted        → Completed (basvuru gonderildi)
 *   ReadyForApproval → AwaitingApproval (form dolu, Gonder'e basilmadi — sadece Fill turunde)
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
  /**
   * Alan bir secimse (select/radio) izin verilen secenek etiketleri. Onay ekrani ve Telegram bunu
   * serbest metin yerine secim olarak sunar; backend onayda cevabin bu listede olmasini zorunlu tutar.
   */
  options?: string[];
  /** Form alaninin turu (text, date, select...). Tarih gibi biçimi sıkı alanlarda cevap bu türe göre doğrulanır. */
  type?: string;
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

/**
 * Faz 10b: worker'in kural tabanli motorun cozemedigi alanlar icin backend'e (Claude API'ye)
 * TOPLU sordugu istek/yanit. Profil DEGERLERI icermez, sadece alan metadatasi gider.
 */
export interface FieldMappingQuery {
  label: string;
  hints: string;
  type: string;
  options?: string[];
}

export interface FieldMappingSuggestion {
  label: string;
  type: string;
  /** "Candidate" | "Screening" | "CustomField" | null (karsiligi yok / AI kapali). */
  targetKind: string | null;
  targetKey: string | null;
  fromCache: boolean;
}

export interface SuggestFieldMappingResponse {
  results: FieldMappingSuggestion[];
}
