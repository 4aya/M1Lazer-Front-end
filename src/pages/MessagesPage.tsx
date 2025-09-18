import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMessageCircle, 
  FiBell, 
  FiChevronLeft,
  FiX,
  FiCheck,
  FiUserPlus,
  FiPlus,
  FiRefreshCw
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
// Use global notification context to avoid Navbar The individual instances are not synchronized
import { useNotificationContext } from '../contexts/NotificationContext';
import { useWebSocketNotifications } from '../hooks/useWebSocketNotifications';
import { chatAPI, teamsAPI, userAPI } from '../utils/api';
import { apiCache } from '../utils/apiCache';

import MessageBubble from '../components/Chat/MessageBubble';
import ChannelItem from '../components/Chat/ChannelItem';
import MessageInput from '../components/Chat/MessageInput';
import PrivateMessageModal from '../components/Chat/PrivateMessageModal';
import type { 
  ChatChannel, 
  ChatMessage, 
  APINotification
} from '../types';
import toast from 'react-hot-toast';

// UTCTime converted to local time
const convertUTCToLocal = (utcTimeString: string): string => {
  try {
    const utcDate = new Date(utcTimeString);
    return utcDate.toISOString(); // This will automatically convert to local time zone display
  } catch (error) {
    console.error('Time conversion error:', error);
    return utcTimeString;
  }
};

type ActiveTab = 'channels' | 'notifications';
type ChannelFilter = 'all' | 'private' | 'team' | 'public';

const MessagesPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('channels');
  const [channels, _setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Save the latest message array to avoid WebSocket The callback closure has expired messages
  const messagesRef = useRef<ChatMessage[]>([]);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showNewPMModal, setShowNewPMModal] = useState(false);
  
  // Optimized channel message loading function, using cacheAPI
  const loadChannelMessages = useCallback(async (channelId: number): Promise<ChatMessage[] | null> => {
    try {
      console.log(`Start loading the channel ${channelId} News`);
      
      const channelMessages = await apiCache.getChannelMessages(channelId);
      
      if (channelMessages && channelMessages.length > 0) {
        // Convert timestamp
        const messagesWithLocalTime = channelMessages.map((msg: ChatMessage) => ({
          ...msg,
          timestamp: convertUTCToLocal(msg.timestamp)
        }));
        
        console.log(`Channel ${channelId} Message loading complete: ${messagesWithLocalTime.length} strip`);
        return messagesWithLocalTime;
      }
      
      return [];
    } catch (error) {
      console.error(`loadChannel ${channelId} The message failed:`, error);
      return null;
    }
  }, []);
  
  // Other necessaryrefs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChannelRef = useRef<ChatChannel | null>(null);
  const channelsRef = useRef<ChatChannel[]>([]);
  const initialLoadRef = useRef<boolean>(true); // First loading mark
  const userScrolledUpRef = useRef<boolean>(false); // Whether the user scrolls upwards away from the bottom
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Update status and ref of setChannels function
  const setChannels = useCallback((value: ChatChannel[] | ((prev: ChatChannel[]) => ChatChannel[])) => {
    _setChannels(prev => {
      const newChannels = typeof value === 'function' ? value(prev) : value;
      channelsRef.current = newChannels;
      return newChannels;
    });
  }, []);

  // renewChannelReadstate
  const updateChannelReadStatus = useCallback((channelId: number, messageId: number) => {
    setChannels(prev => prev.map(channel => {
      if (channel.channel_id === channelId) {
        // Update readID, make sure it is not smaller than the current messageID
        const newLastReadId = Math.max(channel.last_read_id || 0, messageId);
        console.log(`renewChannel ${channel.name} ReadID: ${channel.last_read_id} -> ${newLastReadId}`);
        return {
          ...channel,
          last_read_id: newLastReadId
        };
      }
      return channel;
    }));
  }, []);

  // Use notification system
  const {
    notifications,
    unreadCount,
    markAsRead,
    refresh,
    removeNotificationByObject,
  } = useNotificationContext();

  // useWebSocketProcess real-time messages
  // chatConnected Not currently available UI middleuse, renamedfor _chatConnected To eliminate theusewarn
  const { isConnected: _chatConnected } = useWebSocketNotifications({
    isAuthenticated,
    currentUser: user,
    onNewMessage: (message) => {
      console.log('WebSocketMessage received (before processing):', {
        messageId: message.message_id,
        channelId: message.channel_id,
        senderId: message.sender_id,
        userId: user?.id,
        content: message.content.substring(0, 50),
        selectedChannelId: selectedChannelRef.current?.channel_id,
        selectedChannelName: selectedChannelRef.current?.name
      });
      
      // Filter yourselfNews, no push is displayed
      if (message.sender_id === user?.id) {
        console.log('receivearriveOwnNews,jump overdeal with:', message.message_id, 'sender_id:', message.sender_id, 'user.id:', user?.id);
        return;
      }
      
      console.log('WebSocketReceived the message (after processing):', {
        messageId: message.message_id,
        channelId: message.channel_id,
        senderId: message.sender_id,
        content: message.content.substring(0, 50),
        selectedChannelId: selectedChannelRef.current?.channel_id,
        selectedChannelName: selectedChannelRef.current?.name
      });
  
      // messageWithLocalTimeVariables are no longer hereuse,becauseforWe pass it directlyoriginalmessageGiveaddMessageToList
      
      // Check if it should be addedarrivecurrentChannel(userefMake sure to get the latest status)
      const currentSelectedChannel = selectedChannelRef.current;
      const shouldAddToCurrentChannel = currentSelectedChannel && message.channel_id === currentSelectedChannel.channel_id;
      
      if (shouldAddToCurrentChannel) {
        console.log('Add toinformationarrivecurrentChannel,currentList length:', messagesRef.current.length);
        addMessageToList(message, 'websocket');
      } else if (currentSelectedChannel) {
        console.log('informationNot belongingcurrentChannel,currentChannel:', currentSelectedChannel.channel_id, 'informationChannel:', message.channel_id);
      } else {
        console.log('No choicemiddleofChannel, try to findarrivecorrespondChannelAnd automatically select');
        console.log('currentChannelList length:', channelsRef.current.length);
        console.log('TargetChannelID:', message.channel_id);
        console.log('ChannelList:', channelsRef.current.map(ch => ({id: ch.channel_id, name: ch.name})));
        
        // ifNo choicemiddleChannel, try to findarrivecorrespondofChannelAnd automatically select
        const targetChannel = channelsRef.current.find(ch => ch.channel_id === message.channel_id);
        if (targetChannel) {
          console.log('try to findarrivecorrespondChannel, automatically select:', targetChannel.name);
          
          // CallselectChannelComeloadhistoryinformationand settingsChannel
          // Add a new message after loading
          selectChannelAndAddMessage(targetChannel, message);
        } else {
          console.log('not yettry to findarrivecorrespondChannel,ChannelID:', message.channel_id);
          
          // ifwithouttry to findarriveChannel,may beChannelListreturnwithoutloadover,Try to re-newloadChannelList
          if (channelsRef.current.length === 0) {
            console.log('ChannelListfornull,Try to re-newloadChannel');
            chatAPI.getChannels().then(channelsData => {
              console.log('HeavynewloadChannelFinish,Channelquantity:', channelsData?.length || 0);
              if (channelsData) {
                setChannels(channelsData);
                const retryChannel = channelsData.find((ch: ChatChannel) => ch.channel_id === message.channel_id);
                if (retryChannel) {
                  console.log('Heavynewloadbacktry to findarriveChannel, automatically select:', retryChannel.name);
                  // CallselectChannelAndAddMessageComedeal withChannelSelect andinformationAdd to
                  selectChannelAndAddMessage(retryChannel, message);
                }
              }
            }).catch(error => {
              console.error('HeavynewloadChannelfail:', error);
            });
          }
        }
      }
    },
  });

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setShowSidebar(!mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // (Scroll related useEffect Moved to throttledMarkAsRead After definition, avoid early references)

  // loadChanneldata
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadChannels = async () => {
      try {
        setIsLoading(true);
        console.log('Start loading the channelList');
        const channelsData = await apiCache.getChannels();
        console.log('originalChanneldata:', channelsData);
        
        // examinePrivate chatChannel
        const pmChannels = (channelsData || []).filter((ch: ChatChannel) => ch.type === 'PM');
        console.log('Private chatChannelquantity:', pmChannels.length);
        if (pmChannels.length > 0) {
          console.log('Private chatChannelDetails:', pmChannels.map((ch: ChatChannel) => ({ 
            id: ch.channel_id, 
            name: ch.name, 
            type: ch.type,
            users: ch.users 
          })));
        }
        
        // forPrivate chatChannelGet user information
        const channelsWithUserInfo = await Promise.all(
          (channelsData || []).map(async (channel: ChatChannel) => {
            if (channel.type === 'PM' && channel.users.length > 0) {
              try {
                // GetPrivate chatObjectofuserID
                const targetUserId = channel.users.find(id => id !== user?.id);
                if (targetUserId) {
                  console.log('forPrivate chatChannelGet user information:', targetUserId);
                  
                  const userInfo = await apiCache.getUser(targetUserId);
                  
                  if (userInfo) {
                    return {
                      ...channel,
                      name: `Private chat: ${userInfo.username}`,
                      user_info: {
                        id: userInfo.id,
                        username: userInfo.username,
                        avatar_url: userInfo.avatar_url || userAPI.getAvatarUrl(userInfo.id),
                        cover_url: userInfo.cover_url || userInfo.cover?.url || ''
                      }
                    };
                  }
                }
              } catch (error) {
                console.error('Failed to obtain user information:', error);
              }
            }
            return channel;
          })
        );
        
        // Filter and sortChannel: Inverse order,Channelexistforward,The bottom is the firstoneindivual
        const sortedChannels = channelsWithUserInfo.sort((a: ChatChannel, b: ChatChannel) => {
          // Priority:publicChannel > Private chat > team > private
          const typeOrder: Record<string, number> = { 'PUBLIC': 0, 'PM': 1, 'TEAM': 2, 'PRIVATE': 3 };
          const aOrder = typeOrder[a.type] || 4;
          const bOrder = typeOrder[b.type] || 4;
          
          if (aOrder !== bOrder) {
            // Inverse order: largerof order Value before
            return bOrder - aOrder;
          }
          
          // Order in reverse order of names within the same type
          return b.name.localeCompare(a.name);
        });
        
        console.log('After sortingofChannelList:', sortedChannels.map((ch: ChatChannel) => ({ id: ch.channel_id, name: ch.name, type: ch.type })));
        setChannels(sortedChannels);
        
        // Clean up duplicateofPrivate chatChannel
        setTimeout(() => {
          cleanupDuplicatePrivateChannels();
        }, 100);
        
        // ifNo choicemiddleChannelAnd availableChannel,excellentFirstselectselect osu! Channel
        if (!selectedChannel && sortedChannels.length > 0) {
          // Find osu! Channel
          const osuChannel = sortedChannels.find(ch => 
            ch.name.toLowerCase().includes('osu') || 
            ch.name.toLowerCase().includes('#osu') ||
            ch.name === 'osu!'
          );
          
          const channelToSelect = osuChannel || sortedChannels[0];
          console.log('Automatic selectionChannel:', channelToSelect.name, 'type:', channelToSelect.type);
          selectChannel(channelToSelect);
        }
      } catch (error) {
        console.error('loadChannelfail:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChannels();
  }, [isAuthenticated]);

  // synchronousselectedChannelStatus toref
  useEffect(() => {
    selectedChannelRef.current = selectedChannel;
    console.log('synchronousselectmiddleChannelarriveref:', selectedChannel?.name || 'null');
  }, [selectedChannel]);

  // synchronous messages arrive ref
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // monitornotifychange,deal withPrivate chatnotify
  useEffect(() => {
    if (notifications.length > 0) {
      console.log('Testarrivenewnotify,quantity:', notifications.length);
      
      // use object_id Group deduplication
      const processedObjectIds = new Set<string>();
      
      // deal withallPrivate chatnotify,according to object_id Go to the heavy
      notifications.forEach(notification => {
        if (notification.name === 'channel_message' && 
            notification.details?.type === 'pm') {
          
          const objectKey = `${notification.object_type}-${notification.object_id}`;
          
          if (!processedObjectIds.has(objectKey)) {
            console.log('deal withPrivate chatnotify:', notification.id, objectKey, notification.details.title);
            processedObjectIds.add(objectKey);
            handlePrivateMessageNotification(notification);
            
            // Automatic marks already existofPrivate chatinformationforRead
            autoMarkPrivateMessagesAsRead(notification);
          } else {
            console.log('Skip duplicationofnotifyObject:', objectKey);
          }
        }
      });
    }
  }, [notifications, channels, user?.id]);

  // Clean the timer
  useEffect(() => {
    return () => {
      // Clean up all fallback timers when component uninstallation
      const fallbackTimers = (window as any).messageFallbackTimers;
      if (fallbackTimers) {
        fallbackTimers.forEach((timer: NodeJS.Timeout) => clearTimeout(timer));
        fallbackTimers.clear();
      }
    };
  }, []);

  // filterChannel
  const filteredChannels = channels.filter(channel => {
    switch (channelFilter) {
      case 'private':
        return channel.type === 'PM';
      case 'team':
        return channel.type === 'TEAM';
      case 'public':
        return channel.type === 'PUBLIC';
      default:
        return true;
    }
  });

  // selectselectChannel,loadinformation,andAdd tonewinformation
  const selectChannelAndAddMessage = async (channel: ChatChannel, newMessage: ChatMessage) => {
    console.log('selectselectChannelandAdd toinformation:', channel.name, 'ChannelID:', channel.channel_id);
  // ResetFirst loading mark,Used for scroll judgment
  initialLoadRef.current = true;
    setSelectedChannel(channel);
    selectedChannelRef.current = channel;
  // Record this request for competition detection
  const requestToken = Symbol('channel-load');
  (selectChannelAndAddMessage as any).currentToken = requestToken;
    
    if (isMobile) {
      setShowSidebar(false);
    }

    try {
      console.log('Start loading the channelhistoryinformation');
      const channelMessages = await loadChannelMessages(channel.channel_id);
      
      if (channelMessages && channelMessages.length > 0) {
        // IfaskBefore completionChannelSwitched again,Give up this timeresult
        if ((selectChannelAndAddMessage as any).currentToken !== requestToken) {
          console.log('Give up expirationofChannelhistoryinformationresult (addMessage path)');
          return;
        }
        
        // Check if the new message is already in the historical message
        const messageExists = channelMessages.find((m: ChatMessage) => m.message_id === newMessage.message_id);
        
        // usefunctionModerenew,Avoid coverageexistloadprocessmiddlearriveDeNews
        setMessages(prev => {
          console.log('Merge historical news and in-flight information(onlycurrentChannel)');
          // Only retaincurrentChannelexistloadPassed during the period WS arriveDeNews
          const inflight = prev.filter(m => m.channel_id === channel.channel_id);
          const mergedMap = new Map<number, ChatMessage>();
          [...channelMessages, ...inflight].forEach(m => mergedMap.set(m.message_id, m));
          if (!messageExists) {
            mergedMap.set(newMessage.message_id, {
              ...newMessage,
              timestamp: convertUTCToLocal(newMessage.timestamp)
            });
          }
          const all = Array.from(mergedMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          console.log('finalinformationListquantity:', all.length);
          return all;
        });
        
        // Mark the last onestripinformationforRead
        const lastMessage = channelMessages[channelMessages.length - 1];
        console.log('Mark the last onestripinformationforRead:', lastMessage.message_id);
        throttledMarkAsRead(channel.channel_id, lastMessage.message_id);
        console.log('informationReadMarking done');

        // Private chatChannel: Mark the relevant immediately after openingnotifyforRead(even though last_read It's already the latest and you need to make sure the notification disappears)
        if (channel.type === 'PM') {
          try {
            const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
            if (relatedPmNotifications.some(n => !n.is_read)) {
              console.log('Private chatChannelOpen,automaticmarknotifyforRead (addMessage path):', relatedPmNotifications.map(n => n.id));
              await removeNotificationByObject(channel.channel_id.toString(), 'channel');
            }
          } catch (e) {
            console.error('markPrivate chatnotifyReadfail(selectChannelAndAddMessage):', e);
          }
        }
      } else {
        console.log('ChannelNohistoryinformation,Onlyshownewinformation');
        setMessages(prev => {
          const inflight = prev.filter(m => m.channel_id === channel.channel_id);
          const exists = inflight.some(m => m.message_id === newMessage.message_id);
            return exists ? inflight : [...inflight, {
              ...newMessage,
              timestamp: convertUTCToLocal(newMessage.timestamp)
            }];
        });
        
        // nonehistoryinformationWant toProcessing notification
        if (channel.type === 'PM') {
          try {
            const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
            if (relatedPmNotifications.some(n => !n.is_read)) {
              console.log('Private chatChannel(Empty history)Open,automaticmarknotifyforRead (addMessage path)');
              await removeNotificationByObject(channel.channel_id.toString(), 'channel');
            }
          } catch (e) {
            console.error('markPrivate chatnotifyReadfail(Empty history addMessage):', e);
          }
        }
      }
    } catch (error) {
      console.error('loadChannelThe message failed:', error);
      toast.error('loadThe message failed');
      // even thoughLoading failed,Want toshownewinformation
      setMessages(prev => {
        let allMessages = [...prev];
        
        const newMessageWithLocalTime = {
          ...newMessage,
          timestamp: convertUTCToLocal(newMessage.timestamp)
        };
        
        // examinenewinformationWhether it already exists
        const messageExists = allMessages.find(msg => msg.message_id === newMessage.message_id);
        if (!messageExists) {
          allMessages.push(newMessageWithLocalTime);
        }
        
        // Sort by timestamp
        allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        return allMessages;
      });
      
      if (channel.type === 'PM') {
        try {
          const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
          if (relatedPmNotifications.some(n => !n.is_read)) {
            console.log('Private chatChannel(Loading failed)Open,automaticmarknotifyforRead');
            await removeNotificationByObject(channel.channel_id.toString(), 'channel');
          }
        } catch (e) {
          console.error('markPrivate chatnotifyReadfail(Loading failed addMessage):', e);
        }
      }
    }
  };

  // selectselectChannelandloadinformation
  const selectChannel = async (channel: ChatChannel) => {
    console.log('selectselectChannel:', channel.name, 'type:', channel.type, 'ChannelID:', channel.channel_id);
  // ResetFirst loading mark
  initialLoadRef.current = true;
    setSelectedChannel(channel);
    selectedChannelRef.current = channel;
  // Record request token Used for competition
  const requestToken = Symbol('channel-load');
  (selectChannel as any).currentToken = requestToken;
    
    if (isMobile) {
      setShowSidebar(false);
    }

    // in the case ofPrivate chatChannel,tryGet user informationandrenewChannelshow
    if (channel.type === 'PM' && channel.users.length > 0) {
      try {
        // GetPrivate chatObjectofuserinformation
        const targetUserId = channel.users.find(id => id !== user?.id);
        if (targetUserId && !channel.user_info) {
          console.log('GetPrivate chatuserinformation:', targetUserId);
          
          const userInfo = await apiCache.getUser(targetUserId);
          
          if (userInfo) {
            console.log('Private chatuserinformation:', userInfo);
            
            // renewChannelinformation
            setChannels(prev => prev.map(ch => {
              if (ch.channel_id === channel.channel_id) {
                return {
                  ...ch,
                  name: `Private chat: ${userInfo.username}`,
                  user_info: {
                    id: userInfo.id,
                    username: userInfo.username,
                    avatar_url: userInfo.avatar_url || userAPI.getAvatarUrl(userInfo.id),
                    cover_url: userInfo.cover_url || userInfo.cover?.url || ''
                  }
                };
              }
              return ch;
            }));
          }
        }
      } catch (error) {
        console.error('GetPrivate chatuserinformationfail:', error);
      }
    }

    try {
      console.log('Start loading the channelinformation,ChannelID:', channel.channel_id);
      const channelMessages = await loadChannelMessages(channel.channel_id);
      
      if (channelMessages && channelMessages.length > 0) {
        if ((selectChannel as any).currentToken !== requestToken) {
          console.log('Give up expirationofChannelinformationresult');
          return;
        }
        
        console.log('set upinformationList,informationquantity:', channelMessages.length);
        
        // usefunctionModerenew,Keep possibleexistloadprocessmiddlearriveDeofnewinformation
        setMessages(prev => {
          console.log('Merge historical news and in-flight information(onlycurrentChannel)');
          const inflight = prev.filter(m => m.channel_id === channel.channel_id);
          const mergedMap = new Map<number, ChatMessage>();
          [...channelMessages, ...inflight].forEach(m => mergedMap.set(m.message_id, m));
          const all = Array.from(mergedMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          console.log('finalinformationListquantity:', all.length);
          return all;
        });
        
        // Mark the last onestripinformationforRead
        const lastMessage = channelMessages[channelMessages.length - 1];
        console.log('Mark the last onestripinformationforRead:', lastMessage.message_id);
        throttledMarkAsRead(channel.channel_id, lastMessage.message_id);
        console.log('informationReadMarking done');

        if (channel.type === 'PM') {
          try {
            const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
            if (relatedPmNotifications.some(n => !n.is_read)) {
              console.log('Private chatChannelOpen,automaticmarknotifyforRead (selectChannel path):', relatedPmNotifications.map(n => n.id));
              await removeNotificationByObject(channel.channel_id.toString(), 'channel');
            }
          } catch (e) {
            console.error('markPrivate chatnotifyReadfail(selectChannel):', e);
          }
        }
    } else {
        console.log('ChannelNohistoryinformation');
        // even thoughNohistoryinformation,Want toKeep possibleexistloadprocessmiddlearriveDeNews
        setMessages(prev => {
      const inflight = prev.filter(m => m.channel_id === channel.channel_id);
      return inflight.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });
        
        if (channel.type === 'PM') {
          try {
            const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
            if (relatedPmNotifications.some(n => !n.is_read)) {
              console.log('nullPrivate chatChannelOpen,automaticmarknotifyforRead (selectChannel path)');
              await removeNotificationByObject(channel.channel_id.toString(), 'channel');
            }
          } catch (e) {
            console.error('markPrivate chatnotifyReadfail(nullChannel selectChannel):', e);
          }
        }
      }
    } catch (error) {
      console.error('loadChannelThe message failed:', error);
      toast.error('loadThe message failed');
      
      // even thoughLoading failed,Want toKeep possiblealreadythrougharriveDeNews
      setMessages(prev => {
        console.log('ChannelLoading failed,reserveexistinginformationquantity:', prev.length);
        return prev;
      });
      
      if (channel.type === 'PM') {
        try {
          const relatedPmNotifications = notifications.filter(n => n.name === 'channel_message' && n.object_id === channel.channel_id.toString());
          if (relatedPmNotifications.some(n => !n.is_read)) {
            console.log('Private chatChannel(Loading failed)Open,automaticmarknotifyforRead (selectChannel)');
            await removeNotificationByObject(channel.channel_id.toString(), 'channel');
          }
        } catch (e) {
          console.error('markPrivate chatnotifyReadfail(Loading failed selectChannel):', e);
        }
      }
    }
  };

  // unifiedNewsAdd tofunction
  const addMessageToList = useCallback((message: ChatMessage, source: 'api' | 'websocket') => {
    console.log(`Add toinformation(${source}): ID=${message.message_id}, ChannelID=${message.channel_id}, Sender=${message.sender_id}, content="${message.content.substring(0, 30)}"`);
    
    // examineinformationWhether it belongs tocurrentselectmiddleofChannel
    const currentChannel = selectedChannelRef.current;
    if (!currentChannel || message.channel_id !== currentChannel.channel_id) {
      console.log(`informationNot belongingcurrentChannel,jump overAdd to.currentChannel: ${currentChannel?.channel_id || 'null'}, informationChannel: ${message.channel_id}`);
      return;
    }
    
    const messageWithLocalTime = {
      ...message,
      timestamp: convertUTCToLocal(message.timestamp)
    };
    
    setMessages(prev => {
      // examineinformationWhether it already exists
      const existsById = prev.find(m => m.message_id === message.message_id);
      if (existsById) {
        console.log(`informationAlready exists,jump over: ${message.message_id}`);
        return prev;
      }
      
      console.log(`successAdd toinformation: ${message.message_id}, currentinformationList length: ${prev.length} -> ${prev.length + 1}`);
      
      // make sureinformationSort by timestampinsert
      const newMessages = [...prev, messageWithLocalTime];
      newMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
  messagesRef.current = newMessages;
      return newMessages;
    });

    // in the case ofcurrentChannelofnewinformation,useAnti-shakefunctionmarkforRead
    console.log(`PreparemarkinformationforRead: ${message.message_id}, Channel: ${currentChannel.name}`);
    // use setTimeout To avoid circular dependencies
    setTimeout(() => {
      throttledMarkAsRead(message.channel_id, message.message_id);
    }, 0);
  }, []);

  // sendinformation
  const sendMessage = async (messageText: string) => {
    if (!selectedChannel || !messageText.trim()) return;

    try {
      const message = await chatAPI.sendMessage(
        selectedChannel.channel_id,
        messageText.trim()
      );
      
      console.log('informationsendsuccess,immediatelyshow:', message.message_id);
      
      // immediatelyshowinformation,Don't waitWebSocketconfirm
      addMessageToList(message, 'api');
      
    } catch (error) {
      console.error('sendThe message failed:', error);
      toast.error('sendThe message failed');
    }
  };

  // optimizationofAnti-shakemarkReadfunction,reducerepeatask
  const throttledMarkAsRead = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      const pendingRequests = new Set<string>();
      const lastReadCache = new Map<number, number>(); // cacheEveryindivualChannelofat lastReadinformationID
      const batchQueue = new Map<number, number>(); // Batch processing queue:channelId -> messageId
      
      const processBatch = async () => {
        if (batchQueue.size === 0) return;
        
        const currentBatch = new Map(batchQueue);
        batchQueue.clear();
        
        // andOKdeal withmanyindivualChannelofmarkAsReadask
        const promises = Array.from(currentBatch.entries()).map(async ([channelId, messageId]) => {
          const requestKey = `${channelId}-${messageId}`;
          
          // examinewhetheralreadythroughmarkIt'shigherNewsID
          const cachedLastRead = lastReadCache.get(channelId) || 0;
          if (messageId <= cachedLastRead) {
            console.log(`information${messageId}Has been higherID${cachedLastRead}Tag, skip`);
            return;
          }
          
          if (pendingRequests.has(requestKey)) {
            console.log(`askAlready underwaymiddle,jump over: ${requestKey}`);
            return;
          }
          
          try {
            pendingRequests.add(requestKey);
            console.log(`batchmarkRead: Channel${channelId}, information${messageId}`);
            
            await chatAPI.markAsRead(channelId, messageId);
            
            // Update cache
            lastReadCache.set(channelId, Math.max(cachedLastRead, messageId));
            
            console.log(`markReadsuccess: Channel${channelId}, information${messageId}`);
            
            // renewChannelListmiddleofReadstate
            updateChannelReadStatus(channelId, messageId);
            
            // Delete related notifications (batch operations)
            try {
              await removeNotificationByObject(channelId.toString(), 'channel');
            } catch (error) {
              console.error(`Delete notification failed: Channel${channelId}`, error);
            }
            
          } catch (error) {
            console.error(`markReadfail: Channel${channelId}, information${messageId}`, error);
          } finally {
            pendingRequests.delete(requestKey);
          }
        });
        
        await Promise.allSettled(promises);
      };
      
      return async (channelId: number, messageId: number) => {
        // examinewhetheralreadythroughhavehigherNewsIDIn the queue
        const queuedMessageId = batchQueue.get(channelId);
        if (queuedMessageId && messageId <= queuedMessageId) {
          console.log(`information${messageId}Below queuemiddleof${queuedMessageId},jump over`);
          return;
        }
        
        // Check cache to avoid duplicate marking
        const cachedLastRead = lastReadCache.get(channelId) || 0;
        if (messageId <= cachedLastRead) {
          console.log(`information${messageId}alreadyquiltmarkforRead(cache${cachedLastRead}),jump over`);
          return;
        }
        
        // Add toarriveBatch Queue
        batchQueue.set(channelId, Math.max(queuedMessageId || 0, messageId));
        
        // Before clearingofTimer
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // set upnewofTimer,extendAnti-shakehourbetweenbyreduceaskfrequency
        timeoutId = setTimeout(processBatch, 1500); // Increasearrive1.5Anti-shake in seconds
      };
    })(),
    [updateChannelReadStatus, removeNotificationByObject]
  );

  // monitorscroll,judgeuserwhetherleavebottom(movearrive throttledMarkAsRead after)
  useEffect(() => {
    const container = scrollContainerRef.current || document.querySelector('#chat-message-scroll-container');
    if (!container) return;
    const el = container as HTMLElement;
    const onScroll = () => {
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distanceToBottom > 120; // Exceed120pxThinking to leave the bottom
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // stripAutomatic scrolling of the piece: only (Not first loading && User is still near the bottom) or (newinformationFromOwn) Just roll
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    const currentChannel = selectedChannelRef.current;
    if (!currentChannel) return;

    const container = scrollContainerRef.current || document.querySelector('#chat-message-scroll-container');
    let nearBottom = true;
    if (container) {
      const el = container as HTMLElement;
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      nearBottom = distanceToBottom < 150; // 150px Considered as close to the bottom
    }

    const isOwnMessage = lastMessage.sender_id === user?.id;
    const isInitial = initialLoadRef.current;

    // firstload:scrollarrivebottom,Of coursebackResetmark
    if (isInitial) {
      initialLoadRef.current = false;
      // firstloadhouralsoscrollarrivebottom,use setTimeout make sure DOM Updated
      setTimeout(() => {
        const containerEl = scrollContainerRef.current || document.querySelector('#chat-message-scroll-container');
        if (containerEl) {
          (containerEl as HTMLElement).scrollTop = (containerEl as HTMLElement).scrollHeight;
        } else {
          // Backup: DirectuseDefault lineforof scrollIntoView(none smooth)
          messagesEndRef.current?.scrollIntoView();
        }
      }, 50); // 50ms Delaymake sure DOM Completely updated
      return;
    }

    if (!userScrolledUpRef.current || nearBottom || isOwnMessage) {
      // Jump nowarrivebottom(Remove smooth animations)
      const containerEl = scrollContainerRef.current || document.querySelector('#chat-message-scroll-container');
      if (containerEl) {
        (containerEl as HTMLElement).scrollTop = (containerEl as HTMLElement).scrollHeight;
      } else {
        // Backup: DirectuseDefault lineforof scrollIntoView(none smooth)
        messagesEndRef.current?.scrollIntoView();
      }
    }

    // markReadlogic(andAlways before)
    if (lastMessage.message_id > (currentChannel.last_read_id || 0)) {
      throttledMarkAsRead(currentChannel.channel_id, lastMessage.message_id);
    }
  }, [messages, throttledMarkAsRead, user?.id]);

  // informationVisibilityTest - When the user is really"lookarrive"informationhourautomaticmarkRead
  useEffect(() => {
    if (!selectedChannel || messages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && selectedChannel) {
            const messageElement = entry.target as HTMLElement;
            const messageId = parseInt(messageElement.dataset.messageId || '0');
            const channelId = selectedChannel.channel_id;
            
            // make sureinformationIDEffective and greater thancurrentReadID
            if (messageId > 0 && messageId > (selectedChannel.last_read_id || 0)) {
              console.log(`information ${messageId} existChannel ${channelId} middleEnter the visualarea,PreparemarkforRead`);
              
              // Delayonepointhourbetweenmake sureuserrealoflookarriveIt'sinformation
              const timeoutId = setTimeout(() => {
                // againexaminewhetherstillOf courseyescurrentselectmiddleofChannel
                if (selectedChannel && selectedChannel.channel_id === channelId) {
                  console.log(`Delaybackmarkinformation ${messageId} forRead`);
                  throttledMarkAsRead(channelId, messageId);
                }
              }, 1000); // 1SecondbackmarkforRead
              
              // storage timeout ID To clear if needed
              messageElement.dataset.readTimeout = timeoutId.toString();
            }
          } else {
            // informationLeave the visualareahour,Clear waitingmiddleofmarkReadoperate
            const messageElement = entry.target as HTMLElement;
            const timeoutId = messageElement.dataset.readTimeout;
            if (timeoutId) {
              clearTimeout(parseInt(timeoutId));
              delete messageElement.dataset.readTimeout;
            }
          }
        });
      },
      {
        root: null, // useWindowforroot
        rootMargin: '0px',
        threshold: 0.6 // wheninformation60%visiblehourtrigger,make sureuserrealoflookarriveIt's
      }
    );

    // observecurrentChannelofallinformationelement
    const messageElements = document.querySelectorAll(`[data-message-id]`);
    messageElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      // Clearallobserveandwaitmiddleoftimeout
      messageElements.forEach((element) => {
        const timeoutId = (element as HTMLElement).dataset.readTimeout;
        if (timeoutId) {
          clearTimeout(parseInt(timeoutId));
        }
      });
      observer.disconnect();
    };
  }, [messages, selectedChannel, throttledMarkAsRead]);

  // Processing notificationmarkReadAnd jumparrivechat
  const handleNotificationMarkAsRead = useCallback(async (notification: typeof notifications[0]) => {
    try {
      console.log('Processing notificationmarkRead:', notification.id, notification.name);
      
      // FirstCallAPImarknotifyforRead(make sureserverstaterenew)
      await markAsRead(notification.id);
      
      // in the case ofChannelinformationnotify,Jumparrivecorrespondchat
      if (notification.name === 'channel_message') {
        const channelId = parseInt(notification.object_id);
        
        // FindcorrespondofChannel
        const targetChannel = channels.find(channel => channel.channel_id === channelId);
        
        if (targetChannel) {
          console.log(`JumparriveChannel: ${targetChannel.name} (${channelId})`);
          setSelectedChannel(targetChannel);
          if (isMobile) {
            setShowSidebar(false); // Close the sidebar on the mobile terminal
          }
          
          // Canselect:Delaydeletenotify,make sureuserlookarriveJumpEffect
          setTimeout(() => {
            removeNotificationByObject(notification.object_id, notification.object_type);
          }, 500);
        } else {
          console.log(`not yettry to findarriveChannelIDfor ${channelId} ofChannel`);
        }
      }
    } catch (error) {
      console.error('Processing notificationmarkReadfail:', error);
    }
  }, [markAsRead, channels, removeNotificationByObject, setSelectedChannel, setShowSidebar, isMobile, notifications]);

  // Monitor unread count changes
  useEffect(() => {
    console.log('Unread count update:', unreadCount);
  }, [unreadCount]);

  // optimizationofbatchGetnotifyRelatedofuserinformation
  useEffect(() => {
    if (!notifications.length) return;

    const userIdsToFetch = new Set<number>();
    
    notifications.forEach(notification => {
      if (notification.source_user_id) {
        userIdsToFetch.add(notification.source_user_id);
      }
    });

    // Get user information in batches
    if (userIdsToFetch.size > 0) {
      apiCache.getUsers(Array.from(userIdsToFetch))
        .then(() => {
          console.log(`Get user information in batchesFinish: ${userIdsToFetch.size}A user`);
          // MandatoryHeavynewRender withshowcorrectofusername
          setActiveTab(prev => prev); // Trigger rerendering
        })
        .catch(error => {
          console.error('batchFailed to obtain user information:', error);
        });
    }
  }, [notifications]);

  // Clean up duplicateofPrivate chatChannel
  const cleanupDuplicatePrivateChannels = () => {
    setChannels(prev => {
      const uniqueChannels: ChatChannel[] = [];
      const seenUserPairs = new Set<string>();
      
      prev.forEach(channel => {
        if (channel.type === 'PM') {
          // forPrivate chatChannel,examineusercombinationwhetherrepeat
          const currentUserId = user?.id || 0;
          const otherUsers = channel.users.filter(id => id !== currentUserId);
          
          if (otherUsers.length > 0) {
            // createusercombinationofUnique ID
            const userPairKey = otherUsers.sort().join(',');
            const fullPairKey = `${currentUserId}-${userPairKey}`;
            
            if (!seenUserPairs.has(fullPairKey)) {
              seenUserPairs.add(fullPairKey);
              uniqueChannels.push(channel);
            } else {
              console.log('Remove duplicatesofPrivate chatChannel:', channel.name);
            }
          } else {
            // ifNootheruser,reserveChannel
            uniqueChannels.push(channel);
          }
        } else {
          // NoPrivate chatChannelKeep it directly
          uniqueChannels.push(channel);
        }
      });
      
      console.log('After cleaningofChannelquantity:', uniqueChannels.length, 'Original quantity:', prev.length);
      return uniqueChannels;
    });
  };

  // deal withPrivate chatnotify,createcorrespondofPrivate chatChannel
  const handlePrivateMessageNotification = async (notification: APINotification) => {
    if (notification.name === 'channel_message' && notification.details?.type === 'pm') {
      try {
        console.log('TestarrivePrivate chatinformationnotify,trycreatePrivate chatChannel:', notification);
        
        // Get user information from notifications
        const sourceUserId = notification.source_user_id;
        
        if (!sourceUserId) {
          console.log('Source user is missing in notificationID,jump overdeal with');
          return;
        }
        
        // examinewhetheralreadythroughliveexistcorrespondofPrivate chatChannel(passuserIDGo to the heavy)
        const existingChannel = channels.find(ch => {
          if (ch.type !== 'PM') return false;
          
          // examineChannelwhetherIncludecurrentuserandTargetuser
          const hasCurrentUser = ch.users.includes(user?.id || 0);
          const hasTargetUser = ch.users.includes(sourceUserId);
          
          return hasCurrentUser && hasTargetUser;
        });
        
        if (existingChannel) {
          console.log('Private chatChannelAlready exists,jump overcreate:', existingChannel.name);
          return;
        }
        
        console.log('not yettry to findarriveexistingPrivate chatChannel,Get user informationandcreatenewofPrivate chatChannel');
        
        // Get user details
        let userName = notification.details.title as string || 'Unknown user';
        let userAvatarUrl = '';
        let userCoverUrl = '';
        
        try {
          // examinecache
          const userInfo = await apiCache.getUser(sourceUserId);
          
          if (userInfo) {
            console.log('Getarriveuserinformation:', userInfo);
            userName = userInfo.username || userName;
            userAvatarUrl = userInfo.avatar_url || userAPI.getAvatarUrl(sourceUserId);
            userCoverUrl = userInfo.cover_url || userInfo.cover?.url || '';
          }
        } catch (error) {
          console.error('Failed to obtain user information,usedefault value:', error);
          userAvatarUrl = userAPI.getAvatarUrl(sourceUserId);
        }
        
        // createnewofPrivate chatChannelObject
        const newPrivateChannel: ChatChannel = {
          channel_id: parseInt(notification.object_id.toString()), // Convertfornumber
          name: `Private chat: ${userName}`,
          description: `and ${userName} ofPrivate chat`,
          type: 'PM',
          moderated: false,
          users: [user?.id || 0, sourceUserId],
          current_user_attributes: {
            can_message: true,
            can_message_error: undefined,
            last_read_id: 0
          },
          last_read_id: 0,
          last_message_id: 0,
          recent_messages: [],
          message_length_limit: 1000,
          // Add touserinformationarriveChannelObjectmiddleso thatshow
          user_info: {
            id: sourceUserId,
            username: userName,
            avatar_url: userAvatarUrl,
            cover_url: userCoverUrl
          }
        };
        
        console.log('createnewofPrivate chatChannelObject:', newPrivateChannel);
        
        // Add toarriveChannelList,make sureNo repetition
        setChannels(prev => {
          // againexaminewhetheralreadythroughliveexistsameofPrivate chatChannel(Prevent competitionstripParts)
          const isDuplicate = prev.some(ch => {
            if (ch.type !== 'PM') return false;
            
            // examinewhetherIncludesameofusercombination
            const hasCurrentUser = ch.users.includes(user?.id || 0);
            const hasTargetUser = ch.users.includes(sourceUserId);
            
            return hasCurrentUser && hasTargetUser;
          });
          
          if (isDuplicate) {
            console.log('TestarriverepeatofPrivate chatChannel,jump overAdd to');
            return prev;
          }
          
          console.log('Add tonewofPrivate chatChannelarriveList');
          const newChannels = [...prev, newPrivateChannel];
          
          // HeavynewSort: Inverse order,Channelexistforward,The bottom is the firstoneindivual
          return newChannels.sort((a: ChatChannel, b: ChatChannel) => {
            // Priority:publicChannel > Private chat > team > private
            const typeOrder: Record<string, number> = { 'PUBLIC': 0, 'PM': 1, 'TEAM': 2, 'PRIVATE': 3 };
            const aOrder = typeOrder[a.type] || 4;
            const bOrder = typeOrder[b.type] || 4;
            
            if (aOrder !== bOrder) {
              // Inverse order: largerof order Value before
              return bOrder - aOrder;
            }
            
            // Order in reverse order of names within the same type
            return b.name.localeCompare(a.name);
          });
        });
        
        //console.log('Private chatChannelalreadyAdd toarriveList');
        //toast.success(`DiscovernewofPrivate chat: ${userName}`);
        
        // fromnotifymiddleextractinformationcontentandcreatechatinformationObject
        const messageContent = notification.details?.title as string;
        if (messageContent) {
          console.log('fromnotifymiddleextractinformationcontent,PrepareAdd toarrivechatList:', messageContent);
          
          // createoneindivualtemporaryNewsObject(based onnotifyinformation)
          const chatMessage: ChatMessage = {
            message_id: Date.now() + Math.random(), // generatetemporaryofonlyinformationID
            channel_id: parseInt(notification.object_id.toString()),
            content: messageContent,
            timestamp: notification.created_at,
            sender_id: sourceUserId,
            is_action: false,
            // sender yesCanselectof,Not yetsupplyoverallof User Object
          };
          
          console.log('createoftemporarychatinformationObject:', chatMessage);
          
          // ifcurrentNo choicemiddleChannel,orThoseselectmiddleofChannelThat's itindivualPrivate chatChannel,butAdd toinformation
          const currentChannel = selectedChannelRef.current;
          if (!currentChannel || currentChannel.channel_id === newPrivateChannel.channel_id) {
            console.log('WillfromnotifyextractNewsAdd toarrivecurrentchatList');
            addMessageToList(chatMessage, 'websocket');
          } else {
            console.log('currentselectmiddleofnocorrespondPrivate chatChannel,informationNot yetshow');
          }
        }
        
      } catch (error) {
        console.error('deal withPrivate chatnotifyfail:', error);
      }
    }
  };

  // automaticmarkPrivate chatinformationforRead
  const autoMarkPrivateMessagesAsRead = async (notification: APINotification) => {
    if (notification.name !== 'channel_message' || notification.details?.type !== 'pm') {
      return;
    }

    // Calculate text similarityofSimplefunction
    const calculateTextSimilarity = (text1: string, text2: string): number => {
      if (text1 === text2) return 1.0;
      if (text1.length === 0 || text2.length === 0) return 0.0;

      // uselongestpublicSubsequence algorithm
      const longerText = text1.length > text2.length ? text1 : text2;
      const shorterText = text1.length > text2.length ? text2 : text1;
      
      let matches = 0;
      const shorterLength = shorterText.length;
      
      // SimpleofSliding window matching
      for (let i = 0; i <= longerText.length - shorterLength; i++) {
        const window = longerText.substring(i, i + shorterLength);
        if (window === shorterText) {
          matches = shorterLength;
          break;
        }
        
        // Calculate the number of character matches
        let charMatches = 0;
        for (let j = 0; j < shorterLength; j++) {
          if (window[j] === shorterText[j]) {
            charMatches++;
          }
        }
        matches = Math.max(matches, charMatches);
      }
      
      return matches / shorterLength;
    };

    // informationGo to the heavyfunction
    const deduplicateMessages = (messages: ChatMessage[]): ChatMessage[] => {
      const uniqueMessages: ChatMessage[] = [];
      const seenContents = new Set<string>();
      
      messages.forEach(message => {
        const normalizedContent = message.content
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase();
        
        // examinewhetheralreadythroughhaveresemblanceofcontent
        let isDuplicate = false;
        for (const seenContent of seenContents) {
          const similarity = calculateTextSimilarity(normalizedContent, seenContent);
          if (similarity > 0.9) { // 90%The above similarityrecognizeforyesrepeat
            isDuplicate = true;
            //console.log('Discoverrepeatinformation:', {
            // messageId: message.message_id,
             // content: message.content.substring(0, 30),
             // similarity: similarity.toFixed(2)
            //});
            break;
          }
        }
        
        if (!isDuplicate) {
          uniqueMessages.push(message);
          seenContents.add(normalizedContent);
        }
      });
      
      console.log(`informationGo to the heavy: original ${messages.length} strip,Go to the heavyback ${uniqueMessages.length} strip`);
      return uniqueMessages;
    };

    try {
      const channelId = parseInt(notification.object_id.toString());
      const notificationTitle = notification.details?.title as string;
      
      console.log('startautomaticmarkPrivate chatinformationforRead:', {
        channelId,
        notificationTitle,
        notificationId: notification.id
      });

      // FindcorrespondofPrivate chatChannel
      const targetChannel = channels.find(ch => ch.channel_id === channelId && ch.type === 'PM');
      
      if (!targetChannel) {
        console.log('not yettry to findarrivecorrespondofPrivate chatChannel,jump overautomaticmark');
        return;
      }

      // GetChannelofallinformation
      const channelMessages = await chatAPI.getChannelMessages(channelId);
      
      if (!channelMessages || channelMessages.length === 0) {
        console.log('ChannelNoinformation,jump overautomaticmark');
        return;
      }

      console.log(`Channel ${channelId} There are a total of ${channelMessages.length} stripinformation`);

      // examinewhetheryescurrentselectmiddleofChannel,in the case of,useralreadythrough"lookarrive"It'sinformation
      const isCurrentlyViewingChannel = selectedChannel?.channel_id === channelId;
      
      // Clean up and standardize textoffunction
      const normalizeText = (text: string) => {
        return text
          .trim()                          // Remove the front and back blanks
          .replace(/\s+/g, ' ')           // manyindivualnullCompatibleandforoneindivual
          .replace(/[^\w\s\u4e00-\u9fff]/g, '') // Remove special characters and keep Chinese, letters, and numbers
          .toLowerCase();                  // Convertforlower case
      };

      // FindIncludenotifytitlecontentNews
      const matchingMessages = channelMessages.filter((message: ChatMessage) => {
        if (!notificationTitle || !message.content) {
          return false;
        }

        // Standardized text comparison
        const normalizedTitle = normalizeText(notificationTitle);
        const normalizedContent = normalizeText(message.content);
        
        // Multiple matching strategies
        const exactMatch = normalizedContent === normalizedTitle;
        const contentIncludesTitle = normalizedContent.includes(normalizedTitle);
        const titleIncludesContent = normalizedTitle.includes(normalizedContent);
        
        // Similaritymatch(SimpleVersion)
        const similarity = calculateTextSimilarity(normalizedTitle, normalizedContent);
        const similarityMatch = similarity > 0.8; // 80%The above similarity
        
        const isMatch = exactMatch || contentIncludesTitle || titleIncludesContent || similarityMatch;
        
        if (isMatch) {
          console.log('try to findarrivematchNews:', {
            messageId: message.message_id,
            content: message.content.substring(0, 50),
            notificationTitle,
            matchType: exactMatch ? 'exact' : 
                      contentIncludesTitle ? 'content_includes_title' :
                      titleIncludesContent ? 'title_includes_content' : 
                      'similarity',
            similarity: similarity.toFixed(2)
          });
        }
        
        return isMatch;
      });

      // rightmatchNewsconductGo to the heavy(based oncontentSimilarity)
      const uniqueMessages = deduplicateMessages(matchingMessages);

      let shouldMarkAsRead = false;
      let maxMessageIdToMark = 0;

      if (uniqueMessages.length > 0) {
        // iftry to findarrivematchNews,markarrivemostnewofmatchinformation
        maxMessageIdToMark = Math.max(...uniqueMessages.map((m: ChatMessage) => m.message_id));
        shouldMarkAsRead = true;
        console.log(`try to findarrive ${uniqueMessages.length} striponlymatchinformation(original ${matchingMessages.length} strip),WillmarkarriveinformationID: ${maxMessageIdToMark}`);
      } else if (isCurrentlyViewingChannel) {
        // ifuserjustexistchecklookShouldChannel,markallinformationforRead
        maxMessageIdToMark = Math.max(...channelMessages.map((m: ChatMessage) => m.message_id));
        shouldMarkAsRead = true;
        console.log(`userjustexistchecklookChannel ${channelId},markallinformationforRead,mostbiginformationID: ${maxMessageIdToMark}`);
      }

      if (shouldMarkAsRead && maxMessageIdToMark > 0) {
        // examinewhetherneedUpdate readstate
        const currentLastReadId = targetChannel.last_read_id || 0;
        
        if (maxMessageIdToMark > currentLastReadId) {
          console.log(`PreparemarkChannel ${channelId} information ${maxMessageIdToMark} forRead (currentRead: ${currentLastReadId})`);
          
          // CallAPImarkforRead
          await chatAPI.markAsRead(channelId, maxMessageIdToMark);
          console.log(`successmarkChannel ${channelId} information ${maxMessageIdToMark} forRead`);
          
          // renewlocalChannelstate
          updateChannelReadStatus(channelId, maxMessageIdToMark);
          
          // Delete related notifications
          try {
            console.log(`deletealreadydeal withofnotify: ${notification.id}`);
            await removeNotificationByObject(notification.object_id, notification.object_type);
          } catch (error) {
            console.error(`Delete notification failed: ${notification.id}`, error);
          }
        } else {
          console.log(`information ${maxMessageIdToMark} alreadythroughquiltmarkforRead (currentRead: ${currentLastReadId})`);
        }
      } else {
        console.log('Notry to findarriveneedmarkNewsorusernot yetchecklookShouldChannel');
      }
      
    } catch (error) {
      console.error('automaticmarkPrivate chatinformationReadfail:', error);
    }
  };

  // batchdeal withPrivate chatnotifymarkRead
  const batchMarkPrivateNotificationsAsRead = async () => {
    console.log('startbatchdeal withPrivate chatnotify...');
    let privateNotifications = notifications.filter(notification => 
      notification.name === 'channel_message' && 
      notification.details?.type === 'pm'
    );

    console.log(`try to findarrive ${privateNotifications.length} indivualPrivate chatnotifyneeddeal with`);

    if (privateNotifications.length === 0) {
      toast('Noneeddeal withofPrivate chatnotify');
      return;
    }

    // rightnotifyconductGo to the heavydeal with(based onChannelIDandcontentSimilarity)
    const deduplicatedNotifications = deduplicateNotifications(privateNotifications);
    console.log(`notifyGo to the heavy: original ${privateNotifications.length} indivual,Go to the heavyback ${deduplicatedNotifications.length} indivual`);

    let processedCount = 0;
    let errorCount = 0;

    for (const notification of deduplicatedNotifications) {
      try {
        console.log(`deal withPrivate chatnotify ${notification.id}: ${notification.details?.title}`);
        await autoMarkPrivateMessagesAsRead(notification);
        processedCount++;
        
        // Add small delay to avoidAPIaskToo fast
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Processing notification ${notification.id} fail:`, error);
        errorCount++;
      }
    }

    // Show processing results
    const resultMessage = `Processing is completed: success ${processedCount},fail ${errorCount}`;
    console.log(resultMessage);
    
    if (errorCount > 0) {
      toast.error(resultMessage);
    } else {
      toast.success(resultMessage);
    }

    // Refresh notification list
    setTimeout(() => {
      refresh();
    }, 1000);
  };

  // notifyGo to the heavyfunction
  const deduplicateNotifications = (notifications: APINotification[]): APINotification[] => {
    const uniqueNotifications: APINotification[] = [];
    const seenCombinations = new Set<string>();
    
    notifications.forEach(notification => {
      // createbased onChannelIDandtitleofUnique ID
      const channelId = notification.object_id;
      const title = (notification.details?.title as string) || '';
      const normalizedTitle = title.trim().replace(/\s+/g, ' ').toLowerCase();
      
      // Key combination:ChannelID + Standardized title
      const combinationKey = `${channelId}-${normalizedTitle}`;
      
      if (!seenCombinations.has(combinationKey)) {
        seenCombinations.add(combinationKey);
        uniqueNotifications.push(notification);
        console.log('Retention notice:', {
          id: notification.id,
          channelId,
          title: title.substring(0, 30),
          combinationKey
        });
      } else {
        console.log('Skip duplicate notifications:', {
          id: notification.id,
          channelId,
          title: title.substring(0, 30),
          combinationKey
        });
      }
    });
    
    return uniqueNotifications;
  };

  // Get notification title
  const getNotificationTitle = useCallback((notification: APINotification): string => {
    // Get user information (fromapiCachemiddle)
    let userName = 'Unknown user';
    if (notification.source_user_id) {
      const cachedUser = apiCache.getCachedUser(notification.source_user_id);
      if (cachedUser) {
        userName = cachedUser.username || 'Unknown user';
      }
    }

    switch (notification.name) {
      case 'team_application_store':
        return `teamApplication for joining`;
      case 'team_application_accept':
        return `teamApplyaccept`;
      case 'team_application_reject':
        return `teamApplyreject`;
      case 'channel_message':
        // rootaccording totypeshowdifferentoftitle
        if (notification.details?.type === 'pm') {
          return `newPrivate chatinformation: ${userName}`;
        } else if (notification.details?.type === 'team') {
          return `newteaminformation: ${notification.details.title || 'teamChannel'}`;
        }
        return `newPrivate chatinformation: ${userName}`;
      case 'channel_team':
        return `newteaminformation: ${notification.details?.title || 'teamChannel'}`;
      case 'channel_public':
        return `newpublicChannelinformation: ${notification.details?.title || 'publicChannel'}`;
      case 'channel_private':
        return `newprivateChannelinformation: ${notification.details?.title || 'privateChannel'}`;
      case 'channel_multiplayer':
        return `newMultiplayer Gameinformation: ${notification.details?.title || 'Multiplayer Game'}`;
      case 'channel_spectator':
        return `newWatch the battleChannelinformation: ${notification.details?.title || 'Watch the battleChannel'}`;
      case 'channel_temporary':
        return `newtemporaryChannelinformation: ${notification.details?.title || 'temporaryChannel'}`;
      case 'channel_group':
        return `newGroupsinformation: ${notification.details?.title || 'GroupsChannel'}`;
      case 'channel_system':
        return `newsysteminformation: ${notification.details?.title || 'systemChannel'}`;
      case 'channel_announce':
        return `New announcement: ${notification.details?.title || 'announcementChannel'}`;
      default:
        return notification.name;
    }
  }, []);

  // Getnotifycontent
  const getNotificationContent = useCallback((notification: APINotification): string => {
    // Get user information (fromapiCachemiddle)
    let userName = 'Unknown user';
    if (notification.source_user_id) {
      const cachedUser = apiCache.getCachedUser(notification.source_user_id);
      if (cachedUser) {
        userName = cachedUser.username || 'Unknown user';
      }
    }

    switch (notification.name) {
      case 'team_application_store':
        return `${userName} Apply to join youofteam`;
      case 'team_application_accept':
        return `You havesuccessjoin inteam ${notification.details.title}`;
      case 'team_application_reject':
        return `youofteamApply forreject`;
      case 'channel_message':
        // rootaccording totypeshowdifferentofcontent
        if (notification.details?.type === 'pm') {
          // tryGetoverallNewscontent
          const messageContent = notification.details.title as string;
          const messageUrl = notification.details.url as string;
          
          // If there isdetailedNewscontent,showit
          if (messageContent && messageContent !== 'From the user' && messageContent !== userName) {
            // ifinformationquiltCutoff(generally36character),tryshowoverallcontent
            if (messageContent.length >= 36) {
              return `${userName}: ${messageContent}... (CanablehaveEvenmanycontent)`;
            } else {
              return `${userName}: ${messageContent}`;
            }
          }
          
          // If there isURLInformation, try to extract more information from it
          if (messageUrl) {
            return `From ${userName} ofPrivate chatinformation (ID: ${notification.object_id})`;
          }
          
          return `From ${userName} ofPrivate chatinformation`;
        } else if (notification.details?.type === 'team') {
          return `teamChannel: ${notification.details.title || 'teaminformation'}`;
        }
        return `From ${notification.details.title || 'Unknown source'}`;
      case 'channel_team':
        return `teamChannel: ${notification.details?.title || 'teaminformation'}`;
      case 'channel_public':
        return `publicChannel: ${notification.details?.title || 'publicinformation'}`;
      case 'channel_private':
        return `privateChannel: ${notification.details?.title || 'privateinformation'}`;
      case 'channel_multiplayer':
        return `Multiplayer Game: ${notification.details?.title || 'gameinformation'}`;
      case 'channel_spectator':
        return `Watch the battleChannel: ${notification.details?.title || 'Watch the battleinformation'}`;
      case 'channel_temporary':
        return `temporaryChannel: ${notification.details?.title || 'temporaryinformation'}`;
      case 'channel_group':
        return `GroupsChannel: ${notification.details?.title || 'Groupsinformation'}`;
      case 'channel_system':
        return `systemChannel: ${notification.details?.title || 'systeminformation'}`;
      case 'channel_announce':
        return `announcementChannel: ${notification.details?.title || 'announcementinformation'}`;
      default:
        return JSON.stringify(notification.details);
    }
  }, []);

  // Auxiliaryfunction:examineuserinformationwhetherexistapiCachemiddle
  const hasUserInfoInCache = useCallback((userId: number): boolean => {
    return apiCache.hasCachedUser(userId);
  }, []);

  // Auxiliaryfunction:fromapiCacheGet user information
  const getUserInfoFromCache = useCallback((userId: number): { username: string } | null => {
    return apiCache.getCachedUser(userId);
  }, []);

  // deal withteamask
  const handleTeamRequest = async (notification: APINotification, action: 'accept' | 'reject') => {
    try {
      const teamId = parseInt(notification.object_id);
      const userId = notification.source_user_id;
      
      if (!userId) {
        toast.error('CannotGet user information');
        return;
      }

      if (action === 'accept') {
        await teamsAPI.acceptJoinRequest(teamId, userId);
        toast.success('alreadyacceptjoin inask');
      } else {
        await teamsAPI.rejectJoinRequest(teamId, userId);
        toast.success('alreadyrejectjoin inask');
      }

      // marknotifyforRead
      await markAsRead(notification.id);
    } catch (error) {
      console.error('deal withteamaskfail:', error);
      toast.error(`${action === 'accept' ? 'accept' : 'reject'}askfail`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Need to log in
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please log in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-h-[calc(100vh-8rem)] md:max-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-b from-white to-gray-50 dark:from-[#0f1424] dark:to-[#0b1020]">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: isMobile ? -320 : 0, opacity: isMobile ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobile ? -320 : 0, opacity: isMobile ? 0 : 1 }}
            transition={{ duration: 0.3 }}
            className={`
              ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
              w-80 bg-white/80 dark:bg-gray-800/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-r border-black/5 dark:border-white/10 shadow
              flex flex-col ${isMobile ? 'h-screen max-h-screen' : 'h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]'}
            `}
          >
            {/* Sidebarhead */}
            <div className="p-4 border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Osu! server Chat.
                  </h1>
                  {/* WebSocketConnection status */}
                  {/* <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${chatConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div> */}
                </div>
                {isMobile && (
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FiX size={20} />
                  </button>
                )}
              </div>

              {/* Tag page switching */}
              <div className="flex space-x-1 p-1 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
                <button
                  onClick={() => setActiveTab('channels')}
                  className={`
                    flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${activeTab === 'channels'
                      ? 'bg-osu-pink text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-transparent'
                    }
                  `}
                >
                  <FiMessageCircle size={16} />
                  <span>Channels</span>
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`
                    flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium
                    transition-all duration-200 relative
                    ${activeTab === 'notifications'
                      ? 'bg-osu-pink text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-transparent'
                    }
                  `}
                >
                  <FiBell size={16} />
                  <span>Notifications</span>
                  {unreadCount.total > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                      {unreadCount.total > 99 ? '99+' : unreadCount.total}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* contentarea */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'channels' ? (
                <div className="h-full flex flex-col">
                  {/* ChannelfilterDeviceandnewestablishButton */}
                  <div className="p-4 border-b border-black/5 dark:border-white/10 space-y-3 bg-white/70 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {[
                        { key: 'all' as const, label: 'all' },
                        { key: 'private' as const, label: 'Private chat' },
                        { key: 'team' as const, label: 'team' },
                        { key: 'public' as const, label: 'public' },
                      ].map(filter => (
                        <button
                          key={filter.key}
                          onClick={() => setChannelFilter(filter.key)}
                          className={`
                            py-1.5 px-2 rounded-md text-center font-medium transition-all duration-200
                            ${channelFilter === filter.key
                              ? 'bg-osu-pink text-white shadow'
                              : 'bg-white/70 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 border border-black/5 dark:border-white/10 shadow-sm'
                            }
                          `}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                    
                    {/* brushnewChannelListButton */}
                    <button
                      onClick={async () => {
                        console.log('ManualbrushnewChannelList');
                        try {
                          const channels = await chatAPI.getChannels();
                          console.log('ManualbrushnewbackofChannelList:', channels);
                          const pmChannels = channels.filter((ch: ChatChannel) => ch.type === 'PM');
                          console.log('ManualbrushnewbackofPrivate chatChannelquantity:', pmChannels.length);
                          if (pmChannels.length > 0) {
                            console.log('Private chatChannelDetails:', pmChannels.map((ch: ChatChannel) => ({ 
                              id: ch.channel_id, 
                              name: ch.name, 
                              type: ch.type,
                              users: ch.users 
                            })));
                          }
                          
                          // HeavynewSortChannel: Inverse order,Channelexistforward,The bottom is the firstoneindivual
                          const sortedChannels = channels.sort((a: ChatChannel, b: ChatChannel) => {
                            // Priority:publicChannel > Private chat > team > private
                            const typeOrder: Record<string, number> = { 'PUBLIC': 0, 'PM': 1, 'TEAM': 2, 'PRIVATE': 3 };
                            const aOrder = typeOrder[a.type] || 4;
                            const bOrder = typeOrder[b.type] || 4;
                            
                            if (aOrder !== bOrder) {
                              // Inverse order: largerof order Value before
                              return bOrder - aOrder;
                            }
                            
                            // Order in reverse order of names within the same type
                            return b.name.localeCompare(a.name);
                          });
                          
                          setChannels(sortedChannels);
                          
                          // Clean up duplicateofPrivate chatChannel
                          setTimeout(() => {
                            cleanupDuplicatePrivateChannels();
                          }, 100);
                          
                          toast.success(`ChannelListalreadybrushnew,common ${channels.length} indivualChannel,ThatmiddlePrivate chat ${pmChannels.length} indivual`);
                        } catch (error) {
                          console.error('Manualbrushnewfail:', error);
                          toast.error('brushnewfail');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg transition-colors text-sm font-medium
                       bg-white/70 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:bg-white/60
                       border border-black/5 dark:border-white/10 text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                      title="Refresh Channel list"
                    >
                      <FiRefreshCw size={16} />
                      <span>Refresh channels.</span>
                    </button>
                    
                    {/* newestablishPrivate chatButton */}
                    <button
                      onClick={() => setShowNewPMModal(true)}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg transition-colors text-sm font-medium
                       bg-osu-pink text-white hover:brightness-110 shadow focus:outline-none focus:ring-2 focus:ring-osu-pink/40"
                    >
                      <FiPlus size={16} />
                      <span>New Private Message</span>
                    </button>
                  </div>

                  {/* ChannelList */}
                  <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                        loadmiddle...
                      </div>
                    ) : filteredChannels.length === 0 ? (
                      <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                        Nothing yet.
                      </div>
                    ) : (
                      <div className="space-y-1.5 p-2">
                        {filteredChannels.map(channel => (
                          <ChannelItem
                            key={channel.channel_id}
                            channel={channel}
                            isSelected={selectedChannel?.channel_id === channel.channel_id}
                            onClick={() => selectChannel(channel)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* notifyList */
                <div className="flex flex-col h-full">
                  {/* notifyoperateButton */}
                  <div className="p-2 border-b border-black/5 dark:border-white/10 space-y-2 bg-white/70 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                    <button
                      onClick={() => {
                        console.log('ManualRefresh notification list');
                        refresh(); // Callnotifybrushnewfunction
                      }}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg transition-colors text-sm font-medium
                         bg-white/70 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:bg-white/60
                         border border-black/5 dark:border-white/10 text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                      title="Refresh notification list"
                    >
                      <FiRefreshCw size={16} />
                      <span>Refresh notifications</span>
                    </button>
                    
                    {/* batchmarkPrivate chatReadButton */}
                    <button
                      onClick={batchMarkPrivateNotificationsAsRead}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg transition-colors text-sm font-medium
                         bg-white/70 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:bg-white/60
                         border border-black/5 dark:border-white/10 text-fuchsia-600 dark:text-fuchsia-400 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
                      title="batchmarkPrivate chatinformationforRead"
                    >
                      <FiCheck size={16} />
                      <span>Mark all as readed</span>
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                        Nothing yet.
                      </div>
                    ) : (
                      <div className="space-y-1.5 p-2">
                        {notifications.map((notification, index) => (
                          <div
                            key={`notification-${notification.object_type}-${notification.object_id}-${notification.source_user_id || 'no-user'}-${index}`}
                            className="p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-800/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                {/* showUser profile pictureorDefault icon */}
                                {notification.source_user_id && hasUserInfoInCache(notification.source_user_id) ? (
                                  <img
                                    src={userAPI.getAvatarUrl(notification.source_user_id)}
                                    alt="User profile picture"
                                    className="w-10 h-10 rounded-lg object-cover"
                                    onError={(e) => {
                                      // ifavatarLoading failed,showDefault icon
                                      e.currentTarget.style.display = 'none';
                                      (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                
                                {/* Default icon - existNouserinformationoravatarLoading failedhourshow */}
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  notification.source_user_id && hasUserInfoInCache(notification.source_user_id) ? 'hidden' : ''
                                } ${
                                  notification.name.includes('team_application') 
                                    ? 'bg-orange-500/20' 
                                    : notification.name.includes('channel') 
                                    ? 'bg-blue-500/20' 
                                    : 'bg-gray-500/20'
                                }`}>
                                  {notification.name.includes('team_application') && (
                                    <FiUserPlus className="text-orange-500" size={20} />
                                  )}
                                  {notification.name.includes('channel') && (
                                    <FiMessageCircle className="text-blue-500" size={20} />
                                  )}
                                  {!notification.name.includes('team_application') && !notification.name.includes('channel') && (
                                    <FiBell className="text-gray-500" size={20} />
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  {getNotificationTitle(notification)}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {getNotificationContent(notification)}
                                </p>
                                
                                {/* showSenderinformation */}
                                {notification.source_user_id && hasUserInfoInCache(notification.source_user_id) && (
                                  <div className="flex items-center space-x-2 mt-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">From:</span>
                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-black/5 dark:border-white/10">
                                      {(() => {
                                        // fromcacheGetusername
                                        const cachedUser = getUserInfoFromCache(notification.source_user_id!);
                                        return cachedUser?.username || 'Unknown user';
                                      })()}
                                    </span>
                                  </div>
                                )}
                                
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                                
                                {notification.name === 'team_application_store' && (
                                  <div className="flex space-x-2 mt-3">
                                    <button
                                      onClick={() => handleTeamRequest(notification, 'accept')}
                                      className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg shadow hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400/40"
                                    >
                                      <FiCheck size={14} />
                                      <span>accept</span>
                                    </button>
                                    <button
                                      onClick={() => handleTeamRequest(notification, 'reject')}
                                      className="flex items-center space-x-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg shadow hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400/40"
                                    >
                                      <FiX size={14} />
                                      <span>reject</span>
                                    </button>
                                  </div>
                                )}
                                
                                {!notification.is_read && (
                                  <button
                                    onClick={() => handleNotificationMarkAsRead(notification)}
                                    className="text-xs text-osu-pink hover:text-osu-pink/80 mt-2"
                                  >
                                    markforRead
                                  </button>
                                )}
                              </div>
                          </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* hostcontentarea */}
      <div className="flex-1 flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-h-[calc(100vh-8rem)] md:max-h-[calc(100vh-4rem)] overflow-hidden">
        {selectedChannel ? (
          <>
            {/* Chat head */}
            <div className="mt-[2px] h-16 bg-white/80 dark:bg-gray-800/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-black/5 dark:border-white/10 shadow-sm flex items-center px-4 flex-shrink-0">
              <div className="flex items-center space-x-3">
                {isMobile && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                )}
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {selectedChannel.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedChannel.type === 'PM' ? 'Private chat' : 
                     selectedChannel.type === 'TEAM' ? 'teamChannel' : 'publicChannel'}
                  </p>
                </div>
              </div>
            </div>

            {/* informationList */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                
                // improveinformationGrouping logic
                let isGrouped = false;
                if (prevMessage && prevMessage.sender_id === message.sender_id) {
                  const timeDiff = new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime();
                  // Temporarily disable grouping function for debugging
                  isGrouped = false; // timeDiff < 300000; // 5Grouping within minutes, not1minute
                  console.log(`informationGroupingexamine: ${message.message_id}, Time difference: ${timeDiff}ms, Whether to group: ${isGrouped}`);
                }
                
                return (
                  <div key={`message-${message.message_id}-${message.channel_id}-${index}`} data-message-id={message.message_id}>
                    <MessageBubble
                      message={message}
                      currentUser={user || undefined}
                      isGrouped={isGrouped}
                    />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* informationInput box */}
            <div className="flex-shrink-0 border-t border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-800/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <MessageInput
                onSendMessage={sendMessage}
                disabled={!selectedChannel?.current_user_attributes?.can_message}
                placeholder={
                  selectedChannel?.current_user_attributes?.can_message_error || 
                  "Type something here..."
                }
                maxLength={selectedChannel?.message_length_limit || 1000}
              />
            </div>
          </>
        ) : (
          /* not yetselectselectChannelhourofPlaceholdercontent */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              {isMobile && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="mb-4 p-3 bg-osu-pink text-white rounded-lg"
                >
                  <FiMessageCircle size={24} />
                </button>
              )}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                selectselectoneindivualChannelstartchat
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                fromLeft sideselectselectoneindivualChannelorPrivate chatstartrighttalk
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile terminal mask */}
      {isMobile && showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* newestablishPrivate chatModal Box */}
      <PrivateMessageModal
        isOpen={showNewPMModal}
        onClose={() => setShowNewPMModal(false)}
        onMessageSent={async (newChannel) => {
          console.log('Private chatinformationsendsuccess,newChannel:', newChannel);
          
          if (isAuthenticated && newChannel) {
            try {
              // HeavynewloadChannelList
              console.log('HeavynewloadChannelListbyIncludenewPrivate chatChannel');
              const channels = await chatAPI.getChannels();
              console.log('HeavynewloadbackofChannelList:', channels);
              
              // Filter and sortChannel: Inverse order,Channelexistforward,The bottom is the firstoneindivual
              const sortedChannels = channels.sort((a: ChatChannel, b: ChatChannel) => {
                // Priority:publicChannel > Private chat > team > private
                const typeOrder: Record<string, number> = { 'PUBLIC': 0, 'PM': 1, 'TEAM': 2, 'PRIVATE': 3 };
                const aOrder = typeOrder[a.type] || 4;
                const bOrder = typeOrder[b.type] || 4;
                
                if (aOrder !== bOrder) {
                  // Inverse order: largerof order Value before
                  return bOrder - aOrder;
                }
                
                // Order in reverse order of names within the same type
                return b.name.localeCompare(a.name);
              });
              
              setChannels(sortedChannels);
              
              // Automatic selectionnewcreateofPrivate chatChannel
              console.log('Automatic selectionnewcreateofPrivate chatChannel:', newChannel.name);
              await selectChannel(newChannel);
              
              // make sureinformationquiltcorrectload
              console.log('Private chatChannelselectselectFinish,startloadinformation');
            } catch (error) {
              console.error('deal withnewPrivate chatChannelfail:', error);
              toast.error('loadPrivate chatChannelfail');
            }
          }
        }}
        currentUser={user || undefined}
      />
    </div>
  );
};

export default MessagesPage;
