// Simple TypeScript form handler for the contact mock
// This file is client-side — Astro will emit it to the browser. No network requests are made here.

function attachContactForm() {
  const form = document.getElementById('contactForm') as HTMLFormElement | null;
  if (!form) return;

  const fields = {
  subject: document.getElementById('subject') as HTMLInputElement | null,
    name: document.getElementById('name') as HTMLInputElement | null,
    email: document.getElementById('email') as HTMLInputElement | null,
    message: document.getElementById('message') as HTMLTextAreaElement | null,
  };

  const errors = {
  subject: document.getElementById('error-subject') as HTMLElement | null,
    name: document.getElementById('error-name') as HTMLElement | null,
    email: document.getElementById('error-email') as HTMLElement | null,
    message: document.getElementById('error-message') as HTMLElement | null,
  };

  const formMessage = document.getElementById('formMessage') as HTMLElement | null;
  const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;

  function clearErrors() {
    Object.values(errors).forEach(el => { if (el) { el.textContent = ''; } });
    if (formMessage) { formMessage.textContent = ''; formMessage.style.color = '' }
  }

  function setError(field: keyof typeof errors, msg: string) {
    clearErrors();
    const el = errors[field];
    if (el) el.textContent = msg;
    const f = fields[field];
    if (f) f.focus();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();
    const formData = new FormData(form);
    const subject = (formData.get('subject') || '').toString().trim();
    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();
  if (!subject) { setError('subject', '件名を入力してください。'); return; }
  if (!name) { setError('name', 'お名前を入力してください。'); return; }
  if (!email) { setError('email', 'メールアドレスを入力してください。'); return; }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) { setError('email', 'メールアドレスの形式が正しくありません。'); return; }
  if (!message) { setError('message', 'お問い合わせ内容を入力してください。'); return; }

    // Mock loading state
    if (submitBtn) {
      // if an API is configured, try to POST; otherwise keep mock behavior
      const metaKey = document.querySelector('meta[name="api-key"]')?.getAttribute('content') || '';
      if (metaKey) {
        // real submission flow
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy','true');
        const original = submitBtn.textContent;
        submitBtn.textContent = '送信中...';
        if (formMessage) { formMessage.style.color = 'black'; formMessage.textContent = '送信中...'; }
  const apiBase = document.querySelector('meta[name="api-base"]')?.getAttribute('content') || '';
  const endpoint = apiBase ? apiBase.replace(/\/$/, '') + '/api/contact' : '/api/contact';
  fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'x-api-key': metaKey },
          body: JSON.stringify({ subject, name, email, message })
        }).then(async (resp) => {
          if (!resp.ok) throw new Error((await resp.json().catch(()=>({}))).error || '送信失敗');
          if (formMessage) { formMessage.style.color = 'green'; formMessage.textContent = '送信に成功しました。'; }
          form.reset();
        }).catch((err)=>{
          if (formMessage) { formMessage.style.color = '#b91c1c'; formMessage.textContent = '送信に失敗しました。'; }
          console.error(err);
        }).finally(()=>{ if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信（モック）'; submitBtn.removeAttribute('aria-busy'); } setTimeout(()=>{ if(formMessage) formMessage.textContent=''; },1800); });
      } else {
        // fallback mock
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy','true');
        const original = submitBtn.textContent;
        submitBtn.textContent = '送信中...';
        if (formMessage) { formMessage.style.color = 'black'; formMessage.textContent = '送信中（モック）...'; }
        setTimeout(() => {
    if (formMessage) { formMessage.style.color = 'green'; formMessage.textContent = '送信に成功しました。ありがとうございました。'; }
          form.reset();
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = original; submitBtn.removeAttribute('aria-busy'); }
          setTimeout(() => { if (formMessage) { formMessage.textContent = ''; } }, 1800);
        }, 1200);
      }
    }
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', attachContactForm);
}
