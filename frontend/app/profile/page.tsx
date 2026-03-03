"use client";

import React, { useEffect, useState, useRef } from 'react';
import { User, Camera, FileImage, MapPin, Save, Pencil, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

interface EmployeeProfile {
    employee_id: number;
    name: string;
    designation: string | null;
    phone: string | null;
    email: string | null;
    role: string;
    is_active: boolean;
    join_date: string | null;
    basic_salary: number | null;
    address: string | null;
    photo_url: string | null;
    nid_photo_url: string | null;
    created_at: string;
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function PhotoUploader({
    label,
    icon,
    value,
    onChange,
    accept = 'image/*',
}: {
    label: string;
    icon: React.ReactNode;
    value: string | null;
    onChange: (dataUrl: string | null) => void;
    accept?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const dataUrl = await fileToDataUrl(file);
        onChange(dataUrl);
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="flex items-start gap-3">
                <div
                    className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors overflow-hidden shrink-0"
                    onClick={() => inputRef.current?.click()}
                >
                    {value ? (
                        <img src={value} alt={label} className="w-full h-full object-cover" />
                    ) : (
                        <>
                            {icon}
                            <span className="text-xs text-gray-400 mt-1">Click to upload</span>
                        </>
                    )}
                </div>
                <div className="flex flex-col gap-2 mt-1">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                        <Camera className="w-3.5 h-3.5" />
                        {value ? 'Change photo' : 'Upload photo'}
                    </button>
                    {value && (
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                            <X className="w-3.5 h-3.5" />
                            Remove
                        </button>
                    )}
                    <p className="text-xs text-gray-400">JPG, PNG, GIF up to 5MB</p>
                </div>
            </div>
            <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        </div>
    );
}

function ProfileContent() {
    const { token } = useAuth();
    const [profile, setProfile] = useState<EmployeeProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [noEmployee, setNoEmployee] = useState(false);

    // Edit form state
    const [designation, setDesignation] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [nidPhotoUrl, setNidPhotoUrl] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const res = await fetch('/api/employees/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.status === 400) { setNoEmployee(true); return; }
                if (!res.ok) throw new Error('Failed to load profile');
                const data = await res.json();
                setProfile(data);
                // Pre-fill form
                setDesignation(data.designation ?? '');
                setPhone(data.phone ?? '');
                setAddress(data.address ?? '');
                setPhotoUrl(data.photo_url ?? null);
                setNidPhotoUrl(data.nid_photo_url ?? null);
            } catch (err) {
                setError('Could not load your profile.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/employees/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ designation, phone, address, photo_url: photoUrl, nid_photo_url: nidPhotoUrl }),
            });
            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error || 'Save failed');
            }
            const updated = await res.json();
            setProfile(updated);
            setEditing(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-gray-400">Loading profile…</div>
            </div>
        );
    }

    if (noEmployee) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center max-w-sm p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h2 className="text-lg font-semibold text-gray-700 mb-1">No employee record linked</h2>
                    <p className="text-sm text-gray-400">Your user account is not connected to an employee profile. Contact an administrator.</p>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <User className="w-6 h-6 text-indigo-600" />
                            My Profile
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">View and edit your personal information</p>
                    </div>
                    {!editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                        >
                            <Pencil className="w-4 h-4" />
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {saved && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
                        <CheckCircle className="w-4 h-4" />
                        Profile updated successfully!
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
                )}

                {/* Profile Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Banner */}
                    <div className="h-24 bg-gradient-to-r from-indigo-500 to-blue-600" />
                    <div className="px-6 pb-6">
                        {/* Avatar */}
                        <div className="flex items-end gap-4 -mt-12 mb-4">
                            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                                {profile.photo_url ? (
                                    <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-indigo-600">{profile.name.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div className="pb-1">
                                <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
                                <p className="text-sm text-gray-500">{profile.designation || 'No designation set'}</p>
                            </div>
                            <div className="ml-auto pb-1">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${profile.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {profile.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                                    {profile.role}
                                </span>
                            </div>
                        </div>

                        {/* Read-only info grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            <InfoRow label="Email" value={profile.email} />
                            <InfoRow label="Phone" value={profile.phone} />
                            <InfoRow label="Join Date" value={profile.join_date ? new Date(profile.join_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
                            <InfoRow label="Salary" value={profile.basic_salary != null ? `৳${Number(profile.basic_salary).toLocaleString()}` : null} />
                            <div className="sm:col-span-2">
                                <InfoRow label="Address" value={profile.address} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* NID Photo View */}
                {profile.nid_photo_url && !editing && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <FileImage className="w-4 h-4 text-indigo-500" />
                            NID Photo
                        </h3>
                        <img src={profile.nid_photo_url} alt="NID" className="max-w-xs rounded-lg border border-gray-200 shadow-sm" />
                    </div>
                )}

                {/* Edit Form */}
                {editing && (
                    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                        <h3 className="text-base font-semibold text-gray-900">Edit Your Information</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                <input
                                    type="text" value={designation} onChange={(e) => setDesignation(e.target.value)}
                                    placeholder="e.g. Software Engineer"
                                    className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+880 1700-000000"
                                    className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                Address
                            </label>
                            <textarea
                                value={address} onChange={(e) => setAddress(e.target.value)}
                                placeholder="Full address…" rows={3}
                                className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <PhotoUploader
                                label="Profile Photo"
                                icon={<Camera className="w-8 h-8 text-gray-300" />}
                                value={photoUrl}
                                onChange={setPhotoUrl}
                            />
                            <PhotoUploader
                                label="NID Photo"
                                icon={<FileImage className="w-8 h-8 text-gray-300" />}
                                value={nidPhotoUrl}
                                onChange={setNidPhotoUrl}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditing(false);
                                    setError(null);
                                    // Reset
                                    setDesignation(profile.designation ?? '');
                                    setPhone(profile.phone ?? '');
                                    setAddress(profile.address ?? '');
                                    setPhotoUrl(profile.photo_url ?? null);
                                    setNidPhotoUrl(profile.nid_photo_url ?? null);
                                }}
                                className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit" disabled={saving}
                                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm text-gray-800 mt-0.5">{value || <span className="text-gray-400 italic">Not provided</span>}</p>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <ProfileContent />
        </ProtectedRoute>
    );
}
