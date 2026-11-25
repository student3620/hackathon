import React, { useMemo } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { MuseumRecord } from '../types/museum';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (val: string) => void;
  selectedMedium: string;
  setSelectedMedium: (val: string) => void;
  selectedPeriod: string;
  setSelectedPeriod: (val: string) => void;
  selectedCulture: string;
  setSelectedCulture: (val: string) => void;
  selectedGeography: string;
  setSelectedGeography: (val: string) => void;
  records: MuseumRecord[];
  filteredCount: number;
  onResetFilters: () => void;
}

export const MISSING_GEOGRAPHY_FILTER = '__MISSING_GEOGRAPHY__';

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedDepartment,
  setSelectedDepartment,
  selectedMedium,
  setSelectedMedium,
  selectedPeriod,
  setSelectedPeriod,
  selectedCulture,
  setSelectedCulture,
  selectedGeography,
  setSelectedGeography,
  records,
  filteredCount,
  onResetFilters,
}) => {
  const { departments, mediums, periods, cultures, geographies } = useMemo(() => {
    const deptSet = new Set<string>();
    const medSet = new Set<string>();
    const perSet = new Set<string>();
    const cultSet = new Set<string>();
    const geoSet = new Set<string>();

    for (const r of records) {
      if (r.department?.trim()) deptSet.add(r.department.trim());
      if (r.medium?.trim()) medSet.add(r.medium.trim());
      if (r.period?.trim()) {
        perSet.add(r.period.trim());
      } else if (r.objectDate?.trim()) {
        perSet.add(r.objectDate.trim());
      }
      if (r.culture?.trim()) cultSet.add(r.culture.trim());
      if (r.country?.trim()) geoSet.add(r.country.trim());
      if (r.region?.trim()) geoSet.add(r.region.trim());
    }

    return {
      departments: Array.from(deptSet).sort((a, b) => a.localeCompare(b)),
      mediums: Array.from(medSet).sort((a, b) => a.localeCompare(b)),
      periods: Array.from(perSet).sort((a, b) => a.localeCompare(b)),
      cultures: Array.from(cultSet).sort((a, b) => a.localeCompare(b)),
      geographies: Array.from(geoSet).sort((a, b) => a.localeCompare(b)),
    };
  }, [records]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedDepartment !== 'all' ||
    selectedMedium !== 'all' ||
    selectedPeriod !== 'all' ||
    selectedCulture !== 'all' ||
    selectedGeography !== 'all';

  return (
    <section
      aria-label="Search and filter collection"
      className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-5 space-y-4 text-[#1C1917]"
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#72695D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by object title, Object ID, accession number, or object name..."
            aria-label="Search by object title or Object ID"
            className="w-full bg-[#FFFFFF] border border-[#D4C9B6] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#1C1917] placeholder-[#8C8377] focus:border-[#96722D] transition-colors"
          />
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
          <div className="text-sm text-[#4A443C] font-mono tabular-nums">
            <strong className="text-[#1C1917] font-semibold">{filteredCount.toLocaleString()}</strong>{' '}
            of {records.length.toLocaleString()} matching
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            disabled={!hasActiveFilters}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              hasActiveFilters
                ? 'bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] cursor-pointer'
                : 'bg-[#ECE6DA] text-[#9E9589] cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-3 border-t border-[#E8E0D2]">
        <div>
          <label
            htmlFor="filter-department"
            className="block text-xs font-medium text-[#5C554C] mb-1.5"
          >
            Department
          </label>
          <select
            id="filter-department"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#D4C9B6] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:border-[#96722D]"
          >
            <option value="all">All Departments ({departments.length})</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-medium"
            className="block text-xs font-medium text-[#5C554C] mb-1.5"
          >
            Material / Medium
          </label>
          <select
            id="filter-medium"
            value={selectedMedium}
            onChange={(e) => setSelectedMedium(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#D4C9B6] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:border-[#96722D]"
          >
            <option value="all">All Materials ({mediums.length})</option>
            {mediums.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-period"
            className="block text-xs font-medium text-[#5C554C] mb-1.5"
          >
            Period / Recorded Date
          </label>
          <select
            id="filter-period"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#D4C9B6] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:border-[#96722D]"
          >
            <option value="all">All Periods & Dates ({periods.length})</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-culture"
            className="block text-xs font-medium text-[#5C554C] mb-1.5"
          >
            Culture
          </label>
          <select
            id="filter-culture"
            value={selectedCulture}
            onChange={(e) => setSelectedCulture(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#D4C9B6] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:border-[#96722D]"
          >
            <option value="all">All Cultures ({cultures.length})</option>
            {cultures.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-geography"
            className="block text-xs font-medium text-[#5C554C] mb-1.5"
          >
            Country / Region
          </label>
          <select
            id="filter-geography"
            value={selectedGeography}
            onChange={(e) => setSelectedGeography(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#D4C9B6] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:border-[#96722D]"
          >
            <option value="all">All Origins ({geographies.length})</option>
            <option value={MISSING_GEOGRAPHY_FILTER}>Not recorded in catalogue</option>
            {geographies.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
};
