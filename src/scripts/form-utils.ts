/**
 * Payload for the contact form submission.
 * Shared utilities for client-side form submit handling.
 * Can be used by multiple forms (e.g. contact, careers).
 * Includes a simple in-page preview modal using DOMPurify if available.
 * @abstraction
 * @module form-utils
 * @see {@link postContact}
 * @see {@link clearErrors}
 * @see {@link showPreviewModal}
 */
export type ContactPayload = { company?: string; subject: string; name: string; email: string; message: string };

/**
 * Options for the postContact function
 */
export type PostContactOpts = {
  apiBase?: string;
  apiKey?: string;
  timeoutMs?: number;
  onStart?: () => void;
  onSuccess?: (json: any) => void;
  onError?: (err: any) => void;
};

/**
 * Get the API base URL from meta tags or use a default
 * @returns {string} - The API base URL
 */
export function getApiBase(): string {
  return (document.querySelector('meta[name="api-base"]') as HTMLMetaElement)?.content || '/api';
}

/**
 * Get the API key from meta tags or use a default
 * @param {string} [apiKey] - Optional API key to use instead of meta tag
 * @returns {string} - The API key
 */
export function getApiKey(apiKey?: string): string {
  return apiKey || ((document.querySelector('meta[name="api-key"]') as HTMLMetaElement)?.content) || '';
}

/**
 * Custom error type for contact form submission
 */
export class ContactFormError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = 'ContactFormError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Post the contact form data to the server
 * @param {ContactPayload} payload - The contact form data
 * @param {PostContactOpts} opts - Optional settings for the request
 * @returns {Promise<any>} - Resolves with the parsed JSON response. If JSON parsing fails, resolves with an object containing a `_raw` property with the raw response text.
 */
export async function postContact(payload: ContactPayload, opts?: PostContactOpts) {
  opts?.onStart?.();
  const base = opts?.apiBase || getApiBase();
  const url = base.replace(/\/$/, '') + '/contact';
  const apiKey = getApiKey(opts?.apiKey);
  const timeoutMs = opts?.timeoutMs ?? 15000;

  const controller = new AbortController();
  const timeout: number = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });

    clearTimeout(timeout);

    const text = await resp.text();
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch (_) { json = { _raw: text }; }

    if (!resp.ok) {
      const errMsg = json?.error || json?.message || `送信に失敗しました (${resp.status})`;
      const err = new ContactFormError(errMsg, resp.status, json);
      opts?.onError?.(err);
      throw err;
    }

    opts?.onSuccess?.(json);
    return json;
  } catch (err) {
    clearTimeout(timeout);
    opts?.onError?.(err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
/**
 * Clear error messages from the form
 * @param {Record<string, HTMLElement | null>} errors - The error elements
 * @param {HTMLElement | null} formMessage - The form message element
 */
export function clearErrors(errors: Record<string, HTMLElement | null>, formMessage: HTMLElement | null) {
  Object.values(errors).forEach(e => e && (e.textContent = ''));
  if (formMessage) { formMessage.textContent = ''; formMessage.style.color = ''; }
}

/**
 * Create a small status controller for a form message element.
 * Returns functions to set status text and optionally auto-clear it.
 */
export function createStatusController(formMessage: HTMLElement | null) {
  let timeoutId: number | undefined;
  const clear = () => {
    if (timeoutId !== undefined) { clearTimeout(timeoutId); timeoutId = undefined; }
    if (formMessage) { formMessage.textContent = ''; formMessage.style.color = ''; }
  };

  const setStatus = (text: string, color?: string) => {
    if (formMessage) { formMessage.style.color = color || 'inherit'; formMessage.textContent = text; }
  };

  const setStatusWithTimeout = (text: string, color?: string, timeout?: number) => {
    clear();
    setStatus(text, color);
    if (timeout && timeout > 0) {
      timeoutId = window.setTimeout(() => { setStatus(''); timeoutId = undefined; }, timeout);
    }
  };

  return { setStatus, setStatusWithTimeout, clearStatus: clear };
}

/**
 * Validate contact form fields and return structured info.
 */
export function validateContactFields(values: { subject?: string; name?: string; email?: string; message?: string }) {
  const missing: string[] = [];
  if (!values.subject) missing.push('件名');
  if (!values.name) missing.push('お名前');
  if (!values.email) missing.push('メールアドレス');
  if (!values.message) missing.push('お問い合わせ内容');

  const emailRe = /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?$/;
  const emailInvalid = !!(values.email && !emailRe.test(values.email));

  const combined = missing.length
    ? `${missing.join('、')}を入力してください。${emailInvalid ? 'また、メールアドレスの形式が正しくありません。' : ''}`
    : (emailInvalid ? 'メールアドレスの形式が正しくありません。' : '');

  const firstInvalid = (!values.subject ? 'subject' : !values.name ? 'name' : !values.email ? 'email' : !values.message ? 'message' : (emailInvalid ? 'email' : 'subject')) as 'subject' | 'name' | 'email' | 'message';

  return { missing, emailInvalid, combined, firstInvalid };
}

/**
 * Show a simple in-page preview modal. Uses DOMPurify on window if available.
 * @param {string} html - The HTML content to display in the modal
 */
export function showPreviewModal(html: string) {
  if (typeof window === 'undefined') return;
  // remove existing modal if present
  const existing = document.getElementById('preview-modal-root');
  if (existing) existing.remove();

  const root = document.createElement('div');
  root.id = 'preview-modal-root';
  Object.assign(root.style, { position: 'fixed', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: '9999' });

  const dialog = document.createElement('div');
  Object.assign(dialog.style, { background: 'var(--card-bg, #fff)', color: 'var(--text)', padding: '16px', width: 'min(90%,900px)', maxHeight: '80%', overflow: 'auto', borderRadius: '8px' });

  const closeBtn = document.createElement('button'); closeBtn.textContent = '閉じる'; closeBtn.style.display = 'block'; closeBtn.style.marginBottom = '8px';
  const content = document.createElement('div');
  (async () => {
    try {
      // Prefer dynamic ESM import in browser (avoids SSR import issues)
      let purifier: any = null;
      if (typeof window !== 'undefined') {
        try {
          // @ts-ignore - dynamic import
          const mod = await import('dompurify');
          purifier = mod && (mod.default || mod);
        } catch (_) {
          // fallback to global if some other script exposes it
          purifier = (window as any).DOMPurify || null;
        }
      }
      if (purifier && purifier.sanitize) content.innerHTML = purifier.sanitize(html);
      else content.innerHTML = html;
    } catch (_) {
      content.innerHTML = html;
    }
  })();

  dialog.append(closeBtn, content); root.appendChild(dialog);

  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { cleanup(); } };
  const cleanup = () => {
    try { document.removeEventListener('keydown', onKey); } catch (_) {}
    try { closeBtn.removeEventListener('click', cleanup); } catch (_) {}
    try { root.removeEventListener('click', cleanup as any); } catch (_) {}
    try { root.remove(); } catch (_) {}
  };
  closeBtn.addEventListener('click', cleanup);
  root.addEventListener('click', (e) => { if (e.target === root) cleanup(); });
  document.addEventListener('keydown', onKey);

  document.body.appendChild(root);
}
