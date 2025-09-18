import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiTrendingUp } from 'react-icons/fi';
import RankBadge from '../UI/RankBadge';
import LazyBackgroundImage from '../UI/LazyBackgroundImage';
import { GAME_MODE_COLORS } from '../../types';
import type { TeamRanking, Team, GameMode, RankingType } from '../../types';

interface Props {
  ranking: TeamRanking;
  team: Team | null;
  rank: number;
  selectedMode: GameMode;
  rankingType: RankingType;
  isLoading?: boolean;
}

const TeamRankingCard: React.FC<Props> = ({ 
  ranking, 
  team, 
  rank, 
  selectedMode, 
  rankingType,
  isLoading = false 
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const isTopThree = rank <= 3;

  if (isLoading || !team) {
    return (
      <div className={`relative overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 animate-pulse ${
        isTopThree 
          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/10' 
          : 'bg-white dark:bg-gray-800'
      }`}>
        <div className="relative flex items-center gap-3 sm:gap-4 px-4 py-3">
          {/* Ranking badge */}
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>

          {/* Team Flag */}
          <div className="flex-shrink-0">
            <div className="w-12 h-6 sm:w-16 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600" />
          </div>

          {/* Team information */}
          <div className="flex-1 min-w-0">
            <div className="h-5 sm:h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 sm:w-40 mb-1" />
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            </div>
          </div>

          {/* Score display */}
          <div className="text-right flex-shrink-0">
            <div className="h-5 sm:h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 sm:w-20" />
          </div>
        </div>
      </div>
    );
  }

  // Filter out the default coverURL
  const rawCoverUrl = team.cover_url;
  const defaultCoverUrls = [
    'https://assets-ppy.m1pposu.dev/user-profile-covers/default.jpeg',
    'https://assets.ppy.sh/user-profile-covers/default.jpeg',
    // Other possible defaultsURLVariants
  ];
  const coverUrl = rawCoverUrl && !defaultCoverUrls.includes(rawCoverUrl) ? rawCoverUrl : undefined;

  // Determine the rendering method based on whether there is a background image
  if (!coverUrl) {
    // When there is no background image, use normal div and default background
    return (
      <div
        className={`relative overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 ${
          isTopThree 
            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/10' 
            : 'bg-white dark:bg-gray-800'
        }`}
      >
        <div className="relative flex items-center gap-3 sm:gap-4 px-4 py-3">
          {/* Ranking badge */}
          <div className="flex-shrink-0">
            <RankBadge rank={rank} size="sm" />
          </div>

          {/* Team Flag - 2:1 Proportion (240:120) */}
          <div className="flex-shrink-0">
            <div className="w-12 h-6 sm:w-16 sm:h-8 rounded overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
              <img
                src={team.flag_url}
                alt={`${team.name} flag`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Team information */}
          <div className="flex-1 min-w-0">
            <Link
              to={`/teams/${team.id}`}
              className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
            >
              {team.name}
            </Link>
            <div className="flex items-center gap-2 sm:gap-4 mt-0.5">
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <FiUsers className="w-3 h-3" />
                <span className="text-xs">
                  {ranking.play_count || 0} Players Online
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <FiTrendingUp className="w-3 h-3" />
                <span className="text-xs">
                  {rankingType === 'performance' 
                    ? `${formatNumber(ranking.performance || 0)} pp`
                    : `${formatNumber(ranking.ranked_score || 0)} point`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Score display */}
          <div className="text-right flex-shrink-0">
            <div className="text-base sm:text-lg font-bold" style={{ color: GAME_MODE_COLORS[selectedMode] }}>
              {rankingType === 'performance'
                ? `${formatNumber(ranking.performance || 0)}pp`
                : `${formatNumber(ranking.ranked_score || 0)}`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // When there is a background picture, use LazyBackgroundImage
  const teamContent = (
    <LazyBackgroundImage 
      src={coverUrl} 
      className="overflow-hidden transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      {/* Background mask layer */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/85 to-white/80 dark:from-gray-900/90 dark:via-gray-900/85 dark:to-gray-900/80 hover:from-white/85 hover:via-white/80 hover:to-white/75 dark:hover:from-gray-900/85 dark:hover:via-gray-900/80 dark:hover:to-gray-900/75 transition-all duration-300" />
      
      {/* TOP 3 Special effects mask */}
      {isTopThree && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-orange-400/5 to-transparent" />
      )}
      
      <div className="relative flex items-center gap-3 sm:gap-4 px-4 py-3">
        {/* Ranking badge */}
        <div className="flex-shrink-0">
          <RankBadge rank={rank} size="sm" />
        </div>

        {/* Team Flag - 2:1 Proportion (240:120) */}
        <div className="flex-shrink-0">
          <div className="w-12 h-6 sm:w-16 sm:h-8 rounded overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
            <img
              src={team.flag_url}
              alt={`${team.name} flag`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Team information */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/teams/${team.id}`}
            className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
          >
            {team.name}
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 mt-0.5">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <FiUsers className="w-3 h-3" />
              <span className="text-xs">
                {ranking.play_count || 0} Game
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <FiTrendingUp className="w-3 h-3" />
              <span className="text-xs">
                {rankingType === 'performance' 
                  ? `${formatNumber(ranking.performance || 0)}pp`
                  : `${formatNumber(ranking.ranked_score || 0)} point`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Score display */}
        <div className="text-right flex-shrink-0">
          <div className="text-base sm:text-lg font-bold" style={{ color: GAME_MODE_COLORS[selectedMode] }}>
            {rankingType === 'performance'
              ? `${formatNumber(ranking.performance || 0)}pp`
              : `${formatNumber(ranking.ranked_score || 0)}`}
          </div>
        </div>
      </div>
    </LazyBackgroundImage>
  );

  return (
    <Link to={`/teams/${team.id}`}>
      {teamContent}
    </Link>
  );
};

export default TeamRankingCard;
