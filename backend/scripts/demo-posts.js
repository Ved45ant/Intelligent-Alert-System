/**
 * Demo script for posting 3 overspeed alerts for same driver within a window
 * Run: node scripts/demo-posts.js
 *
 * Ensure backend is running on PORT (default 4000)
 */
const http = require('http');

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 4000;

function postAlert(payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const options = {
            hostname: host,
            port,
            path: '/api/alerts',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });

        req.on('error', (err) => reject(err));
        req.write(data);
        req.end();
    });
}

async function run() {
    const baseTs = new Date().toISOString();
    const alerts = [
        { alertId: 'demo-a1', sourceType: 'overspeed', severity: 'WARNING', timestamp: baseTs, metadata: { driverId: 'DR1', speed: 95 } },
        { alertId: 'demo-a2', sourceType: 'overspeed', severity: 'WARNING', timestamp: baseTs, metadata: { driverId: 'DR1', speed: 96 } },
        { alertId: 'demo-a3', sourceType: 'overspeed', severity: 'WARNING', timestamp: baseTs, metadata: { driverId: 'DR1', speed: 98 } }
    ];

    for (const a of alerts) {
        // eslint-disable-next-line no-console
        console.log('posting', a.alertId);
        try {
            const resp = await postAlert(a);
            // eslint-disable-next-line no-console
            console.log('resp', resp.status, resp.body);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('err posting', err);
        }
    }

    // done
    // eslint-disable-next-line no-console
    console.log('demo script finished. Query /api/alerts/demo-a3 to check status.');
}

run();
