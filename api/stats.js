// api/stats.js
// GET /api/stats — public stats for dashboard

export default async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
if (req.method !== ‘GET’) return res.status(405).end();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const headers = {
‘apikey’: SUPABASE_KEY,
‘Authorization’: `Bearer ${SUPABASE_KEY}`,
};

try {
const [postsRes, usersRes] = await Promise.all([
fetch(`${SUPABASE_URL}/rest/v1/posts?select=id&limit=1`, { headers }),
fetch(`${SUPABASE_URL}/rest/v1/users?select=id&limit=1`, { headers }),
]);

```
const postsCount = postsRes.headers.get('content-range')?.split('/')[1] || '0';
const usersCount = usersRes.headers.get('content-range')?.split('/')[1] || '0';

return res.status(200).json({
  total_posts: parseInt(postsCount) || 0,
  total_users: parseInt(usersCount) || 0,
});
```

} catch (err) {
return res.status(500).json({ error: ‘Failed to fetch stats’ });
}
}
