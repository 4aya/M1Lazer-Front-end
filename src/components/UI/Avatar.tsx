import React, { useState, useEffect, useMemo } from 'react';
import { FiCamera } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { userAPI } from '../../utils/api';
import AvatarUpload from './AvatarUpload';
import { useAuth } from '../../contexts/AuthContext';

const debugLog = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) console.log(message, data);
};

interface AvatarProps {
  userId?: number;
  username: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  shape?: 'circle' | 'rounded';
  isCurrentUser?: boolean;
  currentUserId?: number;
  editable?: boolean;
  showUploadHint?: boolean;
  onAvatarUpdate?: (newAvatarUrl: string) => void;
}

/** Key point 1: Make pictures independent memo Components, avoid hover State changes cause re-rendering */
const ImageBlock = React.memo(function ImageBlock({
  src,
  alt,
  radiusClass,
  isLoading,
  onLoad,
  onError,
}: {
  src: string;
  alt: string;
  radiusClass: string;
  isLoading: boolean;
  onLoad: () => void;
  onError: () => void;
}) {
  return (
    <div className="relative w-full h-full" style={{ transform: 'translateZ(0)' }}>
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-300 dark:bg-gray-700 animate-pulse ${radiusClass}`} />
      )}
      <img
        /** Key point 2: Not given <img> Set any recalculation that triggers key;hover hour props No nodes will not be rebuilt if they are not changed */
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`block w-full h-full object-cover transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${radiusClass} will-change-[opacity]`}
        onLoad={onLoad}
        onError={onError}
        draggable={false}
        style={{ pointerEvents: 'none', backfaceVisibility: 'hidden' }}
      />
    </div>
  );
});

const Avatar: React.FC<AvatarProps> = ({
  userId,
  username,
  avatarUrl,
  size = 'md',
  className = '',
  shape = 'rounded',
  isCurrentUser = false,
  currentUserId,
  editable = false,
  showUploadHint = true,
  onAvatarUpdate,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { user: currentUser } = useAuth()

  const isSelf = currentUser && userId && currentUser.id === userId;

  //const shouldShowUpload = Boolean(editable || isSelf);

  const sizeClasses = {
    sm: 'w-8 h-8 min-w-8 min-h-8 text-sm',
    md: 'w-12 h-12 min-w-12 min-h-12 text-base',
    lg: 'w-16 h-16 min-w-16 min-h-16 text-lg',
    xl: 'w-24 h-24 min-w-24 min-h-24 text-xl',
    '2xl': 'w-32 h-32 min-w-32 min-h-32 text-2xl',
  } as const;

  const hoverOverlaySizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
    '2xl': 'text-xl',
  } as const;

  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  // Only if explicitly set editable=true Or not set editable And it's the current userhourOnly the upload function is displayed
  const shouldShowUpload = editable === true || (editable !== false && isSelf);

  useEffect(() => {
    debugLog('AvatarComponent status:', {
      shouldShowUpload,
      editable,
      isCurrentUser,
      currentUserId,
      userId,
      username,
    });
  }, [shouldShowUpload, editable, isCurrentUser, currentUserId, userId, username]);

  useEffect(() => {
    const getImageUrl = () => {
      debugLog('Avatar getImageUrl - avatarUrl:', { avatarUrl, userId, username });
      if (avatarUrl && avatarUrl.trim() !== '') return avatarUrl;
      if (userId) return userAPI.getAvatarUrl(userId);
      return '/default.jpg';
    };
    setImageError(false);
    setIsLoading(true);
    setRetryCount(0); // Reset the retry count
    setCurrentImageUrl(getImageUrl());
  }, [userId, username, avatarUrl]);

  const shouldShowImage = currentImageUrl && !imageError;
  const fallbackLetter = (username || '?').charAt(0).toUpperCase();

  const handleImageLoad = () => {
    debugLog('The picture loaded successfully:', currentImageUrl);
    setIsLoading(false);
  };

  const handleImageError = () => {
    debugLog('Image loading failed:', currentImageUrl);
    
    // in the case ofAPIGenerated avatarURLAnd the number of retry times is less than3Time, try again
    if (userId && currentImageUrl.includes(`/users/${userId}/avatar`) && retryCount < 3) {
      debugLog(`The avatar failed to load,${1000 * (retryCount + 1)}msTry again${retryCount + 1}Second-rate`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        const retryUrl = userAPI.getAvatarUrl(userId, true); // Destroy cache and try again
        setCurrentImageUrl(retryUrl);
        setIsLoading(true);
      }, 1000 * (retryCount + 1)); // Incremental delay:1s, 2s, 3s
      return;
    }
    
    // If notAPIavatarURLOr the retry limit has been reached, try to load the default image
    if (currentImageUrl !== '/default.jpg') {
      debugLog('Try to load the default image');
      setCurrentImageUrl('/default.jpg');
      setImageError(false);
      setIsLoading(true);
      setRetryCount(0); // Reset the retry count
    } else {
      debugLog('The default image also fails to load, and the letters are displayed');
      setImageError(true);
      setIsLoading(false);
      setRetryCount(0); // Reset the retry count
    }
  };

  const handleUploadSuccess = (newAvatarUrl: string) => {
    debugLog('Avatar upload success:', newAvatarUrl);
    
    // Reset the retry countand error status
    setRetryCount(0);
    setImageError(false);
    setIsLoading(false);
    
    // Update local display nowofavatarURL(bringhourStampDestroy cache)
    const urlWithTimestamp = `${newAvatarUrl}${newAvatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    setCurrentImageUrl(urlWithTimestamp);
    
    // DelayPerform user information refresh and give the server somehourIntermediate processingavatar
    setTimeout(() => {
      debugLog('DelayRefresh user information andavatarcache');
      // If there isuserId,useAPIRe-acquireavatarURL(Destroy the cache)
      if (userId) {
        const refreshedUrl = userAPI.getAvatarUrl(userId, true); // Destroy cache
        setCurrentImageUrl(refreshedUrl);
      }
      onAvatarUpdate?.(newAvatarUrl);
    }, 2000); // Delay2Second
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    debugLog('AvatarClick event triggers', {
      shouldShowUpload,
      editable,
      isCurrentUser,
      currentUserId,
      userId,
    });
    if (shouldShowUpload) {
      setShowUploadModal(true);
    }
  };

  /** Key point three:overlay Use the content of useMemo(avoid repeated creation) and use framer-motion Control the animation of the visible and hidden */
  const Overlay = useMemo(
    () => (
      <AnimatePresence initial={false}>
        {shouldShowUpload && isHovering && (
          <motion.div
            key="overlay"
            className={`absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center ${radius} z-10 will-change-[opacity,transform]`}
            /** Don't grab events, let the container handle clicks/hover */
            style={{ pointerEvents: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeInOut' }}
          >
            <FiCamera
              className={`${size === 'sm' || size === 'md' ? 'w-4 h-4' : 'w-6 h-6'} text-white mb-1`}
            />
            {showUploadHint && (size === 'lg' || size === 'xl' || size === '2xl') && (
              <span className={`text-white text-xs ${hoverOverlaySizes[size]} text-center px-1 leading-tight`}>
                Click to upload
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    ),
    [shouldShowUpload, isHovering, radius, size, showUploadHint]
  );

  return (
    <>
      <div
        className={[
          sizeClasses[size],
          radius,
          'overflow-hidden flex-shrink-0 shadow-md relative',
          shouldShowUpload ? 'cursor-pointer hover:shadow-lg transition-all duration-200 select-none' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ display: 'inline-block', transform: 'translateZ(0)' }} // Key point 4: Force synthetic layer to reduce jitter
        onClick={shouldShowUpload ? handleAvatarClick : undefined}
        onMouseEnter={
          shouldShowUpload
            ? () => {
                debugLog('Mouse entryavatararea');
                setIsHovering(true);
              }
            : undefined
        }
        onMouseLeave={
          shouldShowUpload
            ? () => {
                debugLog('Mouse leaveavatararea');
                setIsHovering(false);
              }
            : undefined
        }
        title={shouldShowUpload ? 'Click to uploadavatar' : `${username}ofavatar`}
        role={shouldShowUpload ? 'button' : 'img'}
        tabIndex={shouldShowUpload ? 0 : -1}
        onKeyDown={
          shouldShowUpload
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAvatarClick(e as any);
                }
              }
            : undefined
        }
      >
        {/* Image rendering and hover State decoupling:hover hour ImageBlock of props Unchanged, no rebuilding or triggering loading */}
        {shouldShowImage ? (
          <ImageBlock
            src={currentImageUrl}
            alt={`${username}ofavatar`}
            radiusClass={radius}
            isLoading={isLoading}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gray-400 text-white font-bold ${radius}`}>
            {fallbackLetter}
          </div>
        )}

        {/* use framer-motion Gradually disappearingofSuspension layer will not affect <img> oflife cycle */}
        {Overlay}
      </div>

      {showUploadModal && (
        <AvatarUpload
          userId={userId}
          currentAvatarUrl={currentImageUrl}
          onUploadSuccess={handleUploadSuccess}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </>
  );
};

export default Avatar;
