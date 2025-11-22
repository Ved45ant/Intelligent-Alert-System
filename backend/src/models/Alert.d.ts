import { Document } from "mongoose";
export type AlertStatus = "OPEN" | "ESCALATED" | "AUTO-CLOSED" | "RESOLVED";
export interface IAlert extends Document {
    alertId: string;
    sourceType: string;
    severity: "CRITICAL" | "WARNING" | "INFO";
    timestamp: Date;
    status: AlertStatus;
    metadata: Record<string, any>;
    history: Array<{
        state: AlertStatus;
        ts: Date;
        reason?: string;
    }>;
}
export declare const AlertModel: import("mongoose").Model<IAlert, {}, {}, {}, Document<unknown, {}, IAlert, {}, {}> & IAlert & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Alert.d.ts.map