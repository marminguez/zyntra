"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { MLPayload } from "./ClinicianDashboard";
import type { ZyntraOutput } from "@/server/zyntra/types";

import { currentRiskProfile } from "../_lib/mockRiskData";
import { DashboardView } from "./views/DashboardView";
import { DetailedPredictionView } from "./views/DetailedPredictionView";
import { BaselineView } from "./views/BaselineView";
import { RecommendationsView } from "./views/RecommendationsView";
import { HistoryView } from "./views/HistoryView";
import { ZyntraChat } from "./ZyntraChat";
import { ZyntraStatusCard } from "./ZyntraStatusCard";
import { speakText } from "../_lib/voiceAssistant";

const ZYNTRA_ALERT_THRESHOLD = 70;
const ZYNTRA_PREVENTIVE_THRESHOLD = 60;

export function PatientDashboard() {
    const { data: session } = useSession();
    const patientId = (session?.user as any)?.patientId ?? (session?.user as any)?.id;
    // Keep existing payload for potential background updates
    const [payload, setPayload] = useState<MLPayload | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Zyntra state
    const [zyntraData, setZyntraData] = useState<ZyntraOutput | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [zyntraLoading, setZyntraLoading] = useState(false);
    const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);
    const [screenOffSimulationEnabled, setScreenOffSimulationEnabled] = useState(false);
    const hasAnnouncedRiskRef = useRef(false);
    const hasAnnouncedPreventiveRef = useRef(false);

    // New navigation state
    const [activeTab, setActiveTab] = useState<"DASHBOARD" | "BASELINE" | "RECOMMENDATIONS" | "HISTORY" | "DEVICES">("DASHBOARD");
    const [drilldown, setDrilldown] = useState<"48h" | "72h" | null>(null);
    
    // Devices logic
    const searchParams = useSearchParams();
    const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isSyncingFitbit, setIsSyncingFitbit] = useState(false);
    const [isSyncingLibre, setIsSyncingLibre] = useState(false);
    const [isConnectingLibre, setIsConnectingLibre] = useState(false);
    const [libreEmail, setLibreEmail] = useState("");
    const [librePassword, setLibrePassword] = useState("");
    const [libreConnected, setLibreConnected] = useState(false);
    const [libreLastSyncAt, setLibreLastSyncAt] = useState<string | null>(null);

    useEffect(() => {
        if (searchParams?.get("fitbit") === "connected") {
            setActiveTab("DEVICES");
            setSyncMessage({ type: "success", text: "Fitbit connected successfully!" });
        }
        if (searchParams?.get("fitbit") === "error") {
            setActiveTab("DEVICES");
            setSyncMessage({ type: "error", text: decodeURIComponent(searchParams.get("message") ?? "Fitbit connection failed") });
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchLibreStatus = async () => {
            if (!patientId) return;
            try {
                const res = await fetch(`/app-api/integrations/freestyle/status?patientId=${encodeURIComponent(patientId)}`, {
                    credentials: "include",
                });
                if (!res.ok) return;
                const data = await res.json();
                setLibreConnected(Boolean(data.connected));
                setLibreLastSyncAt(typeof data.lastSyncAt === "string" ? data.lastSyncAt : null);
            } catch (err) {
                console.error("Failed to load LibreLink status", err);
            }
        };

        if (activeTab === "DEVICES") {
            void fetchLibreStatus();
        }
    }, [activeTab, patientId]);

    useEffect(() => {
        const fetchMyRisk = async () => {
            if (!patientId) return;
            setLoading(true);
            try {
                const res = await fetch("/app-api/risk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ patientId }),
                });

                if (res.ok) {
                    const data = await res.json();
                    setPayload(data);
                }
            } catch (err) {
                console.error("Failed to fetch risk", err);
            } finally {
                setLoading(false);
            }
        };

        if (patientId && activeTab === "DASHBOARD") {
            fetchMyRisk();
        }
    }, [patientId, activeTab]);

    // Fetch Zyntra status on dashboard mount
    async function fetchZyntraStatus() {
        setZyntraLoading(true);
        try {
            const res = await fetch("/api/zyntra/status");
            if (res.ok) {
                const data = await res.json();
                setZyntraData(data);
            }
        } catch (err) {
            console.error("Failed to fetch Zyntra status", err);
        } finally {
            setZyntraLoading(false);
        }
    }

    useEffect(() => {
        if (activeTab === "DASHBOARD") {
            void fetchZyntraStatus();
        }
    }, [activeTab]);

    useEffect(() => {
        if (!voiceAlertsEnabled || !zyntraData) return;

        if (zyntraData.riskScore > ZYNTRA_ALERT_THRESHOLD && !hasAnnouncedRiskRef.current) {
            hasAnnouncedRiskRef.current = true;
            void speakText(
                `Zyntra alert. Your current risk score is ${zyntraData.riskScore} out of 100. Please review sleep, activity, and meals now.`,
                { preferElevenLabs: true }
            );
            return;
        }

        if (zyntraData.riskScore <= ZYNTRA_ALERT_THRESHOLD) {
            hasAnnouncedRiskRef.current = false;
        }
    }, [voiceAlertsEnabled, zyntraData]);

    useEffect(() => {
        if (!voiceAlertsEnabled || !screenOffSimulationEnabled || !zyntraData) return;

        const preventiveMessage = `Preventive alert. Your risk trend is rising, currently ${zyntraData.riskScore} out of 100. Act now: hydrate, avoid rapid carbs, and take a 10 minute walk to reduce the chance of instability.`;
        const shouldTriggerPreventiveAlert =
            zyntraData.riskScore >= ZYNTRA_PREVENTIVE_THRESHOLD &&
            zyntraData.riskScore <= ZYNTRA_ALERT_THRESHOLD;

        if (shouldTriggerPreventiveAlert && !hasAnnouncedPreventiveRef.current) {
            hasAnnouncedPreventiveRef.current = true;
            void speakText(preventiveMessage, { preferElevenLabs: true });

            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Zyntra preventive alert", {
                    body: "Rising risk detected. Hydrate, avoid rapid carbs, and walk 10 minutes now.",
                });
            }
            return;
        }

        if (!shouldTriggerPreventiveAlert) {
            hasAnnouncedPreventiveRef.current = false;
        }
    }, [voiceAlertsEnabled, screenOffSimulationEnabled, zyntraData]);

    useEffect(() => {
        if (!voiceAlertsEnabled || !screenOffSimulationEnabled || !zyntraData) return;

        const onVisibilityChange = () => {
            const isHidden = document.visibilityState === "hidden";
            const isRisingRisk =
                zyntraData.riskScore >= ZYNTRA_PREVENTIVE_THRESHOLD &&
                zyntraData.riskScore <= ZYNTRA_ALERT_THRESHOLD;

            if (!isHidden || !isRisingRisk) return;

            void speakText(
                `Screen-off simulation active. Preventive guidance now: hydrate, avoid heavy carbs in the next hour, and walk for 10 minutes to lower risk.`,
                { preferElevenLabs: true }
            );

            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Zyntra screen-off simulation", {
                    body: "Preventive action now: hydrate, avoid heavy carbs, and walk 10 minutes.",
                });
            }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => document.removeEventListener("visibilitychange", onVisibilityChange);
    }, [voiceAlertsEnabled, screenOffSimulationEnabled, zyntraData]);

    async function toggleScreenOffSimulation() {
        if (!screenOffSimulationEnabled && "Notification" in window && Notification.permission === "default") {
            await Notification.requestPermission();
        }
        setScreenOffSimulationEnabled((prev) => !prev);
    }

    async function handleSyncFitbit() {
        setIsSyncingFitbit(true);
        setSyncMessage(null);
        try {
            const res = await fetch("/app-api/integrations/fitbit/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ patientId }),
            });
            const data = await res.json();
            if (res.ok) {
                setSyncMessage({ type: "success", text: "Fitbit data synced successfully" });
            } else {
                setSyncMessage({ type: "error", text: `Sync failed: ${data.error || "Unknown error"}` });
            }
        } catch (err) {
            setSyncMessage({ type: "error", text: "Sync failed: Network error" });
        } finally {
            setIsSyncingFitbit(false);
        }
    }

    async function handleSyncLibre() {
        setIsSyncingLibre(true);
        setSyncMessage(null);
        try {
            const res = await fetch("/app-api/integrations/freestyle/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ patientId }),
            });
            const data = await res.json();
            if (res.ok) {
                setLibreConnected(true);
                setLibreLastSyncAt(new Date().toISOString());
                setSyncMessage({ type: "success", text: "FreeStyle CGM data synced successfully" });
                await fetchZyntraStatus();
            } else {
                setSyncMessage({ type: "error", text: `Sync failed: ${data.error || "Unknown error"}` });
            }
        } catch (err) {
            setSyncMessage({ type: "error", text: "Sync failed: Network error" });
        } finally {
            setIsSyncingLibre(false);
        }
    }

    async function handleConnectLibre() {
        if (!libreEmail.trim() || !librePassword.trim()) {
            setSyncMessage({ type: "error", text: "Please add your LibreLink email and password first." });
            return;
        }

        setIsConnectingLibre(true);
        setSyncMessage(null);
        try {
            const res = await fetch("/app-api/integrations/freestyle/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ patientId, email: libreEmail.trim(), password: librePassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setLibreConnected(true);
                setLibrePassword("");
                setSyncMessage({ type: "success", text: "LibreLink account connected. You can sync real data now." });
            } else {
                setSyncMessage({ type: "error", text: `Connection failed: ${data.error || "Unknown error"}` });
            }
        } catch {
            setSyncMessage({ type: "error", text: "Connection failed: Network error" });
        } finally {
            setIsConnectingLibre(false);
        }
    }

    return (
        <>
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
            <header className="px-6 py-6 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => signOut({ callbackUrl: "/login" })}>
                    <span className="font-serif font-bold text-xl ml-2 text-zyntra-navy tracking-tight">Zyntra</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        id="zyntra-voice-alert-toggle"
                        onClick={() => setVoiceAlertsEnabled((prev) => !prev)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                            voiceAlertsEnabled
                                ? "bg-teal-50 text-teal-700 border-teal-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                    >
                        Voice Alerts {voiceAlertsEnabled ? "On" : "Off"}
                    </button>
                    <button
                        id="zyntra-screen-off-sim-toggle"
                        onClick={toggleScreenOffSimulation}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                            screenOffSimulationEnabled
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                    >
                        Screen-Off Sim {screenOffSimulationEnabled ? "On" : "Off"}
                    </button>
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden relative shadow-sm border border-slate-300">
                    <svg className="w-8 h-8 text-slate-400 absolute bottom-0 translate-y-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    </div>
                </div>
            </header>

            {/* Proactive Alert Banner */}
            {zyntraData && zyntraData.riskScore > ZYNTRA_ALERT_THRESHOLD && activeTab === "DASHBOARD" && (
                <div className="mx-6 mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-rose-900 font-semibold text-sm">Zyntra Pattern Alert</p>
                        <p className="text-rose-700 text-sm mt-0.5 leading-snug">You are following a pattern that previously led to instability.</p>
                    </div>
                    <button id="zyntra-alert-talk" onClick={() => setIsChatOpen(true)} className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors whitespace-nowrap mt-1">
                        Talk to Zyntra →
                    </button>
                </div>
            )}

            {screenOffSimulationEnabled && activeTab === "DASHBOARD" && (
                <div className="mx-6 mb-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start gap-3 animate-in fade-in duration-500">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-indigo-900 font-semibold text-sm">Screen-Off simulation enabled</p>
                        <p className="text-indigo-700 text-sm mt-0.5 leading-snug">
                            If risk rises to {ZYNTRA_PREVENTIVE_THRESHOLD}–{ZYNTRA_ALERT_THRESHOLD}, Zyntra will speak preventive guidance and send a notification even while the screen is off.
                        </p>
                    </div>
                </div>
            )}

            <div className="px-6">
                {activeTab === "DASHBOARD" && !drilldown && (
                    <>
                        {/* ZyntraStatusCard */}
                        {zyntraData && (
                            <ZyntraStatusCard
                                output={zyntraData}
                                loading={zyntraLoading}
                                onTalkToZyntra={() => setIsChatOpen(true)}
                            />
                        )}
                        {zyntraLoading && !zyntraData && (
                            <div className="mb-6 bg-white rounded-[1.5rem] border border-slate-100 p-5 shadow-sm animate-pulse">
                                <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
                                <div className="h-8 bg-slate-100 rounded w-1/2 mb-2" />
                                <div className="h-3 bg-slate-100 rounded w-3/4" />
                            </div>
                        )}
                        <DashboardView data={currentRiskProfile} onDrilldown={(t) => setDrilldown(t)} />
                    </>
                )}
                {activeTab === "DASHBOARD" && drilldown && (
                    <DetailedPredictionView data={currentRiskProfile} timeframe={drilldown} onBack={() => setDrilldown(null)} />
                )}
                {activeTab === "BASELINE" && <BaselineView />}
                {activeTab === "RECOMMENDATIONS" && <RecommendationsView />}
                {activeTab === "HISTORY" && <HistoryView />}
                {activeTab === "DEVICES" && (
                    <div className="animate-in fade-in duration-300">
                        <h1 className="text-3xl font-serif font-bold text-zyntra-navy mb-2">Devices</h1>
                        <p className="text-slate-500 mb-8">Connect your wearables and medical devices to sync data with Zyntra Models.</p>

                        {syncMessage && (
                            <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${syncMessage.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                                {syncMessage.text}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Fitbit Card */}
                            <div className="bg-white border border-slate-100 p-6 rounded-[1.5rem] shadow-sm flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 font-bold text-xl">F</div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">Fitbit</h3>
                                            <p className="text-sm text-slate-500">Activity, Sleep, HR</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">Active</span>
                                </div>
                                <div className="flex gap-3 mt-2">
                                    <a href="/app-api/integrations/fitbit/connect" className="flex-1 bg-zyntra-navy text-white text-center py-3 rounded-xl font-medium text-sm transition-colors hover:bg-slate-800">
                                        Reconnect
                                    </a>
                                    <button onClick={handleSyncFitbit} disabled={isSyncingFitbit} className="flex-1 border border-slate-200 text-slate-700 text-center py-3 rounded-xl font-medium text-sm transition-colors hover:bg-slate-50 disabled:opacity-50">
                                        {isSyncingFitbit ? "Syncing..." : "Sync Now"}
                                    </button>
                                </div>
                            </div>

                            {/* Libre Card */}
                            <div className="bg-white border border-slate-100 p-6 rounded-[1.5rem] shadow-sm flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 font-bold text-xl">L</div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">FreeStyle Libre</h3>
                                            <p className="text-sm text-slate-500">Continuous Glucose</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${libreConnected ? "bg-green-50 text-green-700 border-green-100" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                        {libreConnected ? "Connected" : "Not connected"}
                                    </span>
                                </div>
                                {libreLastSyncAt && (
                                    <p className="text-xs text-slate-500 -mt-2">
                                        Last sync: {new Date(libreLastSyncAt).toLocaleString()}
                                    </p>
                                )}
                                <div className="grid grid-cols-1 gap-3">
                                    <input
                                        type="email"
                                        value={libreEmail}
                                        onChange={(e) => setLibreEmail(e.target.value)}
                                        placeholder="LibreLink email"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                    />
                                    <input
                                        type="password"
                                        value={librePassword}
                                        onChange={(e) => setLibrePassword(e.target.value)}
                                        placeholder="LibreLink password"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">
                                    Use LibreLinkUp credentials and make sure glucose sharing is enabled.
                                </p>
                                <div className="flex gap-3 mt-2">
                                    <button onClick={handleConnectLibre} disabled={isConnectingLibre} className="flex-1 border border-amber-200 text-amber-700 text-center py-3 rounded-xl font-medium text-sm transition-colors hover:bg-amber-50 disabled:opacity-50">
                                        {isConnectingLibre ? "Connecting..." : "Connect LibreLink"}
                                    </button>
                                    <button onClick={handleSyncLibre} disabled={isSyncingLibre || !libreConnected} className="flex-1 bg-zyntra-teal text-zyntra-navy text-center py-3 rounded-xl font-medium text-sm transition-colors hover:bg-teal-300 disabled:opacity-50">
                                        {isSyncingLibre ? "Syncing..." : "Sync real data"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 pt-4 pb-6 flex justify-between items-center z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                <NavIcon 
                    icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />}
                    label="HOME" active={activeTab === "DASHBOARD"} 
                    onClick={() => { setActiveTab("DASHBOARD"); setDrilldown(null); }} 
                />
                <NavIcon 
                    icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />}
                    label="BASELINE" active={activeTab === "BASELINE"} 
                    onClick={() => setActiveTab("BASELINE")} 
                />
                <NavIcon 
                    icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />}
                    label="ACTIONS" active={activeTab === "RECOMMENDATIONS"} 
                    onClick={() => setActiveTab("RECOMMENDATIONS")} 
                />
                <NavIcon 
                    icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    label="HISTORY" active={activeTab === "HISTORY"} 
                    onClick={() => setActiveTab("HISTORY")} 
                />
                <NavIcon 
                    icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />}
                    label="DEVICES" active={activeTab === "DEVICES"} 
                    onClick={() => setActiveTab("DEVICES")} 
                />
            </div>
        </div>

        {/* Zyntra Chat Modal */}
        {isChatOpen && (
            <ZyntraChat initialOutput={zyntraData} onClose={() => setIsChatOpen(false)} />
        )}
        </>
    );
}

function NavIcon({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-colors ${active ? "text-zyntra-navy" : "text-slate-400 hover:text-slate-600"}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icon}
            </svg>
            <span className="text-[9px] font-bold tracking-widest">{label}</span>
        </button>
    );
}
