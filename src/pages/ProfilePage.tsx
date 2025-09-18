import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import UserProfileLayout from '../components/User/UserProfileLayout';
import type { GameMode } from '../types';

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading, updateUserMode, updateUser } = useAuth();
  const [selectedMode, setSelectedMode] = useState<GameMode>('osu');

  useEffect(() => {
    if (isAuthenticated) {
      updateUserMode(selectedMode).catch(() => {});
    }
  }, [selectedMode, isAuthenticated, updateUserMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-osu-pink" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Unable to load profile</h2>
        <p className="text-gray-600">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <>
      {/* === PAGE BACKGROUND ONLY (fixed, behind everything; no scroll/logic changes) === */}
      {/* light gradient */}
      <div className="fixed inset-0 -z-10 pointer-events-none bg-gradient-to-b from-white to-gray-50 dark:hidden" />
      {/* dark gradient */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none hidden dark:block"
        style={{ background: 'linear-gradient(180deg,#0f1424 0%,#0b1020 100%)' }}
      />
      {/* dotted grid (light) */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none opacity-35 dark:hidden"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '18px 18px'
        }}
      />
      {/* dotted grid (dark) */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none hidden dark:block opacity-30"
        style={{
          backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
          backgroundSize: '18px 18px'
        }}
      />
      {/* soft pink bloom up top (both modes) */}
      <div
        className="fixed inset-x-0 -top-24 h-72 -z-10 blur-2xl opacity-70 dark:opacity-80 pointer-events-none [mask-image:radial-gradient(75%_75%_at_50%_0%,#000_55%,transparent_100%)]"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, rgba(237,142,166,.28) 0%, rgba(237,142,166,0) 70%)'
        }}
      />

      {/* === CARD CONTENT (unchanged logic) === */}
      <UserProfileLayout
        user={user}
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
        onUserUpdate={updateUser}
      />
    </>
  );
};

export default ProfilePage;
