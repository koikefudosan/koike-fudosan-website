const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff'
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

const clean = (value, max) =>
  String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, max);

const headerSafe = value => clean(value, 120).replace(/[\r\n]/g, ' ');
const emailOk = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const phoneOk = value => !value || /^[0-9+()（）\-ー\s]{1,30}$/.test(value);

const categories = new Set([
  '',
  '不動産売却',
  '不動産買取',
  '相続不動産',
  '空き家・古家',
  '遠方の不動産',
  '民泊・賃貸活用',
  '民泊運営・管理',
  'その他'
]);

const methods = new Set(['メール', '電話', 'どちらでもよい']);

async function sendEmail(env, payload, idempotencyKey, kind) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MAIL_API_KEY || env.EMAIL_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'koike-fudousan-contact/1.0',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Resend API error', {
      kind,
      status: response.status,
      name: result.name || '',
      message: result.message || '',
      statusCode: result.statusCode || ''
    });

    const error = new Error('resend_failed');
    error.status = response.status;
    error.resendName = result.name || '';
    throw error;
  }

  console.log('Resend API success', {
    kind,
    status: response.status,
    hasMessageId: Boolean(result.id)
  });

  return result;
}

async function handleContact(context) {
  if (context.request.method !== 'POST') {
    return json({
      success: false,
      code: 'invalid_request',
      message: 'Method not allowed'
    }, 405);
  }

  const type = context.request.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    return json({
      success: false,
      code: 'invalid_request',
      message: 'Invalid request'
    }, 415);
  }

  const configuration = {
    hasMailApiKey: Boolean(context.env.MAIL_API_KEY || context.env.EMAIL_API_KEY),
    hasTurnstileSecret: Boolean(context.env.TURNSTILE_SECRET_KEY),
    hasFromEmail: Boolean(context.env.CONTACT_FROM_EMAIL),
    hasToEmail: Boolean(context.env.CONTACT_TO_EMAIL),
    hasReplyToEmail: Boolean(context.env.CONTACT_REPLY_TO_EMAIL)
  };

  console.log('Contact configuration', configuration);

  if (Object.values(configuration).some(value => !value)) {
    return json({
      success: false,
      code: 'configuration_missing',
      message: 'サービスを利用できません。'
    }, 503);
  }

  let raw;
  try {
    raw = await context.request.json();
  } catch {
    return json({
      success: false,
      code: 'invalid_request',
      message: 'Invalid request'
    }, 400);
  }

  if (raw.website) return json({ success: true });

  const data = {
    name: clean(raw.name, 80),
    email: clean(raw.email, 254),
    phone: clean(raw.phone, 30),
    property: clean(raw.property_location, 200),
    category: clean(raw.category, 30),
    method: clean(raw.contact_method, 20),
    time: clean(raw.preferred_time, 100),
    message: clean(raw.message, 3000),
    token: clean(raw.turnstile_token, 2048),
    id: clean(raw.submission_id, 80)
  };

  const valid =
    data.name &&
    emailOk(data.email) &&
    phoneOk(data.phone) &&
    data.property &&
    data.message.length >= 10 &&
    categories.has(data.category) &&
    methods.has(data.method) &&
    raw.privacy_consent === true &&
    data.token &&
    /^[0-9a-f-]{20,80}$/i.test(data.id);

  if (!valid) {
    return json({
      success: false,
      code: 'validation_failed',
      message: '入力内容を確認してください。'
    }, 400);
  }

  const ip = context.request.headers.get('CF-Connecting-IP') || '';

  if (context.env.CONTACT_RATE_LIMIT && ip) {
    const key = 'rate:' + ip;
    const recent = await context.env.CONTACT_RATE_LIMIT.get(key);

    if (recent) {
      return json({
        success: false,
        code: 'rate_limited',
        message: '時間をおいて再度お試しください。'
      }, 429);
    }

    await context.env.CONTACT_RATE_LIMIT.put(key, '1', { expirationTtl: 60 });
  }

  const verify = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: context.env.TURNSTILE_SECRET_KEY,
        response: data.token,
        remoteip: ip,
        idempotency_key: crypto.randomUUID()
      })
    }
  );

  const verdict = await verify.json().catch(() => ({ success: false }));

  console.log('Turnstile verification', {
    success: Boolean(verdict.success),
    hostname: verdict.hostname || '',
    action: verdict.action || '',
    errors: verdict['error-codes'] || []
  });

  if (
    !verdict.success ||
    verdict.action !== 'contact' ||
    verdict.hostname !== 'koike-fudousan.com'
  ) {
    return json({
      success: false,
      code: 'turnstile_failed',
      message: 'セキュリティ確認に失敗しました。'
    }, 403);
  }

  const to = context.env.CONTACT_TO_EMAIL;
  const reply = context.env.CONTACT_REPLY_TO_EMAIL;
  const from = '株式会社こいけ不動産 <' + context.env.CONTACT_FROM_EMAIL + '>';
  const received = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  const admin = [
    '受付日時：' + received,
    'お名前：' + data.name,
    'メールアドレス：' + data.email,
    '電話番号：' + (data.phone || '未入力'),
    '物件所在地：' + data.property,
    '相談種別：' + (data.category || '未選択'),
    '希望連絡方法：' + data.method,
    '希望時間帯：' + (data.time || '未入力'),
    '',
    'ご相談内容：',
    data.message
  ].join('\n');

  const auto = [
    data.name + '様',
    '',
    '株式会社こいけ不動産へお問い合わせいただき、ありがとうございます。',
    '',
    '以下の内容でお問い合わせを受け付けました。',
    '',
    '────────────────',
    'お名前：' + data.name,
    '物件所在地：' + data.property,
    '相談種別：' + (data.category || '未選択'),
    'ご相談内容：' + data.message,
    '────────────────',
    '',
    '内容を確認のうえ、担当者よりご連絡いたします。',
    '',
    'お急ぎの場合は、下記までお電話ください。',
    '',
    '株式会社こいけ不動産',
    '電話：03-6823-4055',
    'メール：info@koike-fudousan.com',
    'Web：https://koike-fudousan.com/',
    '',
    '※このメールにお心当たりがない場合は、info@koike-fudousan.comまでご連絡ください。'
  ].join('\n');

  try {
    await Promise.all([
      sendEmail(
        context.env,
        {
          from,
          to: [to],
          reply_to: data.email,
          subject:
            '【Webサイト問い合わせ】' +
            headerSafe(data.name) +
            '様／' +
            headerSafe(data.category || '未選択'),
          text: admin
        },
        data.id + '-admin',
        'admin'
      ),
      sendEmail(
        context.env,
        {
          from,
          to: [data.email],
          reply_to: reply,
          subject: '【株式会社こいけ不動産】お問い合わせを受け付けました',
          text: auto
        },
        data.id + '-reply',
        'auto_reply'
      )
    ]);

    return json({ success: true });
  } catch (error) {
    console.error('Contact mail delivery failed', {
      name: error && error.message === 'resend_failed' ? 'resend_failed' : 'mail_failed',
      status: Number(error && error.status) || 0,
      resendName: (error && error.resendName) || ''
    });

    return json({
      success: false,
      code: 'mail_failed',
      message: '現在メールを送信できません。'
    }, 502);
  }
}

export async function onRequest(context) {
  try {
    return await handleContact(context);
  } catch (error) {
    console.error('Contact function error', {
      name: (error && error.name) || 'Error',
      message: (error && error.message) || 'unknown'
    });

    return json({
      success: false,
      code: 'internal_error',
      message: '送信できませんでした。'
    }, 500);
  }
}
