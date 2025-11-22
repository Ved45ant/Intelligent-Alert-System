import React, { useEffect, useState } from 'react';
import { fetchSummary, fetchAlerts, fetchAlertById, resolveAlertApi, fetchAutoClosed, fetchTrends, fetchRulesOverview, getMe } from './api/api';
import AutoClosedList from './components/AutoClosedList';
import TrendsChart from './components/TrendsChart';
import RulesConfig from './components/RulesConfig';
import CountsBar from './components/CountsBar';
import AlertList from './components/AlertList';
import AlertModal from './components/AlertModal';
import EventsPanel from './components/EventsPanel';
import DemoSelector from './components/DemoSelector';
import Login from './components/Login';

export default function App() {
  const [summary, setSummary] = useState<{ critical: number; warning: number; info: number; topDrivers?: any[] }>({ critical: 0, warning: 0, info: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('token'));
  const [user, setUser] = useState<any | null>(() => {
    const u = sessionStorage.getItem('username');
    const r = sessionStorage.getItem('role');
    return u ? { username: u, role: r } : null;
  });
  const [autoClosed, setAutoClosed] = useState<any[]>([]);
  const [trends, setTrends] = useState<Record<string, { created:number; escalated:number; autoClosed:number; resolved:number; info:number }>>({});
  const [rules, setRules] = useState<Record<string, any>>({});

  async function loadAll() {
    setLoading(true);
    try {
      const s = await fetchSummary();
      setSummary(s);
      const list = await fetchAlerts({ limit: 50 });
      setAlerts(list);
      const ac = await fetchAutoClosed(24);
      setAutoClosed(ac.rows || []);
      const tr = await fetchTrends(7);
      setTrends(tr.data || {});
      if (user?.role === 'admin') {
        try { const r = await fetchRulesOverview(); setRules(r); } catch {}
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load data. Is backend running?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!token) return;
      try {
        // verify token with backend before making protected requests
        const me = await getMe();
        if (!mounted) return;
        setUser(me);
      } catch (err) {
        // token invalid — clear and show login
        console.warn('Token invalid or expired, clearing session', err);
        sessionStorage.removeItem('token');
        setToken(null);
        setUser(null);
        return;
      }
      // token ok, load data and start periodic refresh
      loadAll();
      const id = setInterval(loadAll, 8000);
      return () => clearInterval(id);
    }
    const maybeCleanup = init();
    return () => {
      mounted = false;
      if (maybeCleanup && typeof (maybeCleanup as any) === 'function') (maybeCleanup as any)();
    };
  }, [token]);

  function handleLogin(newToken: string, newUser: any) {
    setToken(newToken);
    setUser(newUser);
    sessionStorage.setItem('token', newToken);
    sessionStorage.setItem('username', newUser.username);
    if (newUser.role) sessionStorage.setItem('role', newUser.role);
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('role');
  }

  async function handleOpen(alertId: string) {
    const a = await fetchAlertById(alertId);
    setSelected(a);
  }

  async function handleResolve(alertId: string, reason?: string) {
    await resolveAlertApi(alertId, reason);
    setSelected(null);
    setTimeout(loadAll, 400);
  }

  return (
    <div className="app">
      {!token ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <div className="header">
            <div>
              <h2>Intelligent Alert — Dashboard</h2>
              <div className="small-muted">Logged in as {user?.username} ({user?.role})</div>
            </div>
            <div className="row">
              <DemoSelector onCreated={() => setTimeout(loadAll, 700)} />
              <button className="btn small" onClick={loadAll} style={{ marginLeft: 8 }}>Refresh</button>
              <button className="btn small" onClick={handleLogout} style={{ marginLeft: 8 }}>Logout</button>
            </div>
          </div>

      <div className="card">
        <CountsBar summary={summary} loading={loading} />
        <div style={{ marginTop: 12 }} className="grid">
          <div>
            <div className="card" style={{ marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Recent alerts</h3>
              <div className="alert-list">
                <AlertList alerts={alerts} onOpen={handleOpen} />
              </div>
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <h3 style={{ margin: 0 }}>Top Drivers</h3>
              <div style={{ paddingTop: 8 }} className="small-muted">
                {summary.topDrivers && summary.topDrivers.length > 0 ? (
                  <div>
                    {summary.topDrivers.map((d:any) => (
                      <div key={d.driverId} className="row" style={{ justifyContent:'space-between', padding:4 }}>
                        <div>{d.driverId}</div>
                        <div className="small-muted">{d.count} alerts</div>
                      </div>
                    ))}
                  </div>
                ) : <div className="small-muted">No driver data.</div>}
              </div>
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <h3 style={{ margin: 0 }}>Recent Auto-CLOSED (24h)</h3>
              <AutoClosedList rows={autoClosed} />
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <h3 style={{ margin: 0 }}>Trends (7d)</h3>
              <TrendsChart data={trends} />
            </div>
            {user?.role === 'admin' && (
              <div className="card" style={{ marginTop: 12 }}>
                <RulesConfig rules={rules} canReload={true} onReload={async () => { await fetch('/api/alerts/rules/reload', { method:'POST', headers:{ Authorization:`Bearer ${token}` } }); setTimeout(loadAll,500); }} />
              </div>
            )}
          </div>

          <div>
            <div className="card">
              <h3 style={{ margin: 0 }}>Selected alert</h3>
              <div style={{ marginTop: 8 }}>
                {selected ? (
                  <div>
                    <div><b>{selected.alertId}</b> <span className={`badge ${selected.severity}`}>{selected.severity}</span></div>
                    <div className="small-muted" style={{ marginTop: 8 }}>{selected.sourceType} • {new Date(selected.timestamp).toLocaleString()}</div>
                    <div style={{ marginTop: 8 }}>
                      <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>{JSON.stringify(selected.metadata, null, 2)}</pre>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <button className="btn small" onClick={() => handleResolve(selected.alertId, 'resolved via UI')}>Resolve</button>
                      <button className="btn small" style={{ marginLeft: 8 }} onClick={() => setSelected(null)}>Close</button>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <h4 style={{ margin: '8px 0' }}>History</h4>
                      {selected.history?.map((h: any, i: number) => (
                        <div key={i} className="row" style={{ justifyContent: 'space-between', padding: 6 }}>
                          <div>{h.state}</div>
                          <div className="small-muted">{new Date(h.ts).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="small-muted">No alert selected. Click an alert row to open it.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
          <EventsPanel />
          {selected && (
            <AlertModal alert={selected} onClose={() => setSelected(null)} onResolve={handleResolve} />
          )}
        </>
      )}
    </div>
  );
}