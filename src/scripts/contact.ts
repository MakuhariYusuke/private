// Simple TypeScript form handler for the contact mock
// This file is client-side — Astro will emit it to the browser. No network requests are made here.

/**
 * Auto-attach for contact form
 * Uses shared utilities from form-utils.ts
 * @module contact
 * @see {@link form-utils}
 */
import { postContact, type ContactPayload, clearErrors as clearFormErrors, getApiKey, getApiBase, createStatusController, validateContactFields } from './form-utils';

type ContactResult = {
  previewUrl?: string;
  // 他に必要なプロパティがあればここに追加
};

/**
 * Attach the contact form submission handler
 */
export function attachContactForm() {
  const form = document.getElementById('contactForm') as HTMLFormElement | null;
  if (!form) return;

  // Use shared helpers to read API configuration
  const apiKey = getApiKey();
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

  /** 
   * Reuse shared clearErrors utility which accepts the map and formMessage. 
   */
  const clearErrors = () => clearFormErrors(errors, formMessage);

  /**
   * Show aggregated error message in the top-level formMessage and focus first invalid field.
   * @param k The key of the first invalid field
   * @param msg The error message to display
   */
  const setError = (k: K, msg: string) => {
    clearErrors();
    if (formMessage) { formMessage.style.color = 'var(--error)'; formMessage.textContent = msg; }
    if (fields[k]) fields[k].focus();
  };

  // Use shared status controller for this form
  const status = createStatusController(formMessage);

  const setBusy = (busy: boolean, label?: string) => {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (label !== undefined) submitBtn.textContent = label;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    // read values directly (avoid FormData in some test envs)
    const company = (document.getElementById('company') as HTMLInputElement | null)?.value.trim() || '';
    const subject = (document.getElementById('subject') as HTMLInputElement | null)?.value.trim() || '';
    const name = (document.getElementById('name') as HTMLInputElement | null)?.value.trim() || '';
    const email = (document.getElementById('email') as HTMLInputElement | null)?.value.trim() || '';
    const message = (document.getElementById('message') as HTMLTextAreaElement | null)?.value.trim() || '';

    // validate using shared helper
    const { missing: _m, emailInvalid: _e, combined, firstInvalid } = validateContactFields({ subject, name, email, message });
    if (_m.length || _e) { setError(firstInvalid, combined); return; }

    const originalLabel = submitBtn?.textContent || '';

    setBusy(true, '送信中...');
    status.setStatus('送信中...' + (hasApiKey ? '' : '（モック）'));

    if (!hasApiKey) {
      // mock flow
      setTimeout(() => {
        status.setStatusWithTimeout('送信に成功しました。ありがとうございました。', 'var(--success)', 1800);
        form.reset();
        setBusy(false, originalLabel);
      }, 1200);
      return;
    }

    // real flow using shared postContact
    try {
      if (!apiKey) throw new Error('APIキーが見つかりません。');

      const payload: ContactPayload = { subject, name, email, message };
      if (company) payload.company = company;

      const apiResponse = await postContact(payload, { apiKey, apiBase: getApiBase() });

      // Type guard for ContactResult
      function isContactResult(obj: any): obj is ContactResult {
        return typeof obj === 'object' && (
          obj.previewUrl === undefined ||
          typeof obj.previewUrl === 'string'
        );
      }

      if (!isContactResult(apiResponse)) {
        status.setStatus('APIレスポンスの形式が正しくありません。', 'var(--error)');
        return;
      }

      const result: ContactResult = apiResponse;

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
      status.setStatusWithTimeout(errorMsg, 'var(--error)', 5000);
    } finally {
      setBusy(false, originalLabel);
      // clear transient loading message after short delay
      setTimeout(() => status.setStatus(''), 1800);
    }
  });
}

/**
 * Auto-attach when loaded
 */
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', attachContactForm);
}
