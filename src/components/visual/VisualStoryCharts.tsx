import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ExternalLink, Eye, MousePointerClick } from 'lucide-react';
import type { AnalyticsFiltersState } from '../../types/analytics';
import type { StoryEvidenceItem } from '../../types/storyteller';
import type {
  VisualStoryAnalyticsData,
  VisualStoryChartSection,
} from '../../types/visualStory';
import { MATERIAL_COLORS } from '../analytics/MaterialAnalysisSection';

export interface ChartDrilldownRequest {
  chartId: string;
  filterPatch: Partial<AnalyticsFiltersState>;
  selectionLabel: string;
}

interface VisualStoryChartsProps {
  charts: VisualStoryChartSection[];
  analyticsData: VisualStoryAnalyticsData;
  referencesById: Map<string, StoryEvidenceItem>;
  activeSelectionLabel: string | null;
  onInspectSlice: (request: ChartDrilldownRequest) => void;
  onInspectObjectById: (objectId: string) => void;
}

const STACKED_MATERIAL_KEYS: {
  key: 'paper' | 'metal' | 'ceramics' | 'textiles' | 'paint' | 'stone' | 'wood' | 'glass' | 'other';
  label: string;
  color: string;
}[] = [
  { key: 'paper', label: 'Paper & Prints', color: MATERIAL_COLORS.paper },
  { key: 'metal', label: 'Metal', color: MATERIAL_COLORS.metal },
  { key: 'ceramics', label: 'Ceramics', color: MATERIAL_COLORS.ceramics },
  { key: 'textiles', label: 'Textiles', color: MATERIAL_COLORS.textiles },
  { key: 'paint', label: 'Paint & Pigments', color: MATERIAL_COLORS.paint },
  { key: 'stone', label: 'Stone', color: MATERIAL_COLORS.stone },
  { key: 'wood', label: 'Wood', color: MATERIAL_COLORS.wood },
  { key: 'glass', label: 'Glass', color: MATERIAL_COLORS.glass },
  { key: 'other', label: 'Other', color: MATERIAL_COLORS.other },
];

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#1B1917',
  border: '1px solid #3F372C',
  borderRadius: '8px',
  color: '#FCFAF5',
  fontSize: '12px',
  padding: '8px 12px',
};

function truncateLabel(text: string, maxLen = 26): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

function isSafeExternalUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const VisualStoryCharts: React.FC<VisualStoryChartsProps> = ({
  charts,
  analyticsData,
  referencesById,
  activeSelectionLabel,
  onInspectSlice,
  onInspectObjectById,
}) => {
  if (charts.length === 0) return null;

  return (
    <div className="space-y-10">
      {charts.map((section) => {
        const attachedRefs = section.supportingObjectIds
          .map((id) => referencesById.get(String(id)))
          .filter((item): item is StoryEvidenceItem => Boolean(item));

        return (
          <figure
            key={section.id}
            className="space-y-4 pt-6 border-t border-[#E6DEC9] first:border-t-0 first:pt-0"
          >
            {/* Editorial Figure Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div className="space-y-1">
                <div className="text-xs font-mono text-[#755821] tracking-wider uppercase">
                  Fig. {section.figureNumber}
                </div>
                <h4 className="text-xl font-serif font-semibold text-[#1C1917] leading-snug">
                  {section.title}
                </h4>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-[#6B6357] shrink-0">
                <MousePointerClick className="w-3.5 h-3.5 text-[#8A6728]" />
                <span>{section.interactionHint}</span>
              </div>
            </div>

            {/* Chart Viewport (large, readable museum gallery frame) */}
            <div className="bg-white border border-[#E3DAC8] rounded-xl p-4 sm:p-6">
              {renderChartByType(section, analyticsData, onInspectSlice)}
            </div>

            {/* Figure Caption & Data Explanation */}
            <figcaption className="space-y-2.5 max-w-3xl">
              <p className="text-xs sm:text-[13px] font-serif italic text-[#5C5449] leading-relaxed">
                Fig. {section.figureNumber} — {section.caption}
              </p>
              {section.explanation && (
                <p className="text-sm text-[#35302A] leading-relaxed">{section.explanation}</p>
              )}
            </figcaption>

            {/* Attached Supporting Catalogue References for This Chart Section */}
            {attachedRefs.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#756D62]">
                  Section Catalogue References
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {attachedRefs.map((ref) => {
                    const safeUrl = isSafeExternalUrl(ref.objectURL);
                    return (
                      <div
                        key={`${section.id}-ref-${ref.objectID}`}
                        className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#E3DAC8] bg-[#F7F3EA] px-3 py-1.5 text-xs text-[#2B2620]"
                      >
                        <span className="font-mono text-[11px] text-[#755821] tabular-nums">
                          ID {ref.objectID}
                        </span>
                        <span className="text-[#B8AE9E]">·</span>
                        <span className="font-medium max-w-[240px] truncate">
                          {ref.title || 'Untitled Object'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onInspectObjectById(String(ref.objectID))}
                          className="inline-flex items-center gap-1 text-[#1B1917] hover:text-[#755821] font-semibold underline underline-offset-2 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          Details
                        </button>
                        {safeUrl && (
                          <a
                            href={ref.objectURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[#755821] hover:text-[#4F3B15]"
                            title="Open official Met catalogue record"
                          >
                            Met
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSelectionLabel && (
              <div className="sr-only" aria-live="polite">
                Active chart selection: {activeSelectionLabel}
              </div>
            )}
          </figure>
        );
      })}
    </div>
  );
};

function renderChartByType(
  section: VisualStoryChartSection,
  data: VisualStoryAnalyticsData,
  onInspectSlice: (request: ChartDrilldownRequest) => void
): React.ReactNode {
  switch (section.chartType) {
    case 'century_distribution': {
      const rows = data.dateAnalysis.centuries.filter((c) => c.overlapCount > 0);
      if (rows.length === 0) {
        return emptyChartMessage('No century date spans available for this selection.');
      }
      return (
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 10, right: 16, left: 0, bottom: 36 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE6D8" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: '#575046', fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                interval={0}
                height={52}
              />
              <YAxis tick={{ fill: '#575046', fontSize: 11 }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
                formatter={(val) => [
                  `${Number(val ?? 0).toLocaleString()} overlapping objects`,
                  'Date-Range Overlap',
                ]}
              />
              <Bar
                dataKey="overlapCount"
                fill="#B89248"
                radius={[4, 4, 0, 0]}
                className="cursor-pointer"
                onClick={(_barData, index) => {
                  const row = rows[index];
                  if (row?.id) {
                    onInspectSlice({
                      chartId: section.id,
                      filterPatch: { century: row.id },
                      selectionLabel: `Century: ${row.label || row.shortLabel}`,
                    });
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case 'historical_timeline': {
      const rows = data.dateAnalysis.timeline;
      if (rows.length === 0) {
        return emptyChartMessage('No historical timeline records available for this selection.');
      }
      return (
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={rows}
              margin={{ top: 12, right: 20, left: 0, bottom: 28 }}
              onClick={(state) => {
                const idx =
                  typeof state?.activeTooltipIndex === 'number'
                    ? state.activeTooltipIndex
                    : -1;
                const row = idx >= 0 ? rows[idx] : undefined;
                if (row?.id) {
                  onInspectSlice({
                    chartId: section.id,
                    filterPatch: { period: row.id },
                    selectionLabel: `Historical Period: ${row.label || row.id}`,
                  });
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE6D8" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: '#575046', fontSize: 11 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={{ fill: '#575046', fontSize: 11 }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
                formatter={(val) => [
                  `${Number(val ?? 0).toLocaleString()} overlapping objects`,
                  'Period Count',
                ]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8A6728"
                strokeWidth={2.2}
                fill="#DFC793"
                fillOpacity={0.45}
                activeDot={{ r: 6, fill: '#1B1917', stroke: '#D1B06B', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case 'period_comparison': {
      const cmp = data.periodComparison;
      if (!cmp || cmp.rows.length === 0) {
        return emptyChartMessage('No period comparison metrics available.');
      }
      const nonZeroRows = cmp.rows.filter(
        (r) => r.periodACount > 0 || r.periodBCount > 0
      );
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#575046] font-mono tabular-nums">
            <span>
              {cmp.periodALabel} ({cmp.periodASpan}):{' '}
              <strong className="text-[#1C1917]">{cmp.periodATotal.toLocaleString()}</strong> objects
            </span>
            <span className="text-[#B8AE9E]">|</span>
            <span>
              {cmp.periodBLabel} ({cmp.periodBSpan}):{' '}
              <strong className="text-[#1C1917]">{cmp.periodBTotal.toLocaleString()}</strong> objects
            </span>
          </div>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={nonZeroRows}
                margin={{ top: 10, right: 20, left: 0, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE6D8" vertical={false} />
                <XAxis
                  dataKey="categoryLabel"
                  tick={{ fill: '#575046', fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={48}
                />
                <YAxis tick={{ fill: '#575046', fontSize: 11 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
                  formatter={(val, name) => [
                    `${Number(val ?? 0).toLocaleString()} objects`,
                    String(name ?? ''),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="periodACount"
                  name={cmp.periodALabel}
                  fill="#B89248"
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer"
                  onClick={(_barData, index) => {
                    const row = nonZeroRows[index];
                    if (row?.categoryId) {
                      onInspectSlice({
                        chartId: section.id,
                        filterPatch: {
                          period: cmp.periodAId,
                          materialCategory: row.categoryId,
                        },
                        selectionLabel: `${cmp.periodALabel} · ${row.categoryLabel}`,
                      });
                    }
                  }}
                />
                <Bar
                  dataKey="periodBCount"
                  name={cmp.periodBLabel}
                  fill="#335C7D"
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer"
                  onClick={(_barData, index) => {
                    const row = nonZeroRows[index];
                    if (row?.categoryId) {
                      onInspectSlice({
                        chartId: section.id,
                        filterPatch: {
                          period: cmp.periodBId,
                          materialCategory: row.categoryId,
                        },
                        selectionLabel: `${cmp.periodBLabel} · ${row.categoryLabel}`,
                      });
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    case 'material_frequency': {
      const rows = data.materialAnalysis.topMediums.slice(0, 12);
      if (rows.length === 0) {
        return emptyChartMessage('No recorded mediums match this selection.');
      }
      return (
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 10, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE6D8" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#575046', fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="medium"
                width={175}
                tick={{ fill: '#35302A', fontSize: 11 }}
                tickFormatter={(v: string) => truncateLabel(v, 25)}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
                formatter={(val) => [
                  `${Number(val ?? 0).toLocaleString()} objects`,
                  'Exact Medium Count',
                ]}
              />
              <Bar
                dataKey="count"
                fill="#A65233"
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onClick={(_barData, index) => {
                  const row = rows[index];
                  if (row?.medium) {
                    onInspectSlice({
                      chartId: section.id,
                      filterPatch: { medium: row.medium },
                      selectionLabel: `Medium: ${row.medium}`,
                    });
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case 'material_categories': {
      const rows = data.materialAnalysis.categories.filter((c) => c.count > 0);
      if (rows.length === 0) {
        return emptyChartMessage('No material category data available for this selection.');
      }
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={114}
                  paddingAngle={2}
                  className="cursor-pointer"
                  onClick={(_pieData, index) => {
                    const row = rows[index];
                    if (row?.id) {
                      onInspectSlice({
                        chartId: section.id,
                        filterPatch: { materialCategory: row.id },
                        selectionLabel: `Material Category: ${row.label}`,
                      });
                    }
                  }}
                >
                  {rows.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={MATERIAL_COLORS[entry.id] || '#8C8377'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val, name) => [
                    `${Number(val ?? 0).toLocaleString()} objects`,
                    String(name ?? ''),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-6 space-y-2">
            {rows.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  onInspectSlice({
                    chartId: section.id,
                    filterPatch: { materialCategory: cat.id },
                    selectionLabel: `Material Category: ${cat.label}`,
                  })
                }
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[#ECE4D6] hover:border-[#B89248] hover:bg-[#F9F5EC] text-left transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: MATERIAL_COLORS[cat.id] || '#8C8377' }}
                  />
                  <span className="text-xs font-medium text-[#1C1917] truncate">
                    {cat.label}
                  </span>
                </span>
                <span className="text-xs font-mono text-[#575046] tabular-nums shrink-0">
                  {cat.count.toLocaleString()} ({cat.shareOfRecordedPercent.toFixed(1)}%)
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'material_vs_period': {
      const rows = data.materialAnalysis.materialVsPeriod.filter(
        (r) => r.totalMatchingObjects > 0
      );
      if (rows.length === 0) {
        return emptyChartMessage('No cross-period material data available.');
      }
      return (
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 10, right: 16, left: 0, bottom: 32 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE6D8" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: '#575046', fontSize: 11 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={52}
              />
              <YAxis tick={{ fill: '#575046', fontSize: 11 }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {STACKED_MATERIAL_KEYS.map((item) => (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.label}
                  stackId="materials"
                  fill={item.color}
                  className="cursor-pointer"
                  onClick={(_barData, index) => {
                    const row = rows[index];
                    if (row?.periodId) {
                      onInspectSlice({
                        chartId: section.id,
                        filterPatch: {
                          period: row.periodId,
                          materialCategory: item.key,
                        },
                        selectionLabel: `${row.periodLabel || row.shortLabel} · ${item.label}`,
                      });
                    }
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case 'documented_countries': {
      const rows = data.geographicalAnalysis.countries.slice(0, 12);
      if (rows.length === 0) {
        return emptyChartMessage(
          'No documented countries are recorded in this subset. Missing geographical origins are never inferred.'
        );
      }
      return (
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 10, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE6D8" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#575046', fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={150}
                tick={{ fill: '#35302A', fontSize: 11 }}
                tickFormatter={(v: string) => truncateLabel(v, 22)}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
                formatter={(val) => [
                  `${Number(val ?? 0).toLocaleString()} documented objects`,
                  'Documented Country',
                ]}
              />
              <Bar
                dataKey="count"
                fill="#335C7D"
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onClick={(_barData, index) => {
                  const row = rows[index];
                  if (row?.label) {
                    onInspectSlice({
                      chartId: section.id,
                      filterPatch: { country: row.label },
                      selectionLabel: `Documented Country: ${row.label}`,
                    });
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case 'documented_regions': {
      const rows = data.geographicalAnalysis.regions.slice(0, 12);
      if (rows.length === 0) {
        return emptyChartMessage('No documented regions are recorded in this subset.');
      }
      return (
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 10, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE6D8" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#575046', fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={160}
                tick={{ fill: '#35302A', fontSize: 11 }}
                tickFormatter={(v: string) => truncateLabel(v, 24)}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
                formatter={(val) => [
                  `${Number(val ?? 0).toLocaleString()} documented objects`,
                  'Recorded Region',
                ]}
              />
              <Bar
                dataKey="count"
                fill="#4E6E58"
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onClick={(_barData, index) => {
                  const row = rows[index];
                  if (row?.label) {
                    onInspectSlice({
                      chartId: section.id,
                      filterPatch: { region: row.label },
                      selectionLabel: `Recorded Region: ${row.label}`,
                    });
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case 'geography_types': {
      const rows = data.geographicalAnalysis.geographyTypes.slice(0, 10);
      if (rows.length === 0) {
        return emptyChartMessage('No Geography Type qualifiers are recorded in this subset.');
      }
      return (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 10, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE6D8" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#575046', fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={165}
                tick={{ fill: '#35302A', fontSize: 11 }}
                tickFormatter={(v: string) => truncateLabel(v, 24)}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
                formatter={(val) => [
                  `${Number(val ?? 0).toLocaleString()} objects`,
                  'Geography Type',
                ]}
              />
              <Bar
                dataKey="count"
                fill="#7B4B6A"
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onClick={(_barData, index) => {
                  const row = rows[index];
                  if (row?.label) {
                    onInspectSlice({
                      chartId: section.id,
                      filterPatch: { geographyType: row.label },
                      selectionLabel: `Geography Type: ${row.label}`,
                    });
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case 'data_completeness': {
      const rows = data.dataCompleteness;
      if (rows.length === 0) {
        return emptyChartMessage('No completeness metrics available.');
      }
      return (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 10, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE6D8" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: '#575046', fontSize: 11 }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={145}
                tick={{ fill: '#35302A', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
                formatter={(val, _name, item) => {
                  const p = item?.payload as
                    | { availableCount?: number; missingCount?: number }
                    | undefined;
                  const avail = p?.availableCount?.toLocaleString() ?? '';
                  const miss = p?.missingCount?.toLocaleString() ?? '';
                  return [
                    `${Number(val ?? 0).toFixed(1)}% recorded (${avail} available, ${miss} missing)`,
                    'Completeness',
                  ];
                }}
              />
              <Bar dataKey="completenessPercent" fill="#8A6728" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
  }
}

function emptyChartMessage(message: string): React.ReactNode {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-[#6B6357] text-center px-6">
      {message}
    </div>
  );
}
