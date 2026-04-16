import React from 'react'
import { Download, FileText, Image } from 'lucide-react'
import { format } from 'date-fns'

const MessageBubble = ({ message, isOwn, showSender }) => {
  const {
    content,
    messageType,
    fileUrl,
    fileName,
    fileMimeType,
    createdAt,
    senderId,
    isOptimistic
  } = message

  const senderName =
    typeof senderId === 'object' ? senderId?.name : 'Unknown'

  const timestamp = createdAt
    ? format(new Date(createdAt), 'hh:mm a')
    : ''

  const isImage =
    messageType === 'image' ||
    (fileMimeType && fileMimeType.startsWith('image/'))

  const renderFileContent = () => {
    if (!fileUrl) return null

    if (isImage) {
      return (
        <div className="mt-1">
          <img
            src={
              fileUrl.startsWith('http')
                ? fileUrl
                : `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'}${fileUrl}`
            }
            alt={fileName || 'Image'}
            className="max-h-48 rounded-lg object-cover cursor-pointer
                       hover:opacity-90 transition-opacity"
            onClick={() =>
              window.open(
                fileUrl.startsWith('http')
                  ? fileUrl
                  : `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'}${fileUrl}`,
                '_blank'
              )
            }
          />
        </div>
      )
    }

    // File download
    return (
      <div
        className={`flex items-center gap-2 mt-1 px-3 py-2 rounded-lg
                    ${isOwn ? 'bg-blue-700' : 'bg-gray-200'}`}
      >
        <FileText
          className={`w-4 h-4 shrink-0 ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}
        />
        <span
          className={`text-xs flex-1 truncate max-w-[180px]
                      ${isOwn ? 'text-blue-100' : 'text-gray-700'}`}
        >
          {fileName || 'File'}
        </span>
        <a 
          href={
            fileUrl.startsWith('http')
              ? fileUrl
              : `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'}${fileUrl}`
          }
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-1 rounded transition-colors
                      ${isOwn
                        ? 'text-blue-200 hover:text-white'
                        : 'text-gray-500 hover:text-gray-700'
                      }`}
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    )
  }

  return (
    <div
      className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}
                  ${isOptimistic ? 'opacity-70' : 'opacity-100'}`}
    >
      {/* Avatar for others */}
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center
                        justify-center text-xs font-semibold shrink-0 mr-2 mt-1 self-end">
          {senderName
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || '?'}
        </div>
      )}

      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender name */}
        {showSender && !isOwn && (
          <span className="text-xs text-gray-500 font-medium mb-1 ml-1">
            {senderName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed
                      ${isOwn
                        ? 'bg-accent text-white rounded-tr-sm'
                        : 'bg-white text-gray-900 rounded-tl-sm border border-gray-200'
                      }
                      ${!content && fileUrl ? 'p-2' : ''}`}
        >
          {/* Text content */}
          {content && (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          )}

          {/* File or image */}
          {fileUrl && renderFileContent()}
        </div>

        {/* Timestamp */}
        <span
          className={`text-xs mt-0.5 px-1
                      ${isOwn ? 'text-gray-400' : 'text-gray-400'}`}
        >
          {timestamp}
          {isOptimistic && (
            <span className="ml-1 text-gray-300">· Sending...</span>
          )}
        </span>
      </div>
    </div>
  )
}

export default MessageBubble