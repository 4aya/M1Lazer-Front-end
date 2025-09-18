import { useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../utils/api';
import { apiCache } from '../utils/apiCache';
import { useWebSocketNotifications } from './useWebSocketNotifications';
import type { UnreadCount, APINotification, User } from '../types';

export const useNotifications = (isAuthenticated: boolean, currentUser?: User | null) => {
  const [unreadCount, setUnreadCount] = useState<UnreadCount>({
    total: 0,
    team_requests: 0,
    private_messages: 0,
    friend_requests: 0,
  });
  const [notifications, setNotifications] = useState<APINotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Process new notifications
  const handleNewNotification = useCallback((notification: APINotification) => {
    console.log('Received a new notification:', {
      id: notification.id,
      source_user_id: notification.source_user_id,
      current_user_id: currentUser?.id,
      name: notification.name
    });

    // Check if it is your own message, and if so, ignore the notification
    if (notification.source_user_id && currentUser && notification.source_user_id === currentUser.id) {
      console.log(`✓ Ignore your message notifications:`, notification.id, 'SenderID:', notification.source_user_id, 'Current userID:', currentUser.id);
      return;
    }

    console.log('✓ Process other peoples message notifications:', notification.id);

    // Pre-get user information in order toUIShow correct username
    if (notification.source_user_id && !apiCache.hasCachedUser(notification.source_user_id)) {
      console.log('Pre-get notification related user information:', notification.source_user_id);
      apiCache.getUser(notification.source_user_id).catch(error => {
        console.error('Pre-acquisition of user information failed:', error);
      });
    }

    setNotifications(prev => {
      // Improved deduplication logic: based on object_id, object_type and source_user_id Deduplication
      const isDuplicate = prev.some(n => {
        // if ID Exactly the same
        if (n.id === notification.id) return true;
        
        // ifIt's the same typenotify, with the same objectandSender
        if (n.object_id === notification.object_id && 
            n.object_type === notification.object_type &&
            n.name === notification.name &&
            n.source_user_id === notification.source_user_id) {
          return true;
        }
        
        return false;
      });
      
      if (isDuplicate) {
        console.log('Repeated notifications were detected, skip adding:', notification.id, notification.object_id, notification.name);
        return prev;
      }
      
      console.log('Add a new notification:', notification.id, notification.object_id, notification.name, 'Sender:', notification.source_user_id);
      return [notification, ...prev];
    });
    
    // Update unread quantity
    setUnreadCount(prev => {
      const newCount = { ...prev };
      
      // Increase the corresponding count according to the notification type
      switch (notification.name) {
        case 'team_application_store':
        case 'team_application_accept':
        case 'team_application_reject':
          newCount.team_requests++;
          break;
        case 'channel_message':
          newCount.private_messages++;
          break;
        default:
          break;
      }
      
      newCount.total = newCount.team_requests + newCount.private_messages + newCount.friend_requests;
      return newCount;
    });
  }, [currentUser]);

  // useWebSocketconnect
  const { isConnected, connectionError } = useWebSocketNotifications({
    isAuthenticated,
    currentUser,
    onNewNotification: handleNewNotification,
  });

  // Get initial notification data
  const fetchNotifications = useCallback(async (force: boolean = false) => {
    if (!isAuthenticated) {
      setUnreadCount({
        total: 0,
        team_requests: 0,
        private_messages: 0,
        friend_requests: 0,
      });
      setNotifications([]);
      return;
    }

    // ifNot forced refresh and there is already data, skip
    if (!force && notifications.length > 0) {
      return;
    }

    try {
      setIsLoading(true);
      
      // useGroup deduplication API Get notification
      const response = await notificationsAPI.getGroupedNotifications();
      
      setNotifications(response.notifications || []);
      
      // Pre-get user information related to all notifications
      const userIdsToFetch = new Set<number>();
      (response.notifications || []).forEach((notification: APINotification) => {
        if (notification.source_user_id && !apiCache.hasCachedUser(notification.source_user_id)) {
          userIdsToFetch.add(notification.source_user_id);
        }
      });
      
      if (userIdsToFetch.size > 0) {
        console.log(`Pre-get notification related user information: ${userIdsToFetch.size}A user`);
        apiCache.getUsers(Array.from(userIdsToFetch)).catch(error => {
          console.error('batchGet notificationUser information failed:', error);
        });
      }
      
      // Calculate unread count
      const teamRequestCount = response.notifications.filter((n: APINotification) => 
        ['team_application_store', 'team_application_accept', 'team_application_reject'].includes(n.name) && !n.is_read
      ).length;
      
      const privateMessageCount = response.notifications.filter((n: APINotification) => 
        n.name === 'channel_message' && !n.is_read
      ).length;
      
      const friendRequestCount = 0; // No friend requests yet
      
      setUnreadCount({
        team_requests: teamRequestCount,
        private_messages: privateMessageCount,
        friend_requests: friendRequestCount,
        total: teamRequestCount + privateMessageCount + friendRequestCount,
      });
      
    } catch (error) {
      console.error('Get notificationfail:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial loading
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(true); // Force refresh of initial data
    }
  }, [isAuthenticated]);

  // Refresh regularly (whenWebSocketnot yetconnecthour)
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      const interval = setInterval(() => fetchNotifications(true), 60000); // Add to60Seconds, reduce frequency
      return () => clearInterval(interval);
    }
  }, [isConnected, isAuthenticated]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchNotifications(true);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      console.log(`Tag notifications ${notificationId} Read`);
      
      // Find the notification you want to mark first
      const targetNotification = notifications.find(n => n.id === notificationId);
      if (!targetNotification) {
        console.log(`notify ${notificationId} Does not exist, skip processing`);
        return;
      }
      
      if (targetNotification.is_read) {
        console.log(`notify ${notificationId} It is already read, skipAPICall`);
        return;
      }
      
      // CallAPImarkRead
      await notificationsAPI.markAsRead(notificationId);
      
      // Update local status
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      
      // Update unread quantity(usealreadyturn upofnotifyObject)
      setUnreadCount(prev => {
        console.log(`Unread count before marking:`, prev);
        const newCount = { ...prev };
        
        switch (targetNotification.name) {
          case 'team_application_store':
          case 'team_application_accept':
          case 'team_application_reject':
            newCount.team_requests = Math.max(0, newCount.team_requests - 1);
            console.log(`Reduce team request count, currently: ${newCount.team_requests}`);
            break;
          case 'channel_message':
            newCount.private_messages = Math.max(0, newCount.private_messages - 1);
            console.log(`Reduce the private chat message count, currently: ${newCount.private_messages}`);
            break;
        }
        
        newCount.total = newCount.team_requests + newCount.private_messages + newCount.friend_requests;
        console.log(`Unread count after marking:`, newCount);
        return newCount;
      });
      
    } catch (error) {
      console.error('Tag notificationsalreadyreadfail:', error);
    }
  }, [notifications]);

  // reducenot yetreadquantity(When the user viewednotifyhour)
  const decrementCount = useCallback((type?: keyof Omit<UnreadCount, 'total'>, amount: number = 1) => {
    setUnreadCount(prev => {
      const newCount = { ...prev };
      
      if (type && newCount[type] > 0) {
        newCount[type] = Math.max(0, newCount[type] - amount);
      }
      
      // Recalculate the total number
      newCount.total = newCount.team_requests + newCount.private_messages + newCount.friend_requests;
      
      return newCount;
    });
  }, []);

  // deletenotify
  const removeNotification = useCallback((notificationId: number) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        // ifdeleteofyesnot yetreadnotify,needUpdate unread quantity
        setUnreadCount(prevCount => {
          const newCount = { ...prevCount };
          
          switch (notification.name) {
            case 'team_application_store':
            case 'team_application_accept':
            case 'team_application_reject':
              newCount.team_requests = Math.max(0, newCount.team_requests - 1);
              break;
            case 'channel_message':
              newCount.private_messages = Math.max(0, newCount.private_messages - 1);
              break;
          }
          
          newCount.total = newCount.team_requests + newCount.private_messages + newCount.friend_requests;
          return newCount;
        });
      }
      
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  // according to object_id and object_type deleteRelatednotify
  const removeNotificationByObject = useCallback(async (objectId: string, objectType: string) => {
    console.log(`Preparedeletenotify: objectId=${objectId}, objectType=${objectType}`);
    
    try {
      // turn upmatchofnotify
      const notificationsToRemove = notifications.filter(n => 
        n.object_id === objectId && n.object_type === objectType
      );
      
      console.log(`turn up ${notificationsToRemove.length} indivualmatchofnotifyneeddelete:`, notificationsToRemove.map(n => n.id));
      
      if (notificationsToRemove.length === 0) {
        console.log('Noturn upmatchofnotify,jump overdelete');
        return;
      }
      
      // CallAPIbatchmarkRead (object_type The backend is a string)
      // Press only object_id Mark read, avoid passing object_type (Backend expectations int Will parse failure)
      await notificationsAPI.markMultipleAsRead([
        {
          object_id: parseInt(objectId),
        }
      ]);
      
      // Update local status
      setNotifications(prev => {
        const unreadNotificationsToRemove = notificationsToRemove.filter(n => !n.is_read);
        console.log(`in ${unreadNotificationsToRemove.length} indivualyesnot yetreadnotify`);
        
        if (unreadNotificationsToRemove.length > 0) {
          setUnreadCount(prevCount => {
            const newCount = { ...prevCount };
            console.log(`Unread count before deletion:`, prevCount);
            
            unreadNotificationsToRemove.forEach(notification => {
              switch (notification.name) {
                case 'team_application_store':
                case 'team_application_accept':
                case 'team_application_reject':
                  newCount.team_requests = Math.max(0, newCount.team_requests - 1);
                  console.log(`Reduce team request count, currently: ${newCount.team_requests}`);
                  break;
                case 'channel_message':
                  newCount.private_messages = Math.max(0, newCount.private_messages - 1);
                  console.log(`Reduce the private chat message count, currently: ${newCount.private_messages}`);
                  break;
              }
            });
            
            newCount.total = newCount.team_requests + newCount.private_messages + newCount.friend_requests;
            console.log(`Unread count after deletion:`, newCount);
            return newCount;
          });
        }
        
        // WillmatchofnotifymarkRead, withoutyesdelete
        const updatedNotifications = prev.map(n => 
          (n.object_id === objectId && n.object_type === objectType) 
            ? { ...n, is_read: true } 
            : n
        );
        
        console.log(`markbacknotifyquantity: ${updatedNotifications.length}`);
        return updatedNotifications;
      });
    } catch (error) {
      console.error('batchTag notificationsalreadyreadfail:', error);
    }
  }, [notifications]);

  return {
    unreadCount,
    notifications,
    isLoading,
    isConnected,
    connectionError,
    refresh,
    decrementCount,
    markAsRead,
    removeNotification,
    removeNotificationByObject,
  };
};
