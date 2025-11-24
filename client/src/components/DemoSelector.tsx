import { useEffect, useState } from "react";
import { createTestAlert } from "../api/api";

type DemoOption = {
    id: string;
    name: string;
    description?: string;
    payload: Record<string, any>;
};

const DEMOS: DemoOption[] = [
    // Overspeed demos - 4 severity levels
    {
        id: "overspeed-low",
        name: "Overspeed Low (75 km/h) — DRV1001",
        description: "Low speed violation: 70-90 km/h → INFO",
        payload: {
            alertId: "demo-os-low",
            sourceType: "overspeed",
            severity: "INFO",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV1001",
                speed: 75,
                vehicleId: "VH-101",
                location: "12.91, 77.60"
            },
        },
    },
    {
        id: "overspeed-moderate",
        name: "Overspeed Moderate (95 km/h) — DRV1002",
        description: "Moderate overspeed: 90-110 km/h → WARNING",
        payload: {
            alertId: "demo-os-mod",
            sourceType: "overspeed",
            severity: "WARNING",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV1002",
                speed: 95,
                vehicleId: "VH-102",
                location: "12.92, 77.61"
            },
        },
    },
    {
        id: "overspeed-high",
        name: "Overspeed High (115 km/h) — DRV1003",
        description: "High overspeed: 110-130 km/h → CRITICAL",
        payload: {
            alertId: "demo-os-high",
            sourceType: "overspeed",
            severity: "CRITICAL",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV1003",
                speed: 115,
                vehicleId: "VH-103",
                location: "12.93, 77.62"
            },
        },
    },
    {
        id: "overspeed-extreme",
        name: "Overspeed Extreme (140 km/h) — DRV1004",
        description: "Extreme overspeed: 130+ km/h → CRITICAL",
        payload: {
            alertId: "demo-os-ext",
            sourceType: "overspeed",
            severity: "CRITICAL",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV1004",
                speed: 140,
                vehicleId: "VH-104",
                location: "12.94, 77.63"
            },
        },
    },
    // Harsh braking demos - 3 severity levels
    {
        id: "harsh-brake-light",
        name: "Harsh Brake Light (-4G) — DRV2001",
        description: "Light harsh braking: -3G to -5G → INFO",
        payload: {
            alertId: "demo-hb-light",
            sourceType: "harsh_brake",
            severity: "INFO",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV2001",
                accelForce: -4.0,
                vehicleId: "VH-201",
                location: "12.95, 77.64"
            },
        },
    },
    {
        id: "harsh-brake-moderate",
        name: "Harsh Brake Moderate (-6G) — DRV2002",
        description: "Moderate harsh braking: -5G to -7G → WARNING",
        payload: {
            alertId: "demo-hb-mod",
            sourceType: "harsh_brake",
            severity: "WARNING",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV2002",
                accelForce: -6.0,
                vehicleId: "VH-202",
                location: "12.96, 77.65"
            },
        },
    },
    {
        id: "harsh-brake-severe",
        name: "Harsh Brake Severe (-8G) — DRV2003",
        description: "Severe harsh braking: -7G+ → CRITICAL",
        payload: {
            alertId: "demo-hb-sev",
            sourceType: "harsh_brake",
            severity: "CRITICAL",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV2003",
                accelForce: -8.0,
                vehicleId: "VH-203",
                location: "12.97, 77.66"
            },
        },
    },
    // Passenger feedback demos - 2 levels
    {
        id: "feedback-poor",
        name: "Feedback Poor (2 stars) — DRV3001",
        description: "Poor passenger feedback: 2 stars → INFO",
        payload: {
            alertId: "demo-fb-poor",
            sourceType: "feedback_negative",
            severity: "INFO",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV3001",
                passengerRating: 2,
                comments: "Driver was late",
                vehicleId: "VH-301"
            },
        },
    },
    {
        id: "feedback-bad",
        name: "Feedback Bad (1 star) — DRV3002",
        description: "Bad passenger feedback: 1 star → WARNING",
        payload: {
            alertId: "demo-fb-bad",
            sourceType: "feedback_negative",
            severity: "WARNING",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV3002",
                passengerRating: 1,
                comments: "Driver was rude and unsafe",
                vehicleId: "VH-302"
            },
        },
    },
    // Compliance demos - 2 levels
    {
        id: "compliance-expiring",
        name: "Compliance Expiring (20 days) — DRV4001",
        description: "Document expiring soon: ≤30 days → WARNING",
        payload: {
            alertId: "demo-comp-exp",
            sourceType: "compliance",
            severity: "WARNING",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV4001",
                docType: "License",
                daysUntilExpiry: 20,
                document_valid: true,
                vehicleId: "VH-401"
            },
        },
    },
    {
        id: "compliance-invalid",
        name: "Compliance Invalid — DRV4002",
        description: "Invalid/expired document → CRITICAL",
        payload: {
            alertId: "demo-comp-inv",
            sourceType: "compliance",
            severity: "CRITICAL",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV4002",
                docType: "License",
                document_valid: false,
                expiry: "2024-01-15",
                vehicleId: "VH-402"
            },
        },
    },
    // Idling demos - 2 levels
    {
        id: "idling-moderate",
        name: "Idling Moderate (15 min) — DRV5001",
        description: "Moderate idling: 10-20 min → INFO",
        payload: {
            alertId: "demo-idle-mod",
            sourceType: "idling",
            severity: "INFO",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV5001",
                idleDurationMins: 15,
                vehicleId: "VH-501",
                location: "11.02, 76.92"
            },
        },
    },
    {
        id: "idling-excessive",
        name: "Idling Excessive (25 min) — DRV5002",
        description: "Excessive idling: 20+ min → WARNING",
        payload: {
            alertId: "demo-idle-exc",
            sourceType: "idling",
            severity: "WARNING",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV5002",
                idleDurationMins: 25,
                vehicleId: "VH-502",
                location: "11.03, 76.93"
            },
        },
    },
    // Late arrival demo
    {
        id: "late-arrival",
        name: "Late Arrival (20 min) — DRV6001",
        description: "Late pickup/dropoff: 15+ min → WARNING",
        payload: {
            alertId: "demo-late",
            sourceType: "late_arrival",
            severity: "WARNING",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV6001",
                delayMins: 20,
                scheduledTime: "08:00",
                actualTime: "08:20",
                vehicleId: "VH-601",
                location: "12.98, 77.67"
            },
        },
    },
    // Route deviation demo
    {
        id: "route-deviation",
        name: "Route Deviation (3 km) — DRV7001",
        description: "Unauthorized route deviation: 2+ km → WARNING",
        payload: {
            alertId: "demo-route",
            sourceType: "route_deviation",
            severity: "WARNING",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV7001",
                deviationKm: 3,
                assignedRoute: "Route A",
                currentLocation: "12.99, 77.68",
                vehicleId: "VH-701"
            },
        },
    },
    // Seatbelt violation demo
    {
        id: "seatbelt-violation",
        name: "Seatbelt Not Worn — DRV8001",
        description: "Seatbelt violation → CRITICAL",
        payload: {
            alertId: "demo-seatbelt",
            sourceType: "seatbelt_violation",
            severity: "CRITICAL",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV8001",
                seatbeltStatus: "not_worn",
                vehicleId: "VH-801",
                location: "13.00, 77.69"
            },
        },
    },
    // Phone usage demo
    {
        id: "phone-usage",
        name: "Phone Usage (10 sec) — DRV9001",
        description: "Mobile phone usage while driving: 5+ sec → CRITICAL",
        payload: {
            alertId: "demo-phone",
            sourceType: "phone_usage",
            severity: "CRITICAL",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV9001",
                usageDurationSec: 10,
                phoneType: "handheld",
                vehicleId: "VH-901",
                location: "13.01, 77.70"
            },
        },
    },
    // Fatigue demos - 2 levels
    {
        id: "fatigue-warning",
        name: "Fatigue Warning (Level 3) — DRV10001",
        description: "Driver fatigue detected: level 3+ → WARNING",
        payload: {
            alertId: "demo-fatigue-warn",
            sourceType: "fatigue",
            severity: "WARNING",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV10001",
                fatigueLevel: 3,
                drivingHours: 8,
                vehicleId: "VH-1001",
                location: "13.02, 77.71"
            },
        },
    },
    {
        id: "fatigue-critical",
        name: "Fatigue Critical (Level 5) — DRV10002",
        description: "Severe driver fatigue: level 5+ → CRITICAL",
        payload: {
            alertId: "demo-fatigue-crit",
            sourceType: "fatigue",
            severity: "CRITICAL",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV10002",
                fatigueLevel: 5,
                drivingHours: 12,
                vehicleId: "VH-1002",
                location: "13.03, 77.72"
            },
        },
    },
    // Accident demo
    {
        id: "accident",
        name: "Accident Major — DRV11001",
        description: "Major accident reported → CRITICAL",
        payload: {
            alertId: "demo-accident",
            sourceType: "accident",
            severity: "CRITICAL",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV11001",
                severity: "major",
                injuries: true,
                vehicleId: "VH-1101",
                location: "13.04, 77.73"
            },
        },
    },
    // Maintenance demo
    {
        id: "maintenance",
        name: "Maintenance Overdue (10 days) — VH-1201",
        description: "Vehicle maintenance overdue: 7+ days → WARNING",
        payload: {
            alertId: "demo-maint",
            sourceType: "maintenance",
            severity: "WARNING",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV12001",
                daysOverdue: 10,
                maintenanceType: "Oil Change",
                vehicleId: "VH-1201",
                lastService: "2025-10-01"
            },
        },
    },
];

function generateUniqueAlertId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const STORAGE_TYPE = "ias:lastDemoType";

function pretty(obj: unknown) {
    try {
        return JSON.stringify(obj, null, 2).replace(/\r\n/g, "\n");
    } catch {
        return "{}";
    }
}

export default function DemoSelector({ onCreated }: { onCreated?: () => void }) {
    const [selectedType, setSelectedType] = useState<string>(DEMOS[0].id);
    const [count, setCount] = useState<number>(1);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<boolean>(false);
    const [payloadText, setPayloadText] = useState<string>(() => pretty(DEMOS[0].payload));
    const [customAppliedPayload, setCustomAppliedPayload] = useState<Record<string, any> | null>(null);

    useEffect(() => {
        try {
            const storedType = localStorage.getItem(STORAGE_TYPE);
            if (storedType && DEMOS.some((d) => d.id === storedType)) setSelectedType(storedType);
        } catch (err) {}
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_TYPE, selectedType);
        } catch (err) {}
    }, [selectedType]);

    const selected = DEMOS.find((d) => d.id === selectedType) || DEMOS[0];

    function buildPayload() {
        return JSON.parse(JSON.stringify(selected.payload || {}));
    }

    useEffect(() => {
        if (editing) return;
        if (customAppliedPayload) {
            setPayloadText(pretty(customAppliedPayload));
            return;
        }
        setPayloadText(pretty(buildPayload()));
    }, [selectedType, editing, customAppliedPayload]);

    const previewPayload = customAppliedPayload ?? buildPayload();

    async function handleCreateDemoOnce() {
        setBusy(true);
        try {
            const payloadSource = customAppliedPayload ?? (editing ? JSON.parse(payloadText) : buildPayload());
            const payload = JSON.parse(JSON.stringify(payloadSource));
            // Generate unique alertId
            if (payload.alertId && !payload.alertId.includes('-' + Date.now())) {
                payload.alertId = generateUniqueAlertId(payload.alertId);
            }
            payload.timestamp = new Date().toISOString();
            await createTestAlert(payload);
            if (onCreated) onCreated();
        } catch (err) {
            console.error("Failed to create demo alert", err);
            alert("Failed to create demo alert");
        } finally {
            setBusy(false);
        }
    }

    async function handleCreateMultiple() {
        setBusy(true);
        try {
            for (let i = 0; i < Math.max(1, Math.floor(count)); i++) {
                const payloadSource = customAppliedPayload ?? (editing ? JSON.parse(payloadText) : buildPayload());
                const payload = JSON.parse(JSON.stringify(payloadSource));
                // Generate unique alertId for each iteration
                if (payload.alertId) {
                    const basePrefix = payload.alertId.split('-')[0] + '-' + payload.alertId.split('-')[1];
                    payload.alertId = generateUniqueAlertId(basePrefix);
                }
                payload.timestamp = new Date().toISOString();
                // Add small delay to ensure unique timestamps
                await new Promise(resolve => setTimeout(resolve, 10));
                await createTestAlert(payload);
            }
            if (onCreated) onCreated();
        } catch (err) {
            console.error("Failed creating multiple demo alerts", err);
            alert("Failed creating demo alerts");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="demo-selector" style={{ width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Choose demo:</span>
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    disabled={busy}
                    className="demo-select"
                    style={{ minWidth: 300 }}
                >
                    {DEMOS.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name}
                        </option>
                    ))}
                </select>
                <span style={{ fontSize: 13, color: "#666" }}>
                    {selected.payload?.metadata?.driverId ? `• driver: ${selected.payload.metadata.driverId}` : ""}
                </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={editing} onChange={(e) => setEditing(e.target.checked)} />
                    <span style={{ fontWeight: 600 }}>Edit payload</span>
                </label>
                <span style={{ fontSize: 13, color: "#444" }}>{customAppliedPayload ? (previewPayload.sourceType ?? "Custom") : selected.name}</span>
            </div>

            <div
                style={{
                    padding: 10,
                    borderRadius: 6,
                    background: "#fff",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.03)",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 240,
                    position: "relative",
                }}
            >
                <div style={{ flex: 1, position: "relative", minHeight: 160 }}>
                    <textarea
                        value={payloadText}
                        onChange={(e) => setPayloadText(e.target.value)}
                        aria-label="Edit payload JSON"
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: "100%",
                            height: "100%",
                            fontFamily: "monospace",
                            fontSize: 13,
                            boxSizing: "border-box",
                            overflow: "auto",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            padding: 8,
                            resize: "none",
                            display: editing ? "block" : "none",
                        }}
                    />
                    <pre
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: "100%",
                            height: "100%",
                            textAlign: "left",
                            overflow: "auto",
                            margin: 0,
                            boxSizing: "border-box",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            padding: 8,
                            fontFamily: "monospace",
                            fontSize: 13,
                            display: editing ? "none" : "block",
                        }}
                    >
                        {JSON.stringify(customAppliedPayload ?? buildPayload(), null, 2)}
                    </pre>
                </div>

                <div style={{ paddingTop: 8, borderTop: "1px solid #eee", display: "flex", gap: 8, marginTop: "auto" }}>
                    <button
                        className="btn small"
                        onClick={() => {
                            setCustomAppliedPayload(null);
                            setPayloadText(pretty(buildPayload()));
                            setEditing(false);
                        }}
                    >
                        Reset
                    </button>
                    <button
                        className="btn small"
                        onClick={() => {
                            try {
                                const parsed = JSON.parse(payloadText.replace(/\r\n/g, "\n"));
                                setCustomAppliedPayload(parsed);
                                setPayloadText(pretty(parsed));
                                setEditing(false);
                            } catch (err) {
                                alert("Invalid JSON: " + err);
                            }
                        }}
                    >
                        Apply JSON
                    </button>
                </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn primary" onClick={handleCreateDemoOnce} disabled={busy} style={{ minWidth: 140 }}>
                    Post demo alert
                </button>

                <input
                    type="number"
                    min={1}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="demo-count"
                    disabled={busy}
                    style={{ width: 80 }}
                />
                <button className="btn small" onClick={handleCreateMultiple} disabled={busy}>
                    Post {count} times
                </button>
            </div>
        </div>
    );
}