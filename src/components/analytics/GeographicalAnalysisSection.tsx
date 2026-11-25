import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { ShieldAlert } from 'lucide-react';
import type { GeographyCountItem, GeographySummary } from '../../types/analytics';

interface GeographicalAnalysisSectionProps {
  summary: GeographySummary;
  countries: GeographyCountItem[];
  regions: GeographyCountItem[];
  geographyTypes: GeographyCountItem[];
  selectedCountry: string;
  selectedRegion: string;
  selectedGeographyType: string;
  onSelectCountry: (country: string) => void;
  onSelectRegion: (region: string) => void;
  onSelectGeographyType: (geoType: string) => void;
}

export const MISSING_COUNTRY_FILTER = '__MISSING_COUNTRY__';

function truncateLabel(text: string, maxLen = 22): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

export const GeographicalAnalysisSection: React.FC<GeographicalAnalysisSectionProps> = ({
  summary,
  countries,
  regions,
  geographyTypes,
  selectedCountry,
  selectedRegion,
  selectedGeographyType,
  onSelectCountry,
  onSelectRegion,
  onSelectGeographyType,
}) => {
  const maxGeoTypeCount = Math.max(1, ...geographyTypes.map((g) => g.count));

  return (
    <section aria-labelledby="section-geographical-analysis" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-[#2E2A25]">
        <div>
          <div className="text-xs font-mono text-[#D1B06B] uppercase tracking-wider">
            Section 03 · Documented Provenance Geography
          </div>
          <h3
            id="section-geographical-analysis"
            className="text-xl sm:text-2xl font-serif font-semibold text-[#FCFAF5] mt-1"
          >
            Geographical Analysis
          </h3>
        </div>
        <p className="text-xs text-[#A69E92] max-w-md">
          Reflects strictly documented <span className="font-mono">country</span>,{' '}
          <span className="font-mono">region</span>, and{' '}
          <span className="font-mono">geographyType</span> values. Unknown origins are never
          inferred.
        </p>
      </div>

      {/* PS 223 Safeguard Banner */}
      <div className="bg-[#24201C] border border-[#4A3F2E] rounded-xl px-5 py-3.5 text-xs sm:text-sm text-[#E5DDD0] flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-[#D1B06B] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#D1B06B] font-semibold">PS 223 Unknown-Origin Protection:</strong>{' '}
          Charts below use only documented catalogue geography fields. Countries and regions are
          never derived from <span className="font-mono">culture</span>,{' '}
          <span className="font-mono">medium</span>, artist nationality, or photographs. Missing
          values remain labeled <em>Not recorded in catalogue</em>.
        </p>
      </div>

      {/* Geography Information Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-4 text-[#1C1917]">
          <div className="text-xs font-medium text-[#6B6357]">Recorded Country Info</div>
          <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
            {summary.withCountry.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6357] mt-1">Explicit country documented</div>
        </div>

        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-4 text-[#1C1917]">
          <div className="text-xs font-medium text-[#6B6357]">Recorded Region Info</div>
          <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
            {summary.withRegion.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6357] mt-1">Explicit region documented</div>
        </div>

        <button
          type="button"
          onClick={() =>
            onSelectCountry(
              selectedCountry === MISSING_COUNTRY_FILTER ? 'all' : MISSING_COUNTRY_FILTER
            )
          }
          className={`text-left rounded-xl p-4 border transition-colors cursor-pointer ${
            selectedCountry === MISSING_COUNTRY_FILTER
              ? 'bg-[#1B1917] border-[#B89248] text-[#FCFAF5]'
              : 'bg-[#FCFAF5] border-[#DDD4C4] hover:border-[#B89248] text-[#1C1917]'
          }`}
        >
          <div
            className={`text-xs font-medium ${
              selectedCountry === MISSING_COUNTRY_FILTER ? 'text-[#C8C0B4]' : 'text-[#6B6357]'
            }`}
          >
            Missing Country Info
          </div>
          <div
            className={`text-2xl font-serif font-semibold tabular-nums mt-1 ${
              selectedCountry === MISSING_COUNTRY_FILTER ? 'text-[#D1B06B]' : 'text-[#8A6326]'
            }`}
          >
            {summary.missingCountry.toLocaleString()}
          </div>
          <div
            className={`text-xs mt-1 ${
              selectedCountry === MISSING_COUNTRY_FILTER ? 'text-[#A69E92]' : 'text-[#6B6357]'
            }`}
          >
            Not recorded in catalogue · Click to inspect
          </div>
        </button>

        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-4 text-[#1C1917]">
          <div className="text-xs font-medium text-[#6B6357]">Missing All Geography</div>
          <div className="text-2xl font-serif font-semibold text-[#8A6326] tabular-nums mt-1">
            {summary.missingGeography.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6357] mt-1">No country, region, or city</div>
        </div>
      </div>

      {/* Row: Country Distribution (Horizontal Bar) + Regional Distribution (Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 6: Country Distribution Horizontal Bar Chart */}
        <div className="lg:col-span-6 bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-serif font-semibold text-[#1C1917]">
                Documented Country Distribution
              </h4>
              <p className="text-xs text-[#5C554C] mt-1">
                Top recorded countries from the catalogue <span className="font-mono">country</span>{' '}
                field. Click a bar to filter by country.
              </p>
            </div>
            {selectedCountry !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectCountry('all')}
                className="text-xs font-semibold text-[#755821] hover:underline whitespace-nowrap cursor-pointer"
              >
                Clear country
              </button>
            )}
          </div>

          {countries.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-sm text-[#6B6357] text-center px-6">
              No documented country values are recorded for the currently filtered subset.
            </div>
          ) : (
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={countries}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 8, bottom: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#4A443C', fontSize: 11 }}
                    axisLine={{ stroke: '#D4C9B6' }}
                    tickLine={false}
                    label={{
                      value: 'Documented Objects',
                      position: 'insideBottom',
                      offset: -8,
                      style: { fill: '#6B6357', fontSize: 11 },
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={136}
                    tickFormatter={(v: string) => truncateLabel(v, 20)}
                    tick={{ fill: '#292524', fontSize: 11 }}
                    axisLine={{ stroke: '#D4C9B6' }}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#ECE6DA', opacity: 0.6 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as GeographyCountItem;
                      return (
                        <div className="bg-[#1B1917] text-[#FCFAF5] border border-[#3E372E] rounded-lg px-3.5 py-2.5 text-xs shadow-lg space-y-1">
                          <div className="font-serif font-semibold text-sm text-[#D1B06B]">
                            {item.label}
                          </div>
                          <div className="font-mono tabular-nums">
                            Documented objects: <strong>{item.count.toLocaleString()}</strong>
                          </div>
                          <div className="text-[11px] text-[#A69E92]">
                            Click bar to filter this country
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    onClick={(barData) => {
                      const item = barData?.payload as GeographyCountItem | undefined;
                      if (item?.label) {
                        onSelectCountry(selectedCountry === item.label ? 'all' : item.label);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {countries.map((entry) => (
                      <Cell
                        key={entry.label}
                        fill={
                          selectedCountry === entry.label
                            ? '#755821'
                            : selectedCountry === 'all'
                            ? '#4E6E58'
                            : '#A6BCB0'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 7: Region Distribution Bar Chart */}
        <div className="lg:col-span-6 bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-serif font-semibold text-[#1C1917]">
                Documented Regional Distribution
              </h4>
              <p className="text-xs text-[#5C554C] mt-1">
                Top recorded regions from the catalogue <span className="font-mono">region</span>{' '}
                field. Click a bar to inspect objects from that region.
              </p>
            </div>
            {selectedRegion !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectRegion('all')}
                className="text-xs font-semibold text-[#755821] hover:underline whitespace-nowrap cursor-pointer"
              >
                Clear region
              </button>
            )}
          </div>

          {regions.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-sm text-[#6B6357] text-center px-6">
              No documented region values are recorded for the currently filtered subset.
            </div>
          ) : (
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={regions}
                  margin={{ top: 10, right: 16, left: 8, bottom: 72 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    height={76}
                    tickFormatter={(v: string) => truncateLabel(v, 18)}
                    tick={{ fill: '#292524', fontSize: 11 }}
                    axisLine={{ stroke: '#D4C9B6' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#4A443C', fontSize: 11 }}
                    axisLine={{ stroke: '#D4C9B6' }}
                    tickLine={false}
                    label={{
                      value: 'Objects',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 4,
                      style: { fill: '#6B6357', fontSize: 11, textAnchor: 'middle' },
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: '#ECE6DA', opacity: 0.6 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as GeographyCountItem;
                      return (
                        <div className="bg-[#1B1917] text-[#FCFAF5] border border-[#3E372E] rounded-lg px-3.5 py-2.5 text-xs shadow-lg space-y-1">
                          <div className="font-serif font-semibold text-sm text-[#D1B06B]">
                            {item.label}
                          </div>
                          <div className="font-mono tabular-nums">
                            Recorded objects: <strong>{item.count.toLocaleString()}</strong>
                          </div>
                          <div className="text-[11px] text-[#A69E92]">
                            Click bar to inspect region records
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    onClick={(barData) => {
                      const item = barData?.payload as GeographyCountItem | undefined;
                      if (item?.label) {
                        onSelectRegion(selectedRegion === item.label ? 'all' : item.label);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {regions.map((entry) => (
                      <Cell
                        key={entry.label}
                        fill={
                          selectedRegion === entry.label
                            ? '#755821'
                            : selectedRegion === 'all'
                            ? '#A65233'
                            : '#CFA697'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Geography Type Analysis */}
      <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-serif font-semibold text-[#1C1917]">
              Geography Type Distinctions
            </h4>
            <p className="text-xs text-[#5C554C] mt-1">
              Original <span className="font-mono">geographyType</span> qualifiers preserved
              verbatim (such as <em>Made in</em>, <em>From</em>, <em>Attributed to</em>, and{' '}
              <em>Excavated in</em>) without merging distinct relationships into one confirmed
              origin.
            </p>
          </div>
          {selectedGeographyType !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectGeographyType('all')}
              className="text-xs font-semibold text-[#755821] hover:underline self-start whitespace-nowrap cursor-pointer"
            >
              Clear geography type
            </button>
          )}
        </div>

        {geographyTypes.length === 0 ? (
          <p className="text-sm text-[#6B6357] py-4">
            No <span className="font-mono">geographyType</span> qualifiers are recorded in the
            current selection.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {geographyTypes.map((gt) => {
              const isSelected = selectedGeographyType === gt.label;
              const widthPct = Math.max(4, Math.round((gt.count / maxGeoTypeCount) * 100));
              return (
                <button
                  key={gt.label}
                  type="button"
                  onClick={() => onSelectGeographyType(isSelected ? 'all' : gt.label)}
                  className={`text-left rounded-lg border px-4 py-3 transition-colors space-y-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#1B1917] border-[#B89248] text-[#FCFAF5]'
                      : 'bg-[#FFFFFF] border-[#E2DACB] hover:border-[#B89248] text-[#1C1917]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium truncate">{gt.label}</span>
                    <span
                      className={`text-xs font-mono tabular-nums shrink-0 ${
                        isSelected ? 'text-[#D1B06B]' : 'text-[#5C554C]'
                      }`}
                    >
                      {gt.count.toLocaleString()} {gt.count === 1 ? 'record' : 'records'}
                    </span>
                  </div>
                  <div
                    className={`w-full h-1.5 rounded-full overflow-hidden ${
                      isSelected ? 'bg-[#36312B]' : 'bg-[#ECE6DA]'
                    }`}
                  >
                    <div
                      className="h-full rounded-full bg-[#B89248]"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
