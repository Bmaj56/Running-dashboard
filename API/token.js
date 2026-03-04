export default async function handler(req, res) {
  const { code } = req.query;
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  const data = await response.json();
  res.redirect(`/?token=${data.access_token}&athlete=${data.athlete.firstname}`);
}
