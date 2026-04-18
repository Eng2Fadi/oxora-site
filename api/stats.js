// api/stats.js
module.exports = async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);

if (req.method !== ‘GET’) return res.status(405).end();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
return res.status(500).json({ error: ‘Missing env vars’ });
}

const headers = {
‘apikey’: SUPABASE_KEY,
‘Authorization’: ’Bearer ’ + SUPABASE_KEY,
‘Prefer’: ‘count=exact’,
};

try {
const postsRes = await fetch(
SUPABASE_URL + ‘/rest/v1/posts?select=id’,
{ method: ‘HEAD’, headers: headers }
);
const usersRes = await fetch(
SUPABASE_URL + ‘/rest/v1/users?select=id’,
{ method: ‘HEAD’, headers: headers }
);

```
const postsRange = postsRes.headers.get('content-range') || '0/0';
const usersRange = usersRes.headers.get('content-range') || '0/0';

const totalPosts = parseInt((postsRange.split('/')[1] || '0'), 10);
const totalUsers = parseInt((usersRange.split('/')[1] || '0'), 10);

return res.status(200).json({
  success: true,
  total_posts: totalPosts,
  total_users: totalUsers,
});
```

} catch (err) {
console.error(‘Stats error:’, err.message);
return res.status(500).json({ error: ‘Failed to fetch stats’ });
}
};
