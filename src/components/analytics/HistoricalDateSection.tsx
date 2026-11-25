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
import { Calendar, ArrowUpRight, Info } from 'lucide-react';
import type {
  CenturyBucket,
  DateAnalysisSummary,
  HistoricalPeriodItem,
} from '../../types/analytics';

interface HistoricalDateSectionProps {
  summary: DateAnalysisSummary;
  centuries: CenturyBucket[];
  timeline: HistoricalPeriodItem[];
  selectedPeriod: string;
  selectedCentury: string;
  onSelectPeriod: (periodId: string) => void;
  onSelectCentury: (centuryId: string) => void;
  onInspectObjectId: (objectID: string | number) => void;
}

function formatHistoricalYear(year: string | number): string {
  const num = Number(year);
  if (!Number.isFinite(num)) return String(year);
  if (num < 0) return `${Math.abs(num).toLocaleString()} BCE`;
  return `${num} CE`;
}

export const HistoricalDateSection: React.FC<HistoricalDateSectionProps> = ({
  summary,
  centuries,
  timeline,
  selectedPeriod,
  selectedCentury,
  onSelectPeriod,
  onSelectCentury,
  onInspectObjectId,
}) => {
  const maxTimelineCount = Math.max(1, ...timeline.map((t) => t.count));

  return (
    <section aria-labelledby="section-historical-dates" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-[#2E2A25]">
        <div>
          <div className="text-xs font-mono text-[#D1B06B] uppercase tracking-wider">
            Section 01 · Chronological Distribution
          </div>
          <h3
            id="section-historical-dates"
            className="text-xl sm:text-2xl font-serif font-semibold text-[#FCFAF5] mt-1"
          >
            Historical Date Analysis
          </h3>
        </div>
        <p className="text-xs text-[#A69E92] max-w-md">
          Calculated numerically from <span className="font-mono">objectBeginDate</span> and{' '}
          <span className="font-mono">objectEndDate</span> (BCE & CE) while preserving original
          catalogue date descriptions.
        </p>
      </div>

      {/* Date Information Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-4 text-[#1C1917]">
          <div className="text-xs font-medium text-[#6B6357]">Objects with Recorded Dates</div>
          <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
            {summary.withRecordedDates.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6357] mt-1 tabular-nums">
            {summary.withValidNumericDates.toLocaleString()} with valid numeric span
          </div>
        </div>

        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-4 text-[#1C1917]">
          <div className="text-xs font-medium text-[#6B6357]">Objects with Missing Dates</div>
          <div className="text-2xl font-serif font-semibold text-[#8A6326] tabular-nums mt-1">
            {summary.missingDates.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6357] mt-1">Preserved as unrecorded</div>
        </div>

        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-4 text-[#1C1917]">
          <div className="text-xs font-medium text-[#6B6357]">Objects with Date Ranges</div>
          <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
            {summary.withDateRanges.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6357] mt-1">Multi-year spans (not exact years)</div>
        </div>

        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-4 text-[#1C1917]">
          <div className="text-xs font-medium text-[#6B6357]">Approximate / Descriptive Dates</div>
          <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
            {summary.withApproximateDates.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6357] mt-1">e.g. ca., century, dynasty, probably</div>
        </div>
      </div>

      {/* Earliest and Latest Recorded Date Inspection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summary.earliestRecord && (
          <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-5 text-[#1C1917] flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono uppercase tracking-wider text-[#755821] font-medium">
                  Earliest Recorded Date Value
                </span>
                <span className="font-mono text-[#6B6357] tabular-nums">
                  ID {summary.earliestRecord.objectID}
                </span>
              </div>
              <div className="text-lg font-serif font-semibold text-[#1C1917]">
                {summary.earliestRecord.objectDate ||
                  formatHistoricalYear(summary.earliestRecord.objectBeginDate)}
              </div>
              <p className="text-sm text-[#4A443C] line-clamp-1">
                {summary.earliestRecord.title || summary.earliestRecord.objectName || 'Untitled'}
              </p>
              <div className="text-xs text-[#6B6357] font-mono tabular-nums">
                Numeric span: {formatHistoricalYear(summary.earliestRecord.objectBeginDate)} to{' '}
                {formatHistoricalYear(summary.earliestRecord.objectEndDate)}
              </div>
            </div>

            <div className="pt-2 border-t border-[#E8E0D2] flex items-center justify-between">
              <span className="text-xs text-[#6B6357] truncate">
                {summary.earliestRecord.department}
              </span>
              <button
                type="button"
                onClick={() => onInspectObjectId(summary.earliestRecord!.objectID)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#755821] hover:text-[#1C1917] cursor-pointer whitespace-nowrap"
              >
                Inspect Record
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {summary.latestRecord && (
          <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-5 text-[#1C1917] flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono uppercase tracking-wider text-[#755821] font-medium">
                  Latest Recorded Date Value
                </span>
                <span className="font-mono text-[#6B6357] tabular-nums">
                  ID {summary.latestRecord.objectID}
                </span>
              </div>
              <div className="text-lg font-serif font-semibold text-[#1C1917]">
                {summary.latestRecord.objectDate ||
                  formatHistoricalYear(summary.latestRecord.objectEndDate)}
              </div>
              <p className="text-sm text-[#4A443C] line-clamp-1">
                {summary.latestRecord.title || summary.latestRecord.objectName || 'Untitled'}
              </p>
              <div className="text-xs text-[#6B6357] font-mono tabular-nums">
                Numeric span: {formatHistoricalYear(summary.latestRecord.objectBeginDate)} to{' '}
                {formatHistoricalYear(summary.latestRecord.objectEndDate)}
              </div>
            </div>

            <div className="pt-2 border-t border-[#E8E0D2] flex items-center justify-between">
              <span className="text-xs text-[#6B6357] truncate">
                {summary.latestRecord.department}
              </span>
              <button
                type="button"
                onClick={() => onInspectObjectId(summary.latestRecord!.objectID)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#755821] hover:text-[#1C1917] cursor-pointer whitespace-nowrap"
              >
                Inspect Record
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chart 1: Century Distribution Bar Chart */}
      <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-serif font-semibold text-[#1C1917]">
              Historical Date Distribution Across Centuries (BCE & CE)
            </h4>
            <p className="text-xs text-[#5C554C] mt-1">
              Click any bar to inspect the catalogue records overlapping that century range.
            </p>
          </div>
          {selectedCentury !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectCentury('all')}
              className="text-xs font-semibold text-[#755821] hover:underline self-start cursor-pointer whitespace-nowrap"
            >
              Clear century selection
            </button>
          )}
        </div>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={centuries}
              margin={{ top: 12, right: 16, left: 8, bottom: 54 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                angle={-35}
                textAnchor="end"
                interval={0}
                height={62}
                tick={{ fill: '#4A443C', fontSize: 11 }}
                axisLine={{ stroke: '#D4C9B6' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#4A443C', fontSize: 11 }}
                axisLine={{ stroke: '#D4C9B6' }}
                tickLine={false}
                label={{
                  value: 'Overlapping Objects',
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
                  const item = payload[0].payload as CenturyBucket;
                  return (
                    <div className="bg-[#1B1917] text-[#FCFAF5] border border-[#3E372E] rounded-lg px-3.5 py-2.5 text-xs shadow-lg space-y-1">
                      <div className="font-serif font-semibold text-sm text-[#D1B06B]">
                        {item.label}
                      </div>
                      <div className="font-mono tabular-nums">
                        Date-range overlap count: <strong>{item.overlapCount.toLocaleString()}</strong>
                      </div>
                      <div className="font-mono tabular-nums text-[#C8C0B4]">
                        Fully contained within bucket: {item.exactSpanCount.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-[#A69E92] pt-1">
                        Click bar to view matching objects
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="overlapCount"
                name="Overlapping Objects"
                radius={[4, 4, 0, 0]}
                onClick={(barData) => {
                  const payload = barData?.payload as CenturyBucket | undefined;
                  if (payload?.id) {
                    onSelectCentury(selectedCentury === payload.id ? 'all' : payload.id);
                  }
                }}
                className="cursor-pointer"
              >
                {centuries.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={
                      selectedCentury === entry.id
                        ? '#755821'
                        : selectedCentury === 'all'
                        ? '#B89248'
                        : '#D4C5A3'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-start gap-2 text-xs text-[#5C554C] bg-[#F4EFE4] border border-[#E5DDD0] rounded-lg px-3.5 py-2.5">
          <Info className="w-4 h-4 text-[#96722D] shrink-0 mt-0.5" />
          <span>
            <strong>Methodology:</strong> Counts reflect <em>date-range overlaps</em> — records
            whose numerical date span (<span className="font-mono">objectBeginDate</span>–
            <span className="font-mono">objectEndDate</span>) crosses multiple centuries are
            counted in each overlapped bucket so approximate ranges are never misrepresented as a
            single exact year.
          </span>
        </div>
      </div>

      {/* Chart 2: Interactive Historical Timeline */}
      <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-serif font-semibold text-[#1C1917]">
              Interactive Historical Timeline
            </h4>
            <p className="text-xs text-[#5C554C] mt-1">
              Select a historical period on the timeline to filter analytics and explore its
              catalogue records. Counts use date-range overlap across each era.
            </p>
          </div>
          {selectedPeriod !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectPeriod('all')}
              className="text-xs font-semibold text-[#755821] hover:underline self-start cursor-pointer whitespace-nowrap"
            >
              Show all periods
            </button>
          )}
        </div>

        <div className="relative">
          {/* Connecting chronological spine on desktop */}
          <div
            className="hidden lg:block absolute left-4 right-4 top-[22px] h-px bg-[#D4C9B6]"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-3">
            {timeline.map((era) => {
              const isSelected = selectedPeriod === era.id;
              const barPct = Math.max(4, Math.round((era.count / maxTimelineCount) * 100));

              return (
                <button
                  key={era.id}
                  type="button"
                  onClick={() => onSelectPeriod(isSelected ? 'all' : era.id)}
                  aria-pressed={isSelected}
                  className={`relative text-left rounded-lg border p-3.5 flex flex-col justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1B1917] border-[#B89248] text-[#FCFAF5]'
                      : 'bg-[#FFFFFF] border-[#DDD4C4] hover:border-[#B89248] text-[#1C1917]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <Calendar
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-[#D1B06B]' : 'text-[#96722D]'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-mono tabular-nums ${
                          isSelected ? 'text-[#D1B06B]' : 'text-[#6B6357]'
                        }`}
                      >
                        {era.spanLabel}
                      </span>
                    </div>
                    <div className="text-xs font-semibold leading-snug">{era.shortLabel}</div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-lg font-serif font-semibold tabular-nums">
                      {era.count.toLocaleString()}
                    </div>
                    <div
                      className={`w-full h-1.5 rounded-full overflow-hidden ${
                        isSelected ? 'bg-[#36312B]' : 'bg-[#ECE6DA]'
                      }`}
                    >
                      <div
                        className={`h-full rounded-full ${
                          isSelected ? 'bg-[#D1B06B]' : 'bg-[#B89248]'
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
