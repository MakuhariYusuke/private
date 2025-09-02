/**
 * Payload for the contact form submission
 * Shared utilities for client-side form submit handling.
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
    try { json = text ? JSON.parse(text) : {}; } catch (e) { json = { _raw: text }; }

    if (!resp.ok) {
      const errMsg = json?.error || json?.message || `送信に失敗しました (${resp.status})`;
      const err = new ContactFormError(errMsg, resp.status, json);
      opts?.onError?.(err);
      throw err;
    }

    opts?.onSuccess?.(json);
    return json;
  } catch (err) {
    opts?.onError?.(err);
    throw err;
  } finally {
    // clearTimeout(timeout); // Already cleared after fetch completes
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
