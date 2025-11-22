import { Schema, model, Document } from "mongoose";

export type AlertStatus = "OPEN" | "ESCALATED" | "AUTO-CLOSED" | "RESOLVED";

export interface IAlert extends Document {
  alertId: string;
  sourceType: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  timestamp: Date;
  status: AlertStatus;
  metadata: Record<string, any>;
  history: Array<{ state: AlertStatus; ts: Date; reason?: string }>;
}

const AlertSchema = new Schema<IAlert>({
  alertId: { type: String, required: true, index: true, unique: true },
  sourceType: { type: String, required: true, index: true },
  severity: { type: String, required: true },
  timestamp: { type: Date, required: true, index: true },
  status: { type: String, required: true, default: "OPEN" },
  metadata: { type: Schema.Types.Mixed, default: {} },
  history: [{ state: String, ts: Date, reason: String }],
});

// Additional indexes
AlertSchema.index({ status: 1, timestamp: -1 }); // for worker queries
AlertSchema.index({ "metadata.driverId": 1, sourceType: 1, timestamp: -1 }); // for rule evaluation

// static-like helper (attached after model creation in services)
// but we export the model for service use:
export const AlertModel = model<IAlert>("Alert", AlertSchema);
