import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Info } from 'lucide-react';
import type {
  MaterialAnalysisSummary,
  MaterialCategoryItem,
  MaterialFrequencyItem,
  MaterialVsPeriodRow,
} from '../../types/analytics';

interface MaterialAnalysisSectionProps {
  summary: MaterialAnalysisSummary;
  topMediums: MaterialFrequencyItem[];
  categories: MaterialCategoryItem[];
  materialVsPeriod: MaterialVsPeriodRow[];
  selectedCategory: string;
  selectedMedium: string;
  onSelectCategory: (categoryId: string) => void;
  onSelectMedium: (medium: string) => void;
  onSelectPeriod: (periodId: string) => void;
}

export const MATERIAL_COLORS: Record<string, string> = {
  paper: '#B89248',
  metal: '#335C7D',
  ceramics: '#A65233',
  textiles: '#4E6E58',
  paint: '#7B4B6A',
  stone: '#6B6258',
  wood: '#8C6239',
  glass: '#3E7C8C',
  other: '#9C9182',
};

const STACKED_KEYS: { key: keyof MaterialVsPeriodRow; id: string; label: string; color: string }[] = [
  { key: 'paper', id: 'paper', label: 'Paper & Prints', color: MATERIAL_COLORS.paper },
  { key: 'metal', id: 'metal', label: 'Metal', color: MATERIAL_COLORS.metal },
  { key: 'ceramics', id: 'ceramics', label: 'Ceramics', color: MATERIAL_COLORS.ceramics },
  { key: 'textiles', id: 'textiles', label: 'Textiles', color: MATERIAL_COLORS.textiles },
  { key: 'paint', id: 'paint', label: 'Paint & Pigments', color: MATERIAL_COLORS.paint },
  { key: 'stone', id: 'stone', label: 'Stone', color: MATERIAL_COLORS.stone },
  { key: 'wood', id: 'wood', label: 'Wood', color: MATERIAL_COLORS.wood },
  { key: 'glass', id: 'glass', label: 'Glass', color: MATERIAL_COLORS.glass },
  { key: 'other', id: 'other', label: 'Other', color: MATERIAL_COLORS.other },
];

function truncateLabel(text: string, maxLen = 28): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

export const MaterialAnalysisSection: React.FC<MaterialAnalysisSectionProps> = ({
  summary,
  topMediums,
  categories,
  materialVsPeriod,
  selectedCategory,
  selectedMedium,
  onSelectCategory,
  onSelectMedium,
  onSelectPeriod,
}) => {
  const nonZeroCategories = categories.filter((c) => c.count > 0);

  return (
    <section aria-labelledby="section-material-analysis" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-[#2E2A25]">
        <div>
          <div className="text-xs font-mono text-[#D1B06B] uppercase tracking-wider">
            Section 02 · Catalogue Mediums & Materials
          </div>
          <h3
            id="section-material-analysis"
            className="text-xl sm:text-2xl font-serif font-semibold text-[#FCFAF5] mt-1"
          >
            Material Analysis
          </h3>
        </div>
        <p className="text-xs text-[#A69E92] max-w-md">
          Normalized material categories are derived exclusively from the original{' '}
          <span className="font-mono">medium</span> field and kept strictly separate from raw
          catalogue text.
        </p>
      </div>

      {/* Material Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-4 text-[#1C1917]">
          <div className="text-xs font-medium text-[#6B6357]">Recorded Material Info</div>
          <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
            {summary.withMaterialInfo.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6357] mt-1">Non-empty medium entries</div>
        </div>

        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-4 text-[#1C1917]">
          <div className="text-xs font-medium text-[#6B6357]">Missing Material Info</div>
          <div className="text-2xl font-serif font-semibold text-[#8A6326] tabular-nums mt-1">
            {summary.missingMaterialInfo.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6357] mt-1">Never guessed or inferred</div>
        </div>

        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-4 text-[#1C1917]">
          <div className="text-xs font-medium text-[#6B6357]">Multi-Material Objects</div>
          <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
            {summary.multiMaterialObjects.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6357] mt-1">Matched 2+ material categories</div>
        </div>

        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-4 text-[#1C1917]">
          <div className="text-xs font-medium text-[#6B6357]">Category Assignments</div>
          <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
            {summary.totalCategoryAssignments.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6357] mt-1">Non-exclusive category totals</div>
        </div>
      </div>

      {/* Row: Material Frequency (Horizontal Bar) + Material Category Distribution (Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 3: Material Frequency Horizontal Bar Chart */}
        <div className="lg:col-span-6 bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917] flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-serif font-semibold text-[#1C1917]">
                Most Frequently Recorded Materials
              </h4>
              <p className="text-xs text-[#5C554C] mt-1">
                Verbatim <span className="font-mono">medium</span> descriptions from the catalogue.
                Click a bar to inspect matching objects.
              </p>
            </div>
            {selectedMedium !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectMedium('all')}
                className="text-xs font-semibold text-[#755821] hover:underline whitespace-nowrap cursor-pointer"
              >
                Clear medium
              </button>
            )}
          </div>

          {topMediums.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-sm text-[#6B6357]">
              No recorded medium descriptions match the active filters.
            </div>
          ) : (
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topMediums}
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
                      value: 'Number of Objects',
                      position: 'insideBottom',
                      offset: -8,
                      style: { fill: '#6B6357', fontSize: 11 },
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="medium"
                    width={165}
                    tickFormatter={(v: string) => truncateLabel(v, 24)}
                    tick={{ fill: '#292524', fontSize: 11 }}
                    axisLine={{ stroke: '#D4C9B6' }}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#ECE6DA', opacity: 0.6 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as MaterialFrequencyItem;
                      return (
                        <div className="bg-[#1B1917] text-[#FCFAF5] border border-[#3E372E] rounded-lg px-3.5 py-2.5 text-xs shadow-lg max-w-xs space-y-1">
                          <div className="font-semibold text-[#D1B06B]">{item.medium}</div>
                          <div className="font-mono tabular-nums">
                            Objects: <strong>{item.count.toLocaleString()}</strong>
                          </div>
                          <div className="text-[11px] text-[#A69E92]">
                            Click bar to filter exact catalogue records
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    onClick={(barData) => {
                      const payload = barData?.payload as MaterialFrequencyItem | undefined;
                      if (payload?.medium) {
                        onSelectMedium(selectedMedium === payload.medium ? 'all' : payload.medium);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {topMediums.map((entry) => (
                      <Cell
                        key={entry.medium}
                        fill={
                          selectedMedium === entry.medium
                            ? '#755821'
                            : selectedMedium === 'all'
                            ? '#335C7D'
                            : '#9FB3C4'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 4: Material Category Distribution Donut Chart */}
        <div className="lg:col-span-6 bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917] flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-serif font-semibold text-[#1C1917]">
                Material Category Distribution
              </h4>
              <p className="text-xs text-[#5C554C] mt-1">
                Non-exclusive counts derived from original <span className="font-mono">medium</span>{' '}
                keywords. Select a category to explore its objects.
              </p>
            </div>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="text-xs font-semibold text-[#755821] hover:underline whitespace-nowrap cursor-pointer"
              >
                Clear category
              </button>
            )}
          </div>

          {nonZeroCategories.length === 0 ? (
            <div className="h-[340px] flex items-center justify-center text-sm text-[#6B6357]">
              No categorized material records match the active filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-6 h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={nonZeroCategories}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={96}
                      paddingAngle={2}
                      onClick={(sliceData) => {
                        const id = (sliceData as unknown as MaterialCategoryItem)?.id;
                        if (id) {
                          onSelectCategory(selectedCategory === id ? 'all' : id);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {nonZeroCategories.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={MATERIAL_COLORS[entry.id] || '#9C9182'}
                          stroke={selectedCategory === entry.id ? '#1B1917' : '#FCFAF5'}
                          strokeWidth={selectedCategory === entry.id ? 3 : 1.5}
                          opacity={
                            selectedCategory === 'all' || selectedCategory === entry.id ? 1 : 0.38
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload as MaterialCategoryItem;
                        return (
                          <div className="bg-[#1B1917] text-[#FCFAF5] border border-[#3E372E] rounded-lg px-3.5 py-2.5 text-xs shadow-lg max-w-xs space-y-1">
                            <div className="font-serif font-semibold text-sm text-[#D1B06B]">
                              {item.label}
                            </div>
                            <div className="font-mono tabular-nums">
                              Objects: <strong>{item.count.toLocaleString()}</strong> (
                              {item.shareOfRecordedPercent}% of recorded)
                            </div>
                            <div className="text-[11px] text-[#B8B0A4] leading-snug pt-0.5">
                              Matched from: {item.keywordsDescription}
                            </div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="sm:col-span-6 space-y-1.5">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onSelectCategory(isSelected ? 'all' : cat.id)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#1B1917] text-[#FCFAF5]'
                          : 'hover:bg-[#EFE9DC] text-[#292524]'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: MATERIAL_COLORS[cat.id] || '#9C9182' }}
                        />
                        <span className="truncate font-medium">{cat.label}</span>
                      </span>
                      <span
                        className={`font-mono tabular-nums shrink-0 ${
                          isSelected ? 'text-[#D1B06B]' : 'text-[#5C554C]'
                        }`}
                      >
                        {cat.count.toLocaleString()} ({cat.shareOfRecordedPercent}%)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-[#5C554C] bg-[#F4EFE4] border border-[#E5DDD0] rounded-lg px-3.5 py-2.5">
            <Info className="w-4 h-4 text-[#96722D] shrink-0 mt-0.5" />
            <span>
              <strong>Non-exclusive counts:</strong> Multi-material objects (e.g.,{' '}
              <em>wood, gesso, paint</em> or <em>ink on paper</em>) are counted in each matching
              category, so category totals exceed the number of unique objects.
            </span>
          </div>
        </div>
      </div>

      {/* Chart 5: Material vs Historical Period Stacked Bar Chart */}
      <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917] space-y-4">
        <div>
          <h4 className="text-lg font-serif font-semibold text-[#1C1917]">
            Material Categories Across Historical Periods
          </h4>
          <p className="text-xs text-[#5C554C] mt-1">
            Stacked comparison of non-exclusive material category assignments across overlapped
            historical periods. Click any period bar to filter that era.
          </p>
        </div>

        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={materialVsPeriod}
              margin={{ top: 12, right: 16, left: 8, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: '#4A443C', fontSize: 11 }}
                axisLine={{ stroke: '#D4C9B6' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#4A443C', fontSize: 11 }}
                axisLine={{ stroke: '#D4C9B6' }}
                tickLine={false}
                label={{
                  value: 'Material Assignments',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 4,
                  style: { fill: '#6B6357', fontSize: 11, textAnchor: 'middle' },
                }}
              />
              <Tooltip
                cursor={{ fill: '#ECE6DA', opacity: 0.5 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const row = payload[0].payload as MaterialVsPeriodRow;
                  return (
                    <div className="bg-[#1B1917] text-[#FCFAF5] border border-[#3E372E] rounded-lg px-3.5 py-2.5 text-xs shadow-lg space-y-1.5 min-w-[210px]">
                      <div>
                        <div className="font-serif font-semibold text-sm text-[#D1B06B]">
                          {row.periodLabel}
                        </div>
                        <div className="text-[11px] font-mono text-[#A69E92]">
                          {row.spanLabel} · {row.totalMatchingObjects.toLocaleString()} objects
                        </div>
                      </div>
                      <div className="space-y-0.5 pt-1 border-t border-[#322E2A]">
                        {STACKED_KEYS.filter((k) => Number(row[k.key]) > 0).map((k) => (
                          <div
                            key={k.id}
                            className="flex items-center justify-between gap-3 font-mono tabular-nums"
                          >
                            <span className="flex items-center gap-1.5 font-sans text-[#E5DDD0]">
                              <span
                                className="w-2 h-2 rounded-sm shrink-0"
                                style={{ backgroundColor: k.color }}
                              />
                              {k.label}
                            </span>
                            <span>{Number(row[k.key]).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="square"
                iconSize={9}
              />
              {STACKED_KEYS.map((item) => (
                <Bar
                  key={item.id}
                  dataKey={item.key}
                  name={item.label}
                  stackId="materials"
                  fill={item.color}
                  onClick={(barData) => {
                    const row = barData?.payload as MaterialVsPeriodRow | undefined;
                    if (row?.periodId) {
                      onSelectPeriod(row.periodId);
                    }
                  }}
                  className="cursor-pointer"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
