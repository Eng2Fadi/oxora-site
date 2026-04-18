// api/generate.js
module.exports = async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘POST, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);

if (req.method === ‘OPTIONS’) return res.status(200).end();
if (req.method !== ‘POST’) return res.status(405).json({ error: ‘Method not allowed’ });

const { niche, tone, topic, session_id } = req.body || {};

if (!niche || !tone || !topic) {
return res.status(400).json({ error: ‘niche, tone, topic مطلوبة’ });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !DEEPSEEK_KEY) {
return res.status(500).json({ error: ‘Environment variables missing’ });
}

const sbHeaders = {
‘Content-Type’: ‘application/json’,
‘apikey’: SUPABASE_KEY,
‘Authorization’: ’Bearer ’ + SUPABASE_KEY,
};

// فحص التجربة المجانية
if (session_id) {
try {
const checkRes = await fetch(
SUPABASE_URL + ‘/rest/v1/posts?session_id=eq.’ + session_id + ‘&select=id’,
{ headers: sbHeaders }
);
const existing = await checkRes.json();
if (Array.isArray(existing) && existing.length >= 1) {
return res.status(429).json({
error: ‘trial_used’,
message: ‘لقد استخدمت تجربتك المجانية.’
});
}
} catch (e) {}
}

// استدعاء DeepSeek
let generatedText = ‘’;
let tokensUsed = 0;

const prompt = ’أنت خبير في إنشاء محتوى LinkedIn باللغة العربية متخصص في مجال ’ + niche + ’.\n\nاكتب منشور LinkedIn واحد باللغة العربية بأسلوب ’ + tone + ’.\n\nالموضوع: ’ + topic + ‘\n\nالمتطلبات:\n- ابدأ بـ hook قوي يوقف التمرير\n- 150-250 كلمة\n- فقرات قصيرة مع مسافات\n- اختم بسؤال أو CTA واضح\n- 3-5 هاشتاقات عربية في النهاية\n- اكتب بالعربية فقط\n\nأخرج نص المنشور فقط.’;

try {
const dsRes = await fetch(‘https://api.deepseek.com/chat/completions’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘Authorization’: ’Bearer ’ + DEEPSEEK_KEY,
},
body: JSON.stringify({
model: ‘deepseek-chat’,
messages: [
{ role: ‘system’, content: ‘أنت كاتب محتوى LinkedIn محترف باللغة العربية.’ },
{ role: ‘user’, content: prompt }
],
max_tokens: 800,
temperature: 0.85,
}),
});

```
if (!dsRes.ok) {
  const errText = await dsRes.text();
  console.error('DeepSeek error:', errText);
  return res.status(502).json({ error: 'فشل الاتصال بـ DeepSeek: ' + dsRes.status });
}

const dsData = await dsRes.json();
generatedText = (dsData.choices && dsData.choices[0] && dsData.choices[0].message && dsData.choices[0].message.content || '').trim();
tokensUsed = (dsData.usage && dsData.usage.total_tokens) || 0;

if (!generatedText) {
  return res.status(502).json({ error: 'لم يتم استلام محتوى من DeepSeek' });
}
```

} catch (err) {
console.error(‘DeepSeek fetch error:’, err.message);
return res.status(502).json({ error: ‘خطأ في الاتصال بـ DeepSeek’ });
}

// حفظ في Supabase
try {
await fetch(SUPABASE_URL + ‘/rest/v1/posts’, {
method: ‘POST’,
headers: Object.assign({}, sbHeaders, { ‘Prefer’: ‘return=minimal’ }),
body: JSON.stringify({
session_id: session_id || null,
niche: niche,
tone: tone,
topic: topic,
content: generatedText,
model: ‘deepseek-chat’,
tokens_used: tokensUsed,
}),
});

```
await fetch(SUPABASE_URL + '/rest/v1/usage_log', {
  method: 'POST',
  headers: Object.assign({}, sbHeaders, { 'Prefer': 'return=minimal' }),
  body: JSON.stringify({
    session_id: session_id || null,
    action: 'generate_post',
    metadata: { niche: niche, tone: tone, tokens: tokensUsed },
  }),
});
```

} catch (err) {
console.error(‘Supabase save error:’, err.message);
}

return res.status(200).json({
success: true,
content: generatedText,
tokens_used: tokensUsed,
model: ‘deepseek-chat’,
});
};
