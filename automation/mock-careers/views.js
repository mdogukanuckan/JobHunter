// HTML şablonları (bağımlılıksız, sunucu tarafında string olarak üretilir).
import { company, jobs } from './jobs.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const fmtDate = (iso) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDateTime = (iso) => new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

export function layout(title, body, { head = '' } = {}) {
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | ${esc(company.name)} Kariyer</title>
<link rel="stylesheet" href="/static/style.css">
${head}
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/"><span class="logo" aria-hidden="true">Ö</span> ${esc(company.name)} <span class="muted">Kariyer</span></a>
    <nav><a href="/">Açık pozisyonlar</a></nav>
  </div>
</header>
<main class="wrap">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">Yerel test sitesi — kurgusal şirket ve ilanlar. <a href="/admin">Gelen başvurular</a></div>
</footer>
</body>
</html>`;
}

// ---- İlan listesi ------------------------------------------------------------

export function listPage() {
  const cards = jobs
    .map(
      (j) => `
  <li class="job-card" data-job-slug="${esc(j.slug)}">
    <div>
      <h2><a href="/ilan/${esc(j.slug)}">${esc(j.title)}</a></h2>
      <p class="meta">${esc(j.department)} · ${esc(j.location)} · ${esc(j.employmentType)}</p>
      <p>${esc(j.summary)}</p>
    </div>
    <div class="card-side">
      ${j.status === 'open' ? '<span class="badge badge-open">Başvuruya açık</span>' : '<span class="badge badge-closed">Başvurular kapandı</span>'}
      <span class="muted small">Yayın: ${fmtDate(j.postedAt)}</span>
      <a class="btn btn-secondary" href="/ilan/${esc(j.slug)}">İlanı incele</a>
    </div>
  </li>`,
    )
    .join('');
  return layout(
    'Açık pozisyonlar',
    `<section class="hero">
  <h1>Açık pozisyonlar</h1>
  <p>${esc(company.about)}</p>
</section>
<ul class="job-list">${cards}</ul>`,
  );
}

// ---- İlan detayı + form --------------------------------------------------------

function jobPostingJsonLd(job, baseUrl) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: `<p>${job.summary}</p>`,
    datePosted: job.postedAt,
    validThrough: job.validThrough,
    employmentType: 'FULL_TIME',
    hiringOrganization: { '@type': 'Organization', name: company.name },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: company.city, addressCountry: 'TR' } },
    url: `${baseUrl}/ilan/${job.slug}`,
  };
  if (job.workModel === 'Uzaktan') data.jobLocationType = 'TELECOMMUTE';
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function renderField(f, values, errors) {
  const v = values[f.name] ?? '';
  const err = errors[f.name];
  const req = f.required ? ' required' : '';
  const star = f.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
  const errId = `${f.name}-error`;
  const errHtml = err ? `<p class="field-error" id="${errId}">${esc(err)}</p>` : '';
  const aria = err ? ` aria-invalid="true" aria-describedby="${errId}"` : '';
  const hint = f.hint ? `<p class="hint">${esc(f.hint)}</p>` : '';
  const label = f.html ? f.label : esc(f.label);

  switch (f.type) {
    case 'radio':
      return `<fieldset class="field${err ? ' has-error' : ''}" data-field="${f.name}">
  <legend>${label}${star}</legend>
  <div class="radios">${f.options
    .map(
      (o, i) =>
        `<label class="radio"><input type="radio" id="${f.name}-${i}" name="${f.name}" value="${esc(o)}"${o === v ? ' checked' : ''}${req}${aria}> ${esc(o)}</label>`,
    )
    .join('')}</div>${hint}${errHtml}
</fieldset>`;
    case 'checkbox':
      return `<div class="field field-check${err ? ' has-error' : ''}" data-field="${f.name}">
  <label><input type="checkbox" id="${f.name}" name="${f.name}" value="on"${v ? ' checked' : ''}${req}${aria}> <span>${label}${star}</span></label>${errHtml}
</div>`;
  }

  let control;
  switch (f.type) {
    case 'select':
      control = `<select id="${f.name}" name="${f.name}"${req}${aria}><option value="">Seçiniz</option>${f.options
        .map((o) => `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${esc(o)}</option>`)
        .join('')}</select>`;
      break;
    case 'textarea':
      control = `<textarea id="${f.name}" name="${f.name}" rows="5"${f.maxLength ? ` maxlength="${f.maxLength}"` : ''}${req}${aria}>${esc(v)}</textarea>`;
      break;
    case 'file':
      control = `<input type="file" id="${f.name}" name="${f.name}" accept="${esc(f.accept)}"${req}${aria}>`;
      break;
    default: {
      const attrs = [
        f.placeholder && `placeholder="${esc(f.placeholder)}"`,
        f.autocomplete && `autocomplete="${f.autocomplete}"`,
        f.min !== undefined && `min="${f.min}"`,
        f.max !== undefined && `max="${f.max}"`,
        f.maxLength && `maxlength="${f.maxLength}"`,
      ]
        .filter(Boolean)
        .join(' ');
      control = `<input type="${f.type}" id="${f.name}" name="${f.name}" value="${esc(v)}" ${attrs}${req}${aria}>`;
    }
  }
  return `<div class="field${err ? ' has-error' : ''}" data-field="${f.name}">
  <label for="${f.name}">${label}${star}</label>
  ${control}${hint}${errHtml}
</div>`;
}

function renderForm(job, { values = {}, errors = {}, formError = '', novalidate = false }) {
  const multi = job.steps.length > 1;
  const stepper = multi
    ? `<ol class="stepper" aria-label="Başvuru adımları">${job.steps
        .map((s, i) => `<li data-step-indicator="${i}"><span class="num">${i + 1}</span> ${esc(s.title)}</li>`)
        .join('')}</ol>`
    : '';
  const steps = job.steps
    .map(
      (s, i) => `<section class="step" data-step="${i}"${multi ? ` aria-label="Adım ${i + 1}: ${esc(s.title)}"` : ''}>
  ${multi ? `<h3>Adım ${i + 1} / ${job.steps.length}: ${esc(s.title)}</h3>` : ''}
  ${s.fields.map((f) => renderField(f, values, errors)).join('\n  ')}
  <div class="actions">
    ${multi && i > 0 ? '<button type="button" class="btn btn-secondary" data-step-nav="prev">Geri</button>' : ''}
    ${multi && i < job.steps.length - 1 ? '<button type="button" class="btn" data-step-nav="next">Devam et</button>' : ''}
    ${!multi || i === job.steps.length - 1 ? '<button type="submit" class="btn" id="submit-application">Başvuruyu gönder</button>' : ''}
  </div>
</section>`,
    )
    .join('\n');

  const errorSummary = formError || Object.keys(errors).length
    ? `<div class="alert alert-error" role="alert" id="form-errors">
  <strong>${esc(formError || 'Başvurunuz gönderilemedi. Lütfen işaretli alanları düzeltin.')}</strong>
  ${Object.keys(errors).length ? `<ul>${Object.entries(errors).map(([k, m]) => `<li><a href="#${k}">${esc(m)}</a></li>`).join('')}</ul>` : ''}
</div>`
    : '';

  return `<form id="application-form" class="card" method="post" action="/ilan/${esc(job.slug)}/basvur${novalidate ? '?novalidate=1' : ''}" enctype="multipart/form-data"${novalidate ? ' novalidate data-novalidate="1"' : ''}${multi ? ' data-multistep="1"' : ''}>
  <h2 id="basvuru">Başvuru formu</h2>
  <p class="muted small"><span class="req">*</span> ile işaretli alanlar zorunludur.</p>
  ${errorSummary}
  ${stepper}
  ${steps}
</form>
<details class="card kvkk" id="kvkk-metni">
  <summary>KVKK aydınlatma metni</summary>
  <p>Bu kurgusal metin yalnızca test amaçlıdır. Gönderilen veriler yalnızca bu bilgisayarda, <code>automation/mock-careers/data</code> klasöründe saklanır.</p>
</details>
${multi ? `<script src="/static/wizard.js" defer></script>` : ''}`;
}

export function jobPage(job, { baseUrl, values, errors, formError, novalidate } = {}) {
  const list = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const applySection =
    job.status === 'open'
      ? renderForm(job, { values, errors, formError, novalidate })
      : `<div class="alert alert-info" role="status" id="job-closed">Bu ilan için başvurular <strong>${fmtDate(job.validThrough)}</strong> tarihinde kapanmıştır.</div>`;

  return layout(
    job.title,
    `<p class="crumbs"><a href="/">Açık pozisyonlar</a> / ${esc(job.title)}</p>
<article class="job-detail" data-job-slug="${esc(job.slug)}" data-job-status="${job.status}">
  <header class="job-head card">
    <div>
      <h1>${esc(job.title)}</h1>
      <p class="meta">${esc(company.name)} · ${esc(job.department)} · ${esc(job.location)}</p>
      <dl class="facts">
        <div><dt>Çalışma şekli</dt><dd>${esc(job.employmentType)}</dd></div>
        <div><dt>Çalışma modeli</dt><dd>${esc(job.workModel)}</dd></div>
        <div><dt>Yayın tarihi</dt><dd>${fmtDate(job.postedAt)}</dd></div>
        <div><dt>Son başvuru</dt><dd>${fmtDate(job.validThrough)}</dd></div>
      </dl>
    </div>
    ${job.status === 'open' ? '<a class="btn" href="#basvuru" id="apply-button">Hemen başvur</a>' : '<span class="badge badge-closed">Başvurular kapandı</span>'}
  </header>
  <div class="card prose">
    <h2>Pozisyon hakkında</h2><p>${esc(job.summary)}</p>
    <h2>Sorumluluklar</h2>${list(job.responsibilities)}
    <h2>Aranan nitelikler</h2>${list(job.requirements)}
    <h2>Sunduklarımız</h2>${list(job.benefits)}
  </div>
  ${applySection}
</article>`,
    { head: jobPostingJsonLd(job, baseUrl) },
  );
}

// ---- Onay sayfası -----------------------------------------------------------------

export function confirmationPage(sub) {
  return layout(
    'Başvurunuz alındı',
    `<div class="card confirmation" id="application-confirmation" data-reference="${esc(sub.id)}">
  <div class="check" aria-hidden="true">✓</div>
  <h1>Başvurunuz alındı</h1>
  <p>Sayın ${esc(sub.values.fullName)}, <strong>${esc(sub.jobTitle)}</strong> pozisyonuna başvurunuz başarıyla iletildi.</p>
  <p>Başvuru numaranız: <strong class="ref" id="reference-number">${esc(sub.id)}</strong></p>
  <p class="muted">Onay e-postası ${esc(sub.values.email)} adresine gönderildi (simülasyon — gerçekte e-posta gönderilmez).</p>
  <p><a class="btn btn-secondary" href="/">Diğer ilanlara göz at</a></p>
</div>`,
  );
}

// ---- Admin: gelen başvurular -------------------------------------------------------

export function adminPage(subs) {
  const rows = subs
    .map(
      (s) => `<tr>
  <td><code>${esc(s.id)}</code></td>
  <td>${fmtDateTime(s.submittedAt)}</td>
  <td>${esc(s.jobTitle)}</td>
  <td>${esc(s.values.fullName)}<br><span class="muted small">${esc(s.values.email)}</span></td>
  <td>${s.cv ? `<a href="/admin/${esc(s.id)}/cv" target="_blank">${esc(s.cv.originalName)}</a><br><span class="muted small">${Math.round(s.cv.size / 1024)} KB</span>` : '—'}</td>
  <td><details><summary>Tüm alanlar</summary><pre>${esc(JSON.stringify(s, null, 2))}</pre></details></td>
</tr>`,
    )
    .join('');
  return layout(
    'Gelen başvurular',
    `<div class="admin-head">
  <h1>Gelen başvurular <span class="muted">(${subs.length})</span></h1>
  <form method="post" action="/admin/temizle"><button class="btn btn-danger" type="submit"${subs.length ? '' : ' disabled'}>Tümünü sil</button></form>
</div>
<p class="muted small">JSON olarak: <a href="/api/submissions"><code>GET /api/submissions</code></a> · Tek ilan: <code>/api/submissions?job=&lt;slug&gt;</code></p>
${
  subs.length
    ? `<div class="table-wrap card"><table><thead><tr><th>Başvuru no</th><th>Tarih</th><th>İlan</th><th>Aday</th><th>CV</th><th>Detay</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : '<div class="card muted">Henüz başvuru yok.</div>'
}`,
  );
}

export function notFoundPage() {
  return layout('Sayfa bulunamadı', `<div class="card"><h1>Sayfa bulunamadı</h1><p><a href="/">Açık pozisyonlara dön</a></p></div>`);
}

