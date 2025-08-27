import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEdit, FiTrash2, FiUserPlus, FiLogOut, FiMoreHorizontal } from 'react-icons/fi';
import { teamsAPI, handleApiError } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import type { Team, User } from '../../types';

interface Props {
  team: Team;
  members: User[];
  onTeamUpdate?: () => void;
}

const TeamActions: React.FC<Props> = ({ team, members, onTeamUpdate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showActions, setShowActions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLeader = user?.id === team.leader_id;
  const isMember = members.some(member => member.id === user?.id);

  // 请求加入战队
  const handleJoinRequest = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      await teamsAPI.requestJoinTeam(team.id);
      toast.success('加入请求已发送，请等待队长审核');
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 退出战队
  const handleLeaveTeam = async () => {
    if (!user || !confirm('确定要退出这个战队吗？')) return;

    setIsSubmitting(true);
    try {
      await teamsAPI.removeMember(team.id, user.id);
      toast.success('已退出战队');
      onTeamUpdate?.();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除战队
  const handleDeleteTeam = async () => {
    if (!confirm('确定要删除这个战队吗？此操作不可撤销！')) return;

    setIsSubmitting(true);
    try {
      await teamsAPI.deleteTeam(team.id);
      toast.success('战队已删除');
      navigate('/teams');
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* 主要操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 加入战队按钮 */}
        {!isMember && (
          <button
            onClick={handleJoinRequest}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 bg-osu-pink text-white rounded-lg hover:bg-osu-pink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiUserPlus className="mr-2" />
            {isSubmitting ? '请求中...' : '请求加入'}
          </button>
        )}

        {/* 退出战队按钮 */}
        {isMember && !isLeader && (
          <button
            onClick={handleLeaveTeam}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiLogOut className="mr-2" />
            {isSubmitting ? '退出中...' : '退出战队'}
          </button>
        )}

        {/* 队长操作菜单 */}
        {isLeader && (
          <>
            {/* 编辑按钮 */}
            <Link
              to={`/teams/${team.id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-osu-pink text-white rounded-lg hover:bg-osu-pink/90 transition-colors"
            >
              <FiEdit className="mr-2" />
              编辑战队
            </Link>

            {/* 更多操作按钮 */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiMoreHorizontal className="w-5 h-5" />
              </button>

              {/* 下拉菜单 */}
              {showActions && (
                <div className="absolute left-auto right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999]">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowActions(false);
                        handleDeleteTeam();
                      }}
                      disabled={isSubmitting}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <FiTrash2 className="mr-3 w-4 h-4" />
                      删除战队
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 点击外部关闭菜单 */}
      {showActions && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
};

export default TeamActions;
