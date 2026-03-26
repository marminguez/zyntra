import React from "react";
import { currentRiskProfile } from "../../_lib/mockRiskData";
import { ActionCard } from "../ui/ActionCard";

export function RecommendationsView() {
    const data = currentRiskProfile;
    
    return (
        <div className="pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Today's Focus</h1>
                <p className="text-slate-600 text-[15px] leading-relaxed">
                    Based on your recent metabolic signals, here are the safest, most effective micro-actions you can take today to support your stability.
                </p>
            </div>

            <div className="bg-teal-50 rounded-[1.5rem] p-6 border border-teal-100 mb-10 shadow-sm">
                <h3 className="font-bold text-teal-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Why these were suggested
                </h3>
                <p className="text-teal-800 text-sm leading-relaxed">
                    We've noticed increased post-meal variability and slight variations in your overnight recovery. These gentle actions are designed to smooth out your glycemic responses naturally.
                </p>
            </div>

            <h2 className="text-xl font-serif font-bold text-slate-900 mb-4">Small wins for the next 24h</h2>
            <div className="space-y-4 mb-10">
                {data.recommendations.map((rec) => (
                    <ActionCard 
                        key={rec.id}
                        title={rec.title}
                        description={rec.description}
                        icon={<svg className="w-5 h-5 text-zyntra-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                    />
                ))}
            </div>

            <h2 className="text-xl font-serif font-bold text-slate-900 mb-4">Monitoring advice</h2>
            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center flex-shrink-0 text-zyntra-navy border border-slate-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 mb-1">Pay attention to post-dinner</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Notice how your body feels 2 hours after your final meal today. If you use a CGM, take a quick look at the trend line before bed. No medical intervention needed, just simple observation.
                    </p>
                </div>
            </div>
        </div>
    );
}
