'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    Shield,
    Plus,
    Pencil,
    Trash2,
    X,
    RefreshCw,
    Users,
    Lock,
    CheckSquare,
    Square,
    AlertTriangle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────── */
interface Permission {
    module_name: string;
    display_name: string;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
}

interface Role {
    role_id: number;
    role_key: string;
    display_name: string;
    description: string | null;
    is_built_in: boolean;
    is_active: boolean;
    employee_count: number;
    permissions: Permission[];
}

interface ModuleConfig {
    module_name: string;
    display_name: string;
    is_enabled: boolean;
    is_core: boolean;
}

const API_BASE = 'http://localhost:5000';

/* ─── Component ──────────────────────────────────────────────────── */
export default function RolesAndAccessPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [roles, setRoles] = useState<Role[]>([]);
    const [modules, setModules] = useState<ModuleConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRole, setExpandedRole] = useState<number | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formActive, setFormActive] = useState(true);
    const [formPerms, setFormPerms] = useState<Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>>({});
    const [saving, setSaving] = useState(false);

    // Delete state
    const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
    const [deleting, setDeleting] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const headers = useCallback(() => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }), [token]);

    /* ─── Fetch ─────────────────────────────────────────── */
    const fetchRoles = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/settings/roles`, { headers: headers() });
            if (res.ok) {
                const data = await res.json();
                setRoles(data);
            }
        } catch (err) {
            console.error('fetchRoles error:', err);
        }
    }, [headers]);

    const fetchModules = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/settings/modules`, { headers: headers() });
            if (res.ok) {
                const data = await res.json();
                setModules(data.filter((m: ModuleConfig) => m.is_enabled));
            }
        } catch (err) {
            console.error('fetchModules error:', err);
        }
    }, [headers]);

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.role !== 'ADMIN') {
                router.push('/');
            } else {
                Promise.all([fetchRoles(), fetchModules()]).finally(() => setLoading(false));
            }
        }
    }, [user, authLoading, router, fetchRoles, fetchModules]);

    /* ─── Open Modal ────────────────────────────────────── */
    const openCreate = () => {
        setEditingRole(null);
        setFormName('');
        setFormDesc('');
        setFormActive(true);
        const perms: typeof formPerms = {};
        modules.forEach(m => {
            perms[m.module_name] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
        });
        setFormPerms(perms);
        setShowModal(true);
    };

    const openEdit = (role: Role) => {
        setEditingRole(role);
        setFormName(role.display_name);
        setFormDesc(role.description || '');
        setFormActive(role.is_active);
        const perms: typeof formPerms = {};
        modules.forEach(m => {
            const existing = role.permissions.find(p => p.module_name === m.module_name);
            perms[m.module_name] = existing
                ? { can_view: existing.can_view, can_create: existing.can_create, can_edit: existing.can_edit, can_delete: existing.can_delete }
                : { can_view: false, can_create: false, can_edit: false, can_delete: false };
        });
        setFormPerms(perms);
        setShowModal(true);
    };

    /* ─── Permission Toggle Logic ───────────────────────── */
    const togglePerm = (mod: string, field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => {
        setFormPerms(prev => {
            const current = { ...prev[mod] };
            if (field === 'can_view') {
                // Unchecking view → clear all
                if (current.can_view) {
                    return { ...prev, [mod]: { can_view: false, can_create: false, can_edit: false, can_delete: false } };
                } else {
                    return { ...prev, [mod]: { ...current, can_view: true } };
                }
            } else {
                // Checking any other → also check view
                const newVal = !current[field];
                return { ...prev, [mod]: { ...current, [field]: newVal, can_view: newVal ? true : current.can_view } };
            }
        });
    };

    const selectAllForModule = (mod: string) => {
        setFormPerms(prev => ({ ...prev, [mod]: { can_view: true, can_create: true, can_edit: true, can_delete: true } }));
    };

    const clearAllForModule = (mod: string) => {
        setFormPerms(prev => ({ ...prev, [mod]: { can_view: false, can_create: false, can_edit: false, can_delete: false } }));
    };

    const selectAll = () => {
        const perms: typeof formPerms = {};
        modules.forEach(m => { perms[m.module_name] = { can_view: true, can_create: true, can_edit: true, can_delete: true }; });
        setFormPerms(perms);
    };

    const clearAll = () => {
        const perms: typeof formPerms = {};
        modules.forEach(m => { perms[m.module_name] = { can_view: false, can_create: false, can_edit: false, can_delete: false }; });
        setFormPerms(perms);
    };

    /* ─── Save ──────────────────────────────────────────── */
    const handleSave = async () => {
        if (!formName.trim()) return;
        setSaving(true);

        const body = {
            display_name: formName.trim(),
            description: formDesc.trim() || null,
            is_active: formActive,
            permissions: Object.entries(formPerms).map(([module_name, flags]) => ({ module_name, ...flags }))
        };

        try {
            const url = editingRole
                ? `${API_BASE}/api/settings/roles/${editingRole.role_id}`
                : `${API_BASE}/api/settings/roles`;

            const res = await fetch(url, {
                method: editingRole ? 'PUT' : 'POST',
                headers: headers(),
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to save role');
                return;
            }

            setShowModal(false);
            await fetchRoles();
        } catch (err) {
            console.error('Save error:', err);
            alert('Failed to save role');
        } finally {
            setSaving(false);
        }
    };

    /* ─── Delete ────────────────────────────────────────── */
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);

        try {
            const res = await fetch(`${API_BASE}/api/settings/roles/${deleteTarget.role_id}`, {
                method: 'DELETE',
                headers: headers()
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to delete role');
                return;
            }

            setDeleteTarget(null);
            await fetchRoles();
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete role');
        } finally {
            setDeleting(false);
        }
    };

    /* ─── Render ────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <RefreshCw className="animate-spin text-indigo-500" size={32} />
                <p className="text-slate-400 font-medium">Loading roles...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Shield className="text-indigo-500" size={32} />
                        Roles & Access
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">
                        Manage roles and their module permissions.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={18} /> Add New Role
                </button>
            </div>

            {/* Roles List */}
            <div className="space-y-3">
                {roles.map(role => {
                    const isExpanded = expandedRole === role.role_id;
                    return (
                        <div
                            key={role.role_id}
                            className="bg-slate-800 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-600/60"
                        >
                            {/* Row */}
                            <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => setExpandedRole(isExpanded ? null : role.role_id)}>
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`p-2.5 rounded-xl ${role.is_built_in ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                        <Shield size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-semibold truncate">{role.display_name}</h3>
                                            {role.is_built_in && (
                                                <span className="text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                                    <Lock size={9} /> Built-in
                                                </span>
                                            )}
                                            {!role.is_active && (
                                                <span className="text-[10px] uppercase tracking-wider bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full shrink-0">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        {role.description && (
                                            <p className="text-sm text-slate-400 truncate mt-0.5">{role.description}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 ml-4">
                                    <span className="flex items-center gap-1.5 text-sm text-slate-400">
                                        <Users size={14} /> {role.employee_count}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEdit(role); }}
                                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50 transition-colors"
                                        title="Edit"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    {!role.is_built_in && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(role); }}
                                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                </div>
                            </div>

                            {/* Expanded Permission Preview */}
                            {isExpanded && (
                                <div className="px-5 pb-5 border-t border-slate-700/50">
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-slate-400 text-xs uppercase tracking-wider">
                                                    <th className="text-left py-2 pr-4 font-medium">Module</th>
                                                    <th className="text-center py-2 px-3 font-medium">View</th>
                                                    <th className="text-center py-2 px-3 font-medium">Create</th>
                                                    <th className="text-center py-2 px-3 font-medium">Edit</th>
                                                    <th className="text-center py-2 px-3 font-medium">Delete</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {role.permissions.length > 0 ? role.permissions.map(p => (
                                                    <tr key={p.module_name} className="border-t border-slate-800/50">
                                                        <td className="py-2.5 pr-4 text-slate-300 font-medium">{p.display_name || p.module_name}</td>
                                                        <td className="text-center py-2.5"><PermDot on={p.can_view} /></td>
                                                        <td className="text-center py-2.5"><PermDot on={p.can_create} /></td>
                                                        <td className="text-center py-2.5"><PermDot on={p.can_edit} /></td>
                                                        <td className="text-center py-2.5"><PermDot on={p.can_delete} /></td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan={5} className="py-4 text-center text-slate-500">No permissions assigned</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {roles.length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                        <Shield size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg">No roles found. Create one to get started.</p>
                    </div>
                )}
            </div>

            {/* ─── Create / Edit Modal ────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                            <h2 className="text-xl font-bold text-white">
                                {editingRole ? `Edit Role: ${editingRole.display_name}` : 'Create New Role'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                            {/* Name & Description */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Role Name *</label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        disabled={editingRole?.is_built_in}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="e.g. Warehouse Staff"
                                    />
                                    {editingRole?.is_built_in && (
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Lock size={10} /> Built-in role name cannot be changed</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                                    <input
                                        type="text"
                                        value={formDesc}
                                        onChange={e => setFormDesc(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="Short description..."
                                    />
                                </div>
                            </div>

                            {/* Status toggle */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-300">Status:</label>
                                <button
                                    type="button"
                                    onClick={() => setFormActive(!formActive)}
                                    className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${formActive ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${formActive ? 'translate-x-[22px]' : 'translate-x-[4px]'}`} />
                                </button>
                                <span className={`text-sm ${formActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {formActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            {/* Permission Matrix */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Module Permissions</h3>
                                    <div className="flex gap-2">
                                        <button onClick={selectAll} className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors">
                                            Select All
                                        </button>
                                        <button onClick={clearAll} className="text-xs text-slate-400 hover:text-slate-300 px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors">
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-800">
                                                <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Module</th>
                                                <th className="text-center py-3 px-2 text-slate-400 font-medium text-xs uppercase tracking-wider w-20">View</th>
                                                <th className="text-center py-3 px-2 text-slate-400 font-medium text-xs uppercase tracking-wider w-20">Create</th>
                                                <th className="text-center py-3 px-2 text-slate-400 font-medium text-xs uppercase tracking-wider w-20">Edit</th>
                                                <th className="text-center py-3 px-2 text-slate-400 font-medium text-xs uppercase tracking-wider w-20">Delete</th>
                                                <th className="text-center py-3 px-2 w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {modules.map((mod, i) => {
                                                const p = formPerms[mod.module_name] || { can_view: false, can_create: false, can_edit: false, can_delete: false };
                                                const allChecked = p.can_view && p.can_create && p.can_edit && p.can_delete;
                                                return (
                                                    <tr key={mod.module_name} className={`border-t border-slate-700/30 ${i % 2 === 0 ? '' : 'bg-slate-800/30'} hover:bg-slate-700/20 transition-colors`}>
                                                        <td className="py-3 px-4 text-slate-300 font-medium">{mod.display_name}</td>
                                                        {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map(field => (
                                                            <td key={field} className="text-center py-3 px-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => togglePerm(mod.module_name, field)}
                                                                    className="inline-flex items-center justify-center w-6 h-6 rounded transition-colors"
                                                                >
                                                                    {p[field]
                                                                        ? <CheckSquare size={18} className="text-indigo-400" />
                                                                        : <Square size={18} className="text-slate-600 hover:text-slate-400" />
                                                                    }
                                                                </button>
                                                            </td>
                                                        ))}
                                                        <td className="text-center py-3 px-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => allChecked ? clearAllForModule(mod.module_name) : selectAllForModule(mod.module_name)}
                                                                className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors"
                                                            >
                                                                {allChecked ? 'Clear' : 'All'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !formName.trim()}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                {saving && <RefreshCw size={14} className="animate-spin" />}
                                {editingRole ? 'Save Changes' : 'Create Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation Modal ─────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Delete &quot;{deleteTarget.display_name}&quot;?</h2>
                                {deleteTarget.employee_count > 0 ? (
                                    <p className="text-sm text-amber-400 mt-2">
                                        ⚠️ This role is assigned to <strong>{deleteTarget.employee_count}</strong> employee(s).
                                        Please reassign them before deleting this role.
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-400 mt-2">
                                        This action cannot be undone. The role and all its permission entries will be permanently removed.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="px-5 py-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            {deleteTarget.employee_count === 0 && (
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                                >
                                    {deleting && <RefreshCw size={14} className="animate-spin" />}
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function PermDot({ on }: { on: boolean }) {
    return (
        <span className={`inline-block w-3 h-3 rounded-full ${on ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-slate-700'}`} />
    );
}
