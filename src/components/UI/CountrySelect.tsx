import React, { useState, useRef, useEffect } from 'react';

interface Country {
  code: string;
  name: string;
}

// List of common countries
const COMMON_COUNTRIES: Country[] = [
  { code: 'CN', name: 'China' },
  { code: 'US', name: 'USA' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'U.K.' },
  { code: 'FR', name: 'France' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'RU', name: 'Russia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hongkong' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'the Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'IN', name: 'India' },
  { code: 'PL', name: 'Poland' },
];

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  placeholder = "Select a country or enter a country code"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCountries = COMMON_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInputValue(newValue);
    setSearchTerm(newValue);
    setIsOpen(true);
    onChange(newValue);
  };

  const handleSelectCountry = (country: Country) => {
    setInputValue(country.code);
    onChange(country.code);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const selectedCountry = COMMON_COUNTRIES.find(c => c.code === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 pr-10 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm min-h-[44px] sm:min-h-[48px] focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-sm sm:text-base"
          />
          
          {/* National flag display */}
          {selectedCountry && (
            <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
              <img
                src={`/image/flag/${selectedCountry.code.toLowerCase()}.svg`}
                alt={selectedCountry.code}
                className="w-5 h-4 rounded-sm"
                title={selectedCountry.name}
              />
            </div>
          )}
          
          {/* Pull down arrow */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Clear button */}
        {value && (
          <button
            onClick={handleClear}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-500 text-white rounded-lg sm:rounded-xl hover:bg-gray-600 transition-colors shadow-sm font-medium text-sm sm:text-base min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
          >
            Clear
          </button>
        )}
      </div>

      {/* Drop-down list */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country) => (
              <button
                key={country.code}
                onClick={() => handleSelectCountry(country)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none flex items-center gap-3"
              >
                <img
                  src={`/image/flag/${country.code.toLowerCase()}.svg`}
                  alt={country.code}
                  className="w-5 h-4 rounded-sm"
                />
                <span className="text-gray-900 dark:text-white">
                  {country.name}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {country.code}
                </span>
              </button>
            ))
          ) : searchTerm ? (
            <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
              No matching country found!
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
