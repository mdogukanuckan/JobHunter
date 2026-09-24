// Çok adımlı başvuru formu: adımlar arasında gezinme + adım bazlı doğrulama.
// Tüm alanlar tek bir <form> içindedir ve son adımda tek POST ile gönderilir.
(function () {
  const form = document.getElementById('application-form');
  if (!form || !form.dataset.multistep) return;

  const steps = Array.from(form.querySelectorAll('.step'));
  const indicators = Array.from(form.querySelectorAll('[data-step-indicator]'));
  const browserValidation = !form.dataset.novalidate;
  form.noValidate = true; // gizli adımlardaki alanlar yüzünden tarayıcı takılmasın; doğrulamayı biz yapıyoruz
  let current = 0;

  function controlsOf(step) {
    return Array.from(step.querySelectorAll('input, select, textarea'));
  }

  function show(i) {
    current = i;
    steps.forEach((s, j) => (s.hidden = j !== i));
    indicators.forEach((el, j) => {
      el.classList.toggle('active', j === i);
      el.classList.toggle('done', j < i);
      if (j === i) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
  }

  function firstInvalid(step) {
    return controlsOf(step).find((el) => !el.checkValidity());
  }

  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-step-nav]');
    if (!btn) return;
    if (btn.dataset.stepNav === 'next') {
      const bad = browserValidation && firstInvalid(steps[current]);
      if (bad) return bad.reportValidity();
      show(current + 1);
    } else {
      show(current - 1);
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  form.addEventListener('submit', (e) => {
    if (!browserValidation) return;
    for (let i = 0; i < steps.length; i++) {
      const bad = firstInvalid(steps[i]);
      if (bad) {
        e.preventDefault();
        show(i);
        bad.reportValidity();
        return;
      }
    }
  });

  // Sunucu hata döndürdüyse hatalı ilk adımdan başla
  const errStep = steps.findIndex((s) => s.querySelector('.field-error'));
  show(errStep >= 0 ? errStep : 0);
})();
