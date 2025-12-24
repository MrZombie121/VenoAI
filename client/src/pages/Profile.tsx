import { useStore } from '../state/store';

export default function Profile() {
  const session = useStore((s) => s.session);

  return (
    <div className="flex-col" style={{ gap: '1rem' }}>
      <div className="glass neo-card" style={{ padding: '1.2rem 1.5rem' }}>
        <h2 style={{ margin: 0 }}>Profile</h2>
        <p style={{ marginTop: 4, color: 'var(--muted)' }}>Account details.</p>
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem', color: 'var(--muted)' }}>
          <div><strong style={{ color: 'var(--text)' }}>Nickname:</strong> {session.nickname || '—'}</div>
          <div><strong style={{ color: 'var(--text)' }}>Email:</strong> {session.email || '—'}</div>
          <div><strong style={{ color: 'var(--text)' }}>User ID:</strong> {session.userId || '—'}</div>
          <div><strong style={{ color: 'var(--text)' }}>Plan:</strong> {session.plan}</div>
          <div><strong style={{ color: 'var(--text)' }}>VCoins:</strong> {session.coins}</div>
        </div>
      </div>
    </div>
  );
}
