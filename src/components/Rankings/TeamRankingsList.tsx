import React, { useState, useEffect } from 'react';
import { FiUsers } from 'react-icons/fi';
import TeamRankingCard from './TeamRankingCard';
import { teamsAPI, handleApiError } from '../../utils/api';
import type { 
  TeamRankingsResponse, 
  GameMode, 
  RankingType, 
  TeamRanking,
  Team 
} from '../../types';

interface Props {
  rankings: TeamRankingsResponse | null;
  currentPage: number;
  selectedMode: GameMode;
  rankingType: RankingType;
}

const TeamRankingsList: React.FC<Props> = ({ 
  rankings, 
  currentPage, 
  selectedMode, 
  rankingType 
}) => {
  const [teams, setTeams] = useState<Record<number, Team>>({});
  const [loadingTeams, setLoadingTeams] = useState<Set<number>>(new Set());

  // Loading team details
  const loadTeamDetail = async (teamId: number) => {
    if (teams[teamId] || loadingTeams.has(teamId)) return;

    setLoadingTeams(prev => new Set(prev).add(teamId));
    
    try {
      const response = await teamsAPI.getTeam(teamId);
      setTeams(prev => ({ ...prev, [teamId]: response.team }));
    } catch (error) {
      handleApiError(error);
      console.error(`Loading team ${teamId} Details failed:`, error);
    } finally {
      setLoadingTeams(prev => {
        const newSet = new Set(prev);
        newSet.delete(teamId);
        return newSet;
      });
    }
  };

  // Load all team details when ranking data changes
  useEffect(() => {
    if (!rankings?.ranking?.length) return;

    const teamIds = rankings.ranking.map(r => r.team_id);
    teamIds.forEach(loadTeamDetail);
  }, [rankings]);

  if (!rankings || !rankings.ranking.length) {
    return (
      <div className="text-center py-20 px-4 sm:px-0">
        <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
          <FiUsers className="text-4xl text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No team ranking data yet.</h3>
        <p className="text-gray-500 dark:text-gray-400">No data was found for the current team.</p>
      </div>
    );
  }

  const startRank = (currentPage - 1) * 50 + 1;

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {rankings.ranking.map((ranking: TeamRanking, index: number) => (
        <TeamRankingCard
          key={ranking.team_id}
          ranking={ranking}
          team={teams[ranking.team_id] || null}
          rank={startRank + index}
          selectedMode={selectedMode}
          rankingType={rankingType}
          isLoading={loadingTeams.has(ranking.team_id)}
        />
      ))}
    </div>
  );
};

export default TeamRankingsList;
