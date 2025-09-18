import React from "react";

interface Stats {
  hit_accuracy?: number;
  pp?: number;
  ranked_score?: number;
  total_score?: number;
  play_count?: number;
  total_hits?: number;
  maximum_combo?: number;
  replays_watched_by_others?: number;
}

interface StatsCardProps {
  stats?: Stats;
}

const StatsCard: React.FC<StatsCardProps> = ({ stats }) => {
  // Number of hits per game = Total hits / Number of games
  const avgHitsPerPlay =
    stats?.play_count && stats?.play_count > 0
      ? Math.round((stats.total_hits ?? 0) / stats.play_count)
      : 0;

  // A purple value is uniformly added→Pink gradient text style, brighter and more breathing
  const valueClass =
    "font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] to-[#ed8ea6] tabular-nums";

  // Line style: lighter separation+Suspended light
  const rowClass =
    "flex justify-between items-center px-2 py-1 rounded-md transition-colors hover:bg-white/40 dark:hover:bg-white/5";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 text-xs">
        {/* Total score */}
        <div className={rowClass}>
          <span className="text-gray-600 dark:text-gray-300">Total score</span>
          <span className={valueClass}>
            {stats?.ranked_score?.toLocaleString() ?? 0}
          </span>
        </div>

        {/* Accuracy */}
        <div className={rowClass}>
          <span className="text-gray-600 dark:text-gray-300">Accuracy</span>
          <span className={valueClass}>
            {(stats?.hit_accuracy ?? 0).toFixed(2)}%
          </span>
        </div>

        {/* Number of games */}
        <div className={rowClass}>
          <span className="text-gray-600 dark:text-gray-300">Playcount</span>
          <span className={valueClass}>
            {stats?.play_count?.toLocaleString() ?? 0}
          </span>
        </div>

        {/* Total points */}
        <div className={rowClass}>
          <span className="text-gray-600 dark:text-gray-300">Total points</span>
          <span className={valueClass}>
            {stats?.total_score?.toLocaleString() ?? 0}
          </span>
        </div>

        {/* Total hits */}
        <div className={rowClass}>
          <span className="text-gray-600 dark:text-gray-300">Total hits</span>
          <span className={valueClass}>
            {stats?.total_hits?.toLocaleString() ?? 0}
          </span>
        </div>

        {/* Number of hits per game */}
        <div className={rowClass}>
          <span className="text-gray-600 dark:text-gray-300">Number of hits per game</span>
          <span className={valueClass}>{avgHitsPerPlay.toLocaleString()}</span>
        </div>

        {/* Maximum combo */}
        <div className={rowClass}>
          <span className="text-gray-600 dark:text-gray-300">Maximum combo</span>
          <span className={valueClass}>
            {stats?.maximum_combo?.toLocaleString() ?? 0}
          </span>
        </div>

        {/* Number of views of playback */}
        <div className={rowClass}>
          <span className="text-gray-600 dark:text-gray-300">Number of views of playback</span>
          <span className={valueClass}>
            {stats?.replays_watched_by_others?.toLocaleString() ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
