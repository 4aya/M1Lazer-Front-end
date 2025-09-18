import axios, { type AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

// API base URL - adjust this to match your osu! API server
const API_BASE_URL = 'https://lazer-api.g0v0.top';
//const API_BASE_URL = 'http://127.0.0.1:8000';
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Make sure not to sendcookiesavoidCORSquestion
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  login: async (username: string, password: string, clientId: number, clientSecret: string) => {
    console.log('Login attempt with:', { username, clientId }); // Debug log
    
    const formData = new FormData();
    formData.append('grant_type', 'password');
    formData.append('client_id', clientId.toString());
    formData.append('client_secret', clientSecret);
    formData.append('username', username);
    formData.append('password', password);
    formData.append('scope', '*');

    try {
      const response = await axios.post(`${API_BASE_URL}/oauth/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return response.data;
    } catch (error) {
      const err = error as { response?: { data?: unknown }; message?: string };
      console.error('Login error:', err.response?.data || err.message);
      throw err;
    }
  },

  register: async (username: string, email: string, password: string) => {
    console.log('Register attempt with:', { username, email }); // Debug log
    
    // use URLSearchParams To ensure the correct application/x-www-form-urlencoded Format
    // Backend expectationsofField nameFormatyes user[fieldname]
    const formData = new URLSearchParams();
    formData.append('user[username]', username);
    formData.append('user[user_email]', email);
    formData.append('user[password]', password);

    try {
      const response = await axios.post(`${API_BASE_URL}/users`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return response.data;
    } catch (error) {
      const err = error as { response?: { data?: unknown }; message?: string };
      console.error('Register error:', err.response?.data || err.message);
      throw err;
    }
  },

  refreshToken: async (refreshToken: string, clientId: number, clientSecret: string) => {
    const formData = new FormData();
    formData.append('grant_type', 'refresh_token');
    formData.append('client_id', clientId.toString());
    formData.append('client_secret', clientSecret);
    formData.append('refresh_token', refreshToken);

    const response = await axios.post(`${API_BASE_URL}/oauth/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
};

// User API functions
export const userAPI = {
  getMe: async (ruleset?: string) => {
    const url = ruleset ? `/api/v2/me/${ruleset}` : '/api/v2/me/';
    const response = await api.get(url);
    return response.data;
  },

  getUser: async (
    userIdOrName: string | number,
    ruleset?: string,
    config?: AxiosRequestConfig,
  ) => {
    const url = ruleset
      ? `/api/v2/users/${userIdOrName}/${ruleset}`
      : `/api/v2/users/${userIdOrName}`;
    const response = await api.get(url, config);
    return response.data;
  },

  // Get user profile pictureURL
  getAvatarUrl: (userId: number, bustCache: boolean = false) => {
    // according toosu_lazer_api-mainImplementation, build avatarURL
    // If the user has a custom avatar, the full image will be returnedURL; Otherwise, return to the default avatar
    const baseUrl = `${API_BASE_URL}/users/${userId}/avatar`;
    // Add timestamp to corrupt cache if needed
    return bustCache ? `${baseUrl}?t=${Date.now()}` : baseUrl;
  },

  // Upload user avatar
  uploadAvatar: async (imageFile: File | Blob) => {
    console.log('Start uploading avatar, file type:', imageFile.type, 'File size:', imageFile.size);
    
    const formData = new FormData();
    // according toblobType determines file extension
    const isJpeg = imageFile.type === 'image/jpeg';
    const fileName = isJpeg ? 'avatar.jpg' : 'avatar.png';
    formData.append('content', imageFile, fileName);
    
    // verifyFormDatacontent
    console.log('FormDatacontent:');
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
      if (value instanceof Blob) {
        console.log(`  type: ${value.type}, size: ${value.size}`);
      }
    }

    // Gettoken
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('The access token was not found, please log in again');
    }

    console.log('Ready to send a request to:', `${API_BASE_URL}/api/private/avatar/upload`);

    // directusefetchComeavoidaxiosofcontent-typedeal withquestion
    const response = await fetch(`${API_BASE_URL}/api/private/avatar/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Not setContent-Type, let the browser automatically set it
      },
      body: formData,
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Upload failure response:', errorData);
      throw new Error(errorData?.detail || errorData?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('Upload response:', result);
    return result;
  },

  // Modify username
  rename: async (newUsername: string) => {
    console.log('Rename the username:', newUsername);
    
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Access token not found');
    }

    const response = await fetch(`${API_BASE_URL}/api/private/rename`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUsername),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      console.error('Rename failed response:', errorData);
      throw new Error(errorData?.detail || errorData?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('Rename the response:', result);
    return result;
  },

  // Upload user header image
  uploadCover: async (imageFile: File | Blob) => {
    console.log('Start uploading the header image,documenttype:', imageFile.type, 'File size:', imageFile.size);
    
    const formData = new FormData();
    // according toblobType determines file extension
    const isJpeg = imageFile.type === 'image/jpeg';
    const fileName = isJpeg ? 'cover.jpg' : 'cover.png';
    formData.append('content', imageFile, fileName);
    
    // verifyFormDatacontent
    console.log('FormDatacontent:');
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
      if (value instanceof Blob) {
        console.log(`  type: ${value.type}, size: ${value.size}`);
      }
    }

    // Gettoken
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Access token not found');
    }

    console.log('Ready to send a request to:', `${API_BASE_URL}/api/private/cover/upload`);

    // directusefetchComeavoidaxiosofcontent-typedeal withquestion
    const response = await fetch(`${API_BASE_URL}/api/private/cover/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Not setContent-Type, let the browser automatically set it
      },
      body: formData,
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      console.error('Upload failure response:', errorData);
      throw new Error(errorData?.detail || errorData?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('Upload response:', result);
    return result;
  },

  // GetUser recent activities
  getRecentActivity: async (
    userId: number,
    limit: number = 6,
    offset: number = 0
  ) => {
    console.log('GetUser recent activities:', { userId, limit, offset });
    
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    const url = `/api/v2/users/${userId}/recent_activity?${params.toString()}`;
    const response = await api.get(url);
    return response.data;
  },

  // GetUser Pagecontent(For editing onlyGetup to datecontent,When displayeduseIn user objectofpageField)
  getUserPage: async (userId: number) => {
    console.log('GetUser Pagecontent(Editor):', { userId });
    const response = await api.get(`/api/v2/users/${userId}/page`);
    return response.data;
  },

  // EvennewUser Pagecontent
  updateUserPage: async (userId: number, content: string) => {
    console.log('EvennewUser Pagecontent:', { userId, contentLength: content.length });
    const response = await api.put(`/api/v2/users/${userId}/page`, {
      body: content
    });
    return response.data;
  },

  // verifyBBCodecontent
  validateBBCode: async (content: string) => {
    console.log('verifyBBCodecontent:', { contentLength: content.length });
    const response = await api.post('/api/v2/me/validate-bbcode', {
      content: content
    });
    return response.data;
  },
};

// Friends API functions - osu! useunidirectionalfocus onsystem
export const friendsAPI = {
  // GetFriends list
  getFriends: async () => {
    const response = await api.get('/api/v2/friends');
    return response.data;
  },

  // Add friends (one-way follow)
  addFriend: async (targetUserId: number) => {
    const response = await api.post(`/api/v2/friends?target=${targetUserId}`);
    return response.data;
  },

  // Delete a friend relationship
  removeFriend: async (targetUserId: number) => {
    const response = await api.delete(`/api/v2/friends/${targetUserId}`);
    return response.data;
  },

  // GetBlock list
  getBlocks: async () => {
    const response = await api.get('/api/v2/blocks');
    return response.data;
  },

  // Block users
  blockUser: async (targetUserId: number) => {
    const response = await api.post(`/api/v2/blocks?target=${targetUserId}`);
    return response.data;
  },

  // Unblock
  unblockUser: async (targetUserId: number) => {
    const response = await api.delete(`/api/v2/blocks/${targetUserId}`);
    return response.data;
  },

  // Check and specify usersofRelationship status
  checkRelationship: async (targetUserId: number) => {
    try {
      // usenewofdedicated API EndpointComeGetRelationship status
      const response = await api.get(`/api/private/relationship/check/${targetUserId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to check user relationship:', error);
      // If new API Not available,Rewind to originalComeofmethod
      try {
        const [friends, blocks] = await Promise.all([
          friendsAPI.getFriends(),
          friendsAPI.getBlocks()
        ]);

        const isFriend = friends.some((friend: { target_id: number; mutual?: boolean }) => friend.target_id === targetUserId);
        const isBlocked = blocks.some((block: { target_id: number }) => block.target_id === targetUserId);
        const isMutual = friends.some((friend: { target_id: number; mutual?: boolean }) => friend.target_id === targetUserId && friend.mutual === true);
        
        // exist osu! ofIn the friend system:
        // 1. isFriend = true and mutual = true: Pay attention to me in both directions.
        // 2. isFriend = true and mutual = false: One-way follower, I followed the other party, but the other party didn't follow me
        // 3. isFriend = false: I didn't follow the other person, and I couldn't directly judge whether the other person was following me
        let followsMe = false;
        
        if (isFriend) {
          // We followed each other,mutual Fields can tell us whether it is bidirectional
          followsMe = isMutual;
        } else {
          // We did not follow each other, and we cannot be sure whether the other party has followed us for the time being
          // existactualusemiddle,In this case UI Should be displayed"focus on"Instead"Back to the clearance"
          followsMe = false;
        }
        
        // Return with new API FormatConsistentofFields
        return {
          is_following: isFriend,   // Iyesnofocus onother side
          isBlocked: isBlocked,     // Whether to block
          mutual: isMutual,         // yesnoeach otherfocus on
          is_followed: followsMe    // other sideyesnofocus onI
        };
      } catch (fallbackError) {
        console.error('The backup method also failed:', fallbackError);
        // Return with new API FormatConsistentofdefault value
        return {
          is_following: false,  // Iyesnofocus onother side
          isBlocked: false,     // Whether to block
          mutual: false,        // yesnoeach otherfocus on
          is_followed: false    // other sideyesnofocus onI
        };
      }
    }
  },

  // Getuseroffocus onList of persons
  getUserFollowers: async (userId: number) => {
    const response = await api.get(`/api/v2/relationship/followers/${userId}`);
    return response.data;
  },



  // GetuserDetails
  getUser: async (userId: number) => {
    const response = await api.get(`/api/v2/users/${userId}`);
    return response.data;
  }
};

// Error handler utility
export const handleApiError = (error: unknown) => {
  const err = error as {
    response?: { data?: { error_description?: string; message?: string } };
    message?: string;
  };
  if (err.response?.data?.error_description) {
    toast.error(err.response.data.error_description);
  } else if (err.response?.data?.message) {
    toast.error(err.response.data.message);
  } else if (err.message) {
    toast.error(err.message);
  } else {
    toast.error('An unexpected error occurred');
  }
};

// Rankings API functions
export const rankingsAPI = {
  // GetuserRanking list
  getUserRankings: async (
    ruleset: string, 
    type: 'performance' | 'score', 
    country?: string, 
    page: number = 1
  ) => {
    const params = new URLSearchParams();
    if (country) params.append('country', country);
    params.append('page', page.toString());
    
    const response = await api.get(`/api/v2/rankings/${ruleset}/${type}?${params}`);
    return response.data;
  },

  // GetRegional rankings
  getCountryRankings: async (ruleset: string, page: number = 1) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    
    const response = await api.get(`/api/v2/rankings/${ruleset}/country?${params}`);
    return response.data;
  },

  // GetTeam ranking list
  getTeamRankings: async (
    ruleset: string, 
    sort: 'performance' | 'score', 
    page: number = 1
  ) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    
    const response = await api.get(`/api/v2/rankings/${ruleset}/team/${sort}?${params}`);
    return response.data;
  },
};

// Teams API functions
export const teamsAPI = {
  // GetTeam details
  getTeam: async (teamId: number) => {
    const response = await api.get(`/api/private/team/${teamId}`);
    return response.data;
  },

  // Create a team
  createTeam: async (teamData: FormData) => {
    const response = await api.post('/api/private/team', teamData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Modify the team
  updateTeam: async (teamId: number, teamData: FormData) => {
    const response = await api.patch(`/api/private/team/${teamId}`, teamData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete the team
  deleteTeam: async (teamId: number) => {
    const response = await api.delete(`/api/private/team/${teamId}`);
    return response.data;
  },

  // Request to join the battle team
  requestJoinTeam: async (teamId: number) => {
    const response = await api.post(`/api/private/team/${teamId}/request`);
    return response.data;
  },

  // Accept joining request
  acceptJoinRequest: async (teamId: number, userId: number) => {
    const response = await api.post(`/api/private/team/${teamId}/${userId}/request`);
    return response.data;
  },

  // Reject join request
  rejectJoinRequest: async (teamId: number, userId: number) => {
    const response = await api.delete(`/api/private/team/${teamId}/${userId}/request`);
    return response.data;
  },

  // Kick out members / Exit the team
  removeMember: async (teamId: number, userId: number) => {
    const response = await api.delete(`/api/private/team/${teamId}/${userId}`);
    return response.data;
  },
};

// Stats API functions
export const statsAPI = {
  // Get current server stats
  getCurrentStats: async () => {
    const response = await api.get('/api/v2/stats');
    return response.data;
  },

  // Get 24h online history
  getOnlineHistory: async () => {
    const response = await api.get('/api/v2/stats/history');
    return response.data;
  },
};

// Chat API functions
export const chatAPI = {
  // GetChannel List
  getChannels: async () => {
    const response = await api.get('/api/v2/chat/channels');
    return response.data;
  },

  // GetChannel Message
  getChannelMessages: async (channelId: string | number, limit: number = 50, since: number = 0, until?: number) => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('since', since.toString());
    if (until !== undefined) {
      params.append('until', until.toString());
    }
    
    const response = await api.get(`/api/v2/chat/channels/${channelId}/messages?${params}`);
    return response.data;
  },

  // Send a message
  sendMessage: async (channelId: string | number, message: string, isAction: boolean = false, uuid?: string) => {
    const formData = new URLSearchParams();
    formData.append('message', message);
    formData.append('is_action', isAction.toString());
    if (uuid) {
      formData.append('uuid', uuid);
    }

    const response = await api.post(`/api/v2/chat/channels/${channelId}/messages`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  // Mark the message as read
  markAsRead: async (channelId: string | number, messageId: number) => {
    const response = await api.put(`/api/v2/chat/channels/${channelId}/mark-as-read/${messageId}`, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  // createnewofPrivate chat
  createPrivateMessage: async (targetId: number, message: string, isAction: boolean = false, uuid?: string) => {
    const formData = new URLSearchParams();
    formData.append('target_id', targetId.toString());
    formData.append('message', message);
    formData.append('is_action', isAction.toString());
    if (uuid) {
      formData.append('uuid', uuid);
    }

    const response = await api.post('/api/v2/chat/new', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  // Join the channel
  joinChannel: async (channelId: string | number) => {
    const response = await api.post(`/api/v2/chat/channels/${channelId}/join`);
    return response.data;
  },

  // Leave the channel
  leaveChannel: async (channelId: string | number) => {
    const response = await api.post(`/api/v2/chat/channels/${channelId}/leave`);
    return response.data;
  },

  // GetPrivate chatChannel (if savedexist)
  getPrivateChannel: async (targetUserId: number) => {
    try {
      const response = await api.get(`/api/v2/chat/private/${targetUserId}`);
      return response.data;
    } catch (error: any) {
      // ifPrivate chatThe channel does not existexist,returnnull
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Stay connected active
  keepAlive: async (historySince?: number, since?: number) => {
    const params = new URLSearchParams();
    if (historySince !== undefined) {
      params.append('history_since', historySince.toString());
    }
    if (since !== undefined) {
      params.append('since', since.toString());
    }

    const response = await api.post(`/api/v2/chat/ack?${params}`);
    return response.data;
  },
};

// Notifications API functions
export const notificationsAPI = {
  // GetNotification list andWebSocketEndpoint
  getNotifications: async () => {
    const response = await api.get('/api/v2/notifications');
    return response.data;
  },

  // Mark a single notification as read (Backend needs {identities:[...]} structure, 204 nonecontent)
  markAsRead: async (notificationId: number) => {
    await api.post('/api/v2/notifications/mark-read', {
      identities: [{ id: notificationId }],
      notifications: [],
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  // Batch mark notifications are read (backend _IdentityReq Supported only id/object_id/category,object_type Defined as int Will conflict with strings,Therefore, it is not sent)
  markMultipleAsRead: async (identities: Array<{ id?: number; object_id?: number; category?: string; object_type?: string }>) => {
    if (!identities || identities.length === 0) return;
    // filter/ConvertFields,Remove object_type,object_id Make sure to number
    const safeIdentities = identities.map(i => ({
      ...(i.id !== undefined ? { id: i.id } : {}),
      ...(i.object_id !== undefined ? { object_id: Number(i.object_id) } : {}),
      ...(i.category ? { category: i.category } : {}),
    }));
    await api.post('/api/v2/notifications/mark-read', {
      identities: safeIdentities,
      notifications: [],
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  // GetNumber of unread notifications
  getUnreadCount: async () => {
    const response = await api.get('/api/v2/notifications/unread-count');
    return response.data;
  },

  // GetTeam join request notification
  getTeamRequests: async () => {
    const response = await api.get('/api/private/team-requests');
    return response.data;
  },

  // pass object_id Group deduplication notification
  getGroupedNotifications: async () => {
    const response = await api.get('/api/v2/notifications');
    const notifications = response.data.notifications || [];
    
    // use object_id Grouping and deduplication
    const groupedMap = new Map<string, typeof notifications[0]>();
    
    notifications.forEach((notification: any) => {
      const key = `${notification.object_type}-${notification.object_id}`;
      
      // If already savedexistsame object_id ofnotify,Retention timeup to dateof
      if (!groupedMap.has(key) || 
          new Date(notification.created_at) > new Date(groupedMap.get(key)!.created_at)) {
        groupedMap.set(key, notification);
      }
    });
    
    // returnAfter removing the heavyofnotify,Sort by reverse order of time
    const deduplicatedNotifications = Array.from(groupedMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return {
      ...response.data,
      notifications: deduplicatedNotifications
    };
  },
};

// Client credentials - in production, these should be environment variables
export const CLIENT_CONFIG = {
  osu_client_id: 6,
  osu_client_secret: '454532f3dba952663c8917ad15204d501ec2f28e41b3bce4b276b5d4a2a25823918f4711bb87a7fe',
  web_client_id: 6,
  web_client_secret: '454532f3dba952663c8917ad15204d501ec2f28e41b3bce4b276b5d4a2a25823918f4711bb87a7fe',
};
