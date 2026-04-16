import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Paperclip, X, Users, ArrowLeft, Pin, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import toast from 'react-hot-toast'
import { communityAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import MessageBubble from './MessageBubble'

const DateSeparator = ({ date }) => {
  const label = isToday(new Date(date)) ? 'Today' : isYesterday(new Date(date)) ? 'Yesterday' : format(new Date(date), 'dd MMM yyyy')
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 border-t border-gray-200" />
      <span className="text-xs text-gray-400 font-medium bg-white px-2">{label}</span>
      <div className="flex-1 border-t border-gray-200" />
    </div>
  )
}

const ChatWindow = ({
  communityId, communityName, memberCount,
  pinnedMessages = [], members = [],
  isDM = false, recipientId = null, recipientName = '',
  onBack
}) => {
  const { user } = useAuth()
  const { joinCommunity, leaveCommunity, sendSocketMessage, onCommunityMessage, emitTyping, emitStopTyping, onUserTyping } = useSocket()

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [showMembers, setShowMembers] = useState(false)
  const [showPinned, setShowPinned] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const isAtBottomRef = useRef(true)
  // Track pending optimistic message IDs so we can replace them
  const pendingOptimisticRef = useRef(new Set())

  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }
  }, [])

  const fetchMessages = useCallback(async (pageNum = 1) => {
    if (!communityId && !isDM) return
    try {
      if (pageNum === 1) setIsLoading(true)
      else setIsLoadingMore(true)

      let response
      if (isDM && recipientId) {
        response = await communityAPI.getDMConversation(recipientId, { page: pageNum, limit: 50 })
      } else {
        response = await communityAPI.getMessages(communityId, { page: pageNum, limit: 50 })
      }

      const { messages: fetchedMsgs, pagination } = response.data.data
      if (pageNum === 1) {
        setMessages(fetchedMsgs)
        setPage(1)
        setTimeout(() => scrollToBottom(), 100)
      } else {
        setMessages((prev) => [...fetchedMsgs, ...prev])
        setPage(pageNum)
      }
      setHasMore(pageNum < pagination.pages)
    } catch (error) {
      console.error('Failed to fetch messages:', error.message)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [communityId, isDM, recipientId, scrollToBottom])

  useEffect(() => {
    if (!communityId && !isDM) return
    fetchMessages(1)
    if (!isDM && communityId) joinCommunity(communityId)
    return () => { if (!isDM && communityId) leaveCommunity(communityId) }
  }, [communityId, isDM, fetchMessages, joinCommunity, leaveCommunity])

  // Socket message listener — replaces matching optimistic message, otherwise appends
  useEffect(() => {
    if (!communityId || isDM) return
    const cleanup = onCommunityMessage(communityId, (message) => {
      setMessages((prev) => {
        // If this message came from the current user and we have a pending optimistic,
        // replace the oldest pending optimistic with the confirmed message
        const senderId = message.senderId?._id?.toString() || message.senderId?.toString()
        if (senderId === user?._id?.toString() && pendingOptimisticRef.current.size > 0) {
          const [firstKey] = pendingOptimisticRef.current
          pendingOptimisticRef.current.delete(firstKey)
          return prev.map((m) =>
            m._id === firstKey ? { ...message, isOptimistic: false } : m
          )
        }
        // Message from someone else — just append (avoid duplicate real messages)
        const exists = prev.some((m) => m._id === message._id)
        if (exists) return prev
        return [...prev, message]
      })
      if (isAtBottomRef.current) setTimeout(() => scrollToBottom(true), 50)
    })
    return cleanup
  }, [communityId, isDM, onCommunityMessage, scrollToBottom, user])

  // Typing events
  useEffect(() => {
    if (!communityId || isDM) return
    const cleanup = onUserTyping(communityId, (data) => {
      if (data.userId === user?._id?.toString()) return
      if (data.stopped) {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId))
      } else {
        setTypingUsers((prev) => {
          const exists = prev.find((u) => u.userId === data.userId)
          if (exists) return prev
          return [...prev, { userId: data.userId, userName: data.userName }]
        })
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId))
        }, 3000)
      }
    })
    return cleanup
  }, [communityId, isDM, onUserTyping, user])

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50
    if (scrollTop === 0 && hasMore && !isLoadingMore) fetchMessages(page + 1)
  }

  const handleSend = async () => {
    if (isSending) return
    if (!newMessage.trim() && !selectedFile) return
    setIsSending(true)

    try {
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        if (newMessage.trim()) formData.append('content', newMessage.trim())

        let response
        if (isDM && recipientId) {
          response = await communityAPI.sendDM(recipientId, { content: newMessage.trim() || null, messageType: 'file' })
        } else {
          response = await communityAPI.sendMessage(communityId, formData)
        }

        const sentMessage = response.data.data.message
        setMessages((prev) => [...prev, sentMessage])
        setSelectedFile(null)
        setNewMessage('')
        setTimeout(() => scrollToBottom(true), 50)
      } else {
        if (isDM && recipientId) {
          const response = await communityAPI.sendDM(recipientId, { content: newMessage.trim(), messageType: 'text' })
          const sentMessage = response.data.data.message
          setMessages((prev) => [...prev, sentMessage])
        } else {
          // Generate a unique optimistic ID
          const optimisticId = `optimistic_${Date.now()}_${Math.random()}`
          pendingOptimisticRef.current.add(optimisticId)

          const optimisticMsg = {
            _id: optimisticId,
            communityId,
            senderId: { _id: user._id, name: user.name },
            content: newMessage.trim(),
            messageType: 'text',
            createdAt: new Date().toISOString(),
            isOptimistic: true
          }
          setMessages((prev) => [...prev, optimisticMsg])
          sendSocketMessage(communityId, newMessage.trim())
        }

        setNewMessage('')
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
        setTimeout(() => scrollToBottom(true), 50)
      }

      if (!isDM) emitStopTyping(communityId)
    } catch (error) {
      toast.error('Failed to send message')
      // Remove any stuck optimistic messages on error
      setMessages((prev) => prev.filter((m) => !m.isOptimistic))
      pendingOptimisticRef.current.clear()
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaChange = (e) => {
    setNewMessage(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
    if (!isDM && communityId) {
      emitTyping(communityId)
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => emitStopTyping(communityId), 2000)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return }
    setSelectedFile(file)
  }

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = []
    let currentDate = null
    messages.forEach((msg) => {
      const msgDate = format(new Date(msg.createdAt), 'yyyy-MM-dd')
      if (msgDate !== currentDate) {
        currentDate = msgDate
        groups.push({ type: 'separator', date: msg.createdAt, id: msgDate })
      }
      groups.push({ type: 'message', message: msg, id: msg._id })
    })
    return groups
  }

  const messageGroups = groupMessagesByDate()

  const shouldShowSender = (index) => {
    if (index === 0) return true
    const prevItem = messageGroups[index - 1]
    const currItem = messageGroups[index]
    if (!prevItem || prevItem.type === 'separator') return true
    if (!currItem || currItem.type !== 'message') return false
    return prevItem.message.senderId?._id?.toString() !== currItem.message.senderId?._id?.toString()
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors md:hidden">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate text-sm">{isDM ? recipientName : communityName}</h3>
          {!isDM && memberCount !== undefined && (
            <p className="text-xs text-gray-500">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        {!isDM && (
          <button onClick={() => setShowMembers((v) => !v)} className={`p-2 rounded-lg transition-colors ${showMembers ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            <Users className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Pinned messages */}
      {!isDM && pinnedMessages?.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 shrink-0">
          <button onClick={() => setShowPinned((v) => !v)} className="flex items-center gap-2 w-full text-left">
            <Pin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700 font-medium flex-1 truncate">
              📌 {typeof pinnedMessages[0] === 'object' ? pinnedMessages[0].content : 'Pinned message'}
            </span>
            {showPinned ? <ChevronUp className="w-3.5 h-3.5 text-amber-600" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-600" />}
          </button>
          {showPinned && pinnedMessages.length > 1 && (
            <div className="mt-2 space-y-1">
              {pinnedMessages.slice(1).map((msg, i) => (
                <p key={i} className="text-xs text-amber-700 pl-5">📌 {typeof msg === 'object' ? msg.content : msg}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-2" onScroll={handleScroll}>
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Send className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Be the first to say something!</p>
            </div>
          </div>
        ) : (
          <>
            {messageGroups.map((item, index) => {
              if (item.type === 'separator') return <DateSeparator key={item.id} date={item.date} />
              const msg = item.message
              const isOwn = msg.senderId?._id?.toString() === user?._id?.toString() || msg.senderId === user?._id?.toString()
              const showSender = !isOwn && shouldShowSender(index)
              return <MessageBubble key={item.id} message={msg} isOwn={isOwn} showSender={showSender} />
            })}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-400">
                  {typingUsers.map((u) => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Members sidebar (overlay) */}
      {showMembers && !isDM && (
        <div className="absolute right-0 top-0 h-full w-64 bg-white border-l border-gray-200 z-10 overflow-y-auto shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <span className="font-semibold text-sm text-gray-900">Members ({members.length})</span>
            <button onClick={() => setShowMembers(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="py-2">
            {members.map((member) => (
              <div key={member._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {member.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.department}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        {selectedFile && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-2">
            <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-sm text-blue-700 flex-1 truncate">{selectedFile.name}</span>
            <span className="text-xs text-blue-500">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="p-0.5 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5 text-blue-500" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0 mb-0.5" title="Attach file">
            <Paperclip className="w-5 h-5" />
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleFileSelect} />

          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={isDM ? `Message ${recipientName}...` : 'Type a message...'}
            rows={1}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none bg-white placeholder-gray-400 overflow-y-auto"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />

          <button
            onClick={handleSend}
            disabled={isSending || (!newMessage.trim() && !selectedFile)}
            className="p-2.5 rounded-xl bg-accent text-white hover:bg-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 mb-0.5"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

export default ChatWindow