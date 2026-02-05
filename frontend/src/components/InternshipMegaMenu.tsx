import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Metadata {
    top_locations: string[];
    top_profiles: string[];
}

export function InternshipMegaMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<'locations' | 'profiles'>('locations');
    const [metadata, setMetadata] = useState<Metadata | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                setLoading(true);
                // Using a direct fetch or existing api client if it supports public generic GET
                const res = await api.get<Metadata>('/students/internships/metadata');
                setMetadata(res);
            } catch (err) {
                console.error("Failed to fetch menu metadata", err);
            } finally {
                setLoading(false);
            }
        };

        // Fetch only once essentially or when component mounts
        fetchMetadata();
    }, []);

    const categories = [
        { id: 'locations', label: 'Top Locations' },
        { id: 'profiles', label: 'Profile' },
        // { id: 'categories', label: 'Top Categories' }, // Could add more later
    ];

    const getItems = () => {
        if (!metadata) return [];
        if (activeCategory === 'locations') return metadata.top_locations;
        if (activeCategory === 'profiles') return metadata.top_profiles;
        return [];
    };

    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                className={`
          flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all
          ${isOpen ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
        `}
            >
                <span>Internships</span>
                <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Flyout Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 w-[600px] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in-down origin-top-left mt-1">
                    <div className="flex">
                        {/* Sidebar Categories */}
                        <div className="w-1/3 bg-slate-50 border-r border-slate-100 py-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onMouseEnter={() => setActiveCategory(cat.id as any)}
                                    className={`
                    w-full text-left px-4 py-3 text-sm font-medium transition-colors flex justify-between items-center
                    ${activeCategory === cat.id
                                            ? 'bg-white text-brand-600 border-l-4 border-brand-500'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-l-4 border-transparent'
                                        }
                  `}
                                >
                                    {cat.label}
                                    {activeCategory === cat.id && (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                            <div className="border-t border-slate-200 mt-2 pt-2">
                                <Link
                                    to="/posted-internships"
                                    className="block w-full text-left px-4 py-3 text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-slate-100 border-l-4 border-transparent"
                                >
                                    Explore All Internships
                                </Link>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="w-2/3 p-4 bg-white min-h-[300px]">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                {activeCategory === 'locations' ? 'Popular Cities' : 'Popular Profiles'}
                            </h4>

                            {loading ? (
                                <div className="flex items-center justify-center h-40">
                                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {/* Add "Work From Home" explicitly for locations/profiles or just include if backend sends it */}
                                    {activeCategory === 'locations' && !getItems().includes('Work From Home') && (
                                        <Link
                                            to="/student?mode=remote"
                                            className="text-sm text-slate-600 hover:text-brand-600 hover:underline py-1 truncate"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            Work from Home
                                        </Link>
                                    )}

                                    {getItems().map((item, idx) => (
                                        <Link
                                            key={idx}
                                            to={activeCategory === 'locations' 
                                                ? `/student?location=${encodeURIComponent(item)}`
                                                : `/student?search=${encodeURIComponent(item)}`
                                            }
                                            className="text-sm text-slate-600 hover:text-brand-600 hover:underline py-1 truncate"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            {item}
                                        </Link>
                                    ))}

                                    {getItems().length === 0 && (
                                        <p className="text-sm text-slate-400 italic col-span-2">No active internships found.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
