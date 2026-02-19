import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  endpoint: string;
  label?: string;
  className?: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  placeholder,
  endpoint,
  label,
  className = ""
}) => {
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await api.get<any[]>(`${endpoint}?q=${value}`);
        // API returns array directly
        setSuggestions(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Failed to fetch suggestions', error);
        setSuggestions([]);
      }
    };

    const timeoutId = setTimeout(() => {
      if (showSuggestions) fetchSuggestions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, endpoint]);

  const handleSelect = (name: string) => {
    onChange(name);
    setShowSuggestions(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all outline-none"
      />
      
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-slate-400 text-sm">Loading...</div>
          ) : (
            suggestions.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item.name)}
                className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-slate-700 text-sm border-b border-slate-50 last:border-0"
              >
                {item.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
