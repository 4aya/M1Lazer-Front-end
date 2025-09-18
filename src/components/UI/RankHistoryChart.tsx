import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { FiBarChart2 } from 'react-icons/fi';

interface RankHistoryData {
  data: number[];
}

interface RankHistoryChartProps {
  rankHistory?: RankHistoryData;
  isUpdatingMode?: boolean;
  selectedModeColor?: string;
  title?: string;
  delay?: number;
  height?: string | number;
  showTitle?: boolean;
  fullBleed?: boolean; // Is it full on the left and right?
}

const RankHistoryChart: React.FC<RankHistoryChartProps> = ({
  rankHistory,
  isUpdatingMode = false,
  selectedModeColor = '#e91e63',
  delay = 0.4,
  height = '16rem',
  fullBleed = true,
}) => {
  // Data preprocessing: removal 0(Deemed as missing), retaining chronological order
  const chartData = React.useMemo(() => {
    const src = rankHistory?.data ?? [];
    if (src.length === 0) return [];

    const validData = src
      .map((rank, originalIdx) => ({
        originalIdx,
        rank: rank === 0 ? null : rank,
      }))
      .filter(d => d.rank !== null) as Array<{ originalIdx: number; rank: number }>;

    return validData.map((item, newIdx) => ({
      idx: newIdx,
      rank: item.rank,
    }));
  }, [rankHistory?.data]);

  const total = chartData.length;

  // === Key fix: Y The axis increases the upper and lower buffer to avoid being cut in half at the extreme value. ===
  const yDomain = React.useMemo<[number | 'auto', number | 'auto']>(() => {
    if (chartData.length === 0) return ['auto', 'auto'];
    const values = chartData.map(d => d.rank as number);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    // By range 5% Rounding as buffering, at least 1
    const pad = Math.max(1, Math.round((dataMax - dataMin) * 0.05));
    return [dataMin - pad, dataMax + pad];
  }, [chartData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white/95 dark:bg-gray-900/85 rounded-2xl p-6 outline-none focus:outline-none ring-0 focus:ring-0"
      style={{ outline: 'none' }}
    >
      <div className={fullBleed ? '-mx-6' : ''} style={{ height }}>
        {isUpdatingMode ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-gray-400 dark:text-gray-500 text-center">
              <FiBarChart2 className="mx-auto text-4xl mb-2" />
              <p>Data is loading...</p>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              // Give some extra margin,Cooperate yDomain More stable buffering
              margin={{ top: 12, right: 0, left: 0, bottom: 12 }}
            >
              <XAxis dataKey="idx" hide />
              {/* Small at the top and large at the bottom: reversal Y and use buffered domain */}
              <YAxis
                type="number"
                dataKey="rank"
                hide
                reversed
                domain={yDomain}
                allowDecimals={false}
                // If the data mutation causes temporary crossing of the boundaries, you can draw it first without being cut
                allowDataOverflow
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                labelFormatter={(label) => {
                  const idx = Number(label);
                  const daysAgo = total - 1 - idx; // The most right is the latest
                  return daysAgo === 0 ? 'just' : `${daysAgo} Day ago`;
                }}
                formatter={(value) => [`#${value}`, 'Global ranking']}
              />
              <Line
                type="monotone"
                dataKey="rank"
                stroke={selectedModeColor}
                strokeWidth={3}
                dot={false}
                activeDot={false}
                connectNulls={false}
                // Rounded corners at the ends, the edges look more natural
                strokeLinecap="round"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FiBarChart2 className="mx-auto text-4xl mb-2 text-gray-400 dark:text-gray-500" />
              <p className="text-gray-500 dark:text-gray-400">No ranking historical data yet</p>
            </div>
          </div>
        )}
      </div>
      <style>{`
        *:focus { outline: none; }
        textarea:focus, input:focus { outline: none; }
      `}</style>
    </motion.div>
  );
};

export default RankHistoryChart;
