import React, { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:4000';

export default function AlertModal({ alert, onClose, onResolve }: { alert: any; onClose: () => void; onResolve: (id: string, reason?: string) => void }) {
    const [reason, setReason] = useState('');
    const [fullHistory, setFullHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        if (!token || token === 'null' || token === 'undefined') {
            setLoading(false);
            return;
        }
        fetch(`${BASE}/api/alerts/${alert.alertId}/history`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setFullHistory(data.history || []);
                setLoading(false);
            })
            .catch(() => {
                setFullHistory([]);
                setLoading(false);
            });
    }, [alert.alertId]);

    const handleResolve = () => {
        onResolve(alert.alertId, reason);
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{alert.alertId} <span style={{ marginLeft: 8 }} className={`badge ${alert.severity}`}>{alert.severity}</span></h3>
                    <button className="btn small" onClick={onClose}>Close</button>
                </div>
                <div style={{ marginTop: 8 }}>
                    <div className="small-muted">{alert.sourceType} • {new Date(alert.timestamp).toLocaleString()}</div>
                    <div style={{ marginTop: 10 }}>
                        <strong>Status: </strong>
                        <span className={`badge ${alert.status}`}>{alert.status}</span>
                        {alert.lastTransitionAt && (
                            <div className="small-muted" style={{ marginTop: 4 }}>
                                Last transition: {new Date(alert.lastTransitionAt).toLocaleString()} — {alert.lastTransitionReason}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <strong>Metadata</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(alert.metadata, null, 2)}</pre>
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <strong>Full History (Alert + EventLog)</strong>
                        {loading ? (
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

                    {alert.status !== 'RESOLVED' && alert.status !== 'AUTO-CLOSED' && (
                        <div style={{ marginTop: 10 }}>
                            <strong>Manual Resolve</strong>
                            <div className="form-row">
                                <input className="input" placeholder="reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
                                <button className="btn" onClick={handleResolve}>Resolve</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
