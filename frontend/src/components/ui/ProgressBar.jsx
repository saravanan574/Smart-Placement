import React from 'react'

const ProgressBar = ({
  value = 0,
  max = 100,
  showLabel = false,
  height = 'h-2',
  className = '',
  colorOverride = null
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  // Determine color based on percentage unless overridden
  const getColor = () => {
    if (colorOverride) return colorOverride
    if (percentage >= 70) return 'bg-green-500'
    if (percentage >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={`w-full ${height} bg-gray-200 rounded-full overflow-hidden`}
      >
        <div
          className={`${height} ${getColor()} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar