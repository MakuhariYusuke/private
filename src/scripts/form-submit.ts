/**
 * Client-side submit helper for posting to /api/contact 
 * @param {Object} payload - The contact form data
 * @param {Object} opts - Optional callbacks for different stages of the request
 */
import { postContact, getApiBase, getApiKey, clearErrors, showPreviewModal, type ContactPayload, createStatusController, validateContactFields } from './form-utils';

export { postContact };

/**
 * Auto-attach for careers form
 */
export function attachCareersForm(form: HTMLFormElement) {
  if (!form) return;
  const submitBtn = form.querySelector('#submitCareersBtn') as HTMLButtonElement | null;
  const formMessage = form.querySelector('#formMessage-careers') as HTMLElement | null;
  const CAREERS_BTN_TEXT = '応募する（モック）';
  const errors = {
    subject: form.querySelector('#error-subject') as HTMLElement | null,
    name: form.querySelector('#error-name') as HTMLElement | null,
    email: form.querySelector('#error-email') as HTMLElement | null,
    message: form.querySelector('#error-message') as HTMLElement | null,
  };

  // 応募ボタンの busy 状態を切り替えます
  const setBusy = (busy: boolean) => {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    if (busy) {
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.textContent = '送信中...';
    } else {
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = CAREERS_BTN_TEXT;
    }
  };

  // shared status controller
  const status = createStatusController(formMessage);

  // 事前に API キーが設定されているか確認し、なければ軽い警告を表示
  const configuredApiKey = getApiKey();
  if (!configuredApiKey && formMessage) {
    status.setStatusWithTimeout('APIキーが設定されていません。管理者にお問い合わせください。', 'var(--error)', 5000);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(errors, formMessage);

    // Read values directly to avoid FormData constructor issues in test envs
    const company = (form.elements.namedItem('company') as HTMLInputElement | null)?.value.trim() || '';
    const subject = (form.elements.namedItem('subject') as HTMLInputElement | null)?.value.trim() || '';
    const name = (form.elements.namedItem('name') as HTMLInputElement | null)?.value.trim() || '';
    const email = (form.elements.namedItem('email') as HTMLInputElement | null)?.value.trim() || '';
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement | null)?.value.trim() || '';

    // Validation using shared helper
    const { missing, emailInvalid, combined, firstInvalid } = validateContactFields({ subject, name, email, message });
    if (missing.length || emailInvalid) {
      // put message into the specific field error and top-level form message
      if (firstInvalid && errors[firstInvalid]) errors[firstInvalid]!.textContent = combined;
      status.setStatus(combined, 'var(--error)');
      const focusEl = document.getElementById(firstInvalid) as HTMLElement | null;
      if (focusEl) focusEl.focus();
      return;
    }

  setBusy(true);
  status.setStatus('送信中...', 'black'); // keep until resolved

  // Include company when provided (optional)
    const payload: ContactPayload = { subject, name, email, message };
    if (company) payload.company = company;
  const metaKey = getApiKey();

    try {
      if (!metaKey) throw new Error('API キーが設定されていません (meta[name="api-key"]).');

      const result = await postContact(payload, {
        apiKey: metaKey,
        apiBase: getApiBase(),
        timeoutMs: 15000,
      });

  // show success
  status.setStatusWithTimeout('送信に成功しました。ありがとうございました。', 'var(--success)', 2500);
      form.reset();

      // If server returned previewUrl or previewHtml, surface it for developers
  if (result?.previewUrl) {
        const a = document.createElement('a');
        a.href = result.previewUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = '送信プレビューを開く';
        if (formMessage) {
          formMessage.appendChild(document.createElement('br'));
          formMessage.appendChild(a);
        }
      }
  if (result?.previewHtml) showPreviewModal(result.previewHtml);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '送信に失敗しました（サーバーエラー）。';
  status.setStatusWithTimeout(errorMsg, 'var(--error)', 5000);
      console.error(err);
    } finally {
      setBusy(false);
    }
  });
}

/**
 * Auto-attach when loaded
 */
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('form[id^="careersForm"]');
    if (forms.length === 0) {
      console.warn('No careers forms found to attach.');
    }
    forms.forEach(form => {
      attachCareersForm(form as HTMLFormElement);
    });
  });
}

// preview modal functionality now provided by shared showPreviewModal in form-utils
// Example usage:
// import { showPreviewModal } from './form-utils';
// showPreviewModal('<div>Preview HTML content here</div>');
// This will display the provided HTML content in a modal dialog.
