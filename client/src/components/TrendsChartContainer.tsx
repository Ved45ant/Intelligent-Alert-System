import React, { useState, useEffect } from 'react';
import TrendsChart from './TrendsChart';

const BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:4000';

export default function TrendsChartContainer() {
    const [data, setData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrends();
        const interval = setInterval(fetchTrends, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchTrends = () => {
        const token = sessionStorage.getItem('token');
        if (!token || token === 'null' || token === 'undefined') {
            setLoading(false);
            return;
        }
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 7);
        
        const fromStr = from.toISOString();
        const toStr = to.toISOString();

        fetch(`${BASE}/api/dashboard/trends?from=${fromStr}&to=${toStr}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(result => {
                setData(result.trends || {});
                setLoading(false);
            })
            .catch(() => {
                setData({});
                setLoading(false);
            });
    };

    if (loading) return <div className="card"><div className="small-muted">Loading trends...</div></div>;

    return (
        <div className="card">
            <h4>Daily Trends (Last 7 Days)</h4>
            <TrendsChart data={data} height={160} />
        </div>
    );
}
