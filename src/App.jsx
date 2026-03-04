import { useState } from "react";

const CODE = {
  "src/App.jsx": `import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const REDIRECT = encodeURIComponent(window.location.origin + '/api/token');

function calcStreak(activities) {
  // Filter runs only, sorted by date descending
  const runs = activities
    .filter(a => a.type === 'Run')
    .map(a => new Date(a.start_date).toDateString())
    .filter((d, i, arr) => arr.indexOf(d) === i) // unique days
    .sort((a, b) => new Date(b) - new Date(a));

  if (!runs.length) return 0;

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  // Streak must include today or yesterday to be active
  if (runs[0] !== today && runs[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < runs.length; i++) {
    const diff = (new Date(runs[i-1]) - new Date(runs[i])) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function StreakCard({ streak }) {
  const flames = Math.min(streak, 10);
  return (
    <div style={{
      background: streak > 0 ? 'linear-gradient(135deg, #FC4C02, #ff8c00)' : '#f0f0f0',
      borderRadius: 20, padding: '32px 28px', textAlign: 'center',
      boxShadow: streak > 0 ? '0 4px 24px rgba(252,76,2,0.25)' : 'none',
      marginBottom: 24
    }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>
        {streak > 0 ? '🔥'.repeat(Math.max(1, Math.floor(flames / 3))) : '😴'}
      </div>
      <div style={{ fontSize: 72, fontWeight: 800, color: streak > 0 ? '#fff' : '#ccc', lineHeight: 1 }}>
        {streak}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: streak > 0 ? 'rgba(255,255,255,0.9)' : '#aaa', marginTop: 8 }}>
        {streak === 1 ? 'day streak' : 'day running streak'}
      </div>
      <div style={{ fontSize: 13, color: streak > 0 ? 'rgba(255,255,255,0.7)' : '#bbb', marginTop: 6 }}>
        {streak === 0 ? "Go for a run to start your streak!"
          : streak < 7 ? "Keep it up — you're building momentum!"
          : streak < 30 ? "You're on fire! Don't break the chain 🔥"
          : "Legendary consistency. Incredible! 🏆"}
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(null);
  const [athlete, setAthlete] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    const a = params.get('athlete');
    if (t) { setToken(t); setAthlete(a); }
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    // Fetch 60 activities to get enough history for streak
    fetch('https://www.strava.com/api/v3/athlete/activities?per_page=60', {
      headers: { Authorization: \`Bearer \${token}\` }
    })
    .then(r => r.json())
    .then(data => { setActivities(data); setLoading(false); });
  }, [token]);

  const streak = calcStreak(activities);
  const recentRuns = activities
    .filter(a => a.type === 'Run')
    .slice(0, 7)
    .map(a => ({
      name: new Date(a.start_date).toLocaleDateString('en', { weekday: 'short' }),
      km: +(a.distance / 1000).toFixed(1),
    }))
    .reverse();

  if (!token) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Inter,sans-serif',background:'#f7f7f5'}}>
      <div style={{fontSize:48,marginBottom:16}}>🏃</div>
      <h1 style={{fontSize:24,fontWeight:700,marginBottom:8}}>Running Streak Dashboard</h1>
      <p style={{color:'#888',marginBottom:28}}>See your streak and recent runs from Strava</p>
      <a href={\`https://www.strava.com/oauth/authorize?client_id=\${CLIENT_ID}&response_type=code&redirect_uri=\${REDIRECT}&scope=activity:read_all\`}
        style={{background:'#FC4C02',color:'#fff',padding:'13px 32px',borderRadius:10,textDecoration:'none',fontWeight:700,fontSize:15}}>
        Connect with Strava
      </a>
    </div>
  );

  return (
    <div style={{fontFamily:'Inter,sans-serif',background:'#f7f7f5',minHeight:'100vh',padding:'32px 20px'}}>
      <div style={{maxWidth:480,margin:'0 auto'}}>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:20,fontWeight:700,color:'#111'}}>Hey {athlete} 👋</div>
          <div style={{fontSize:13,color:'#aaa'}}>Here's your running streak</div>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:60,color:'#bbb'}}>Loading your runs...</div>
        ) : (
          <>
            <StreakCard streak={streak} />

            {recentRuns.length > 0 && (
              <div style={{background:'#fff',borderRadius:16,padding:'20px 20px 12px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                <div style={{fontWeight:600,fontSize:14,marginBottom:16,color:'#111'}}>Recent Runs (km)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={recentRuns} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false}/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:12,fill:'#bbb'}}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#bbb'}}/>
                    <Tooltip contentStyle={{borderRadius:8,border:'none',fontSize:13}}/>
                    <Bar dataKey="km" fill="#FC4C02" radius={[5,5,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}`,

  "api/token.js": `export default async function handler(req, res) {
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
  res.redirect(\`/?token=\${data.access_token}&athlete=\${data.athlete.firstname}\`);
}`
};

export default function StreakGuide() {
  const [activeFile, setActiveFile] = useState("src/App.jsx");
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(CODE[activeFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Streak preview with sample data
  const sampleStreak = 12;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#f7f7f5", minHeight: "100vh", padding: "32px 20px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#111" }}>Running Streak Dashboard</div>
          <div style={{ fontSize: 13, color: "#999", marginTop: 2 }}>Updated app code — streak is now front and center</div>
        </div>

        {/* Streak preview */}
        <div style={{ background: "linear-gradient(135deg, #FC4C02, #ff8c00)", borderRadius: 20, padding: "32px 28px", textAlign: "center", marginBottom: 24, boxShadow: "0 4px 24px rgba(252,76,2,0.25)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔥🔥🔥🔥</div>
          <div style={{ fontSize: 80, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{sampleStreak}</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginTop: 8 }}>day running streak</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>You're on fire! Don't break the chain 🔥</div>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 10 }}>What changed in the code</div>
          {[
            ["🔥", "Streak card is now the hero element — big, bold, full-color"],
            ["🧠", "Smart streak logic: counts consecutive days you ran (not just activities)"],
            ["💬", "Dynamic message based on streak length (building momentum → legendary)"],
            ["😴", "Shows a rest state if streak is broken, with a nudge to run"],
            ["📊", "Recent runs bar chart kept below as supporting context"],
          ].map(([icon, text], i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: "#555" }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

        {/* Code viewer */}
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ borderBottom: "1px solid #f0f0f0", display: "flex" }}>
            {Object.keys(CODE).map(f => (
              <button key={f} onClick={() => setActiveFile(f)} style={{
                padding: "11px 16px", border: "none", background: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 500,
                color: activeFile === f ? "#111" : "#aaa",
                borderBottom: activeFile === f ? "2px solid #FC4C02" : "2px solid transparent",
              }}>{f}</button>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <pre style={{ margin: 0, padding: "20px 24px", fontSize: 11.5, lineHeight: 1.7, color: "#333", overflowX: "auto", background: "#fafafa", maxHeight: 380 }}>
              <code>{CODE[activeFile]}</code>
            </pre>
            <button onClick={copy} style={{ position: "absolute", top: 12, right: 12, background: "#FC4C02", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#ccc" }}>
          Replace the files in your Vercel project with these updated versions
        </div>
      </div>
    </div>
  );
}
