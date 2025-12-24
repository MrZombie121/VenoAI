import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { useStore } from '../state/store';

export default function Login() {
  const navigate = useNavigate();
  const setSession = useStore((s) => s.setSession);
  const [login, setLogin] = useState('demo@veno.ai');
  const [password, setPassword] = useState('password123');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'credentials' | 'verify'>('credentials');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const submitCreds = async () => {
    setLoading(true);
    setNotice('');
    try {
      await authApi.login(login, password);
      setStage('verify');
      setNotice('A 6-digit code was sent to your email. Check inbox or spam.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Login failed.';
      setNotice(msg);
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    setNotice('');
    try {
      const data = await authApi.verify(login, code);
      const nextSession = {
        token: data.token,
        email: data.email,
        nickname: data.nickname,
        userId: data.userId,
        verified: data.verified,
        coins: data.coins,
        plan: data.plan
      };
      setSession(nextSession);
      persistSession(nextSession);
      navigate('/chat');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Invalid code.';
      setNotice(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center" style={{ minHeight: '80vh' }}>
      <div className="glass neo-card" style={{ padding: '2rem', width: 420 }}>
        <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>Welcome back</h1>
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>Sign in to chat with ven-1.0-free.</p>

        <div className="flex-col" style={{ marginTop: '1.5rem' }}>
          <label>
            <div style={{ marginBottom: 6 }}>Email or nickname</div>
            <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="you@example.com" />
          </label>
          <label>
            <div style={{ marginBottom: 6 }}>Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          {stage === 'verify' && (
            <label>
              <div style={{ marginBottom: 6 }}>6-digit code</div>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" />
            </label>
          )}

          {notice && <div style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>{notice}</div>}

          {stage === 'credentials' ? (
            <button onClick={submitCreds} disabled={loading}>
              {loading ? '...' : 'Send code'}
            </button>
          ) : (
            <button onClick={verify} disabled={loading || code.length !== 6}>
              {loading ? '...' : 'Verify & enter'}
            </button>
          )}
        </div>

        <div style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.95rem' }}>
          No account? <Link to="/register" style={{ color: 'var(--accent)' }}>Create one</Link>
        </div>
      </div>
    </div>
  );
}

function persistSession(session: {
  token: string | null;
  email: string | null;
  nickname: string | null;
  userId: string | null;
  verified: boolean;
  coins: number;
  plan: string;
}) {
  if (!session.token) return;
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  localStorage.setItem('veno_token', session.token);
  localStorage.setItem('veno_session', JSON.stringify({ ...session, expiresAt }));
}
