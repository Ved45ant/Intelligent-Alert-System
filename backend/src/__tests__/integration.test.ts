import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import { AlertModel } from '../models/Alert.js';
import { EventLogModel } from '../models/EventLog.js';
import alertRoutes from '../routes/alerts.js';
import dashboardRoutes from '../routes/dashboard.js';
import authRoutes from '../routes/auth.js';
import { processPendingAlerts } from '../services/worker.js';
import { loadRules } from '../services/ruleEngine.js';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);

const TEST_RULES = {
  overspeed: { escalate_if_count: 3, window_mins: 60, escalate_to: "CRITICAL" },
  compliance: { auto_close_if: "document_valid" }
};

let authToken = '';

describe('Integration Tests', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/test-alert-system-integration';
    await mongoose.connect(mongoUri);
    
    // Write test rules
    const rulesPath = path.join(process.cwd(), 'rules.json');
    fs.writeFileSync(rulesPath, JSON.stringify(TEST_RULES, null, 2));
    loadRules();

    // Login to get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    if (response.status === 200) {
      authToken = response.body.token;
    } else {
      // If auth fails, use a mock token (adjust based on your auth setup)
      authToken = 'mock-token-for-testing';
    }
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await AlertModel.deleteMany({});
    await EventLogModel.deleteMany({});
  });

  describe('POST /api/alerts/ingest → Overspeed Escalation', () => {
    it('should ingest 3 overspeed events and escalate to CRITICAL', async () => {
      const driverId = 'INT-DRIVER-001';
      const baseTime = Date.now();

      // Ingest 3 overspeed alerts
      const res1 = await request(app)
        .post('/api/alerts/ingest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceType: 'overspeed',
          severity: 'WARNING',
          timestamp: new Date(baseTime - 50 * 60 * 1000).toISOString(),
          metadata: { driverId, speed: 95 }
        });
      expect(res1.status).toBe(201);
      expect(res1.body.alertId).toBeDefined();

      const res2 = await request(app)
        .post('/api/alerts/ingest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceType: 'overspeed',
          severity: 'WARNING',
          timestamp: new Date(baseTime - 25 * 60 * 1000).toISOString(),
          metadata: { driverId, speed: 98 }
        });
      expect(res2.status).toBe(201);

      const res3 = await request(app)
        .post('/api/alerts/ingest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceType: 'overspeed',
          severity: 'WARNING',
          timestamp: new Date(baseTime).toISOString(),
          metadata: { driverId, speed: 100 }
        });
      expect(res3.status).toBe(201);

      // Verify escalation
      const alerts = await AlertModel.find({ 'metadata.driverId': driverId });
      expect(alerts.length).toBe(3);
      alerts.forEach(a => {
        expect(a.status).toBe('ESCALATED');
        expect(a.severity).toBe('CRITICAL');
      });

      // Verify EventLog entries
      const escalatedEvents = await EventLogModel.find({ type: 'ESCALATED' });
      expect(escalatedEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Compliance Alert → PATCH metadata → Auto-Close', () => {
    it('should auto-close when document_renewed is set via metadata update', async () => {
      // Create compliance alert
      const createRes = await request(app)
        .post('/api/alerts/ingest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceType: 'compliance',
          severity: 'WARNING',
          metadata: { driverId: 'INT-DRIVER-002', document_valid: false }
        });
      expect(createRes.status).toBe(201);
      const alertId = createRes.body.alertId;

      // Verify it's OPEN
      let alert = await AlertModel.findOne({ alertId });
      expect(alert?.status).toBe('OPEN');

      // Update metadata to renew document
      const updateRes = await request(app)
        .patch(`/api/alerts/${alertId}/metadata`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ document_renewed: true });
      expect(updateRes.status).toBe(200);

      // Verify auto-close
      alert = await AlertModel.findOne({ alertId });
      expect(alert?.status).toBe('AUTO-CLOSED');
      expect(alert?.lastTransitionReason).toBe('DOCUMENT_RENEWED');

      // Verify EventLog
      const autoClosedEvent = await EventLogModel.findOne({ 
        alertId, 
        type: 'AUTO_CLOSED' 
      });
      expect(autoClosedEvent).toBeDefined();
    });
  });

  describe('Worker Idempotency', () => {
    it('should process expired alert only once even when worker runs twice', async () => {
      // Create alert with expiry in past
      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const alert = await AlertModel.create({
        alertId: 'worker-idem-test',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: pastTime,
        status: 'OPEN',
        metadata: { driverId: 'INT-DRIVER-003' },
        history: [{ state: 'OPEN', ts: pastTime }],
        expiryTimestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        lastTransitionAt: pastTime,
        lastTransitionReason: 'CREATED'
      });

      // Run worker first time
      await processPendingAlerts();

      const afterFirst = await AlertModel.findOne({ alertId: 'worker-idem-test' });
      expect(afterFirst?.status).toBe('AUTO-CLOSED');
      expect(afterFirst?.lastTransitionReason).toBe('TIME_WINDOW_EXPIRED');

      const eventsAfterFirst = await EventLogModel.countDocuments({ 
        alertId: 'worker-idem-test', 
        type: 'AUTO_CLOSED' 
      });
      expect(eventsAfterFirst).toBe(1);

      // Run worker second time (should be idempotent)
      await processPendingAlerts();

      const afterSecond = await AlertModel.findOne({ alertId: 'worker-idem-test' });
      expect(afterSecond?.status).toBe('AUTO-CLOSED');

      const eventsAfterSecond = await EventLogModel.countDocuments({ 
        alertId: 'worker-idem-test', 
        type: 'AUTO_CLOSED' 
      });
      // Should still be 1 event, not duplicated
      expect(eventsAfterSecond).toBe(1);
    });
  });

  describe('Dashboard Endpoints', () => {
    it('GET /api/dashboard/counts should return severity counts', async () => {
      // Create test alerts
      await AlertModel.create([
        { alertId: 'c1', sourceType: 'overspeed', severity: 'CRITICAL', status: 'OPEN', timestamp: new Date(), metadata: {}, history: [] },
        { alertId: 'c2', sourceType: 'overspeed', severity: 'CRITICAL', status: 'ESCALATED', timestamp: new Date(), metadata: {}, history: [] },
        { alertId: 'w1', sourceType: 'feedback_negative', severity: 'WARNING', status: 'OPEN', timestamp: new Date(), metadata: {}, history: [] },
        { alertId: 'i1', sourceType: 'compliance', severity: 'INFO', status: 'OPEN', timestamp: new Date(), metadata: {}, history: [] }
      ]);

      const res = await request(app)
        .get('/api/dashboard/counts')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.counts).toBeDefined();
      expect(res.body.counts.CRITICAL).toBe(2);
      expect(res.body.counts.WARNING).toBe(1);
      expect(res.body.counts.INFO).toBe(1);
    });

    it('GET /api/dashboard/top-drivers should return drivers with most alerts', async () => {
      await AlertModel.create([
        { alertId: 'td1', sourceType: 'overspeed', severity: 'WARNING', status: 'OPEN', timestamp: new Date(), metadata: { driverId: 'D1' }, history: [] },
        { alertId: 'td2', sourceType: 'overspeed', severity: 'WARNING', status: 'OPEN', timestamp: new Date(), metadata: { driverId: 'D1' }, history: [] },
        { alertId: 'td3', sourceType: 'overspeed', severity: 'WARNING', status: 'OPEN', timestamp: new Date(), metadata: { driverId: 'D2' }, history: [] }
      ]);

      const res = await request(app)
        .get('/api/dashboard/top-drivers?limit=5')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.drivers).toBeDefined();
      expect(res.body.drivers.length).toBeGreaterThan(0);
      expect(res.body.drivers[0].driverId).toBe('D1');
      expect(res.body.drivers[0].count).toBe(2);
    });

    it('GET /api/dashboard/auto-closed should return recently auto-closed alerts', async () => {
      const recent = new Date();
      await AlertModel.create({
        alertId: 'ac1',
        sourceType: 'compliance',
        severity: 'WARNING',
        status: 'AUTO-CLOSED',
        timestamp: recent,
        metadata: { driverId: 'D3' },
        history: [{ state: 'OPEN', ts: recent }, { state: 'AUTO-CLOSED', ts: recent }],
        lastTransitionAt: recent,
        lastTransitionReason: 'DOCUMENT_RENEWED'
      });

      const res = await request(app)
        .get('/api/dashboard/auto-closed?filter=24h')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.alerts).toBeDefined();
      expect(res.body.alerts.length).toBeGreaterThan(0);
      expect(res.body.alerts[0].alertId).toBe('ac1');
    });
  });

  describe('Manual Resolve', () => {
    it('POST /api/alerts/:id/resolve should manually resolve alert', async () => {
      const alert = await AlertModel.create({
        alertId: 'resolve-test',
        sourceType: 'overspeed',
        severity: 'WARNING',
        status: 'ESCALATED',
        timestamp: new Date(),
        metadata: { driverId: 'D4' },
        history: [{ state: 'OPEN', ts: new Date() }],
        lastTransitionAt: new Date(),
        lastTransitionReason: 'ESCALATED'
      });

      const res = await request(app)
        .post('/api/alerts/resolve-test/resolve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Manual intervention' });
      
      expect(res.status).toBe(200);

      const resolved = await AlertModel.findOne({ alertId: 'resolve-test' });
      expect(resolved?.status).toBe('RESOLVED');
      expect(resolved?.lastTransitionReason).toBe('Manual intervention');

      const event = await EventLogModel.findOne({ 
        alertId: 'resolve-test', 
        type: 'RESOLVED' 
      });
      expect(event).toBeDefined();
    });
  });
});
