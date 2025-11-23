import React, { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:4000';

type FilterType = '24h' | '7d';

export default function AutoClosedList() {
  const [filter, setFilter] = useState<FilterType>('24h');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAutoClosed();
  }, [filter]);

  const fetchAutoClosed = () => {
    setLoading(true);
    const token = sessionStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      setLoading(false);
      return;
    }
    fetch(`${BASE}/api/dashboard/auto-closed?filter=${filter}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setRows(data.alerts || []);
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setLoading(false);
      });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>Auto-Closed Alerts</h4>
        <div>
          <button 
            className={`btn small ${filter === '24h' ? '' : 'secondary'}`} 
            onClick={() => setFilter('24h')}
            style={{ marginRight: 4 }}
          >
            24h
          </button>
          <button 
            className={`btn small ${filter === '7d' ? '' : 'secondary'}`} 
            onClick={() => setFilter('7d')}
          >
            7d
          </button>
        </div>
      </div>

      {loading ? (
        <div className="small-muted">Loading...</div>
      ) : (
        <div style={{ maxHeight: 180, overflow: 'auto' }}>
          {rows.length === 0 && <div className="small-muted">No recent auto-closed alerts.</div>}
          {rows.map(r => (
            <div key={r.alertId} className="row" style={{ justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #eee' }}>
              <div>
                <b>{r.alertId}</b> <span className={`badge ${r.severity}`}>{r.severity}</span>
                <div className="small-muted">{r.sourceType}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div className="small-muted">{new Date(r.timestamp).toLocaleString()}</div>
                <div className="small-muted">{r.lastTransitionReason || 'N/A'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
