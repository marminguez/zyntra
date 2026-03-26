import React from "react";

export function BaselineView() {
    return (
        <div className="pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Your Baseline</h1>
                <p className="text-slate-600 text-[15px] leading-relaxed">
                    Zyntra learns what is normal for <strong>you</strong>. We compare your current signals against your own trailing patterns, building a highly personalized metabolic signature.
                </p>
            </div>

            <h2 className="text-xl font-serif font-bold text-slate-900 mb-4">Metabolic Foundation</h2>
            
            <div className="space-y-4 mb-8">
                <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Usual Sleep</h3>
                                <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">7h 15m Avg</p>
                            </div>
                        </div>
                        <span className="text-rose-500 text-sm font-bold flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                            -45m
                        </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: "65%" }}></div>
                    </div>
                </div>

                <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-teal-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Usual Activity</h3>
                                <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">6,400 Steps Avg</p>
                            </div>
                        </div>
                        <span className="text-teal-600 text-sm font-bold flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            +12%
                        </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-400 rounded-full" style={{ width: "85%" }}></div>
                    </div>
                </div>

                <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Overnight Recovery</h3>
                                <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">HRV 52ms Avg</p>
                            </div>
                        </div>
                        <span className="text-slate-400 text-sm font-bold flex items-center gap-1">
                            Stable
                        </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-400 rounded-full" style={{ width: "75%" }}></div>
                    </div>
                </div>
            </div>

            <div className="bg-zyntra-navy text-white rounded-[1.5rem] p-6 shadow-md relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="font-serif font-bold text-xl mb-2">Glucose Stability</h3>
                    <p className="text-slate-400 text-sm mb-4 leading-relaxed">Your 14-day TIR (Time In Range) is 88%. Recent days show a slight increase in post-meal clearance durations.</p>
                    <div className="flex items-end gap-2 h-20 mt-8">
                        {/* Mock bars */}
                        {[70,80,88,85,90,88,75].map((h, i) => (
                            <div key={i} className="flex-1 bg-zyntra-teal/20 rounded-t-sm relative">
                                <div className="absolute bottom-0 w-full bg-zyntra-teal rounded-t-sm" style={{ height: `${h}%` }}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
