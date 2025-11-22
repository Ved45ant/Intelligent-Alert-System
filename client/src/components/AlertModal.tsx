import React, { useState } from 'react';

export default function AlertModal({ alert, onClose, onResolve }: { alert: any; onClose: () => void; onResolve: (id: string, reason?: string) => void }) {
    const [reason, setReason] = useState('');

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{alert.alertId} <span style={{ marginLeft: 8 }} className={`badge ${alert.severity}`}>{alert.severity}</span></h3>
                    <button className="btn small" onClick={onClose}>Close</button>
                </div>
                <div style={{ marginTop: 8 }}>
                    <div className="small-muted">{alert.sourceType} • {new Date(alert.timestamp).toLocaleString()}</div>
                    <div style={{ marginTop: 10 }}>
                        <strong>Metadata</strong>
                        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(alert.metadata, null, 2)}</pre>
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <strong>History</strong>
                        {alert.history?.map((h: any, i: number) => (
                            <div key={i} className="row" style={{ justifyContent: 'space-between', padding: 6 }}>
                                <div>{h.state}</div>
                                <div className="small-muted">{new Date(h.ts).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <strong>Resolve</strong>
                        <div className="form-row">
                            <input className="input" placeholder="reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
                            <button className="btn" onClick={() => onResolve(alert.alertId, reason)}>Resolve</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
