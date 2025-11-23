import { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:4000';

export default function TopDrivers() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTopDrivers();
        const interval = setInterval(fetchTopDrivers, 15000); // refresh every 15s
        return () => clearInterval(interval);
    }, []);

    const fetchTopDrivers = () => {
        const token = sessionStorage.getItem('token');
        if (!token || token === 'null' || token === 'undefined') return;
        fetch(`${BASE}/api/dashboard/top-drivers?limit=5`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setDrivers(data.drivers || []);
                setLoading(false);
            })
            .catch(() => {
                setDrivers([]);
                setLoading(false);
            });
    };

    return (
        <div className="card">
            <h4>Top Drivers by Open Alerts</h4>
            {loading ? (
                <div className="small-muted">Loading...</div>
            ) : (
                <div>
                    {drivers.length === 0 && <div className="small-muted">No data</div>}
                    {drivers.map((d, i) => (
                        <div key={i} className="row" style={{ justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #eee' }}>
                            <div>
                                <strong>{d.driverId || 'Unknown'}</strong>
                            </div>
                            <div className="badge">{d.count} alerts</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
