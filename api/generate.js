// api/generate.js
// Vercel Serverless Function
// POST /api/generate

export default async function handler(req, res) {
// CORS
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘POST, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);
if (req.method === ‘OPTIONS’) return res.status(200).end();
if (req.method !== ‘POST’) return res.status(405).json({ error: ‘Method not allowed’ });

const { niche, tone, topic, session_id } = req.body || {};

if (!niche || !tone || !topic) {
return res.status(400).json({ error: ‘niche, tone, topic مطلوبة’ });
}

if (topic.length < 10) {
return res.status(400).json({ error: ‘الموضوع قصير جداً، أضف تفاصيل أكثر’ });
}

// ── 1. CHECK SESSION LIMIT (Supabase) ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !DEEPSEEK_KEY) {
return res.status(500).json({ error: ‘Environment variables missing’ });
}

const headers = {
‘Content-Type’: ‘application/json’,
‘apikey’: SUPABASE_KEY,
‘Authorization’: `Bearer ${SUPABASE_KEY}`,
};

// Check how many posts this session already generated
if (session_id) {
const checkRes = await fetch(
`${SUPABASE_URL}/rest/v1/posts?session_id=eq.${session_id}&select=id`,
{ headers }
);
const existing = await checkRes.json();
if (Array.isArray(existing) && existing.length >= 1) {
return res.status(429).json({
error: ‘trial_used’,
message: ‘لقد استخدمت تجربتك المجانية. سجّل للحصول على المزيد.’
});
}
}

// ── 2. CALL DEEPSEEK API ──
const prompt = `أنت خبير في إنشاء محتوى LinkedIn باللغة العربية متخصص في مجال ${niche}.

اكتب منشور LinkedIn واحد باللغة العربية بأسلوب ${tone}.

الموضوع: ${topic}

المتطلبات:

- ابدأ بـ hook قوي يوقف التمرير (السطر الأول حاسم)
- 150-250 كلمة
- فقرات قصيرة مع مسافات للقراءة السهلة
- اختم بسؤال مثير للتفكير أو CTA واضح
- 3-5 هاشتاقات عربية ذات صلة في النهاية
- اكتب بالعربية فقط

أخرج نص المنشور فقط بدون أي مقدمة أو شرح.`;

let generatedText = ‘’;
let tokensUsed = 0;

try {
const deepseekRes = await fetch(‘https://api.deepseek.com/chat/completions’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘Authorization’: `Bearer ${DEEPSEEK_KEY}`,
},
body: JSON.stringify({
model: ‘deepseek-chat’,
messages: [
{ role: ‘system’, content: ‘أنت كاتب محتوى LinkedIn محترف باللغة العربية.’ },
{ role: ‘user’, content: prompt }
],
max_tokens: 800,
temperature: 0.85,
stream: false,
}),
});

```
if (!deepseekRes.ok) {
  const errBody = await deepseekRes.text();
  console.error('DeepSeek error:', errBody);
  return res.status(502).json({ error: 'فشل الاتصال بـ DeepSeek API' });
}

const deepseekData = await deepseekRes.json();
generatedText = deepseekData.choices?.[0]?.message?.content?.trim() || '';
tokensUsed = deepseekData.usage?.total_tokens || 0;

if (!generatedText) {
  return res.status(502).json({ error: 'لم يتم استلام محتوى من DeepSeek' });
}
```

} catch (err) {
console.error(‘DeepSeek fetch error:’, err);
return res.status(502).json({ error: ‘خطأ في الاتصال بـ DeepSeek’ });
}

// ── 3. SAVE TO SUPABASE ──
try {
const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
method: ‘POST’,
headers: { …headers, ‘Prefer’: ‘return=representation’ },
body: JSON.stringify({
session_id: session_id || null,
niche,
tone,
topic,
content: generatedText,
model: ‘deepseek-chat’,
tokens_used: tokensUsed,
}),
});

```
if (!insertRes.ok) {
  console.error('Supabase insert failed:', await insertRes.text());
}

// Update analytics
await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_daily_posts`, {
  method: 'POST',
  headers,
}).catch(() => {});

// Log usage
await fetch(`${SUPABASE_URL}/rest/v1/usage_log`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    session_id: session_id || null,
    action: 'generate_post',
    metadata: { niche, tone, tokens: tokensUsed },
  }),
}).catch(() => {});
```

} catch (err) {
console.error(‘Supabase save error:’, err);
// Don’t fail the request — still return the generated text
}

return res.status(200).json({
success: true,
content: generatedText,
tokens_used: tokensUsed,
model: ‘deepseek-chat’,
});
}
