import { useEffect, useState } from 'react';
import { fetchAlerts, fetchAlertById, resolveAlertApi, fetchRulesOverview, getMe, reloadRules } from './api/api';
import AutoClosedList from './components/AutoClosedList';
import TrendsChartContainer from './components/TrendsChartContainer';
import RulesConfig from './components/RulesConfig';
import CountsBar from './components/CountsBar';
import TopDrivers from './components/TopDrivers';
import AlertList from './components/AlertList';
import EventsPanel from './components/EventsPanel';
import DemoSelector from './components/DemoSelector';
import Login from './components/Login';

export default function App() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [fullHistory, setFullHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
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
    setReason('');
    
    // Fetch full history
    setLoadingHistory(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_BASE || 'http://localhost:4000'}/api/alerts/${alertId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setFullHistory(data.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
      setFullHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleResolve(alertId: string, resolveReason?: string) {
    await resolveAlertApi(alertId, resolveReason);
    setSelected(null);
    setReason('');
    setFullHistory([]);
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
                    
                    <div style={{ marginTop: 10 }}>
                      <strong>Status: </strong>
                      <span className={`badge ${selected.status}`}>{selected.status}</span>
                      {selected.lastTransitionAt && (
                        <div className="small-muted" style={{ marginTop: 4 }}>
                          Last transition: {new Date(selected.lastTransitionAt).toLocaleString()} — {selected.lastTransitionReason}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <strong>Metadata</strong>
                      <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>{JSON.stringify(selected.metadata, null, 2)}</pre>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <strong>Full History (Alert + EventLog)</strong>
                      {loadingHistory ? (
                        <div className="small-muted">Loading...</div>
                      ) : (
                        <div style={{ maxHeight: 250, overflow: 'auto', border: '1px solid #ccc', borderRadius: 4, padding: 8 }}>
                          {fullHistory.length === 0 && <div className="small-muted">No history</div>}
                          {fullHistory.map((h: any, i: number) => (
                            <div key={i} style={{ borderBottom: '1px solid #eee', paddingBottom: 6, marginBottom: 6 }}>
                              <div className="row" style={{ justifyContent: 'space-between' }}>
                                <strong>{h.type || h.state}</strong>
                                <div className="small-muted">{new Date(h.ts).toLocaleString()}</div>
                              </div>
                              {h.reason && <div className="small-muted">Reason: {h.reason}</div>}
                              {h.payload && <div className="small-muted">Payload: {JSON.stringify(h.payload)}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selected.status !== 'RESOLVED' && selected.status !== 'AUTO-CLOSED' && (
                      <div style={{ marginTop: 10 }}>
                        <strong>Manual Resolve</strong>
                        <div className="form-row" style={{ marginTop: 8 }}>
                          <input 
                            className="input" 
                            placeholder="reason (optional)" 
                            value={reason} 
                            onChange={(e) => setReason(e.target.value)} 
                            style={{ flex: 1 }}
                          />
                          <button className="btn" onClick={() => handleResolve(selected.alertId, reason)} style={{ marginLeft: 8 }}>Resolve</button>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <button className="btn small" onClick={() => { setSelected(null); setReason(''); setFullHistory([]); }}>Close</button>
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
        </>
      )}
    </div>
  );
}