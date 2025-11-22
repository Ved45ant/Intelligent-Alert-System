// backend/src/services/eventEmitter.ts
import { EventEmitter } from "events";

export type OutgoingEvent = {
  alertId: string;
  type: "CREATED" | "ESCALATED" | "AUTO_CLOSED" | "RESOLVED" | "INFO";
  ts: string; // ISO
  payload?: Record<string, any>;
};

const emitter = new EventEmitter();

/**
 * Emit an event to in-process listeners (SSE, tests, etc.)
 */
export function emitEvent(e: OutgoingEvent) {
  // emit with a stable channel name
  emitter.emit("event", e);
}

/** Consumer access */
export function getEmitter() {
  return emitter;
}
