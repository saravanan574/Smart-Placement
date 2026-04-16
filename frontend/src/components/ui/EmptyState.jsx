import React from 'react'

const EmptyState = ({
  icon: Icon,
  title = 'Nothing here yet',
  description = '',
  actionLabel = '',
  onAction = null,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      {/* Icon */}
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      )}

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      )}

      {/* Action button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium
                     hover:bg-accent transition-colors duration-150
                     flex items-center gap-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState