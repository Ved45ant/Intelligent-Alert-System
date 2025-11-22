import { Schema, model, Document } from "mongoose";

export interface IEventLog extends Document {
  alertId: string;
  type: "CREATED" | "ESCALATED" | "AUTO_CLOSED" | "RESOLVED" | "INFO";
  ts: Date;
  payload?: Record<string, any>;
}

const EventLogSchema = new Schema<IEventLog>({
  alertId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  ts: { type: Date, required: true, default: () => new Date() },
  payload: { type: Schema.Types.Mixed },
});

EventLogSchema.index({ alertId: 1, ts: -1 }); // compound index for queries

export const EventLogModel = model<IEventLog>("EventLog", EventLogSchema);
