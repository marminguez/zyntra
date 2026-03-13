"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Driver {
    feature: string;
    contribution: number;
    direction: "up" | "down";
}

interface MLPayload {
    ok: boolean;
    usedModel: "ml" | "zscore";
    pci?: number;
    global_24?: number;
    global_72?: number;
    p_hyper_24?: number;
    p_hyper_72?: number;
    p_hypo_12?: number;
    p_hypo_24?: number;
    p_instability_24?: number;
    p_instability_72?: number;
    needs_human_review?: boolean;
    warning?: string;
    drivers?: {
        hyper_24: Driver[];
        hypo_12: Driver[];
        instability_24: Driver[];
    };
    riskScores?: any[];
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [patientId, setPatientId] = useState("");
    const [payload, setPayload] = useState<MLPayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (status === "loading") {
        return (
            <div className="container">
                <p className="page-subtitle">Loading…</p>
            </div>
        );
    }

    if (!session) {
        router.push("/login");
        return null;
    }

    async function fetchRisk() {
        if (!patientId.trim()) return;
        setLoading(true);
        setError("");
        setPayload(null);

        try {
            const res = await fetch("/app-api/risk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ patientId }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Request failed");
            } else {
                setPayload(data);
            }
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }

    const renderDrivers = (drivers: Driver[]) => {
        if (!drivers || drivers.length === 0) return <p className="text-secondary text-sm">No significant drivers</p>;
        return (
            <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {drivers.map((d, i) => (
                    <li key={i} style={{ marginBottom: "0.25rem" }}>
                        <span style={{ color: d.direction === "up" ? "#ff4d4f" : "#52c41a", marginRight: "6px" }}>
                            {d.direction === "up" ? "↑" : "↓"}
                        </span>
                        {d.feature.replace("delta_", "Δ ")}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="container pt-8 pb-12">
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div>
                    <h1 className="page-title">Zyntra Intelligence</h1>
                    <p className="page-subtitle" style={{ marginBottom: 0 }}>
                        Diabetes Predictive Layer · {(session.user as any)?.role}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => signOut({ callbackUrl: "/login" })} style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}>
                    Sign Out
                </button>
            </header>

            <div className="card animate-in" style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Predictive Horizons</h2>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <input
                        id="patient-id"
                        className="input"
                        placeholder="Patient ID"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        style={{ maxWidth: 360 }}
                    />
                    <button className="btn btn-primary" onClick={fetchRisk} disabled={loading}>
                        {loading ? "Computing…" : "Run"}
                    </button>
                </div>
                {error && <p className="error-msg" style={{ marginTop: "0.75rem" }}>{error}</p>}
            </div>

            {/* Disclaimer always visible when there is a payload */}
            {payload && (
                <div style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "rgba(255, 170, 0, 0.1)", border: "1px solid rgba(255, 170, 0, 0.4)", borderRadius: "6px", color: "var(--text-primary)" }}>
                    <strong>Disclaimer:</strong> Zyntra does not make clinical decisions. Human supervision required.
                </div>
            )}

            {payload && payload.usedModel === "ml" && (
                <>
                    {/* PCI Visualizer */}
                    <div className="card animate-in" style={{ marginBottom: "1.5rem" }}>
                        <h3 className="stat-label" style={{ marginBottom: "0.5rem" }}>Physiological Coherence Index (PCI)</h3>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div style={{ flex: 1, height: "12px", background: "linear-gradient(90deg, #52c41a, #faad14, #ff4drf, #cf1322)", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
                                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(payload.pci ?? 0) * 100}%`, width: "4px", backgroundColor: "#fff", border: "1px solid #000" }} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: "1.2rem", width: "60px", textAlign: "right" }}>
                                {((payload.pci ?? 0) * 100).toFixed(1)}
                            </span>
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>0 = High Coherence, 100 = Systemic Strain</p>
                    </div>

                    {/* 4 Cards Grid */}
                    <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>

                        {/* 1. Hyper Risk */}
                        <div className="card animate-in">
                            <h3 className="stat-label">Hyper Risk</h3>
                            <div style={{ display: "flex", justifyContent: "space-between", margin: "1rem 0" }}>
                                <div>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>24h Horizon</p>
                                    <p style={{ fontWeight: 700, fontSize: "1.2rem" }}>{((payload.p_hyper_24 ?? 0) * 100).toFixed(1)}%</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>72h Horizon</p>
                                    <p style={{ fontWeight: 700, fontSize: "1.2rem" }}>{((payload.p_hyper_72 ?? 0) * 100).toFixed(1)}%</p>
                                </div>
                            </div>
                            <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>Why this?</p>
                            {renderDrivers(payload.drivers?.hyper_24 ?? [])}
                        </div>

                        {/* 2. Hypo Risk */}
                        <div className="card animate-in">
                            <h3 className="stat-label">Hypo Risk</h3>
                            <div style={{ display: "flex", justifyContent: "space-between", margin: "1rem 0" }}>
                                <div>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>12h Horizon</p>
                                    <p style={{ fontWeight: 700, fontSize: "1.2rem" }}>{((payload.p_hypo_12 ?? 0) * 100).toFixed(1)}%</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>24h Horizon</p>
                                    <p style={{ fontWeight: 700, fontSize: "1.2rem" }}>{((payload.p_hypo_24 ?? 0) * 100).toFixed(1)}%</p>
                                </div>
                            </div>
                            <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>Why this?</p>
                            {renderDrivers(payload.drivers?.hypo_12 ?? [])}
                        </div>

                        {/* 3. Global Instability */}
                        <div className="card animate-in">
                            <h3 className="stat-label">Global Instability</h3>
                            <div style={{ display: "flex", justifyContent: "space-between", margin: "1rem 0" }}>
                                <div>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>24h Horizon</p>
                                    <p style={{ fontWeight: 700, fontSize: "1.2rem" }}>{((payload.global_24 ?? 0) * 100).toFixed(1)}%</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>72h Horizon</p>
                                    <p style={{ fontWeight: 700, fontSize: "1.2rem" }}>{((payload.global_72 ?? 0) * 100).toFixed(1)}%</p>
                                </div>
                            </div>
                            <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>Why this?</p>
                            {renderDrivers(payload.drivers?.instability_24 ?? [])}
                        </div>

                        {/* 4. Needs Human Review */}
                        <div className="card animate-in" style={{ backgroundColor: payload.needs_human_review ? "rgba(207, 19, 34, 0.05)" : "transparent", border: payload.needs_human_review ? "1px solid #cf1322" : undefined }}>
                            <h3 className="stat-label" style={{ color: payload.needs_human_review ? "#cf1322" : undefined }}>Needs Human Review</h3>
                            <div style={{ margin: "1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span className={`badge badge-${payload.needs_human_review ? "high" : "low"}`} style={{ fontSize: "1rem" }}>
                                    {payload.needs_human_review ? "FLAGGED" : "CLEAR"}
                                </span>
                            </div>
                            {payload.needs_human_review && payload.warning && (
                                <p style={{ color: "#cf1322", fontSize: "0.95rem", fontWeight: 600, marginTop: "0.75rem" }}>
                                    {payload.warning}
                                </p>
                            )}
                        </div>

                    </div>
                </>
            )}

            {payload && payload.usedModel === "zscore" && (
                <div className="grid-3">
                    {payload.riskScores?.map((rs) => (
                        <div key={rs.id} className="card animate-in">
                            <p className="stat-label">{rs.horizonHrs}h Horizon</p>
                            <p className="stat-value" style={{ marginTop: "0.5rem" }}>
                                {(rs.score * 100).toFixed(1)}%
                            </p>
                            <span className={`badge badge-${rs.level}`} style={{ marginTop: "0.75rem" }}>
                                {rs.level}
                            </span>
                            <p style={{ marginTop: "0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                {rs.explanation}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {!payload && !error && !loading && (
                <div className="card animate-in" style={{ textAlign: "center" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        Enter a Patient ID and click <strong>Run</strong> to compute diabetic ML risk horizons.
                    </p>
                </div>
            )}
        </div>
    );
}
