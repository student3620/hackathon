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
import type {
  VisualChartType,
  VisualStoryAnalyticsData,
} from '../../types/visualStory';
import type { ChartDrilldownRequest } from './VisualStoryCharts';
import { MATERIAL_COLORS } from '../analytics/MaterialAnalysisSection';

interface AnimatedSceneChartProps {
  sceneId: string;
  chartType: VisualChartType;
  analyticsData: VisualStoryAnalyticsData;
  sceneProgress: number; // 0..1 for subtle sequential highlight
  onInspectSlice: (request: ChartDrilldownRequest) => void;
}

const DARK_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#141311',
  border: '1px solid #4A4032',
  borderRadius: '8px',
  color: '#FCFAF5',
  fontSize: '12px',
  padding: '8px 12px',
};

const STACKED_KEYS: {
  key: 'paper' | 'metal' | 'ceramics' | 'textiles' | 'paint' | 'stone' | 'wood' | 'glass' | 'other';
  label: string;
  color: string;
}[] = [
  { key: 'paper', label: 'Paper & Prints', color: '#D1B06B' },
  { key: 'metal', label: 'Metal', color: '#5D8AA8' },
  { key: 'ceramics', label: 'Ceramics', color: '#C87453' },
  { key: 'textiles', label: 'Textiles', color: '#6E967B' },
  { key: 'paint', label: 'Paint', color: '#A37091' },
  { key: 'stone', label: 'Stone', color: '#8E8478' },
  { key: 'wood', label: 'Wood', color: '#B08458' },
  { key: 'glass', label: 'Glass', color: '#5FA0B0' },
  { key: 'other', label: 'Other', color: '#ABA194' },
];

function truncateLabel(text: string, maxLen = 22): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

export const AnimatedSceneChart: React.FC<AnimatedSceneChartProps> = ({
  sceneId,
  chartType,
  analyticsData,
  sceneProgress,
  onInspectSlice,
}) => {
  switch (chartType) {
    case 'century_distribution': {
      const rows = analyticsData.dateAnalysis.centuries.filter((c) => c.overlapCount > 0);
      if (rows.length === 0) return emptyDarkChart('No century date ranges recorded in this subset.');
      const activeIdx = Math.min(rows.length - 1, Math.floor(sceneProgress * rows.length));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 10, right: 14, left: -12, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D2822" vertical={false} />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: '#C7BFB2', fontSize: 10 }}
              angle={-30}
              textAnchor="end"
              interval={0}
              height={46}
            />
            <YAxis tick={{ fill: '#A89F91', fontSize: 10 }} />
            <Tooltip
              contentStyle={DARK_TOOLTIP_STYLE}
              labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
              formatter={(val) => [
                `${Number(val ?? 0).toLocaleString()} overlapping objects`,
                'Century Overlap',
              ]}
            />
            <Bar
              dataKey="overlapCount"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={1100}
              className="cursor-pointer"
              onClick={(_barData, index) => {
                const row = rows[index];
                if (row?.id) {
                  onInspectSlice({
                    chartId: sceneId,
                    filterPatch: { century: row.id },
                    selectionLabel: `Century: ${row.label || row.shortLabel}`,
                  });
                }
              }}
            >
              {rows.map((entry, idx) => (
                <Cell
                  key={entry.id}
                  fill={idx === activeIdx ? '#E3C37D' : '#9E7D3F'}
                  fillOpacity={idx <= activeIdx ? 0.96 : 0.45}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'historical_timeline': {
      const rows = analyticsData.dateAnalysis.timeline;
      if (rows.length === 0) return emptyDarkChart('No historical timeline records available.');
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={rows}
            margin={{ top: 12, right: 18, left: -10, bottom: 26 }}
            onClick={(state) => {
              const idx =
                typeof state?.activeTooltipIndex === 'number'
                  ? state.activeTooltipIndex
                  : -1;
              const row = idx >= 0 ? rows[idx] : undefined;
              if (row?.id) {
                onInspectSlice({
                  chartId: sceneId,
                  filterPatch: { period: row.id },
                  selectionLabel: `Historical Period: ${row.label || row.id}`,
                });
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2D2822" vertical={false} />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: '#C7BFB2', fontSize: 10 }}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={44}
            />
            <YAxis tick={{ fill: '#A89F91', fontSize: 10 }} />
            <Tooltip
              contentStyle={DARK_TOOLTIP_STYLE}
              labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
              formatter={(val) => [
                `${Number(val ?? 0).toLocaleString()} overlapping objects`,
                'Historical Period',
              ]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#D1B06B"
              strokeWidth={2.4}
              fill="#B89248"
              fillOpacity={0.28}
              isAnimationActive={true}
              animationDuration={1200}
              activeDot={{ r: 6, fill: '#FCFAF5', stroke: '#D1B06B', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    case 'period_comparison': {
      const cmp = analyticsData.periodComparison;
      if (!cmp || cmp.rows.length === 0) return emptyDarkChart('No period comparison data available.');
      const rows = cmp.rows.filter((r) => r.periodACount > 0 || r.periodBCount > 0);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 10, right: 16, left: -10, bottom: 26 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D2822" vertical={false} />
            <XAxis
              dataKey="categoryLabel"
              tick={{ fill: '#C7BFB2', fontSize: 10 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={46}
            />
            <YAxis tick={{ fill: '#A89F91', fontSize: 10 }} />
            <Tooltip
              contentStyle={DARK_TOOLTIP_STYLE}
              labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
              formatter={(val, name) => [
                `${Number(val ?? 0).toLocaleString()} objects`,
                String(name ?? ''),
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#E6DFD2' }} />
            <Bar
              dataKey="periodACount"
              name={cmp.periodALabel}
              fill="#D1B06B"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={1100}
              className="cursor-pointer"
              onClick={(_barData, index) => {
                const row = rows[index];
                if (row?.categoryId) {
                  onInspectSlice({
                    chartId: sceneId,
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
              fill="#5D8AA8"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={1300}
              className="cursor-pointer"
              onClick={(_barData, index) => {
                const row = rows[index];
                if (row?.categoryId) {
                  onInspectSlice({
                    chartId: sceneId,
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
      );
    }

    case 'material_frequency': {
      const rows = analyticsData.materialAnalysis.topMediums.slice(0, 8);
      if (rows.length === 0) return emptyDarkChart('No recorded medium strings available.');
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 6, right: 20, left: 6, bottom: 6 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2D2822" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#A89F91', fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="medium"
              width={145}
              tick={{ fill: '#E6DFD2', fontSize: 10 }}
              tickFormatter={(v: string) => truncateLabel(v, 22)}
            />
            <Tooltip
              contentStyle={DARK_TOOLTIP_STYLE}
              labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
              formatter={(val) => [`${Number(val ?? 0).toLocaleString()} objects`, 'Exact Medium']}
            />
            <Bar
              dataKey="count"
              fill="#C87453"
              radius={[0, 4, 4, 0]}
              isAnimationActive={true}
              animationDuration={1100}
              className="cursor-pointer"
              onClick={(_barData, index) => {
                const row = rows[index];
                if (row?.medium) {
                  onInspectSlice({
                    chartId: sceneId,
                    filterPatch: { medium: row.medium },
                    selectionLabel: `Medium: ${row.medium}`,
                  });
                }
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'material_categories': {
      const rows = analyticsData.materialAnalysis.categories.filter((c) => c.count > 0);
      if (rows.length === 0) return emptyDarkChart('No material categories recorded.');
      const revealedCount = Math.max(2, Math.ceil(sceneProgress * rows.length) + 1);
      return (
        <div className="w-full h-full grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6 h-full min-h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={82}
                  paddingAngle={2}
                  isAnimationActive={true}
                  animationDuration={1100}
                  className="cursor-pointer"
                  onClick={(_pieData, index) => {
                    const row = rows[index];
                    if (row?.id) {
                      onInspectSlice({
                        chartId: sceneId,
                        filterPatch: { materialCategory: row.id },
                        selectionLabel: `Material Category: ${row.label}`,
                      });
                    }
                  }}
                >
                  {rows.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={MATERIAL_COLORS[entry.id] || '#9E9589'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={DARK_TOOLTIP_STYLE}
                  formatter={(val, name) => [
                    `${Number(val ?? 0).toLocaleString()} objects`,
                    String(name ?? ''),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="md:col-span-6 space-y-1.5 overflow-y-auto max-h-full pr-1">
            {rows.slice(0, 7).map((cat, idx) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  onInspectSlice({
                    chartId: sceneId,
                    filterPatch: { materialCategory: cat.id },
                    selectionLabel: `Material Category: ${cat.label}`,
                  })
                }
                style={{ opacity: idx < revealedCount ? 1 : 0.35 }}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border border-[#302B24] bg-[#1E1B18] hover:border-[#B89248] text-left transition-opacity duration-300 cursor-pointer"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: MATERIAL_COLORS[cat.id] || '#9E9589' }}
                  />
                  <span className="text-xs text-[#F5F0E6] truncate">{cat.label}</span>
                </span>
                <span className="text-[11px] font-mono text-[#D1B06B] tabular-nums shrink-0">
                  {cat.count.toLocaleString()} ({cat.shareOfRecordedPercent.toFixed(1)}%)
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'material_vs_period': {
      const rows = analyticsData.materialAnalysis.materialVsPeriod.filter(
        (r) => r.totalMatchingObjects > 0
      );
      if (rows.length === 0) return emptyDarkChart('No cross-period material data available.');
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 14, left: -12, bottom: 26 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D2822" vertical={false} />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: '#C7BFB2', fontSize: 10 }}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={44}
            />
            <YAxis tick={{ fill: '#A89F91', fontSize: 10 }} />
            <Tooltip
              contentStyle={DARK_TOOLTIP_STYLE}
              labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', color: '#D8D0C5' }} />
            {STACKED_KEYS.map((item) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                stackId="materials"
                fill={item.color}
                isAnimationActive={true}
                animationDuration={1100}
                className="cursor-pointer"
                onClick={(_barData, index) => {
                  const row = rows[index];
                  if (row?.periodId) {
                    onInspectSlice({
                      chartId: sceneId,
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
      );
    }

    case 'documented_countries': {
      const rows = analyticsData.geographicalAnalysis.countries.slice(0, 8);
      if (rows.length === 0) {
        return emptyDarkChart(
          'No documented countries recorded in this selection. Missing origins are never inferred.'
        );
      }
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 6, right: 20, left: 6, bottom: 6 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2D2822" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#A89F91', fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={130}
              tick={{ fill: '#E6DFD2', fontSize: 10 }}
              tickFormatter={(v: string) => truncateLabel(v, 20)}
            />
            <Tooltip
              contentStyle={DARK_TOOLTIP_STYLE}
              labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
              formatter={(val) => [
                `${Number(val ?? 0).toLocaleString()} documented objects`,
                'Documented Country',
              ]}
            />
            <Bar
              dataKey="count"
              fill="#5D8AA8"
              radius={[0, 4, 4, 0]}
              isAnimationActive={true}
              animationDuration={1100}
              className="cursor-pointer"
              onClick={(_barData, index) => {
                const row = rows[index];
                if (row?.label) {
                  onInspectSlice({
                    chartId: sceneId,
                    filterPatch: { country: row.label },
                    selectionLabel: `Documented Country: ${row.label}`,
                  });
                }
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'documented_regions': {
      const rows = analyticsData.geographicalAnalysis.regions.slice(0, 8);
      if (rows.length === 0) return emptyDarkChart('No documented regions recorded in this selection.');
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 6, right: 20, left: 6, bottom: 6 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2D2822" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#A89F91', fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={135}
              tick={{ fill: '#E6DFD2', fontSize: 10 }}
              tickFormatter={(v: string) => truncateLabel(v, 21)}
            />
            <Tooltip
              contentStyle={DARK_TOOLTIP_STYLE}
              labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
              formatter={(val) => [
                `${Number(val ?? 0).toLocaleString()} documented objects`,
                'Recorded Region',
              ]}
            />
            <Bar
              dataKey="count"
              fill="#6E967B"
              radius={[0, 4, 4, 0]}
              isAnimationActive={true}
              animationDuration={1100}
              className="cursor-pointer"
              onClick={(_barData, index) => {
                const row = rows[index];
                if (row?.label) {
                  onInspectSlice({
                    chartId: sceneId,
                    filterPatch: { region: row.label },
                    selectionLabel: `Recorded Region: ${row.label}`,
                  });
                }
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'geography_types': {
      const rows = analyticsData.geographicalAnalysis.geographyTypes.slice(0, 8);
      if (rows.length === 0) return emptyDarkChart('No Geography Type qualifiers recorded.');
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 6, right: 20, left: 6, bottom: 6 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2D2822" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#A89F91', fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={135}
              tick={{ fill: '#E6DFD2', fontSize: 10 }}
              tickFormatter={(v: string) => truncateLabel(v, 21)}
            />
            <Tooltip
              contentStyle={DARK_TOOLTIP_STYLE}
              labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
              formatter={(val) => [`${Number(val ?? 0).toLocaleString()} objects`, 'Geography Type']}
            />
            <Bar
              dataKey="count"
              fill="#A37091"
              radius={[0, 4, 4, 0]}
              isAnimationActive={true}
              animationDuration={1100}
              className="cursor-pointer"
              onClick={(_barData, index) => {
                const row = rows[index];
                if (row?.label) {
                  onInspectSlice({
                    chartId: sceneId,
                    filterPatch: { geographyType: row.label },
                    selectionLabel: `Geography Type: ${row.label}`,
                  });
                }
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'data_completeness': {
      const rows = analyticsData.dataCompleteness;
      if (rows.length === 0) return emptyDarkChart('No completeness metrics available.');
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 6, right: 20, left: 6, bottom: 6 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2D2822" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: '#A89F91', fontSize: 10 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={125}
              tick={{ fill: '#E6DFD2', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={DARK_TOOLTIP_STYLE}
              labelStyle={{ color: '#D1B06B', fontWeight: 600 }}
              formatter={(val, _name, item) => {
                const p = item?.payload as
                  | { availableCount?: number; missingCount?: number }
                  | undefined;
                return [
                  `${Number(val ?? 0).toFixed(1)}% (${p?.availableCount?.toLocaleString() ?? ''} recorded, ${p?.missingCount?.toLocaleString() ?? ''} missing)`,
                  'Field Completeness',
                ];
              }}
            />
            <Bar
              dataKey="completenessPercent"
              fill="#D1B06B"
              radius={[0, 4, 4, 0]}
              isAnimationActive={true}
              animationDuration={1100}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  }
}

function emptyDarkChart(message: string): React.ReactNode {
  return (
    <div className="w-full h-full flex items-center justify-center text-xs text-[#A89F91] text-center px-6">
      {message}
    </div>
  );
}
