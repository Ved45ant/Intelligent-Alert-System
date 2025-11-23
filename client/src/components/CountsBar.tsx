import React, { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:4000';

export default function CountsBar() {
    const [counts, setCounts] = useState({ CRITICAL: 0, WARNING: 0, INFO: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCounts();
        const interval = setInterval(fetchCounts, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchCounts = () => {
        const token = sessionStorage.getItem('token');
        if (!token || token === 'null' || token === 'undefined') return;
        fetch(`${BASE}/api/dashboard/counts`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setCounts(data.counts || { CRITICAL: 0, WARNING: 0, INFO: 0 });
                setLoading(false);
            })
            .catch(() => {
                setCounts({ CRITICAL: 0, WARNING: 0, INFO: 0 });
                setLoading(false);
            });
    };

    return (
        <div className="counts">
            <div className="count card">
                <div className="num">{loading ? '…' : counts.CRITICAL}</div>
                <div className="label">CRITICAL</div>
            </div>
            <div className="count card">
                <div className="num">{loading ? '…' : counts.WARNING}</div>
                <div className="label">WARNING</div>
            </div>
            <div className="count card">
                <div className="num">{loading ? '…' : counts.INFO}</div>
                <div className="label">INFO</div>
            </div>
        </div>
    );
}
