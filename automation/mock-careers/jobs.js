// Sahte ilan verileri + başvuru formu alan tanımları.
// Formlar hem sayfada çizilirken hem de sunucuda doğrulanırken bu tanımlardan beslenir.

export const company = {
  name: 'Örnek Teknoloji A.Ş.',
  city: 'Denizli',
  about:
    'Örnek Teknoloji, kurumsal müşterilere web ve mobil çözümler geliştiren kurgusal bir yazılım şirketidir. ' +
    'Bu site JobHunter otomasyonunu güvenle test etmek için hazırlanmıştır; gerçek bir şirket veya ilan değildir.',
};

// ---- Ortak alan setleri ----------------------------------------------------

const personal = [
  { name: 'fullName', label: 'Ad Soyad', type: 'text', required: true, autocomplete: 'name', maxLength: 100 },
  { name: 'email', label: 'E-posta', type: 'email', required: true, autocomplete: 'email' },
  { name: 'phone', label: 'Telefon', type: 'tel', required: true, autocomplete: 'tel', placeholder: '05xx xxx xx xx' },
  { name: 'city', label: 'Yaşadığınız şehir', type: 'text', required: true, autocomplete: 'address-level2' },
];

const personalExtra = [
  { name: 'birthDate', label: 'Doğum tarihi', type: 'date' },
  { name: 'gender', label: 'Cinsiyet', type: 'select', options: ['Kadın', 'Erkek', 'Belirtmek istemiyorum'] },
  { name: 'militaryStatus', label: 'Askerlik durumu', type: 'select', options: ['Yapıldı', 'Muaf', 'Tecilli', 'Yükümlü değil'] },
  { name: 'driverLicense', label: 'Sürücü belgesi', type: 'select', options: ['Yok', 'B', 'B ve üzeri'] },
];

const links = [
  { name: 'linkedin', label: 'LinkedIn profili', type: 'url', placeholder: 'https://www.linkedin.com/in/...' },
  { name: 'github', label: 'GitHub / portföy', type: 'url', placeholder: 'https://github.com/...' },
];

const cv = { name: 'cv', label: 'CV (PDF, en fazla 5 MB)', type: 'file', accept: '.pdf,application/pdf', required: true };

const coverLetter = { name: 'coverLetter', label: 'Ön yazı', type: 'textarea', maxLength: 3000, hint: 'İsteğe bağlı.' };

const kvkk = {
  name: 'kvkkConsent',
  label: 'Kişisel verilerimin başvuru süreci kapsamında işlenmesine ilişkin <a href="#kvkk-metni">aydınlatma metnini</a> okudum ve onaylıyorum.',
  type: 'checkbox',
  required: true,
  html: true,
};

const commonQuestions = [
  { name: 'yearsExperience', label: 'Bu alanda kaç yıl deneyiminiz var?', type: 'number', required: true, min: 0, max: 50 },
  { name: 'englishLevel', label: 'İngilizce seviyeniz', type: 'select', required: true, options: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
  { name: 'startDate', label: 'Ne zaman işe başlayabilirsiniz?', type: 'select', required: true, options: ['Hemen', '2 hafta içinde', '1 ay içinde', '1 aydan uzun'] },
  { name: 'expectedSalary', label: 'Net maaş beklentiniz (TL / ay)', type: 'number', min: 0, hint: 'İsteğe bağlı.' },
];

// ---- İlanlar ---------------------------------------------------------------
// status: 'open' | 'closed'
// steps: tek adım = düz form, birden fazla adım = sihirbaz (tek POST ile gönderilir)

export const jobs = [
  {
    slug: 'junior-net-developer',
    title: 'Junior .NET Developer',
    department: 'Yazılım Geliştirme',
    location: 'Denizli (Hibrit)',
    employmentType: 'Tam zamanlı',
    workModel: 'Hibrit',
    postedAt: '2026-09-20',
    validThrough: '2026-10-31',
    status: 'open',
    summary: 'ASP.NET Core ile REST API geliştiren ekibimize katılacak, öğrenmeye açık bir çalışma arkadaşı arıyoruz.',
    responsibilities: [
      'ASP.NET Core Web API ile yeni uç noktalar geliştirmek',
      'Entity Framework Core ile veri erişim katmanını sürdürmek',
      'Birim testleri yazmak ve kod incelemelerine katılmak',
    ],
    requirements: [
      'Bilgisayar Mühendisliği veya ilgili bölümlerden mezun',
      'C# ve nesne yönelimli programlama bilgisi',
      'SQL ve ilişkisel veritabanları hakkında temel bilgi',
      'Git kullanım deneyimi',
    ],
    benefits: ['Özel sağlık sigortası', 'Yemek kartı', 'Haftada 2 gün uzaktan çalışma', 'Eğitim bütçesi'],
    steps: [
      {
        title: 'Başvuru formu',
        fields: [
          ...personal,
          ...links.slice(0, 1),
          cv,
          { name: 'yearsExperience', label: '.NET ile kaç yıl deneyiminiz var?', type: 'number', required: true, min: 0, max: 50 },
          { name: 'relocate', label: 'Denizli\'de hibrit çalışmaya uygun musunuz?', type: 'radio', required: true, options: ['Evet', 'Hayır'] },
          coverLetter,
          kvkk,
        ],
      },
    ],
  },
  {
    slug: 'full-stack-developer-react-net',
    title: 'Full Stack Developer (React / .NET)',
    department: 'Ürün Geliştirme',
    location: 'Uzaktan (Türkiye)',
    employmentType: 'Tam zamanlı',
    workModel: 'Uzaktan',
    postedAt: '2026-09-18',
    validThrough: '2026-11-15',
    status: 'open',
    summary: 'React + TypeScript ön yüz ve .NET arka uçtan oluşan SaaS ürünümüzde uçtan uca geliştirme yapacak bir mühendis arıyoruz.',
    responsibilities: [
      'React, TypeScript ve MUI ile kullanıcı arayüzleri geliştirmek',
      '.NET ile ölçeklenebilir API\'ler tasarlamak',
      'PostgreSQL şema tasarımı ve performans iyileştirmeleri yapmak',
      'CI/CD süreçlerine katkı sağlamak',
    ],
    requirements: [
      'En az 2 yıl profesyonel yazılım geliştirme deneyimi',
      'React ve TypeScript ile üretim deneyimi',
      'C# / .NET ve REST API tasarımı',
      'PostgreSQL veya benzeri bir ilişkisel veritabanı',
      'İyi derecede İngilizce (okuma-yazma)',
    ],
    benefits: ['Tamamen uzaktan çalışma', 'Ekipman desteği', 'Esnek çalışma saatleri', 'Yıllık konferans bütçesi'],
    steps: [
      { title: 'Kişisel bilgiler', fields: [...personal, ...personalExtra] },
      { title: 'Deneyim ve CV', fields: [...links, cv, coverLetter] },
      {
        title: 'Ön değerlendirme',
        fields: [
          ...commonQuestions,
          { name: 'remoteExperience', label: 'Daha önce tamamen uzaktan çalıştınız mı?', type: 'radio', required: true, options: ['Evet', 'Hayır'] },
          { name: 'whyUs', label: 'Neden bu pozisyona başvuruyorsunuz?', type: 'textarea', required: true, maxLength: 1500 },
          kvkk,
        ],
      },
    ],
  },
  {
    slug: 'dijital-pazarlama-uzmani',
    title: 'Dijital Pazarlama Uzmanı',
    department: 'Pazarlama',
    location: 'Denizli',
    employmentType: 'Tam zamanlı',
    workModel: 'Ofiste',
    postedAt: '2026-08-01',
    validThrough: '2026-09-01',
    status: 'closed',
    summary: 'SEO, SEM ve sosyal medya kampanyalarını yönetecek bir uzman arıyorduk.',
    responsibilities: ['SEO ve SEM kampanyalarını yönetmek', 'İçerik takvimi hazırlamak'],
    requirements: ['En az 3 yıl dijital pazarlama deneyimi', 'Google Analytics ve Search Console bilgisi'],
    benefits: ['Özel sağlık sigortası', 'Servis'],
    steps: [{ title: 'Başvuru formu', fields: [...personal, cv, kvkk] }],
  },
];

export const findJob = (slug) => jobs.find((j) => j.slug === slug);
export const fieldsOf = (job) => job.steps.flatMap((s) => s.fields);
