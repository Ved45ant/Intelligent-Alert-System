export type AlertStatus = "OPEN" | "ESCALATED" | "AUTO-CLOSED" | "RESOLVED";

export interface CreateAlertDto {
  alertId: string;
  sourceType: string;
  severity?: "CRITICAL" | "WARNING" | "INFO";
  timestamp?: string | Date;
  metadata?: Record<string, any>;
}

export interface EvaluationResult {
  action: "NONE" | "ESCALATE" | "AUTO_CLOSE";
  reason?: string;
  details?: any;
}
