import { useSettings } from '../context/SettingsContext';

/**
 * Formats a monetary amount using the configured currency symbol and position.
 *
 * @example
 * formatCurrency(1250, '৳', 'BEFORE')  // → '৳1,250.00'
 * formatCurrency(1250, '৳', 'AFTER')   // → '1,250.00 ৳'
 */
export function formatCurrency(
    amount: number,
    symbol: string,
    position: 'BEFORE' | 'AFTER'
): string {
    const formatted = (amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return position === 'BEFORE' ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
}

/**
 * Hook to use the global currency settings.
 */
export function useCurrency() {
    const { settings } = useSettings();

    const format = (amount: number) => {
        return formatCurrency(
            amount,
            settings?.currency_symbol || '$',
            settings?.currency_position || 'BEFORE'
        );
    };

    return {
        format,
        symbol: settings?.currency_symbol || '$',
        position: settings?.currency_position || 'BEFORE',
        code: settings?.currency_code || 'USD'
    };
}
