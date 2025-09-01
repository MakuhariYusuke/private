// Client-side submit helper for posting to /api/contact
async function postContact(payload: { subject: string; name: string; email: string; message: string }, opts?: { onStart?: ()=>void; onSuccess?: ()=>void; onError?: (err:any)=>void }) {
  opts?.onStart && opts.onStart();
  try {
    const resp = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const body = await resp.json().catch(()=>({}));
      throw new Error(body?.error || '送信に失敗しました');
    }
    opts?.onSuccess && opts.onSuccess();
  } catch (err) {
    opts?.onError && opts.onError(err);
  }
}

export { postContact };

// auto-attach for careers form
function attachCareersForm() {
  const form = document.getElementById('careersForm') as HTMLFormElement | null;
  if (!form) return;
  const submitBtn = document.getElementById('submitCareersBtn') as HTMLButtonElement | null;
  const formMessage = document.getElementById('formMessage-careers') as HTMLElement | null;
  const errors = {
    subject: document.getElementById('error-subject') as HTMLElement | null,
    name: document.getElementById('error-name') as HTMLElement | null,
    email: document.getElementById('error-email') as HTMLElement | null,
    message: document.getElementById('error-message') as HTMLElement | null,
  };

  function clearErrors() { Object.values(errors).forEach(e=>{ if(e) e.textContent=''; }); if(formMessage) { formMessage.textContent=''; formMessage.style.color=''; } }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    const data = new FormData(form);
    const subject = (data.get('subject')||'').toString().trim();
    const name = (data.get('name')||'').toString().trim();
    const email = (data.get('email')||'').toString().trim();
    const message = (data.get('message')||'').toString().trim();

  if (!subject) { if(errors.subject) errors.subject.textContent='件名を入力してください。'; (document.getElementById('subject') as HTMLElement).focus(); return; }
  if (!name) { if(errors.name) errors.name.textContent='お名前を入力してください。'; (document.getElementById('name') as HTMLElement).focus(); return; }
  if (!email) { if(errors.email) errors.email.textContent='メールアドレスを入力してください。'; (document.getElementById('email') as HTMLElement).focus(); return; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) { if(errors.email) errors.email.textContent='有効なメールアドレスを入力してください。'; (document.getElementById('email') as HTMLElement).focus(); return; }
  if (!message) { if(errors.message) errors.message.textContent='お問い合わせ内容を入力してください。'; (document.getElementById('message') as HTMLElement).focus(); return; }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.setAttribute('aria-busy','true'); const orig = submitBtn.textContent; submitBtn.textContent='送信中...'; }
    if (formMessage) { formMessage.style.color='black'; formMessage.textContent='送信中...'; }

    const metaKey = document.querySelector('meta[name="api-key"]')?.getAttribute('content') || '';
    if (metaKey) {
      try {
        const resp = await fetch('/api/contact', { method: 'POST', headers: {'Content-Type':'application/json', 'x-api-key': metaKey}, body: JSON.stringify({ subject, name, email, message }) });
        if (!resp.ok) {
          const body = await resp.json().catch(()=>({}));
          throw new Error(body?.error || '送信に失敗しました');
        }
  if (formMessage) { formMessage.style.color='green'; formMessage.textContent='送信に成功しました。ありがとうございました。'; }
        form.reset();
      } catch (err:any) {
        if (formMessage) { formMessage.style.color='#b91c1c'; formMessage.textContent = '送信に失敗しました（サーバー未設定またはAPIキーが不正）。'; }
        console.error(err);
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '応募する（モック）'; submitBtn.removeAttribute('aria-busy'); }
        setTimeout(()=>{ if(formMessage) formMessage.textContent=''; }, 2500);
      }
    } else {
      // mock fallback
      setTimeout(()=>{ if (formMessage) { formMessage.style.color='green'; formMessage.textContent='送信成功（モック）。'; } form.reset(); if (submitBtn) { submitBtn.disabled=false; submitBtn.textContent='応募する（モック）'; submitBtn.removeAttribute('aria-busy'); } setTimeout(()=>{ if(formMessage) formMessage.textContent=''; },2500); }, 1200);
    }
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    attachCareersForm();
  });
}
