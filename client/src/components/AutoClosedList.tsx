import React from 'react';

interface AutoClosedListProps {
  rows: Array<{ alertId: string; sourceType: string; severity: string; timestamp: string; lastReason: string | null }>;
}

export default function AutoClosedList({ rows }: AutoClosedListProps) {
  if (!rows || rows.length === 0) return <div className="small-muted">No recent auto-closed alerts.</div>;
  return (
    <div style={{ maxHeight: 180, overflow: 'auto' }}>
      {rows.map(r => (
        <div key={r.alertId} className="row" style={{ justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #eee' }}>
          <div>
            <b>{r.alertId}</b> <span className={`badge ${r.severity}`}>{r.severity}</span>
            <div className="small-muted">{r.sourceType}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div className="small-muted">{new Date(r.timestamp).toLocaleString()}</div>
            <div className="small-muted">{r.lastReason}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
