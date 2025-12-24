import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { chatApi } from '../api/client';

export default function Chats() {
  const session = useStore((s) => s.session);
  const chatMeta = useStore((s) => s.chatMeta);
  const setChatMetaBatch = useStore((s) => s.setChatMetaBatch);
  const list = Object.values(chatMeta).sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => {
    if (!session.token) return;
    chatApi.list(session.token).then((items) => {
      setChatMetaBatch(items);
    }).catch(() => null);
  }, [session.token, setChatMetaBatch]);

  return (
    <div className="flex-col" style={{ gap: '1rem' }}>
      <div className="glass neo-card" style={{ padding: '1.2rem 1.5rem' }}>
        <h2 style={{ margin: 0 }}>Chats</h2>
        <p style={{ marginTop: 4, color: 'var(--muted)' }}>Pick a session or start a fresh one.</p>
      </div>
      <div className="flex-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        {list.map((c) => (
          <Link key={c.id} to={`/chat?id=${c.id}`} style={{ flex: '1 1 240px', textDecoration: 'none' }}>
            <div className="glass neo-card" style={{ padding: '1rem', height: '100%' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{c.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Resume dialog with ven-1.0-free.</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
