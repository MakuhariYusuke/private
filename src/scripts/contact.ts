// Simple TypeScript form handler for the contact mock
// This file is client-side — Astro will emit it to the browser. No network requests are made here.

/**
 * Auto-attach for contact form
 */
import { postContact, type ContactPayload } from './form-utils';

/**
 * Attach the contact form submission handler
 */
function attachContactForm() {
  const form = document.getElementById('contactForm') as HTMLFormElement | null;
  if (!form) return;

  // Cache API key at initialization
  const apiKeyMeta = document.querySelector('meta[name="api-key"]');
  const apiKey = apiKeyMeta ? apiKeyMeta.getAttribute('content') || '' : '';
  const hasApiKey = !!apiKey;

  type K = 'subject' | 'name' | 'email' | 'message';
  const fields: Record<K, HTMLInputElement | HTMLTextAreaElement | null> = {
    subject: document.getElementById('subject') as HTMLInputElement | null,
    name: document.getElementById('name') as HTMLInputElement | null,
    email: document.getElementById('email') as HTMLInputElement | null,
    message: document.getElementById('message') as HTMLTextAreaElement | null,
  };

  const errors: Record<K, HTMLElement | null> = {
    subject: document.getElementById('error-subject') as HTMLElement | null,
    name: document.getElementById('error-name') as HTMLElement | null,
    email: document.getElementById('error-email') as HTMLElement | null,
    message: document.getElementById('error-message') as HTMLElement | null,
  };

  const formMessage = document.getElementById('formMessage') as HTMLElement | null;
  const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;

  const clearErrors = () => {
    (Object.keys(errors) as K[]).forEach(k => { if (errors[k]) errors[k]!.textContent = ''; });
    if (formMessage) { formMessage.textContent = ''; formMessage.style.color = ''; }
  };

  // Show aggregated error message in the top-level formMessage and focus first invalid field
  const setError = (k: K, msg: string) => {
    clearErrors();
    if (formMessage) { formMessage.style.color = '#b91c1c'; formMessage.textContent = msg; }
    if (fields[k]) fields[k].focus();
  };

  const setStatus = (text: string, color?: string) => {
    if (formMessage) { formMessage.style.color = color || 'inherit'; formMessage.textContent = text; }
  };

  const setBusy = (busy: boolean, label?: string) => {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (label !== undefined) submitBtn.textContent = label;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const fd = new FormData(form);
    const company = (fd.get('company') || '').toString().trim();
    const subject = (fd.get('subject') || '').toString().trim();
    const name = (fd.get('name') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const message = (fd.get('message') || '').toString().trim();

    // aggregate validation: collect missing fields and email format error
    const missing: string[] = [];
    if (!subject) missing.push('件名');
    if (!name) missing.push('お名前');
    if (!email) missing.push('メールアドレス');
    if (!message) missing.push('お問い合わせ内容');

    const emailRe = /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?$/;
    const emailInvalid = email && !emailRe.test(email);

    if (missing.length || emailInvalid) {
      let msgParts: string[] = [];
      if (missing.length) {
        msgParts.push(`${missing.join('、')}を入力してください。`);
      }
      if (emailInvalid) {
        msgParts.push('メールアドレスの形式が正しくありません。');
      }
      const combined = msgParts.join(' また、');

      // decide which field to focus: first missing in order or email if only format error
      const firstInvalid: K =
          !subject ? 'subject' :
          !name ? 'name' : 
          !email ? 'email' : 
          !message ? 'message' : 
          (emailInvalid ? 'email' : 'subject');
      setError(firstInvalid, combined);
      return;
    }

    const originalLabel = submitBtn?.textContent || '';

    setBusy(true, '送信中...');
    setStatus(hasApiKey ? '送信中...' : '送信中（モック）...');

    if (!hasApiKey) {
      // mock flow
      setTimeout(() => {
        setStatus('送信に成功しました。ありがとうございました。', 'green');
        form.reset();
        setBusy(false, originalLabel);
        setTimeout(() => setStatus(''), 1800);
      }, 1200);
      return;
    }

    // real flow using shared postContact
    try {
      if (!apiKey) throw new Error('APIキーが見つかりません。');

      const payload: ContactPayload = { subject, name, email, message };
      if (company) payload.company = company;

      const result = await postContact(payload, { apiKey, apiBase: undefined });
      if (result?.previewUrl && formMessage) {
        // Remove any existing preview links
        const existingLinks = formMessage.querySelectorAll('.preview-link-spacer, a[target="_blank"]');
        existingLinks.forEach(el => el.remove());

        const a = document.createElement('a');
        a.href = result.previewUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = '送信プレビューを開く';
        const spacer = document.createElement('span');
        spacer.className = 'preview-link-spacer';
        formMessage.appendChild(spacer);
        formMessage.appendChild(a);
      }
      
    } catch (err) {
      console.error(err);
      const errorMsg = (err instanceof Error && err.message) ? `送信に失敗しました: ${err.message}` : '送信に失敗しました。';
      setStatus(errorMsg, '#b91c1c');
    } finally {
      setBusy(false, originalLabel);
      setTimeout(() => setStatus(''), 1800);
    }
  });
}

/**
 * Auto-attach when loaded
 */
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', attachContactForm);
}
