import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FiBarChart, FiUsers, FiActivity, FiPlay, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import { statsAPI } from '../../utils/api';
import type { ServerStats, OnlineHistoryResponse } from '../../types';

// Simple two-line chart component
const SimpleLineChart: React.FC<{ 
  onlineData: { time: string; value: number }[];
  playingData: { time: string; value: number }[];
}> = ({ onlineData, playingData }) => {
  if (onlineData.length === 0) return null;

  const allValues = [...onlineData.map(d => d.value), ...playingData.map(d => d.value)];
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;

  const width = 300;
  const height = 80;
  const padding = 10;

  // Create online user path points
  const onlinePoints = onlineData.map((item, index) => {
    const x = padding + (index / (onlineData.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((item.value - minValue) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  // Create play user path points
  const playingPoints = playingData.map((item, index) => {
    const x = padding + (index / (playingData.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((item.value - minValue) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id="onlineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="playingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Online user fill area */}
        <polygon
          points={`${padding},${height - padding} ${onlinePoints} ${width - padding},${height - padding}`}
          fill="url(#onlineGradient)"
        />
        
        {/* Play users fill areas */}
        <polygon
          points={`${padding},${height - padding} ${playingPoints} ${width - padding},${height - padding}`}
          fill="url(#playingGradient)"
        />
        
        {/* Online user lines */}
        <polyline
          points={onlinePoints}
          fill="none"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Play user lines */}
        <polyline
          points={playingPoints}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Online user data points - Show only the last point */}
        {onlineData.length > 0 && (() => {
          const lastIndex = onlineData.length - 1;
          const item = onlineData[lastIndex];
          const x = padding + (lastIndex / (onlineData.length - 1)) * (width - 2 * padding);
          const y = height - padding - ((item.value - minValue) / range) * (height - 2 * padding);
          return (
            <circle
              cx={x}
              cy={y}
              r="4"
              fill="#10B981"
              className="drop-shadow-sm"
            />
          );
        })()}

        {/* Play user data points - Show only the last point */}
        {playingData.length > 0 && (() => {
          const lastIndex = playingData.length - 1;
          const item = playingData[lastIndex];
          const x = padding + (lastIndex / (playingData.length - 1)) * (width - 2 * padding);
          const y = height - padding - ((item.value - minValue) / range) * (height - 2 * padding);
          return (
            <circle
              cx={x}
              cy={y}
              r="4"
              fill="#8B5CF6"
              className="drop-shadow-sm"
            />
          );
        })()}
      </svg>
    </div>
  );
};

const ServerStatsCard: React.FC = () => {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [history, setHistory] = useState<OnlineHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WillUTCTime converted to local time
  const formatLocalTime = (utcTimeString: string): string => {
    // Make sure the time string is correctly parsed intoUTCtime
    const utcDate = new Date(utcTimeString.endsWith('Z') ? utcTimeString : utcTimeString + 'Z');
    return utcDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use system time zone
    });
  };

  // Format full local datetime(For debugging)
  const formatLocalDateTime = (utcTimeString: string): string => {
    const utcDate = new Date(utcTimeString.endsWith('Z') ? utcTimeString : utcTimeString + 'Z');
    return utcDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [currentStats, onlineHistory] = await Promise.all([
        statsAPI.getCurrentStats(),
        statsAPI.getOnlineHistory()
      ]);

      setStats(currentStats);
      setHistory(onlineHistory);
    } catch (err) {
      console.error('Failed to fetch server stats:', err);
      setError('Failed to obtain server statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Remove automatic refresh and get data only once when component mounts
    // const interval = setInterval(fetchStats, 30000);
    // return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        {/* Title placeholder */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>

        {/* Statistical placeholders */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
            </div>
          ))}
        </div>

        {/* Chart placeholder */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Chart area placeholder */}
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
          
          {/* timeTag placeholders */}
          <div className="flex justify-between mb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
          
          {/* Time zone identification placeholder */}
          <div className="text-center">
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <FiBarChart className="w-8 h-8 mx-auto mb-2" />
          <p className="mb-2">Statistics are not available yet</p>
          <button
            onClick={fetchStats}
            className="text-sm text-blue-500 hover:text-blue-600 underline inline-flex items-center gap-1"
          >
            <FiRefreshCw className="w-3 h-3" />
            Try again
          </button>
        </div>
      </motion.div>
    );
  }

  // Prepare chart data
  const onlineChartData = history ? history.history.map(entry => ({
    time: formatLocalTime(entry.timestamp),
    value: entry.online_count
  })).reverse() : []; // ReversaltimeFrom morning to night

  const playingChartData = history ? history.history.map(entry => ({
    time: formatLocalTime(entry.timestamp),
    value: entry.playing_count
  })).reverse() : []; // ReversaltimeFrom morning to night

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-3">
          <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center">
            <FiBarChart className="w-4 h-4 text-pink-600 dark:text-pink-400" />
          </div>
          Server Statistics
        </h3>
        {stats && (
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            Updated on {formatLocalDateTime(stats.timestamp)}
            <button
              onClick={fetchStats}
              disabled={loading}
              className="text-pink-500 hover:text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Manual refresh"
            >
              <FiRefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </span>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2 mb-2">
              <FiUsers className="w-6 h-6" />
              {stats.registered_users.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600/70 dark:text-blue-400/70 font-medium">Registered User</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-2 mb-2">
              <FiActivity className="w-6 h-6" />
              {stats.online_users.toLocaleString()}
            </div>
            <div className="text-sm text-green-600/70 dark:text-green-400/70 font-medium">Online users</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 flex items-center justify-center gap-2 mb-2">
              <FiPlay className="w-6 h-6" />
              {stats.playing_users.toLocaleString()}
            </div>
            <div className="text-sm text-purple-600/70 dark:text-purple-400/70 font-medium">Playing</div>
          </div>
        </div>
      )}

      {onlineChartData.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FiTrendingUp className="w-4 h-4" />
              24Hourly Online Trends
            </h4>
            
            {/* legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">Online</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">play</span>
              </div>
            </div>
          </div>
          
          <SimpleLineChart onlineData={onlineChartData} playingData={playingChartData} />
          
          {/* timeLabel */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>{onlineChartData[0]?.time}</span>
            <span>{onlineChartData[Math.floor(onlineChartData.length / 2)]?.time}</span>
            <span>{onlineChartData[onlineChartData.length - 1]?.time}</span>
          </div>
          
          {/* Time zone indication */}
          <div className="text-center mt-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {Intl.DateTimeFormat().resolvedOptions().timeZone} Time zone
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ServerStatsCard;
