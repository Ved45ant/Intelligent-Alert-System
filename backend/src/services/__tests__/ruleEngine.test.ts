import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { AlertModel } from '../../models/Alert.js';
import { EventLogModel } from '../../models/EventLog.js';
import { loadRules, evaluateOnCreate, evaluateAlert } from '../ruleEngine.js';
import { createAlert } from '../alertService.js';
import fs from 'fs';
import path from 'path';

const TEST_RULES = {
  overspeed: { escalate_if_count: 3, window_mins: 60, escalate_to: "CRITICAL" },
  feedback_negative: { escalate_if_count: 2, window_mins: 1440, escalate_to: "CRITICAL" },
  compliance: { auto_close_if: "document_valid" }
};

describe('Rule Engine', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/test-alert-system';
    await mongoose.connect(mongoUri);
    
    const rulesPath = path.join(process.cwd(), 'rules.json');
    fs.writeFileSync(rulesPath, JSON.stringify(TEST_RULES, null, 2));
    loadRules();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await AlertModel.deleteMany({});
    await EventLogModel.deleteMany({});
  });

  describe('Overspeed Escalation (3 in 60 minutes)', () => {
    it('should escalate after 3 overspeed events within 60 minutes', async () => {
      const driverId = 'TEST-DRIVER-001';
      const baseTime = new Date();

      const alert1 = await createAlert({
        alertId: 'overspeed-1',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: new Date(baseTime.getTime() - 50 * 60 * 1000), // 50 mins ago
        metadata: { driverId, speed: 95 }
      });

      const alert2 = await createAlert({
        alertId: 'overspeed-2',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: new Date(baseTime.getTime() - 25 * 60 * 1000), // 25 mins ago
        metadata: { driverId, speed: 98 }
      });

      const alert3 = await createAlert({
        alertId: 'overspeed-3',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: baseTime,
        metadata: { driverId, speed: 100 }
      });

      // Verify all alerts are now ESCALATED
      const escalated = await AlertModel.find({ alertId: { $in: ['overspeed-1', 'overspeed-2', 'overspeed-3'] } });
      expect(escalated.length).toBe(3);
      escalated.forEach(a => {
        expect(a.status).toBe('ESCALATED');
        expect(a.severity).toBe('CRITICAL');
        expect(a.lastTransitionReason).toContain('RULE_COUNT_3');
      });

      // Verify EventLog entries
      const events = await EventLogModel.find({ type: 'ESCALATED' });
      expect(events.length).toBeGreaterThan(0);
    });

    it('should NOT escalate if only 2 events within window', async () => {
      const driverId = 'TEST-DRIVER-002';
      const baseTime = new Date();

      await createAlert({
        alertId: 'overspeed-A',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: new Date(baseTime.getTime() - 30 * 60 * 1000),
        metadata: { driverId, speed: 95 }
      });

      await createAlert({
        alertId: 'overspeed-B',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: baseTime,
        metadata: { driverId, speed: 98 }
      });

      const alerts = await AlertModel.find({ alertId: { $in: ['overspeed-A', 'overspeed-B'] } });
      alerts.forEach(a => {
        expect(a.status).toBe('OPEN');
      });
    });

    it('should NOT escalate if 3 events but outside 60min window', async () => {
      const driverId = 'TEST-DRIVER-003';
      const baseTime = new Date();

      await createAlert({
        alertId: 'overspeed-X',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: new Date(baseTime.getTime() - 70 * 60 * 1000), // 70 mins ago
        metadata: { driverId, speed: 95 }
      });

      await createAlert({
        alertId: 'overspeed-Y',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: new Date(baseTime.getTime() - 30 * 60 * 1000),
        metadata: { driverId, speed: 98 }
      });

      await createAlert({
        alertId: 'overspeed-Z',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: baseTime,
        metadata: { driverId, speed: 100 }
      });

      // overspeed-Y and overspeed-Z should be OPEN (only 2 in window)
      const alertY = await AlertModel.findOne({ alertId: 'overspeed-Y' });
      const alertZ = await AlertModel.findOne({ alertId: 'overspeed-Z' });
      expect(alertY?.status).toBe('OPEN');
      expect(alertZ?.status).toBe('OPEN');
    });
  });

  describe('Feedback Negative Escalation (2 in 1440 minutes / 24 hours)', () => {
    it('should escalate after 2 feedback_negative events within 24 hours', async () => {
      const driverId = 'TEST-DRIVER-004';
      const baseTime = new Date();

      await createAlert({
        alertId: 'feedback-1',
        sourceType: 'feedback_negative',
        severity: 'WARNING',
        timestamp: new Date(baseTime.getTime() - 10 * 60 * 60 * 1000), // 10 hours ago
        metadata: { driverId, rating: 1 }
      });

      await createAlert({
        alertId: 'feedback-2',
        sourceType: 'feedback_negative',
        severity: 'WARNING',
        timestamp: baseTime,
        metadata: { driverId, rating: 2 }
      });

      const escalated = await AlertModel.find({ alertId: { $in: ['feedback-1', 'feedback-2'] } });
      expect(escalated.length).toBe(2);
      escalated.forEach(a => {
        expect(a.status).toBe('ESCALATED');
        expect(a.severity).toBe('CRITICAL');
        expect(a.lastTransitionReason).toContain('RULE_COUNT_2');
      });
    });
  });

  describe('Compliance Auto-Close', () => {
    it('should auto-close when document_valid is set to true', async () => {
      const alert = await createAlert({
        alertId: 'compliance-1',
        sourceType: 'compliance',
        severity: 'WARNING',
        timestamp: new Date(),
        metadata: { driverId: 'TEST-DRIVER-005', document_valid: false }
      });

      expect(alert.status).toBe('OPEN');

      // Update metadata to simulate document renewal
      alert.metadata.document_valid = true;
      await alert.save();

      // Re-evaluate
      await evaluateAlert(alert);

      const updated = await AlertModel.findOne({ alertId: 'compliance-1' });
      expect(updated?.status).toBe('AUTO-CLOSED');
      expect(updated?.lastTransitionReason).toBe('DOCUMENT_RENEWED');
    });

    it('should auto-close when document_renewed is set to true', async () => {
      const alert = await createAlert({
        alertId: 'compliance-2',
        sourceType: 'compliance',
        severity: 'WARNING',
        timestamp: new Date(),
        metadata: { driverId: 'TEST-DRIVER-006' }
      });

      expect(alert.status).toBe('OPEN');

      alert.metadata.document_renewed = true;
      await alert.save();

      await evaluateAlert(alert);

      const updated = await AlertModel.findOne({ alertId: 'compliance-2' });
      expect(updated?.status).toBe('AUTO-CLOSED');
      expect(updated?.lastTransitionReason).toBe('DOCUMENT_RENEWED');
    });
  });

  describe('Idempotency', () => {
    it('should not re-escalate already ESCALATED alert', async () => {
      const driverId = 'TEST-DRIVER-007';
      const baseTime = new Date();

      // Create 3 events to trigger escalation
      await createAlert({
        alertId: 'idem-1',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: new Date(baseTime.getTime() - 30 * 60 * 1000),
        metadata: { driverId, speed: 95 }
      });

      await createAlert({
        alertId: 'idem-2',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: new Date(baseTime.getTime() - 15 * 60 * 1000),
        metadata: { driverId, speed: 98 }
      });

      await createAlert({
        alertId: 'idem-3',
        sourceType: 'overspeed',
        severity: 'WARNING',
        timestamp: baseTime,
        metadata: { driverId, speed: 100 }
      });

      // All should be escalated
      const beforeCount = await EventLogModel.countDocuments({ type: 'ESCALATED' });

      // Try to re-evaluate alert (should be idempotent)
      const alert1 = await AlertModel.findOne({ alertId: 'idem-1' });
      if (alert1) {
        await evaluateAlert(alert1);
      }

      // Should not create additional ESCALATED events
      const afterCount = await EventLogModel.countDocuments({ type: 'ESCALATED' });
      expect(afterCount).toBe(beforeCount);
    });

    it('should not re-auto-close already AUTO-CLOSED alert', async () => {
      const alert = await createAlert({
        alertId: 'idem-compliance',
        sourceType: 'compliance',
        severity: 'WARNING',
        timestamp: new Date(),
        metadata: { driverId: 'TEST-DRIVER-008', document_valid: true }
      });

      // Should auto-close on creation
      const first = await AlertModel.findOne({ alertId: 'idem-compliance' });
      expect(first?.status).toBe('AUTO-CLOSED');

      const eventCountBefore = await EventLogModel.countDocuments({ 
        alertId: 'idem-compliance', 
        type: 'AUTO_CLOSED' 
      });

      // Try to re-evaluate
      if (first) {
        await evaluateAlert(first);
      }

      const eventCountAfter = await EventLogModel.countDocuments({ 
        alertId: 'idem-compliance', 
        type: 'AUTO_CLOSED' 
      });

      // Should not create duplicate AUTO_CLOSED event
      expect(eventCountAfter).toBe(eventCountBefore);
    });
  });
});
