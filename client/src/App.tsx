import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Chats from './pages/Chats';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Game from './pages/Game';
import Profile from './pages/Profile';
import { Layout } from './components/Layout';
import { authApi } from './api/client';
import { useStore } from './state/store';

function Protected({ children }: { children: React.ReactNode }) {
  const session = useStore((s) => s.session);
  const location = useLocation();
  if (!session.token) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export default function App() {
  const setSession = useStore((s) => s.setSession);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('veno_token');
    const persisted = readPersistedSession();
    if (persisted) {
      setSession({
        token: persisted.token,
        email: persisted.email,
        nickname: persisted.nickname,
        userId: persisted.userId,
        verified: persisted.verified,
        coins: persisted.coins,
        plan: persisted.plan
      });
    }
    if (!token || isExpired(persisted?.expiresAt)) {
      clearPersistedSession();
      return;
    }
    authApi
      .me(token)
      .then((data) => {
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
      })
      .catch(() => {
        clearPersistedSession();
        navigate('/login');
      });
  }, [navigate, setSession]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout>
              <Chats />
            </Layout>
          </Protected>
        }
      />
      <Route
        path="/chats"
        element={
          <Protected>
            <Layout>
              <Chats />
            </Layout>
          </Protected>
        }
      />
      <Route
        path="/chat"
        element={
          <Protected>
            <Layout>
              <Chat />
            </Layout>
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected>
            <Layout>
              <Settings />
            </Layout>
          </Protected>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected>
            <Layout>
              <Profile />
            </Layout>
          </Protected>
        }
      />
      <Route
        path="/game"
        element={
          <Protected>
            <Layout>
              <Game />
            </Layout>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
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

function readPersistedSession(): (typeof defaultSession) | null {
  const raw = localStorage.getItem('veno_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as typeof defaultSession;
  } catch {
    return null;
  }
}

function clearPersistedSession() {
  localStorage.removeItem('veno_token');
  localStorage.removeItem('veno_session');
}

function isExpired(expiresAt?: number | null): boolean {
  if (!expiresAt) return true;
  return Date.now() > expiresAt;
}

const defaultSession = {
  token: null,
  email: null,
  nickname: null,
  userId: null,
  verified: false,
  coins: 0,
  plan: 'free'
};
