// api/contact.js
// Vercel Serverless Function
// POST /api/contact

export default async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘POST, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);
if (req.method === ‘OPTIONS’) return res.status(200).end();
if (req.method !== ‘POST’) return res.status(405).json({ error: ‘Method not allowed’ });

const { name, email, company, message } = req.body || {};

if (!name || !email || !message) {
return res.status(400).json({ error: ‘الاسم والبريد والرسالة مطلوبة’ });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
return res.status(500).json({ error: ‘Server configuration error’ });
}

try {
const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/contact_requests`, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘apikey’: SUPABASE_KEY,
‘Authorization’: `Bearer ${SUPABASE_KEY}`,
‘Prefer’: ‘return=minimal’,
},
body: JSON.stringify({ name, email, company: company || null, message }),
});

```
if (!insertRes.ok) {
  const err = await insertRes.text();
  console.error('Supabase contact insert error:', err);
  return res.status(500).json({ error: 'فشل حفظ الطلب' });
}

return res.status(200).json({ success: true, message: 'تم إرسال طلبك بنجاح!' });
```

} catch (err) {
console.error(‘Contact handler error:’, err);
return res.status(500).json({ error: ‘خطأ في الخادم’ });
}
}
