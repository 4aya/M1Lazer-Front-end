import React from 'react';
import { Link } from 'react-router-dom';

interface UserLinkProps {
  userId: number;
  username: string;
  className?: string;
  children?: React.ReactNode;
}

const UserLink: React.FC<UserLinkProps> = ({ 
  userId, 
  username, 
  className = '', 
  children 
}) => {
  return (
    <Link
      to={`/users/${userId}`}
      className={`hover:text-osu-pink transition-colors duration-200 ${className}`}
      title={`查看 ${username} 的个人资料`}
    >
      {children || username}
    </Link>
  );
};

export default UserLink;
