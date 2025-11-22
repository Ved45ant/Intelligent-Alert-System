import React from 'react';

export default function AlertList({ alerts, onOpen }: { alerts: any[]; onOpen: (id: string) => void }) {
    if (!alerts || alerts.length === 0) return <div className="small-muted">No alerts</div>;
    return (
        <div>
            {alerts.map((a) => (
                <div key={a.alertId} className="alert-row card" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>{a.alertId}</div>
                            <div className="small-muted">{a.sourceType} • {new Date(a.timestamp).toLocaleString()}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div className={`badge ${a.severity}`}>{a.severity}</div>
                        <button className="btn small" onClick={() => onOpen(a.alertId)}>Open</button>
                    </div>
                </div>
            ))}
        </div>
    );
}
