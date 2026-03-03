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

    const fetchModules = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/settings/modules', {
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
            const res = await fetch(`http://localhost:5000/api/settings/modules/${moduleName}`, {
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

            {/* Warning Alert */}
            <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-xl flex gap-3 text-amber-200/80">
                <Info className="shrink-0 text-amber-500" size={20} />
                <p className="text-sm">
                    Disabling a module will immediately hide its links from all users' sidebars and block API access.
                    Data is preserved but will be inaccessible until re-enabled.
                </p>
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
                                    ? 'bg-slate-900/40 border-slate-800 hover:border-indigo-500/50'
                                    : 'bg-slate-950/40 border-slate-900 grayscale-[0.5]'}`}
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
                                            ${mod.is_enabled ? 'translate-x-[22px]' : 'translate-x-[4px]'}`}
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
                                        <><CheckCircle2 size={12} className="text-emerald-500" /> Active</>
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
