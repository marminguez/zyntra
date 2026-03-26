import React from "react";

export function HistoryView() {
    return (
        <div className="pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Trends & Patterns</h1>
                <p className="text-slate-600 text-[15px] leading-relaxed">
                    Understanding your 14-day trailing risk history. Focus on recurring patterns that precede instability.
                </p>
            </div>

            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 mb-8">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="font-serif font-bold text-lg text-slate-900">7-Day Trajectory</h3>
                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">48h Risk Score</p>
                    </div>
                </div>
                
                {/* Mock Area Chart */}
                <div className="h-40 flex items-end justify-between gap-1.5 mt-4 relative">
                    <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-slate-200 z-0"></div>
                    {[22, 18, 15, 28, 45, 60, 45].map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative z-10 w-full h-full justify-end">
                            <div className="w-full bg-zyntra-teal rounded-t-sm transition-all duration-300 hover:bg-teal-400 cursor-pointer" style={{ height: `${val}%`, minHeight: '4px' }}>
                                {/* Tooltip mock */}
                            </div>
                            <span className={`text-[10px] pb-1 font-bold ${-6 + i === 0 ? 'text-zyntra-navy' : 'text-slate-400'}`}>{-6 + i === 0 ? 'Today' : ((-6 + i) + 'd')}</span>
                        </div>
                    ))}
                </div>
            </div>

            <h2 className="text-xl font-serif font-bold text-slate-900 mb-4">Repeated Drivers</h2>
            <div className="space-y-4 mb-8">
                <div className="bg-white p-5 rounded-[1.25rem] border border-slate-100 shadow-sm flex items-start gap-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-lg">3x</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">Late Meals + Poor Sleep</h4>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">In the last two weeks, eating after 8 PM corresponded tightly with disrupted sleep architecture and morning glucose instability.</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[1.25rem] border border-slate-100 shadow-sm flex items-start gap-4">
                    <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-lg">2x</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">Lower Activity Load</h4>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">Days with under 5,000 steps frequently preceded a jump in your 48h risk score.</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-100 rounded-[1.25rem] p-5 shadow-sm text-amber-900">
                <h3 className="font-bold mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Gentle Reminder
                </h3>
                <p className="text-sm leading-relaxed text-amber-800">
                    Your body's response changes daily based on complex factors. Avoid over-optimizing. Focus on small, consistent behavioral wins rather than chasing perfect metrics.
                </p>
            </div>
        </div>
    );
}
