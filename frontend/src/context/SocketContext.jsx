import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useRef,
    useCallback
  } from 'react'
  import { io } from 'socket.io-client'
  import toast from 'react-hot-toast'
  import { useAuth } from './AuthContext'
  
  const SocketContext = createContext(null)
  
  export const SocketProvider = ({ children }) => {
    const { token, isAuthenticated } = useAuth()
    const [socket, setSocket] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
    const socketRef = useRef(null)
    const messageListenersRef = useRef({})
    const dmListenersRef = useRef([])
    const syncListenersRef = useRef([])
  
    // Connect socket when authenticated
    useEffect(() => {
      if (!isAuthenticated || !token) {
        // Disconnect if not authenticated
        if (socketRef.current) {
          socketRef.current.disconnect()
          socketRef.current = null
          setSocket(null)
          setIsConnected(false)
        }
        return
      }
  
      // Avoid duplicate connections
      if (socketRef.current && socketRef.current.connected) {
        return
      }
  
      const newSocket = io(
       import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
        {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        }
      )
  
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id)
        setIsConnected(true)
      })
  
      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
        setIsConnected(false)
      })
  
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message)
        setIsConnected(false)
      })
  
      // Handle new community messages
      newSocket.on('new_message', (data) => {
        const { communityId, message } = data
        // Notify all registered listeners for this community
        if (
          messageListenersRef.current[communityId] &&
          messageListenersRef.current[communityId].length > 0
        ) {
          messageListenersRef.current[communityId].forEach((cb) => cb(message))
        }
      })
  
      // Handle new DMs
      newSocket.on('new_dm', (data) => {
        const { message } = data
        dmListenersRef.current.forEach((cb) => cb(message))
        toast.success(
          `New message from ${message.senderId?.name || 'Someone'}`,
          { duration: 3000 }
        )
      })
  
      // Handle notifications
      newSocket.on('notification', (notification) => {
        toast.success(notification.title, {
          duration: 4000,
          icon: '🔔'
        })
        setUnreadNotificationCount((prev) => prev + 1)
      })
  
      // Handle sync complete
      newSocket.on('sync_complete', (data) => {
        syncListenersRef.current.forEach((cb) => cb(data))
      })
  
      // Handle errors
      newSocket.on('error', (error) => {
        console.error('Socket error:', error.message)
      })
  
      socketRef.current = newSocket
      setSocket(newSocket)
  
      // Cleanup on unmount or when auth changes
      return () => {
        newSocket.disconnect()
        socketRef.current = null
        setSocket(null)
        setIsConnected(false)
      }
    }, [isAuthenticated, token])
  
    // Register a listener for messages in a specific community
    const onCommunityMessage = useCallback((communityId, callback) => {
      if (!messageListenersRef.current[communityId]) {
        messageListenersRef.current[communityId] = []
      }
      messageListenersRef.current[communityId].push(callback)
  
      // Return cleanup function
      return () => {
        if (messageListenersRef.current[communityId]) {
          messageListenersRef.current[communityId] = messageListenersRef.current[
            communityId
          ].filter((cb) => cb !== callback)
        }
      }
    }, [])
  
    // Register a listener for DMs
    const onDirectMessage = useCallback((callback) => {
      dmListenersRef.current.push(callback)
      return () => {
        dmListenersRef.current = dmListenersRef.current.filter(
          (cb) => cb !== callback
        )
      }
    }, [])
  
    // Register a listener for sync complete
    const onSyncComplete = useCallback((callback) => {
      syncListenersRef.current.push(callback)
      return () => {
        syncListenersRef.current = syncListenersRef.current.filter(
          (cb) => cb !== callback
        )
      }
    }, [])
  
    // Emit join community
    const joinCommunity = useCallback((communityId) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('join_community', communityId)
      }
    }, [])
  
    // Emit leave community
    const leaveCommunity = useCallback((communityId) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('leave_community', communityId)
      }
    }, [])
  
    // Emit send message
    const sendSocketMessage = useCallback((communityId, content, messageType = 'text') => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send_message', {
          communityId,
          content,
          messageType
        })
      }
    }, [])
  
    // Emit send DM
    const sendSocketDM = useCallback((recipientId, content, messageType = 'text') => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send_dm', {
          recipientId,
          content,
          messageType
        })
      }
    }, [])
  
    // Emit typing
    const emitTyping = useCallback((communityId) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('typing', { communityId })
      }
    }, [])
  
    // Emit stop typing
    const emitStopTyping = useCallback((communityId) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('stop_typing', { communityId })
      }
    }, [])
  
    // Register typing listener
    const onUserTyping = useCallback((communityId, callback) => {
      if (!socketRef.current) return () => {}
  
      const handler = (data) => {
        if (data.communityId === communityId) {
          callback(data)
        }
      }
  
      socketRef.current.on('user_typing', handler)
      socketRef.current.on('user_stop_typing', (data) => {
        if (data.communityId === communityId) {
          callback({ ...data, stopped: true })
        }
      })
  
      return () => {
        if (socketRef.current) {
          socketRef.current.off('user_typing', handler)
        }
      }
    }, [])
  
    // Decrement unread count
    const decrementUnreadCount = useCallback((amount = 1) => {
      setUnreadNotificationCount((prev) => Math.max(0, prev - amount))
    }, [])
  
    // Reset unread count
    const resetUnreadCount = useCallback(() => {
      setUnreadNotificationCount(0)
    }, [])
  
    const value = {
      socket,
      isConnected,
      unreadNotificationCount,
      setUnreadNotificationCount,
      decrementUnreadCount,
      resetUnreadCount,
      onCommunityMessage,
      onDirectMessage,
      onSyncComplete,
      joinCommunity,
      leaveCommunity,
      sendSocketMessage,
      sendSocketDM,
      emitTyping,
      emitStopTyping,
      onUserTyping
    }
  
    return (
      <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
    )
  }
  
  export const useSocket = () => {
    const context = useContext(SocketContext)
    if (!context) {
      throw new Error('useSocket must be used within a SocketProvider')
    }
    return context
  }
  
  export default SocketContext
