import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, getByLabelText, getByText, waitFor } from '@testing-library/dom';

// load the module under test
import * as formUtils from '../scripts/form-utils';

// helper to create a simple careers form in DOM
function makeForm() {
  document.body.innerHTML = `
    <form id="careersForm">
      <input id="subject" name="subject" />
      <div id="error-subject"></div>
      <input id="name" name="name" />
      <div id="error-name"></div>
      <input id="email" name="email" />
      <div id="error-email"></div>
      <textarea id="message" name="message"></textarea>
      <div id="error-message"></div>
      <button id="submitCareersBtn" type="submit">送信</button>
      <div id="formMessage-careers"></div>
    </form>
  `;
}

describe('attachCareersForm', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('shows validation errors for empty fields', async () => {
  makeForm();
  const mod = await import('../scripts/form-submit');
  (mod as any).attachCareersForm?.();

    const form = document.getElementById('careersForm') as HTMLFormElement;
    const submit = document.getElementById('submitCareersBtn') as HTMLButtonElement;
    expect(form).toBeTruthy();

    // submit empty form and wait for validation to run
    await fireEvent.submit(form);
    await waitFor(() => {
      const es = document.getElementById('error-subject')?.textContent || '';
      const en = document.getElementById('error-name')?.textContent || '';
      const ee = document.getElementById('error-email')?.textContent || '';
      if (!es.includes('件名') && !en.includes('お名前') && !ee.includes('有効なメールアドレス')) {
        throw new Error('validation messages not present yet');
      }
    });
  });

  it('sends payload when fields are valid', async () => {
  makeForm();
  // add meta api-key so submit flow uses real path
  const meta = document.createElement('meta'); meta.name = 'api-key'; meta.content = 'test'; document.head.appendChild(meta);
  // stub postContact BEFORE importing module so internal binding is mocked
  const mock = vi.spyOn(formUtils, 'postContact').mockResolvedValue({ previewUrl: 'https://example.test/preview' });
  const mod = await import('../scripts/form-submit');
  (mod as any).attachCareersForm?.();

    // fill form
    (document.getElementById('subject') as HTMLInputElement).value = 'hi';
    (document.getElementById('name') as HTMLInputElement).value = 'me';
    (document.getElementById('email') as HTMLInputElement).value = 'a@b.com';
    (document.getElementById('message') as HTMLTextAreaElement).value = 'hello';

    const form = document.getElementById('careersForm') as HTMLFormElement;
  await fireEvent.submit(form);
  // wait for postContact to be called and for success message to appear
  await waitFor(() => expect(mock).toHaveBeenCalled());
  await waitFor(() => expect(document.getElementById('formMessage-careers')?.textContent).toContain('送信に成功'));
  });
});
