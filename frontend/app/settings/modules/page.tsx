'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    Settings,
    ShoppingCart,
    Package,
    Users,
    ArrowRightLeft,
    Landmark,
    UserCog,
    Lock,
    CheckCircle2,
    XCircle,
    Info,
    RefreshCw
} from 'lucide-react';

interface ModuleConfig {
    config_id: number;
    module_name: string;
    display_name: string;
    description: string;
    icon: string;
    is_enabled: boolean;
    is_core: boolean;
    updated_at: string;
    last_updated_by: string | null;
}

const ICON_MAP: Record<string, any> = {
    ShoppingCart,
    Package,
    Users,
    ArrowRightLeft,
    Landmark,
    UserCog,
    Settings
};

export default function ModuleManagementPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [modules, setModules] = useState<ModuleConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [showAlert, setShowAlert] = useState(false);

    const fetchModules = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/settings/modules`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setModules(data);
        } catch (error) {
            console.error('Failed to fetch modules:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.role !== 'ADMIN') {
                router.push('/');
            } else {
                fetchModules();
            }
        }
    }, [user, authLoading, router]);

    const handleToggle = async (moduleName: string, currentState: boolean) => {
        const newState = !currentState;
        setUpdating(moduleName);

        // Optimistic UI update
        setModules(prev => prev.map(m => m.module_name === moduleName ? { ...m, is_enabled: newState } : m));

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/settings/modules/${moduleName}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_enabled: newState })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.details || 'Failed to update module');
            }

            // Re-fetch to get latest updated_at and user info
            fetchModules();
        } catch (error: any) {
            console.error('Toggle error:', error);
            // Revert on failure
            setModules(prev => prev.map(m => m.module_name === moduleName ? { ...m, is_enabled: currentState } : m));
            alert(error.message);
        } finally {
            setUpdating(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <RefreshCw className="animate-spin text-indigo-500" size={32} />
                <p className="text-slate-400 font-medium">Loading system configuration...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Settings className="text-indigo-500" size={32} />
                    Module Management
                </h1>
                <p className="text-slate-400 mt-2 text-lg">
                    Enable or disable features across the entire ERP system.
                </p>
            </div>

            {/* Warning Alert Section */}
            <div className="relative min-h-[32px]">
                {!showAlert ? (
                    <button
                        onClick={() => setShowAlert(true)}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-red-700 border border-red-700 shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 group"

                    >
                        <Info size={18} color="white" />

                        {/* Tooltip hint when collapsed */}
                        <span className="absolute left-10 scale-0 group-hover:scale-100 transition-transform origin-left bg-slate-800 text-white text-[10px] px-2 py-1 rounded border border-slate-700 whitespace-nowrap">
                            System Warning
                        </span>
                    </button>
                ) : (
                    <div
                        className="bg-red-700 border border-red-700 p-4 rounded-xl flex gap-3 text-amber-200/80 shadow-2xl animate-in fade-in zoom-in duration-700 relative group cursor-pointer"
                        onClick={() => setShowAlert(false)}
                        title="Click to shrink"
                    >
                        <div className="bg-red-800 rounded-full p-1 self-start group-hover:bg-red-900 transition-colors">
                            <Info className="shrink-0 text-amber-500" size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium leading-relaxed">
                                Disabling a module will immediately hide its links from users and block API access.
                                Data is preserved but will be inaccessible until re-enabled.
                            </p>

                        </div>
                    </div>
                )}
            </div>

            {/* Module Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((mod) => {
                    const Icon = ICON_MAP[mod.icon] || Settings;
                    const isUpdating = updating === mod.module_name;

                    return (
                        <div
                            key={mod.config_id}
                            className={`p-6 rounded-2xl border transition-all duration-300 relative group
                                ${mod.is_enabled
                                    ? 'bg-slate-800 backdrop-blur-md border-slate-800 hover:border-indigo-500/50'
                                    : 'bg-slate-600 border-slate-900 grayscale-[0.5]'}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className={`p-3 rounded-xl ${mod.is_enabled ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                            {mod.display_name}
                                            {mod.is_core && (
                                                <span className="text-[10px] uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Lock size={10} /> Core
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                            {mod.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Toggle */}
                                {mod.is_core ? (
                                    <div className="h-6 w-11 rounded-full bg-indigo-900/30 flex items-center px-1 border border-indigo-500/20 cursor-not-allowed opacity-50">
                                        <div className="h-4 w-4 rounded-full bg-indigo-400 translate-x-5" />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleToggle(mod.module_name, mod.is_enabled)}
                                        disabled={isUpdating}
                                        className={`relative h-6 w-11 rounded-full transition-colors duration-200 outline-none
                                            ${mod.is_enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
                                            ${mod.is_enabled ? 'translate-x-[12px]' : 'translate-x-[-10px]'}`}
                                        />
                                        {isUpdating && (
                                            <RefreshCw size={10} className="absolute inset-0 m-auto animate-spin text-indigo-200" />
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Footer Status */}
                            <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-500">
                                <span className="flex items-center gap-1">
                                    {mod.is_enabled ? (
                                        <><CheckCircle2 size={12} className="text-emerald-500" /> <span className="text-white">Active</span></>
                                    ) : (
                                        <><XCircle size={12} className="text-rose-500" /> Disabled</>
                                    )}
                                </span>
                                {mod.last_updated_by && (
                                    <span>Updated by {mod.last_updated_by}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
