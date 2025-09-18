import { useState, useEffect, useRef, useCallback } from 'react';
import { notificationsAPI } from '../utils/api';
import type { 
  SocketMessage, 
  ChatEvent, 
  NotificationEvent, 
  APINotification,
  ChatMessage,
  User
} from '../types';
import { showCustomToast } from '../components/CustomToast';

// Generate a unique notification ID Functions of
let notificationIdCounter = 0;
const generateUniqueNotificationId = (): number => {
  return Date.now() * 10000 + (++notificationIdCounter % 10000);
};

interface UseWebSocketNotificationsProps {
  isAuthenticated: boolean;
  currentUser?: User | null;
  onNewMessage?: (message: ChatMessage) => void;
  onNewNotification?: (notification: APINotification) => void;
}

// ---------------- Global singleton state to prevent repeated establishment of multiple WebSocket connect ----------------
let globalWsRef: WebSocket | null = null; // sharedconnect
let globalConnecting = false; // connectmiddlemark
let globalIsConnected = false; // Globalconnectstate
let globalConnectionError: string | null = null; // Globalconnectmistake
const globalMessageListeners = new Set<(m: ChatMessage) => void>();
const globalNotificationListeners = new Set<(n: APINotification) => void>();
const globalConnectionStateListeners = new Set<(connected: boolean, error: string | null) => void>(); // connectstateListener
let globalEndpointCache: string | null = null; // Endpoint Cache

// Distribution functions
const dispatchChatMessage = (msg: ChatMessage) => {
  if (globalMessageListeners.size === 0) {
    messageBuffer.push(msg);
    return;
  }
  globalMessageListeners.forEach(fn => { try { fn(msg); } catch (e) { console.error('Failed to distribute chat messages to listeners', e); } });
};
const dispatchNotification = (n: APINotification) => {
  if (globalNotificationListeners.size === 0) {
    notificationBuffer.push(n);
    return;
  }
  globalNotificationListeners.forEach(fn => { try { fn(n); } catch (e) { console.error('Distributing notification to listener failed', e); } });
};
const dispatchConnectionState = (connected: boolean, error: string | null) => {
  globalIsConnected = connected;
  globalConnectionError = error;
  globalConnectionStateListeners.forEach(fn => { try { fn(connected, error); } catch (e) { console.error('distributionconnectstateGiveListenerfail', e); } });
};

// Buffer queue (staged when the listener is not mounted)
const messageBuffer: ChatMessage[] = [];
const notificationBuffer: APINotification[] = [];

export const useWebSocketNotifications = ({
  isAuthenticated,
  currentUser,
  onNewMessage,
  onNewNotification
}: UseWebSocketNotificationsProps) => {
  const [isConnected, setIsConnected] = useState(globalIsConnected);
  const [connectionError, setConnectionError] = useState<string | null>(globalConnectionError);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelayBase = 1000;
  const endpointCacheRef = useRef<string | null>(null);
  const lastConnectAttemptRef = useRef<number>(0);
  const connectionThrottleMs = 2000; // 2No repeat within secondsconnect

  // GetWebSocketEndpoint (with cache)
  const getWebSocketEndpoint = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated) {
      endpointCacheRef.current = null;
      globalEndpointCache = null;
      return null;
    }
    // Use global cache first
    if (globalEndpointCache) return globalEndpointCache;
    if (endpointCacheRef.current) return endpointCacheRef.current;
    try {
      const response = await notificationsAPI.getNotifications();
      endpointCacheRef.current = response.notification_endpoint;
      globalEndpointCache = endpointCacheRef.current;
      return endpointCacheRef.current;
    } catch (error) {
      console.error('Failed to get notification endpoint:', error);
      return null;
    }
  }, [isAuthenticated]);

  // Send a message toWebSocket
  const sendMessage = useCallback((message: SocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // deal withWebSocketinformation
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: SocketMessage = JSON.parse(event.data);
      console.log('WebSocketReceived originalinformation:', message);
      
  // deal withVarious chatsinformationevent
      if (message.event === 'chat.message.new' || 
          message.event === 'new_message' || 
          message.event === 'message') {
        const chatEvent = message as ChatEvent;
        console.log('Chat event data:', chatEvent.data);
        
        if (chatEvent.data?.messages) {
          console.log('deal withinformationArray:', chatEvent.data.messages);
          chatEvent.data.messages.forEach(msg => {
            // Filter your owninformation
            if (msg.sender_id && currentUser && msg.sender_id === currentUser.id) {
              console.log(`✓ Filter your ownchatinformation: ${msg.message_id}, SenderID: ${msg.sender_id}`);
              return;
            }
            console.log('Send to othersinformationTo callback:', msg);
            dispatchChatMessage(msg);
          });
        } else if ((chatEvent.data as any)?.message) {
          // Probably a singleinformationInsteadArray
          const msg = (chatEvent.data as any).message as ChatMessage;
          // Filter your owninformation
          if (msg.sender_id && currentUser && msg.sender_id === currentUser.id) {
            console.log(`✓ Filter your ownsinglechatinformation: ${msg.message_id}, SenderID: ${msg.sender_id}`);
            return;
          }
          console.log('deal withOthers are singleinformation:', msg);
          dispatchChatMessage(msg);
        } else if (chatEvent.data && typeof chatEvent.data === 'object') {
          // possibleinformationDirect dataexistdatamiddle
          const msg = chatEvent.data as ChatMessage;
          // Filter your owninformation
          if (msg.sender_id && currentUser && msg.sender_id === currentUser.id) {
            console.log(`✓ Filter your own directinformationdata: ${msg.message_id}, SenderID: ${msg.sender_id}`);
            return;
          }
          console.log('deal withOthers are directinformationdata:', msg);
          dispatchChatMessage(msg);
        }
      }
      // deal withDirectinformationFormat(Send directly to the serverChatMessageFormat data)
      else if (message.data && 
               typeof message.data === 'object' && 
               'message_id' in message.data && 
               'channel_id' in message.data && 
               'content' in message.data && 
               'sender_id' in message.data && 
               'timestamp' in message.data) {
        // Send directly to the serverChatMessageFormatofinformation
        console.log('deal withdirectChatMessageFormat:', message.data);
        const chatMessage: ChatMessage = {
          message_id: message.data.message_id as number,
          channel_id: message.data.channel_id as number,
          content: message.data.content as string,
          timestamp: message.data.timestamp as string,
          sender_id: message.data.sender_id as number,
          is_action: (message.data.is_action as boolean) || false,
          sender: message.data.sender as any,
          uuid: message.data.uuid as string | undefined
        };
        
        // Filter your owninformation
        if (chatMessage.sender_id && currentUser && chatMessage.sender_id === currentUser.id) {
          console.log(`✓ Filter your own directChatMessage: ${chatMessage.message_id}, SenderID: ${chatMessage.sender_id}`);
          return;
        }
        
  dispatchChatMessage(chatMessage);
      }
      // ifinformationIt's itselfChatMessageFormat(No nestingexistdatamiddle)
      else if ('message_id' in message && 
               'channel_id' in message && 
               'content' in message && 
               'sender_id' in message && 
               'timestamp' in message) {
        // informationdirectyesChatMessageFormat
        console.log('deal withdirectinformationFormat(No nesting):', message);
        const chatMessage: ChatMessage = {
          message_id: (message as any).message_id,
          channel_id: (message as any).channel_id,
          content: (message as any).content,
          timestamp: (message as any).timestamp,
          sender_id: (message as any).sender_id,
          is_action: (message as any).is_action || false,
          sender: (message as any).sender,
          uuid: (message as any).uuid
        };
        
        // Filter your owninformation
        if (chatMessage.sender_id && currentUser && chatMessage.sender_id === currentUser.id) {
          console.log(`✓ Filter your ownNo nestinginformation: ${chatMessage.message_id}, SenderID: ${chatMessage.sender_id}`);
          return;
        }
        
  dispatchChatMessage(chatMessage);
      }
      
      // deal withNew notice
      else if (message.event === 'new_private_notification') {
        const notificationEvent = message as NotificationEvent;
        if (notificationEvent.data) {
          // examineyesnoyesOwnofinformation,ifyesIt will not be displayednotify
          if (notificationEvent.data.source_user_id && currentUser && notificationEvent.data.source_user_id === currentUser.id) {
            console.log(`✓ Filter your own private notifications: ${notificationEvent.data.source_user_id}, Current userID: ${currentUser.id}`);
            return;
          }

          const notification: APINotification = {
            id: generateUniqueNotificationId(),
            name: notificationEvent.data.name,
            created_at: new Date().toISOString(),
            object_type: notificationEvent.data.object_type,
            object_id: notificationEvent.data.object_id.toString(),
            source_user_id: notificationEvent.data.source_user_id,
            is_read: false,
            details: notificationEvent.data.details
          };
          
          dispatchNotification(notification);
          
          // Show custom notification prompts
          const notificationTitle = getNotificationTitle(notification);
          if (notificationTitle) {
            showCustomToast({
              title: notificationTitle,
              message: 'You have new notifications',
              sourceUserId: notification.source_user_id,
              type: 'default'
            });
          }
        }
      }
      
      // deal withnewofnotifyevent(includePrivate chatnotify)
      else if (message.event === 'new') {
        console.log('deal withNew noticeevent:', message);
        
        if (message.data && typeof message.data === 'object') {
          const data = message.data as any;
          
          // Create corresponding notifications based on channel type
          if (data.category === 'channel' && data.name === 'channel_message') {
            const channelType = data.details?.type?.toLowerCase();
            console.log(`Channel notification detected, type: ${channelType}`, data);
            
            let notificationName = 'channel_message';
            let defaultTitle = 'Channelinformation';
            
            // Set notification name and default title according to channel type
            switch (channelType) {
              case 'pm':
                notificationName = 'channel_message';
                defaultTitle = 'Private chatinformation';
                break;
              case 'team':
                notificationName = 'channel_team';
                defaultTitle = 'teaminformation';
                break;
              case 'public':
                notificationName = 'channel_public';
                defaultTitle = 'Public Channel';
                break;
              case 'private':
                notificationName = 'channel_private';
                defaultTitle = 'Private Channel';
                break;
              case 'multiplayer':
                notificationName = 'channel_multiplayer';
                defaultTitle = 'Multiplayer Game';
                break;
              case 'spectator':
                notificationName = 'channel_spectator';
                defaultTitle = 'Watch Channel';
                break;
              case 'temporary':
                notificationName = 'channel_temporary';
                defaultTitle = 'Temporary Channel';
                break;
              case 'group':
                notificationName = 'channel_group';
                defaultTitle = 'Group Channel';
                break;
              case 'system':
                notificationName = 'channel_system';
                defaultTitle = 'System Channel';
                break;
              case 'announce':
                notificationName = 'channel_announce';
                defaultTitle = 'Announcement Channel';
                break;
              default:
                notificationName = 'channel_message';
                defaultTitle = 'Channelinformation';
                break;
            }
            
            const notification: APINotification = {
              id: generateUniqueNotificationId(),
              name: notificationName,
              created_at: data.created_at || new Date().toISOString(),
              object_type: data.object_type || 'channel',
              object_id: data.object_id?.toString() || data.id?.toString(),
              source_user_id: data.source_user_id,
              is_read: data.is_read || false,
              details: {
                type: data.details?.type || channelType || 'unknown',
                title: data.details?.title || defaultTitle,
                cover_url: data.details?.cover_url || ''
              }
            };
            
            console.log(`create${defaultTitle}Notify the object:`, notification, 'according tosource_user_idDetermine whether it is yourselfinformation - source_user_id:', notification.source_user_id);
            
            // examineyesnoyesOwnofinformation,ifyesThen nocreatenotify
            if (notification.source_user_id && currentUser && notification.source_user_id === currentUser.id) {
              console.log(`✓ existWebSocketlayerFilter your owninformationnotify: ${notification.id}, SenderID: ${notification.source_user_id}, Current userID: ${currentUser.id}`);
              return; // Return directly, without calling onNewNotification
            }
            
            console.log(`✓ PrepareSend to othersofinformationnotify: ${notification.id}`);
            dispatchNotification(notification);
            
            // Show custom notification prompts
            const notificationTitle = getNotificationTitle(notification);
            if (notificationTitle) {
              const toastType = channelType === 'pm' ? 'pm' : 
                              channelType === 'team' ? 'team' : 
                              channelType === 'public' ? 'public' : 'default';
              
              let toastMessage = '';
              switch (channelType) {
                case 'pm':
                  // Show actualofinformationcontent
                  const messageContent = data.details?.title as string;
                  if (messageContent && messageContent.length > 0 && messageContent !== 'From the user') {
                    // ifinformationTrunked, display prompt
                    if (messageContent.length >= 36) {
                      toastMessage = `${messageContent}... (There may be more content)`;
                    } else {
                      toastMessage = messageContent;
                    }
                  } else {
                    toastMessage = 'Sent onestripPrivate chatinformation';
                  }
                  break;
                case 'team':
                  const teamMessage = data.details?.title as string;
                  toastMessage = teamMessage || 'existTeam ChannelSentinformation';
                  break;
                case 'public':
                  const publicMessage = data.details?.title as string;
                  toastMessage = publicMessage || 'existPublic ChannelSentinformation';
                  break;
                default:
                  const generalMessage = data.details?.title as string;
                  toastMessage = generalMessage || 'Sent onestripinformation';
                  break;
              }
              
              showCustomToast({
                title: channelType === 'pm' ? 'newPrivate chatinformation' : notificationTitle,
                message: toastMessage,
                sourceUserId: notification.source_user_id,
                type: toastType
              });
            }
          }
          // Other types of notifications
          else {
            console.log('Other types of notifications detected:', data);
            
            const notification: APINotification = {
              id: generateUniqueNotificationId(),
              name: data.name || 'unknown',
              created_at: data.created_at || new Date().toISOString(),
              object_type: data.object_type || 'unknown',
              object_id: data.object_id?.toString() || data.id?.toString(),
              source_user_id: data.source_user_id,
              is_read: data.is_read || false,
              details: data.details || {}
            };
            
            console.log('createGeneralNotify the object:', notification);
            
            // examineyesnoyesOwnofinformation,ifyesIt will not be displayednotify
            if (notification.source_user_id && currentUser && notification.source_user_id === currentUser.id) {
              console.log(`✓ Filter your own general notifications: ${notification.id}, SenderID: ${notification.source_user_id}`);
              return;
            }
            
            dispatchNotification(notification);
            
            // Show custom universal notification prompts
            const notificationTitle = getNotificationTitle(notification);
            if (notificationTitle) {
              showCustomToast({
                title: notificationTitle,
                message: 'You have new notifications',
                sourceUserId: notification.source_user_id,
                type: 'default'
              });
            }
          }
        }
      }
      
      // deal withmistakeinformation
      if (message.error) {
        console.error('WebSocket error:', message.error);
        setConnectionError(message.error);
      }
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [onNewMessage, onNewNotification, currentUser]);

  // Rebinddeal withfunction(Single caseReuse)
  useEffect(() => {
    if (globalWsRef) {
      console.log('[WebSocket] Rebind onmessage deal withfunction (Depend on updates, Single case)');
      globalWsRef.onmessage = handleMessage;
      wsRef.current = globalWsRef;
    }
  }, [handleMessage]);

  // Register Listener (Component Layer)
  useEffect(() => {
    // registerconnectstateListener
    const connectionStateListener = (connected: boolean, error: string | null) => {
      setIsConnected(connected);
      setConnectionError(error);
    };
    globalConnectionStateListeners.add(connectionStateListener);
    
    if (onNewMessage) {
      globalMessageListeners.add(onNewMessage);
    }
    if (onNewNotification) {
      globalNotificationListeners.add(onNewNotification);
    }
    // Replay buffering(OnlyexistnewincreaseListenerExecute once)
    if (onNewMessage && messageBuffer.length) {
      console.log(`[WebSocket] Replay bufferinginformation ${messageBuffer.length} strip`);
      messageBuffer.splice(0).forEach(m => { try { onNewMessage(m); } catch {} });
    }
    if (onNewNotification && notificationBuffer.length) {
      console.log(`[WebSocket] Replay buffer notifications ${notificationBuffer.length} strip`);
      notificationBuffer.splice(0).forEach(n => { try { onNewNotification(n); } catch {} });
    }
    return () => {
      globalConnectionStateListeners.delete(connectionStateListener);
      if (onNewMessage) globalMessageListeners.delete(onNewMessage);
      if (onNewNotification) globalNotificationListeners.delete(onNewNotification);
      // no longerexistClose immediately every time the listener is cleanedconnect,Avoid component re-renderingofFlash break.
      // connectClose and hand over disconnect()(Certification invalid or real uninstall) Management.
    };
  }, [onNewMessage, onNewNotification]);

  // Getnotifytitle
  const getNotificationTitle = (notification: APINotification): string => {
    switch (notification.name) {
      case 'team_application_store':
        return `${notification.details.title} Apply to join the team`;
      case 'team_application_accept':
        return `Your team application has been accepted`;
      case 'team_application_reject':
        return `Your team application has been denied`;
      case 'channel_message':
        // according toTypes are displayed differentlyoftitle
        if (notification.details?.type === 'pm') {
          return `newPrivate chatinformation: ${notification.details.title || 'From the user'}`;
        } else if (notification.details?.type === 'team') {
          return `newteaminformation: ${notification.details.title || 'Team Channel'}`;
        }
        return `newPrivate chatinformation`;
      case 'channel_team':
        return `newteaminformation: ${notification.details?.title || 'Team Channel'}`;
      case 'channel_public':
        return `newPublic Channelinformation: ${notification.details?.title || 'Public Channel'}`;
      case 'channel_private':
        return `newPrivate Channelinformation: ${notification.details?.title || 'Private Channel'}`;
      case 'channel_multiplayer':
        return `newMultiplayer Gameinformation: ${notification.details?.title || 'Multiplayer Game'}`;
      case 'channel_spectator':
        return `newWatch Channelinformation: ${notification.details?.title || 'Watch Channel'}`;
      case 'channel_temporary':
        return `newTemporary Channelinformation: ${notification.details?.title || 'Temporary Channel'}`;
      case 'channel_group':
        return `newGroupsinformation: ${notification.details?.title || 'Group Channel'}`;
      case 'channel_system':
        return `newsysteminformation: ${notification.details?.title || 'System Channel'}`;
      case 'channel_announce':
        return `New announcement: ${notification.details?.title || 'Announcement Channel'}`;
      default:
        // Try fromdetailsmiddleGetMore meaningfuloftitle
        if (notification.details?.title) {
          return `New notice: ${notification.details.title}`;
        }
        return 'New notice';
    }
  };

  // WebSocketconnect
  const connect = useCallback(async () => {
  if (!isAuthenticated) return;

    // Throttle mechanism: Avoid frequentconnect
    const now = Date.now();
  if (now - lastConnectAttemptRef.current < connectionThrottleMs) {
      console.log('connectRequests are too frequent and have been skipped');
      return;
    }
    lastConnectAttemptRef.current = now;

    // likeGlobalconnectSavedexistAnd not closed, reused
    if (globalWsRef && (globalWsRef.readyState === WebSocket.OPEN || globalWsRef.readyState === WebSocket.CONNECTING)) {
      console.log('[WebSocket] ReusealreadyhaveGlobalconnect');
      wsRef.current = globalWsRef;
      if (globalWsRef.readyState === WebSocket.OPEN) {
        // Synchronize the currentconnectstateGo to the local areastate
        setIsConnected(globalIsConnected);
        setConnectionError(globalConnectionError);
      }
      return;
    }
    if (globalConnecting) {
      console.log('[WebSocket] alreadyexistEstablishconnectmiddle,jump overnewestablish');
      return;
    }
    globalConnecting = true;

    const endpoint = await getWebSocketEndpoint();
    if (!endpoint) {
      dispatchConnectionState(false, 'Failed to get WebSocket endpoint');
      return;
    }

    try {
      dispatchConnectionState(false, null);
      
      // BuildWebSocket URL, add authentication parameters
      const token = localStorage.getItem('access_token');
      if (!token) {
        dispatchConnectionState(false, 'No access token available');
        return;
      }

      // make sureendpointIt's completeWebSocket URL
      let wsUrl: string;
      if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
        wsUrl = `${endpoint}?access_token=${encodeURIComponent(token)}`;
      } else {
        // ifyesRelative path,BuildwholeofWebSocket URL
        const baseUrl = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const host = window.location.host;
        wsUrl = `${baseUrl}${host}${endpoint}?access_token=${encodeURIComponent(token)}`;
      }
  const ws = new WebSocket(wsUrl);
  globalWsRef = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected (Single case)');
        dispatchConnectionState(true, null);
        reconnectAttemptsRef.current = 0;
        globalConnecting = false;
        
        // Send Startinformation
        ws.send(JSON.stringify({
          event: 'chat.start'
        }));
      };  ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('WebSocket disconnected (Single case):', event.code, event.reason);
        dispatchConnectionState(false, null);
        if (wsRef.current === ws) wsRef.current = null;
        if (globalWsRef === ws) globalWsRef = null;
        globalConnecting = false;
        
        // Automatic reconnection
        if (isAuthenticated && (globalMessageListeners.size > 0 || globalNotificationListeners.size > 0) && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelayBase * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          dispatchConnectionState(false, 'Connection lost and max reconnect attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error (Single case):', error);
        console.log('WebSocket URL:', wsUrl);
        console.log('Endpoint:', endpoint);
        dispatchConnectionState(false, `WebSocket connection error: ${endpoint}`);
      };

      wsRef.current = ws;
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      dispatchConnectionState(false, 'Failed to create WebSocket connection');
      globalConnecting = false;
    }
  }, [isAuthenticated, getWebSocketEndpoint, handleMessage]);

  // disconnectconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    // OnlyhaveWhen nothaveRemainingListenerIt's really closedGlobalconnect
    const shouldClose = globalMessageListeners.size === 0 && globalNotificationListeners.size === 0;
    if (shouldClose && globalWsRef) {
      try {
        if (globalWsRef.readyState === WebSocket.OPEN) {
          globalWsRef.send(JSON.stringify({ event: 'chat.end' }));
        }
        globalWsRef.close();
      } catch { /* ignore */ }
      globalWsRef = null;
    }
    if (wsRef.current && wsRef.current !== globalWsRef) {
      try { wsRef.current.close(); } catch { /* ignore */ }
      wsRef.current = null;
    }
    globalConnecting = false;
    dispatchConnectionState(false, null);
    reconnectAttemptsRef.current = 0;
    
    // Clean up the cache
    if (shouldClose) {
      endpointCacheRef.current = null;
      globalEndpointCache = null;
      lastConnectAttemptRef.current = 0;
    }
  }, []);

  // manageconnectstate
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [isAuthenticated]);

  // Reconnect when page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && !isConnected) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isConnected, connect]);

  return {
    isConnected,
    connectionError,
    sendMessage,
    reconnect: connect
  };
};
