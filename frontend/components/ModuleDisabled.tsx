import React from 'react';
import { PowerOff } from 'lucide-react';

interface ModuleDisabledProps {
    moduleName: string;
}

export default function ModuleDisabled({ moduleName }: ModuleDisabledProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <div className="p-6 bg-slate-800/50 rounded-full text-slate-500 shadow-inner">
                <PowerOff size={64} strokeWidth={1.5} />
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
                    {moduleName} Module is Disabled
                </h2>
                <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
                    This feature has been temporarily turned off by a system administrator.
                    Please contact your manager if you believe this is an error.
                </p>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => window.history.back()}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all duration-200 text-sm font-medium border border-slate-700"
                >
                    Go Back
                </button>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all duration-200 text-sm font-medium shadow-lg shadow-indigo-500/20"
                >
                    Return Dashboard
                </button>
            </div>
        </div>
    );
}
