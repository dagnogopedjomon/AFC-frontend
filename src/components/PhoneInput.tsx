'use client';

import { useState, forwardRef } from 'react';

interface Country {
  code: string;
  name: string;
  flag: string;
  dial: string;
}

const COUNTRIES: Country[] = [
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', dial: '+225' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', dial: '+32' },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭', dial: '+41' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸', dial: '+1' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dial: '+221' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dial: '+223' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial: '+226' },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳', dial: '+224' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', dial: '+228' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', dial: '+229' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '+233' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '+234' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dial: '+237' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', dial: '+241' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', dial: '+242' },
  { code: 'CD', name: 'RDC', flag: '🇨🇩', dial: '+243' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', dial: '+212' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳', dial: '+216' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿', dial: '+213' },
  { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dial: '+44' },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪', dial: '+49' },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸', dial: '+34' },
  { code: 'IT', name: 'Italie', flag: '🇮🇹', dial: '+39' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial: '+351' },
  { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱', dial: '+31' },
  { code: 'OTHER', name: 'Autre / Sans indicatif', flag: '🌍', dial: '' },
];

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  defaultCountry?: string;
  disabled?: boolean;
  /** 'dark' pour le login, 'light' pour les formulaires classiques */
  variant?: 'dark' | 'light';
}

const VARIANTS = {
  dark: {
    button: 'border-neutral-600 bg-neutral-700/50 text-neutral-100 hover:bg-neutral-700',
    input: 'border-neutral-600 bg-neutral-700/50 text-neutral-100 caret-sky-400 placeholder:text-neutral-500 focus:border-sky-500 focus:ring-sky-500/25',
    dropdown: 'border-neutral-600 bg-neutral-800',
    item: 'text-neutral-100 hover:bg-neutral-700',
    selectedItem: 'bg-neutral-700',
    dial: 'text-neutral-400',
  },
  light: {
    button: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    input: 'border-gray-300 bg-white text-[var(--foreground)] caret-sky-500 placeholder:text-gray-400 focus:border-[var(--sky-blue)] focus:ring-[var(--sky-blue-soft)]',
    dropdown: 'border-gray-200 bg-white shadow-lg',
    item: 'text-gray-700 hover:bg-gray-50',
    selectedItem: 'bg-sky-50',
    dial: 'text-gray-400',
  },
};

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, placeholder, className, inputClassName, defaultCountry = 'CI', disabled, variant = 'dark' }, ref) => {
    const [selected, setSelected] = useState<Country>(
      COUNTRIES.find((c) => c.code === defaultCountry) ?? COUNTRIES[0],
    );
    const [open, setOpen] = useState(false);
    const v = VARIANTS[variant];

    const handleCountryChange = (country: Country) => {
      setSelected(country);
      setOpen(false);
      const digits = value.replace(/^\+|\D/g, '');
      const selectedDialDigits = selected.dial.replace('+', '');
      const withoutOldDial = selectedDialDigits && digits.startsWith(selectedDialDigits)
        ? digits.slice(selectedDialDigits.length)
        : digits;
      onChange(country.dial + withoutOldDial);
    };

    const handleInputChange = (raw: string) => {
      const digits = raw.replace(/\D/g, '');
      if (!digits) {
        onChange(selected.dial);
        return;
      }
      const fullValue = raw.startsWith('+') || raw.startsWith(selected.dial) ? raw : selected.dial + digits;
      onChange(fullValue);
    };

    const displayValue = value.startsWith('+') || selected.dial === '' ? value : value ? selected.dial + value : '';

    return (
      <div className={`relative flex items-center ${className ?? ''}`}>
        <button
          type="button"
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          className={`flex items-center gap-1 px-3 py-3 rounded-l-xl border border-r-0 text-sm transition disabled:opacity-50 ${v.button}`}
          title={selected.name}
        >
          <span className="text-base">{selected.flag}</span>
          <span className="hidden sm:inline">{selected.dial}</span>
          <span className="text-xs">▼</span>
        </button>
        <input
          ref={ref}
          type="tel"
          value={displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder || `${selected.dial} 07 12 34 56 78`}
          disabled={disabled}
          className={`flex-1 rounded-r-xl border px-4 py-3 outline-none transition focus:ring-2 ${v.input} ${inputClassName ?? ''}`}
        />
        {open && (
          <div className={`absolute left-0 top-full z-20 mt-1 max-h-60 w-64 overflow-auto rounded-xl border ${v.dropdown}`}>
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleCountryChange(c)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${v.item} ${c.code === selected.code ? v.selectedItem : ''}`}
              >
                <span className="text-base">{c.flag}</span>
                <span className="flex-1">{c.name}</span>
                <span className={`${v.dial}`}>{c.dial}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput, COUNTRIES };
