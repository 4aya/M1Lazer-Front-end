import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { friendsAPI, handleApiError } from '../utils/api';

export type FriendStatus = {
  isFriend: boolean;
  isBlocked: boolean;
  isMutual: boolean;
  followsMe: boolean;
  loading: boolean;
  isSelf: boolean;
};

export function useFriendRelationship(targetUserId: number, selfUserId: number) {
  const mountedRef = useRef(true);
  
  // Add debug log
  console.log('useFriendRelationship called with:', { targetUserId, selfUserId });
  
  // Parameter verification
  const isValidUserId = (id: any): id is number => {
    return typeof id === 'number' && !isNaN(id) && id > 0;
  };
  
  if (!isValidUserId(targetUserId)) {
    console.error('Invalid targetUserId:', targetUserId);
  }
  
  if (!isValidUserId(selfUserId)) {
    console.error('Invalid selfUserId:', selfUserId);
  }
  
  const [status, setStatus] = useState<FriendStatus>({
    isFriend: false,
    isBlocked: false,
    isMutual: false,
    followsMe: false,
    loading: true, // The beginning is always loading,let API Let's judge
    isSelf: false, // The initial assumption is not yourself,let API Let's judge
  });

  const refresh = useCallback(async () => {
    // verify targetUserId Is it valid or not
    if (!isValidUserId(targetUserId)) {
      console.error('Cannot make API call with invalid targetUserId:', targetUserId);
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }
    
    // verify selfUserId Is it valid or not
    if (!isValidUserId(selfUserId)) {
      console.error('Cannot make API call with invalid selfUserId:', selfUserId);
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      console.log('Making API call to check relationship for userId:', targetUserId);
      setStatus(prev => ({ ...prev, loading: true }));
      
      const res = await friendsAPI.checkRelationship(targetUserId);
      console.log('API response:', res);
      
      if (!mountedRef.current) return;

      // Mapping API Response field to component state
      setStatus({
        isFriend: !!res?.is_following,    // Do I pay attention to the other person?
        isBlocked: !!res?.isBlocked,      // Whether to block (API This field may not be returned)
        isMutual: !!res?.mutual,          // Whether to pay attention to each other
        followsMe: !!res?.is_followed,    // Does the other party pay attention to me
        loading: false,
        isSelf: false,
      });
      
      console.log('Mapped status:', {
        original: res,
        mapped: {
          isFriend: !!res?.is_following,
          isBlocked: !!res?.isBlocked,
          isMutual: !!res?.mutual,
          followsMe: !!res?.is_followed,
        }
      });
    } catch (err: any) {
      console.log('API call failed:', err);
      
      // Check if it is"Can't check yourself"Error
      const errorMessage = err?.response?.data?.message || err?.message || '';
      const isSelfError = errorMessage.includes('Cannot check relationship with yourself') || 
                         errorMessage.includes('yourself') ||
                         (err?.response?.status === 422 && errorMessage.includes('relationship'));
      
      if (isSelfError) {
        console.log('Detected self-relationship error, setting isSelf to true');
        if (mountedRef.current) {
          setStatus({
            isFriend: false,
            isBlocked: false,
            isMutual: false,
            followsMe: false,
            loading: false,
            isSelf: true,
          });
        }
        return; // No errors are displayedtoast, this is normal
      }
      
      // Other errors are handled normally
      console.error('Real API error:', {
        targetUserId,
        selfUserId,
        errorMessage,
        status: err?.response?.status
      });
      
      if (mountedRef.current) {
        setStatus(prev => ({ ...prev, loading: false }));
      }
      handleApiError(err);
    }
  }, [targetUserId]);

  useEffect(() => {
    mountedRef.current = true;
    
    console.log('useEffect triggered:', { targetUserId, selfUserId });
    
    // Always try to request,letrear endLet's judgeWhether it is for yourself
    refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [targetUserId, selfUserId, refresh]);

  // Dynamic acquisition isSelf state
  const currentIsSelf = status.isSelf;

  // Optimistic update of auxiliary functions
  const withOptimisticUpdate = useCallback((
    updater: (prev: FriendStatus) => FriendStatus,
    action: () => Promise<any>,
    okMsg?: string
  ) => {
    const prev = status;
    const optimistic = updater(prev);
    setStatus(optimistic);

    return action()
      .then(() => {
        if (okMsg) toast.success(okMsg);
        return refresh();
      })
      .catch((err) => {
        setStatus(prev);
        handleApiError(err);
      });
  }, [status, refresh]);

  // Create operation functions
  const add = useCallback(() => {
    console.log('Add friend called:', { targetUserId, currentIsSelf, isValidTargetUserId: isValidUserId(targetUserId) });
    
    if (currentIsSelf) {
      console.log('Cannot add self as friend');
      return Promise.resolve();
    }
    
    if (!isValidUserId(targetUserId)) {
      console.error('Cannot add friend - invalid targetUserId:', targetUserId);
      toast.error('Invalid userID');
      return Promise.reject(new Error('Invalid targetUserId'));
    }
    
    return withOptimisticUpdate(
      (s) => ({ ...s, isFriend: true }),
      () => {
        console.log('Calling friendsAPI.addFriend with targetUserId:', targetUserId);
        return friendsAPI.addFriend(targetUserId);
      },
      'Already followed this user'
    );
  }, [targetUserId, currentIsSelf, withOptimisticUpdate]);

  const remove = useCallback(() => {
    if (currentIsSelf) return Promise.resolve();
    
    return withOptimisticUpdate(
      (s) => ({ ...s, isFriend: false, isMutual: false }),
      () => friendsAPI.removeFriend(targetUserId),
      'Unfollowed'
    );
  }, [targetUserId, currentIsSelf, withOptimisticUpdate]);

  const block = useCallback(() => {
    if (currentIsSelf) return Promise.resolve();
    
    return withOptimisticUpdate(
      (s) => ({ ...s, isBlocked: true, isFriend: false, isMutual: false }),
      () => friendsAPI.blockUser(targetUserId),
      'This user has been blocked'
    );
  }, [targetUserId, currentIsSelf, withOptimisticUpdate]);

  const unblock = useCallback(() => {
    if (currentIsSelf) return Promise.resolve();
    
    return withOptimisticUpdate(
      (s) => ({ ...s, isBlocked: false }),
      () => friendsAPI.unblockUser(targetUserId),
      'Unblocked'
    );
  }, [targetUserId, currentIsSelf, withOptimisticUpdate]);
  console.log('Current status:', status);
  return {
    status,
    isSelf: currentIsSelf,
    refresh,
    add,
    remove,
    block,
    unblock,
  };
}