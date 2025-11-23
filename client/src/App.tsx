import { useEffect, useState } from 'react';
import { fetchAlerts, fetchAlertById, resolveAlertApi, fetchRulesOverview, getMe, reloadRules } from './api/api';
import AutoClosedList from './components/AutoClosedList';
import TrendsChartContainer from './components/TrendsChartContainer';
import RulesConfig from './components/RulesConfig';
import CountsBar from './components/CountsBar';
import TopDrivers from './components/TopDrivers';
import AlertList from './components/AlertList';
import AlertModal from './components/AlertModal';
import EventsPanel from './components/EventsPanel';
import DemoSelector from './components/DemoSelector';
import Login from './components/Login';

export default function App() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    const t = sessionStorage.getItem('token');
    return t && t !== 'null' && t !== 'undefined' ? t : null;
  });
  const [user, setUser] = useState<any | null>(() => {
    const u = sessionStorage.getItem('username');
    const r = sessionStorage.getItem('role');
    return u && u !== 'null' ? { username: u, role: r } : null;
  });
  const [rules, setRules] = useState<Record<string, any>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadAlerts() {
    try {
      const list = await fetchAlerts({ limit: 50 });
      setAlerts(list);
      if (user?.role === 'admin') {
        try { const r = await fetchRulesOverview(); setRules(r); } catch {}
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load data. Is backend running?');
    }
  }

  function triggerRefresh() {
    setRefreshKey(k => k + 1);
    loadAlerts();
  }

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!token) return;
      try {
        const me = await getMe();
        if (!mounted) return;
        setUser(me);
      } catch (err) {
        console.warn('Token invalid or expired, clearing session', err);
        sessionStorage.removeItem('token');
        setToken(null);
        setUser(null);
        return;
      }
      loadAlerts();
      const id = setInterval(loadAlerts, 8000);
      return () => clearInterval(id);
    }
    const maybeCleanup = init();
    return () => {
      mounted = false;
      if (maybeCleanup && typeof (maybeCleanup as any) === 'function') (maybeCleanup as any)();
    };
  }, [token]);

  function handleLogin(newToken: string, newUser: any) {
    if (!newToken || newToken === 'null' || newToken === 'undefined') {
      console.error('Invalid token received:', newToken);
      return;
    }
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
    setTimeout(triggerRefresh, 400);
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
              <DemoSelector onCreated={() => setTimeout(triggerRefresh, 700)} />
              <button className="btn small" onClick={triggerRefresh} style={{ marginLeft: 8 }}>Refresh</button>
              <button className="btn small" onClick={handleLogout} style={{ marginLeft: 8 }}>Logout</button>
            </div>
          </div>

      <div className="card">
        <CountsBar key={refreshKey} />
        <div style={{ marginTop: 12 }} className="grid">
          <div>
            <div className="card" style={{ marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Recent alerts</h3>
              <div className="alert-list">
                <AlertList alerts={alerts} onOpen={handleOpen} />
              </div>
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <TopDrivers key={refreshKey} />
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <AutoClosedList key={refreshKey} />
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <TrendsChartContainer key={refreshKey} />
            </div>
            {user?.role === 'admin' && (
              <div className="card" style={{ marginTop: 12 }}>
                <RulesConfig rules={rules} canReload={true} onReload={async () => { 
                  try {
                    await reloadRules();
                    const r = await fetchRulesOverview();
                    setRules(r);
                    triggerRefresh();
                  } catch (err) {
                    console.error('Failed to reload rules:', err);
                    alert('Failed to reload rules');
                  }
                }} />
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