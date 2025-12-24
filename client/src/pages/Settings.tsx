import { useState } from 'react';
import { coinApi } from '../api/client';
import { useStore, Plan } from '../state/store';

const plans: { id: Plan; price: number; perks: string[] }[] = [
  { id: 'plus', price: 1250, perks: ['Priority queue', '2x context', 'Custom styles'] },
  { id: 'extended', price: 5000, perks: ['All Plus perks', 'Long context', 'Faster responses'] }
];

export default function Settings() {
  const session = useStore((s) => s.session);
  const setSession = useStore((s) => s.setSession);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const purchase = async (plan: Plan) => {
    if (!session.token) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await coinApi.purchase(session.token, plan);
      setSession({ coins: res.coins, plan: res.plan });
      setMsg(`Upgraded to ${plan}.`);
    } catch (err) {
      setMsg('Not enough VCoins.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-col" style={{ gap: '1rem' }}>
      <div className="glass neo-card" style={{ padding: '1.2rem 1.5rem' }}>
        <h2 style={{ margin: 0 }}>Settings</h2>
        <p style={{ marginTop: 4, color: 'var(--muted)' }}>Manage plan and balance.</p>
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', color: 'var(--muted)' }}>
          <span>Balance: {session.coins} VCoins</span>
          <span>Plan: {session.plan}</span>
        </div>
        {msg && <div style={{ color: 'var(--accent)', marginTop: 6 }}>{msg}</div>}
      </div>

      <div className="flex-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        {plans.map((p) => (
          <div key={p.id} className="glass neo-card" style={{ padding: '1.25rem', flex: '1 1 280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{p.id}</h3>
              <span style={{ color: 'var(--accent)' }}>{p.price} VCoins</span>
            </div>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--muted)' }}>
              {p.perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
            <button onClick={() => purchase(p.id)} disabled={loading || session.plan === p.id}>
              {session.plan === p.id ? 'Active' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
