import { EventEmitter } from "events";

export type OutgoingEvent = {
  alertId: string;
  type: "CREATED" | "ESCALATED" | "AUTO_CLOSED" | "RESOLVED" | "INFO";
  ts: string;
  payload?: Record<string, any>;
};

const emitter = new EventEmitter();

export function emitEvent(e: OutgoingEvent) {
  emitter.emit("event", e);
}

export function getEmitter() {
  return emitter;
}
