import { useEffect, useState, useRef } from 'react';
import { fetchEvents, fetchEventCounts } from '../api/api';

export default function EventsPanel() {
    const [events, setEvents] = useState<any[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const evtRef = useRef<EventSource | null>(null);

    async function load() {
        try {
            const ev = await fetchEvents({ limit: 100 });
            setEvents(ev);
            const c = await fetchEventCounts();
            setCounts(c || {});
        } catch (err) {
            console.error('Failed loading events', err);
        }
    }

    useEffect(() => {
        load();

        if (!evtRef.current) {
            const base = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:5001';
            const token = sessionStorage.getItem('token');
            const url = `${base}/api/events/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
            const es = new EventSource(url);
            evtRef.current = es;
            es.onmessage = (evt) => {
                try {
                    const data = JSON.parse(evt.data);
                    setEvents((prev) => [data, ...prev].slice(0, 200));
                } catch (e) {}
            };
            es.addEventListener('event', (ev: any) => {
                try {
                    const data = JSON.parse(ev.data);
                    setEvents((prev) => [data, ...prev].slice(0, 200));
                } catch (e) { }
            });

            es.onerror = () => {};
        }

        const id = setInterval(async () => {
            try {
                const c = await fetchEventCounts();
                setCounts(c || {});
            } catch (e) {}
        }, 8000);

        return () => {
            clearInterval(id);
            if (evtRef.current) {
                evtRef.current.close();
                evtRef.current = null;
            }
        };
    }, []);

    return (
        <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ margin: 0 }}>Event Log</h3>
            <div style={{ marginTop: 8 }} className="small-muted">
                Counts: {Object.entries(counts).map(([k, v]) => <span key={k} style={{ marginRight: 8 }}><strong>{k}</strong>: {v}</span>)}
            </div>

            <div style={{ marginTop: 8, maxHeight: 280, overflow: 'auto' }}>
                {events.length === 0 ? <div className="small-muted">No events</div> : events.map((e: any) => (
                    <div key={e.alertId + '-' + e.ts} className="alert-row" style={{ justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>{e.alertId}</div>
                            <div className="small-muted">{e.type} • {new Date(e.ts).toLocaleString()}</div>
                            {e.payload && <div style={{ fontSize: 13, marginTop: 6 }}><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(e.payload, null, 2)}</pre></div>}
                        </div>
                        <div style={{ minWidth: 90, textAlign: 'right' }} />
                    </div>
                ))}
            </div>
        </div>
    );
}
