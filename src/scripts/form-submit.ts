/**
 * Client-side submit helper for posting to /api/contact 
 * @param {Object} payload - The contact form data
 * @param {Object} opts - Optional callbacks for different stages of the request
 */
import { postContact, getApiBase, clearErrors, type ContactPayload } from './form-utils';

export { postContact };

/**
 * Auto-attach for careers form
 */
function attachCareersForm() {
  const form = document.getElementById('careersForm') as HTMLFormElement | null;
  if (!form) return;
  const submitBtn = document.getElementById('submitCareersBtn') as HTMLButtonElement | null;
  const formMessage = document.getElementById('formMessage-careers') as HTMLElement | null;
  const CAREERS_BTN_TEXT = '応募する（モック）';
  const errors = {
    subject: document.getElementById('error-subject') as HTMLElement | null,
    name: document.getElementById('error-name') as HTMLElement | null,
    email: document.getElementById('error-email') as HTMLElement | null,
    message: document.getElementById('error-message') as HTMLElement | null,
  };

  const setBusy = (busy: boolean, text = CAREERS_BTN_TEXT) => {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    if (busy) {
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.textContent = text;
    } else {
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = CAREERS_BTN_TEXT;
    }
  };

  let formMessageTimeout: number = 0;

  const showMessage = (text: string, color = 'black', autoClearMs = 2500) => {
    if (!formMessage) return;
    formMessage.style.color = color;
    formMessage.textContent = text;
    if (formMessageTimeout) {
      clearTimeout(formMessageTimeout);
      formMessageTimeout = 0;
    }
    if (autoClearMs > 0) {
      formMessageTimeout = window.setTimeout(() => {
        if (formMessage) formMessage.textContent = '';
        formMessageTimeout = 0;
      }, autoClearMs);
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(errors, formMessage);

    const data = new FormData(form);
    const company = (data.get('company') || '').toString().trim();
    const subject = (data.get('subject') || '').toString().trim();
    const name = (data.get('name') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    const message = (data.get('message') || '').toString().trim();

    // Simple validation
    if (!subject) { if (errors.subject) errors.subject.textContent = '件名を入力してください。'; (document.getElementById('subject') as HTMLElement | null)?.focus(); return; }
    if (!name) { if (errors.name) errors.name.textContent = 'お名前を入力してください。'; (document.getElementById('name') as HTMLElement | null)?.focus(); return; }
    const emailRe = /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?$/;
    if (!emailRe.test(email)) { if (errors.email) errors.email.textContent = '有効なメールアドレスを入力してください。'; (document.getElementById('email') as HTMLElement | null)?.focus(); return; }
    if (!message) { if (errors.message) errors.message.textContent = 'お問い合わせ内容を入力してください。'; (document.getElementById('message') as HTMLElement | null)?.focus(); return; }

    setBusy(true);
    showMessage('送信中...', 'black', 0); // keep until resolved

  // Include company when provided (optional)
  const payload: ContactPayload = { subject, name, email, message };
  if (company) payload.company = company;
    const metaKey = document.querySelector('meta[name="api-key"]')?.getAttribute('content') || '';

      try {
        if (!metaKey) throw new Error('API キーが設定されていません (meta[name="api-key"]).');

        const result = await postContact(payload, {
          apiKey: metaKey,
          apiBase: getApiBase(),
          timeoutMs: 15000,
        });

        // show success
        showMessage('送信に成功しました。ありがとうございました。', 'green');
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
        if (result?.previewHtml) {
          // NOTE: previewHtml is inserted as innerHTML and may be vulnerable to XSS.
          // Make sure the server sanitizes previewHtml before sending it to the client.
          // Show preview in an in-page modal (avoids popup blockers)
          showPreviewModal(result.previewHtml);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '送信に失敗しました（サーバーエラー）。';
        showMessage(errorMsg, '#b91c1c', 5000);
        console.error(err);
      } finally {
        setBusy(false);
      }
      }
  );
}

/**
 * Auto-attach when loaded
 */
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    attachCareersForm();
  });
}

/**
 *  Preview modal helpers (in-page) 
 */
function removePreviewModal() {
  const existing = document.getElementById('preview-modal-root');
  if (existing) existing.remove();
}

/**
 * Show the preview modal with the given HTML content.
 * @param html The HTML content to display in the modal.
 */
function showPreviewModal(html: string) {
  removePreviewModal();

  const root = document.createElement('div');
  root.id = 'preview-modal-root';
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.5)',
    zIndex: '9999',
  });

  const dialog = document.createElement('div');
  Object.assign(dialog.style, {
    background: '#fff',
    padding: '16px',
    width: 'min(90%,900px)',
    maxHeight: '80%',
    overflow: 'auto',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '閉じる';
  closeBtn.style.display = 'block';
  closeBtn.style.marginBottom = '8px';

  // Sanitize previewHtml to prevent XSS
  // Make sure to install dompurify: npm install dompurify
  // And import it at the top of this file:
  // import DOMPurify from 'dompurify';
  const content = document.createElement('div');
  // @ts-ignore
  content.innerHTML = (window.DOMPurify ? window.DOMPurify.sanitize(html) : html);

  dialog.append(closeBtn, content);
  root.appendChild(dialog);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') removePreviewModal();
  };

  function removePreviewModal() {
    document.removeEventListener('keydown', onKey);
    root.remove();
  }

  closeBtn.addEventListener('click', removePreviewModal);
  root.addEventListener('click', (e) => { if (e.target === root) removePreviewModal(); });
  document.addEventListener('keydown', onKey);

  document.body.appendChild(root);
}
