import { z } from "zod";

export const createAlertSchema = z.object({
  alertId: z.string(),
  sourceType: z.string(),
  severity: z.enum(["CRITICAL", "WARNING", "INFO"]).optional(),
  timestamp: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export function validateCreateAlert(body: any) {
  return createAlertSchema.parse(body);
}

export function validateLogin(body: any) {
  return loginSchema.parse(body);
}
