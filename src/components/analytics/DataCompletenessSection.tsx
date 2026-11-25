import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { DataCompletenessItem } from '../../types/analytics';

interface DataCompletenessSectionProps {
  items: DataCompletenessItem[];
  totalRecords: number;
}

export const DataCompletenessSection: React.FC<DataCompletenessSectionProps> = ({
  items,
  totalRecords,
}) => {
  return (
    <section aria-labelledby="section-data-completeness" className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-[#2E2A25]">
        <div>
          <div className="text-xs font-mono text-[#D1B06B] uppercase tracking-wider">
            Section 04 · Source Metadata Transparency
          </div>
          <h3
            id="section-data-completeness"
            className="text-xl sm:text-2xl font-serif font-semibold text-[#FCFAF5] mt-1"
          >
            Catalogue Data Completeness
          </h3>
        </div>
        <p className="text-xs text-[#A69E92] font-mono tabular-nums">
          Calculated across {totalRecords.toLocaleString()} active Met records
        </p>
      </div>

      <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Chart 8: Visual completeness bar chart */}
        <div className="lg:col-span-7 h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={items}
              layout="vertical"
              margin={{ top: 8, right: 20, left: 10, bottom: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, Math.max(1, totalRecords)]}
                tick={{ fill: '#4A443C', fontSize: 11 }}
                axisLine={{ stroke: '#D4C9B6' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={132}
                tick={{ fill: '#292524', fontSize: 12 }}
                axisLine={{ stroke: '#D4C9B6' }}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#ECE6DA', opacity: 0.5 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as DataCompletenessItem;
                  return (
                    <div className="bg-[#1B1917] text-[#FCFAF5] border border-[#3E372E] rounded-lg px-3.5 py-2.5 text-xs shadow-lg space-y-1">
                      <div className="font-serif font-semibold text-sm text-[#D1B06B]">
                        {item.label}
                      </div>
                      <div className="font-mono tabular-nums">
                        Available: <strong>{item.availableCount.toLocaleString()}</strong> (
                        {item.completenessPercent}%)
                      </div>
                      <div className="font-mono tabular-nums text-[#C8C0B4]">
                        Missing / Not recorded: {item.missingCount.toLocaleString()}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} iconType="square" />
              <Bar dataKey="availableCount" name="Available in Catalogue" stackId="comp" fill="#4E6E58" />
              <Bar
                dataKey="missingCount"
                name="Missing / Not Recorded"
                stackId="comp"
                fill="#DDD4C4"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Exact tabular counts */}
        <div className="lg:col-span-5 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#DDD4C4] text-xs font-medium text-[#6B6357]">
                <th className="py-2 pr-3">Catalogue Field</th>
                <th className="py-2 px-2 text-right">Available</th>
                <th className="py-2 px-2 text-right">Missing</th>
                <th className="py-2 pl-2 text-right">Complete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE2D4] font-mono text-xs tabular-nums">
              {items.map((item) => (
                <tr key={item.fieldKey}>
                  <td className="py-2.5 pr-3 font-sans font-medium text-[#1C1917]">
                    {item.label}
                  </td>
                  <td className="py-2.5 px-2 text-right text-[#2F6B45] font-medium">
                    {item.availableCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right text-[#8A6326]">
                    {item.missingCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 pl-2 text-right font-semibold text-[#1C1917]">
                    {item.completenessPercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
