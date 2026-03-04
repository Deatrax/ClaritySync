'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface GeneralSettings {
    id: number;
    company_name: string;
    company_email: string | null;
    company_phone: string | null;
    company_address: string | null;
    company_website: string | null;
    currency_code: string;
    currency_symbol: string;
    currency_position: 'BEFORE' | 'AFTER';
    logo_url: string | null;
    favicon_url: string | null;
    social_banner_url: string | null;
    updated_at: string | null;
    updated_by: number | null;
    updated_by_name: string | null;
}

interface SettingsContextType {
    settings: GeneralSettings | null;
    isLoading: boolean;
    refetch: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
    settings: null,
    isLoading: true,
    refetch: () => { },
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<GeneralSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setIsLoading(false);
            return;
        }

        fetch('http://localhost:5000/api/settings/general', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data) setSettings(data);
            })
            .catch((err) => console.error('SettingsContext fetch error:', err))
            .finally(() => setIsLoading(false));
    }, [tick]);

    // Apply favicon and document title dynamically
    useEffect(() => {
        if (!settings) return;

        if (settings.company_name) {
            document.title = settings.company_name;
        }

        if (settings.favicon_url) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = settings.favicon_url;
        }
    }, [settings?.favicon_url, settings?.company_name]);

    const refetch = () => setTick((t) => t + 1);

    return (
        <SettingsContext.Provider value={{ settings, isLoading, refetch }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => useContext(SettingsContext);
