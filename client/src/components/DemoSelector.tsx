import { useEffect, useState } from "react";
import { createTestAlert } from "../api/api";

type DemoOption = {
    id: string;
    name: string;
    description?: string;
    payload: Record<string, any>;
};

const DEMOS: DemoOption[] = [
    {
        id: "overspeed",
        name: "Overspeed — DRV1001",
        description: "Overspeed event for driver DRV1001 (speed, vehicleId)",
        payload: {
            alertId: `demo-os-${Date.now()}`,
            sourceType: "overspeed",
            severity: "WARNING",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV1001",
                speed: 102,
                vehicleId: "VH-21",
            },
        },
    },
    {
        id: "feedback_negative",
        name: "Negative Feedback — DRV2002",
        description: "Passenger negative feedback with rating and comments",
        payload: {
            alertId: `demo-fb-${Date.now()}`,
            sourceType: "feedback_negative",
            severity: "INFO",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV2002",
                passengerRating: 1,
                comments: "Driver was rude",
            },
        },
    },
    {
        id: "compliance",
        name: "Compliance — DRV3003",
        description: "Compliance/document check event (docType, expiry)",
        payload: {
            alertId: `demo-comp-${Date.now()}`,
            sourceType: "compliance",
            severity: "INFO",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV3003",
                document_valid: true,
                docType: "License",
                expiry: "2030-12-31",
            },
        },
    },
    {
        id: "harsh_brake",
        name: "Harsh Brake — DRV4004",
        description: "Harsh braking event with accel force and location",
        payload: {
            alertId: `demo-hb-${Date.now()}`,
            sourceType: "harsh_brake",
            severity: "WARNING",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV4004",
                accelForce: -6.2,
                location: "12.91, 77.60",
            },
        },
    },
    {
        id: "idling",
        name: "Idling — DRV5005",
        description: "Idling event with duration and location",
        payload: {
            alertId: `demo-idle-${Date.now()}`,
            sourceType: "idling",
            severity: "INFO",
            timestamp: new Date().toISOString(),
            metadata: {
                driverId: "DRV5005",
                idleDurationMins: 18,
                location: "11.02, 76.92",
            },
        },
    },
];

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
        } catch (err) {
            // ignore storage errors
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_TYPE, selectedType);
        } catch (err) {
            // ignore
        }
    }, [selectedType]);

    const selected = DEMOS.find((d) => d.id === selectedType) || DEMOS[0];

    // Deep clone the demo payload so we don't accidentally mutate DEMOS
    function buildPayload() {
        return JSON.parse(JSON.stringify(selected.payload || {}));
    }

    // Synchronize payloadText when not editing and when custom payload changes
    useEffect(() => {
        if (editing) return;
        if (customAppliedPayload) {
            setPayloadText(pretty(customAppliedPayload));
            return;
        }
        setPayloadText(pretty(buildPayload()));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedType, editing, customAppliedPayload]);

    const previewPayload = customAppliedPayload ?? buildPayload();

    async function handleCreateDemoOnce() {
        setBusy(true);
        try {
            const payloadSource = customAppliedPayload ?? (editing ? JSON.parse(payloadText) : buildPayload());
            const payload = JSON.parse(JSON.stringify(payloadSource)); // clone
            await createTestAlert(payload);
            if (onCreated) onCreated();
        } catch (err) {
            // eslint-disable-next-line no-console
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
                const payload = JSON.parse(JSON.stringify(payloadSource)); // clone per iteration
                // eslint-disable-next-line no-await-in-loop
                await createTestAlert(payload);
            }
            if (onCreated) onCreated();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Failed creating multiple demo alerts", err);
            alert("Failed creating demo alerts");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="demo-selector" style={{ width: "100%" }}>
            {/* Top: Choose demo */}
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

            {/* Middle: Edit/Preview payload header */}
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
                                setPayloadText(pretty(parsed)); // keep textarea formatted
                                setEditing(false);
                                // eslint-disable-next-line no-console
                                console.log("Custom payload applied");
                            } catch (err) {
                                alert("Invalid JSON: " + err);
                            }
                        }}
                    >
                        Apply JSON
                    </button>
                </div>
            </div>

            {/* Bottom: Post actions */}
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