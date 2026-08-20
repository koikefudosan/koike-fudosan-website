(() => {
  'use strict';

  const form = document.getElementById('contact-form');
  if (!form) return;

  const submit = document.getElementById('submit-button');
  const status = document.getElementById('form-status');
  const summary = document.getElementById('form-errors');
  const ts = document.getElementById('turnstile-container');

  let token = '';
  let started = false;
  let submitting = false;
  let widgetId = null;
  let loadAttempts = 0;
  let refreshTimer = null;

  const allowedCategories = ['', '不動産売却', '不動産買取', '相続不動産', '空き家・古家', '遠方の不動産', '民泊・賃貸活用', '民泊運営・管理', 'その他'];
  const allowedMethods = ['メール', '電話', 'どちらでもよい'];

  const emit = (name, params = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
    else if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: name, ...params });
  };

  const setStatus = (message, type = '', focus = true) => {
    status.className = 'form-status ' + type;
    status.textContent = message;
    if (message && focus) status.focus();
  };

  const clearErrors = () => {
    summary.hidden = true;
    summary.innerHTML = '';
    form.querySelectorAll('.field-error').forEach(element => element.remove());
    form.querySelectorAll('[aria-invalid=true]').forEach(element => element.removeAttribute('aria-invalid'));
  };

  const error = (element, message) => {
    element.setAttribute('aria-invalid', 'true');
    const id = element.id + '-error';
    let paragraph = document.getElementById(id);
    if (!paragraph) {
      paragraph = document.createElement('p');
      paragraph.id = id;
      paragraph.className = 'field-error';
      element.insertAdjacentElement('afterend', paragraph);
    }
    paragraph.textContent = message;
    const described = (element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!described.includes(id)) element.setAttribute('aria-describedby', [...described, id].join(' '));
  };

  const validate = () => {
    clearErrors();
    const data = Object.fromEntries(new FormData(form));
    const issues = [];
    const required = [
      ['name', 'お名前を入力してください。', 80],
      ['email', 'メールアドレスを入力してください。', 254],
      ['property_location', '物件所在地を入力してください。', 200],
      ['message', 'ご相談内容を10文字以上で入力してください。', 3000]
    ];

    for (const [key, message, max] of required) {
      const element = form.elements[key];
      const value = String(data[key] || '').trim();
      if (!value || (key === 'message' && value.length < 10)) {
        error(element, message);
        issues.push(message);
      } else if (value.length > max) {
        const limitMessage = max + '文字以内で入力してください。';
        error(element, limitMessage);
        issues.push(limitMessage);
      }
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
      const message = 'メールアドレスの形式を確認してください。';
      error(form.elements.email, message);
      issues.push(message);
    }

    if (data.phone && !/^[0-9+()（）\-ー\s]+$/.test(String(data.phone))) {
      const message = '電話番号に使用できない文字が含まれています。';
      error(form.elements.phone, message);
      issues.push(message);
    }

    if (!allowedCategories.includes(String(data.category || ''))) issues.push('相談種別を選び直してください。');
    if (!allowedMethods.includes(String(data.contact_method || ''))) issues.push('希望する連絡方法を選び直してください。');

    if (!form.elements.privacy_consent.checked) {
      const message = '個人情報の取扱いへの同意が必要です。';
      error(form.elements.privacy_consent, message);
      issues.push(message);
    }

    if (!token) issues.push('セキュリティ確認を完了してください。');

    if (issues.length) {
      summary.hidden = false;
      summary.innerHTML = '<strong>入力内容を確認してください。</strong><ul>' +
        issues.map(item => '<li>' + item.replace(/[&<>"']/g, character => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]) + '</li>').join('') + '</ul>';
      summary.focus();
      return null;
    }

    return data;
  };

  const loadTurnstileScript = () => new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) resolve();
      else reject(new Error('turnstile-api'));
    };
    script.onerror = () => reject(new Error('turnstile-script'));
    document.head.appendChild(script);
  });

  const refreshTurnstile = () => {
    token = '';
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
      else loadTurnstile();
    }, 250);
  };

  const loadTurnstile = async () => {
    loadAttempts += 1;
    ts.textContent = 'セキュリティ確認を読み込んでいます。';

    try {
      const response = await fetch('/api/contact-config', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const config = await response.json();
      if (!response.ok || !config.siteKey) throw new Error('config');

      await loadTurnstileScript();
      ts.textContent = '';
      widgetId = window.turnstile.render(ts, {
        sitekey: config.siteKey,
        action: 'contact',
        callback: value => {
          token = value;
          submit.disabled = false;
          setStatus('', '', false);
        },
        'expired-callback': refreshTurnstile,
        'timeout-callback': refreshTurnstile,
        'error-callback': () => {
          token = '';
                setStatus('セキュリティ確認を更新しています。しばらくお待ちください。', '', false);
          refreshTurnstile();
        }
      });
    } catch (exception) {
      if (loadAttempts < 4) {
        ts.textContent = 'セキュリティ確認を再読み込みしています。';
        window.setTimeout(loadTurnstile, 1500 * loadAttempts);
      } else {
        ts.textContent = 'セキュリティ確認を読み込めませんでした。ページを再読み込みするか、電話またはメールでお問い合わせください。';
          }
    }
  };

  form.addEventListener('focusin', () => {
    if (!started) {
      started = true;
      emit('form_start', { form_name: 'contact' });
    }
  }, { once: true });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;

    const data = validate();
    if (!data) {
      if (!token) refreshTurnstile();
      return;
    }

    submitting = true;
    submit.textContent = '送信中…';
    setStatus('送信しています。');

    const payload = {
      ...data,
      privacy_consent: true,
      turnstile_token: token,
      submission_id: crypto.randomUUID()
    };
    delete payload['cf-turnstile-response'];

    try {
      emit('contact_form_submit', { form_name: 'contact' });
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error('send');

      form.reset();
      token = '';
      emit('generate_lead', { form_name: 'contact' });
      setStatus('お問い合わせを受け付けました。ご入力いただいたメールアドレスへ受付確認メールを送信しました。届かない場合は迷惑メールフォルダもご確認ください。', 'success');
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    } catch (exception) {
      setStatus('送信できませんでした。時間をおいて再度お試しいただくか、電話（03-6823-4055）またはメール（info@koike-fudousan.com）でお問い合わせください。', 'error');
      refreshTurnstile();
    } finally {
      submitting = false;
      submit.textContent = '送信する';
      submit.disabled = false;
    }
  });

  loadTurnstile();
})();
