import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Users,
  MessageSquare,
  X,
  Loader2,
  Hash,
  Building2
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { communityAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import ChatWindow from '../components/community/ChatWindow'

// ── Create Community Modal ────────────────────────────────────────────────────
const CreateCommunityModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    visibility: 'public'
  })
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Community name is required')
      return
    }
    setIsCreating(true)
    try {
      const response = await communityAPI.create(formData)
      const newCommunity = response.data.data.community
      toast.success('Community created!')
      onCreate(newCommunity)
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create community')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Create Community
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. TCS Placement Discussion"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm
                         focus:outline-none focus:ring-2 focus:ring-accent
                         focus:border-transparent bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value
                }))
              }
              placeholder="What is this community about?"
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm
                         focus:outline-none focus:ring-2 focus:ring-accent
                         focus:border-transparent bg-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value
                  }))
                }
                className="w-full border border-gray-300 rounded-lg p-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-accent
                           focus:border-transparent bg-white"
              >
                <option value="general">General</option>
                <option value="company">Company</option>
                <option value="study_group">Study Group</option>
                <option value="mock_interview">Mock Interview</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Visibility
              </label>
              <select
                value={formData.visibility}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    visibility: e.target.value
                  }))
                }
                className="w-full border border-gray-300 rounded-lg p-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-accent
                           focus:border-transparent bg-white"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium bg-primary text-white
                       rounded-lg hover:bg-accent transition-colors
                       disabled:opacity-50 flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Community'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Community List Item ───────────────────────────────────────────────────────
const CommunityListItem = ({ community, isActive, onClick }) => {
  const lastMsg = community.lastMessage
  const unread = community.unreadCount || 0

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer
                  transition-colors ${
                    isActive
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
    >
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center
                    text-white text-sm font-bold shrink-0
                    ${community.isAutoCreated ? 'bg-accent' : 'bg-primary'}`}
      >
        {community.isAutoCreated ? (
          <Building2 className="w-5 h-5" />
        ) : (
          getInitials(community.name)
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {community.name}
          </span>
          {unread > 0 && (
            <span className="w-5 h-5 bg-accent text-white text-xs rounded-full
                             flex items-center justify-center shrink-0 font-medium">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500 truncate">
            {lastMsg
              ? lastMsg.content
                ? lastMsg.content.slice(0, 40)
                : '📎 File'
              : `${community.members?.length || 0} members`}
          </p>
          {community.isAutoCreated && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5
                             rounded-full shrink-0 font-medium">
              Company
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── DM List Item ──────────────────────────────────────────────────────────────
const DMListItem = ({ conversation, isActive, onClick }) => {
  const otherUser = conversation.otherUser
  const lastMsg = conversation.lastMessage

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer
                  transition-colors ${
                    isActive
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
    >
      <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-700
                      flex items-center justify-center text-sm font-bold shrink-0">
        {otherUser?.name
          ?.split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {otherUser?.name}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {lastMsg?.content
            ? lastMsg.content.slice(0, 40)
            : 'Start a conversation'}
        </p>
      </div>
    </div>
  )
}

// ── Main Community Page ───────────────────────────────────────────────────────
const Community = () => {
  const { id: urlCommunityId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { onDirectMessage } = useSocket()

  const [communities, setCommunities] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [dmConversations, setDMConversations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('my')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCommunity, setSelectedCommunity] = useState(null)
  const [selectedDM, setSelectedDM] = useState(null)
  const [showChat, setShowChat] = useState(false)
  const [selectedCommunityData, setSelectedCommunityData] = useState(null)
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false)

  // Fetch communities
  const fetchCommunities = useCallback(async () => {
    try {
      setIsLoading(true)
      const [commRes, suggRes] = await Promise.all([
        communityAPI.getAll(),
        communityAPI.getSuggestions()
      ])
      setCommunities(commRes.data.data.communities || [])
      setSuggestions(suggRes.data.data.suggestions || [])
    } catch (error) {
      console.error('Failed to fetch communities:', error.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCommunities()
  }, [fetchCommunities])

  // Handle URL param
  useEffect(() => {
    if (urlCommunityId && communities.length > 0) {
      const found = communities.find((c) => c._id === urlCommunityId)
      if (found) {
        handleSelectCommunity(found)
      }
    }
  }, [urlCommunityId, communities])

  // Listen for incoming DMs
  useEffect(() => {
    const cleanup = onDirectMessage((message) => {
      const senderId = message.senderId?._id || message.senderId
      const senderName = message.senderId?.name || 'Someone'

      setDMConversations((prev) => {
        const exists = prev.find((dm) => dm.otherUser?._id === senderId)
        if (exists) {
          return prev.map((dm) =>
            dm.otherUser?._id === senderId
              ? { ...dm, lastMessage: message }
              : dm
          )
        }
        return [
          ...prev,
          {
            otherUser: { _id: senderId, name: senderName },
            lastMessage: message
          }
        ]
      })
    })
    return cleanup
  }, [onDirectMessage])

  // Select community
  const handleSelectCommunity = async (community) => {
    setSelectedCommunity(community._id)
    setSelectedDM(null)
    setShowChat(true)
    setIsLoadingCommunity(true)

    try {
      const response = await communityAPI.getById(community._id)
      setSelectedCommunityData(response.data.data.community)
    } catch (error) {
      console.error('Failed to fetch community data:', error.message)
      setSelectedCommunityData(community)
    } finally {
      setIsLoadingCommunity(false)
    }
  }

  // Select DM
  const handleSelectDM = (dm) => {
    setSelectedDM(dm)
    setSelectedCommunity(null)
    setShowChat(true)
  }

  // Join community
  const handleJoin = async (communityId) => {
    try {
      await communityAPI.join(communityId)
      toast.success('Joined community!')
      await fetchCommunities()
      setActiveTab('my')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join community')
    }
  }

  // Create community
  const handleCreate = (newCommunity) => {
    setCommunities((prev) => [newCommunity, ...prev])
    handleSelectCommunity(newCommunity)
  }

  // Back button handler (mobile)
  const handleBack = () => {
    setShowChat(false)
    setSelectedCommunity(null)
    setSelectedDM(null)
    setSelectedCommunityData(null)
  }

  // Filter communities by search
  const filteredCommunities = communities.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredSuggestions = suggestions.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-6 overflow-hidden">
      {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
      <div
        className={`w-full md:w-80 shrink-0 bg-white border-r border-gray-200
                    flex flex-col
                    ${showChat ? 'hidden md:flex' : 'flex'}`}
      >
        {/* Left header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Community</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5
                         rounded-lg text-xs font-medium hover:bg-accent transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search communities..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-accent
                         focus:border-transparent bg-white placeholder-gray-400"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors
                          ${activeTab === 'my'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                          }`}
            >
              My Communities
            </button>
            <button
              onClick={() => setActiveTab('suggested')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors
                          ${activeTab === 'suggested'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                          }`}
            >
              Suggested
            </button>
          </div>
        </div>

        {/* Community list */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : activeTab === 'my' ? (
            <>
              {filteredCommunities.length === 0 ? (
                <div className="text-center py-12">
                  <Hash className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    No communities yet
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Create or join one!
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCommunities.map((community) => (
                    <CommunityListItem
                      key={community._id}
                      community={community}
                      isActive={selectedCommunity === community._id}
                      onClick={() => handleSelectCommunity(community)}
                    />
                  ))}
                </div>
              )}

              {/* Direct Messages section */}
              {dmConversations.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase
                                tracking-wide px-3 mb-2">
                    Direct Messages
                  </p>
                  <div className="space-y-1">
                    {dmConversations.map((dm) => (
                      <DMListItem
                        key={dm.otherUser?._id}
                        conversation={dm}
                        isActive={
                          selectedDM?.otherUser?._id === dm.otherUser?._id
                        }
                        onClick={() => handleSelectDM(dm)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Suggested tab
            <>
              {filteredSuggestions.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No suggestions</p>
                </div>
              ) : (
                <div className="space-y-2 p-1">
                  {filteredSuggestions.map((community) => (
                    <div
                      key={community._id}
                      className="bg-white rounded-xl border border-gray-200 p-3
                                 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {community.name}
                          </p>
                          {community.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {community.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {community.members?.length || 0} members
                          </p>
                        </div>
                        <button
                          onClick={() => handleJoin(community._id)}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-medium
                                     rounded-lg hover:bg-accent transition-colors shrink-0"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL (CHAT) ───────────────────────────────────────────── */}
      <div
        className={`flex-1 overflow-hidden
                    ${showChat ? 'flex' : 'hidden md:flex'}`}
      >
        {isLoadingCommunity ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Loading chat...</p>
            </div>
          </div>
        ) : selectedCommunity && selectedCommunityData ? (
          <ChatWindow
            communityId={selectedCommunityData._id}
            communityName={selectedCommunityData.name}
            memberCount={selectedCommunityData.members?.length}
            pinnedMessages={selectedCommunityData.pinnedMessages || []}
            members={selectedCommunityData.members || []}
            isDM={false}
            onBack={handleBack}
          />
        ) : selectedDM ? (
          <ChatWindow
            isDM={true}
            recipientId={selectedDM.otherUser?._id}
            recipientName={selectedDM.otherUser?.name}
            onBack={handleBack}
          />
        ) : (
          // Empty state (desktop only)
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center
                              justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700">
                Select a community
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Choose a community to start chatting
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 flex items-center gap-2 bg-primary text-white px-4 py-2
                           rounded-lg text-sm font-medium hover:bg-accent transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create Community
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCommunityModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}

export default Community