import React from 'react'

const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
      {/* Top row: company name + badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-200 rounded w-2/5" />
        <div className="h-5 bg-gray-200 rounded-full w-20" />
      </div>

      {/* Second row: role + location */}
      <div className="flex items-center gap-4 mb-4">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>

      {/* Third row: deadline */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-4" />
        <div className="h-4 bg-gray-200 rounded w-2/5" />
      </div>

      {/* Fourth row: eligibility + match */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-200 rounded-full w-24" />
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full w-full mb-4" />

      {/* Skills chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="h-5 bg-gray-200 rounded-full w-16" />
        <div className="h-5 bg-gray-200 rounded-full w-20" />
        <div className="h-5 bg-gray-200 rounded-full w-14" />
        <div className="h-5 bg-gray-200 rounded-full w-18" />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="h-9 bg-gray-200 rounded-lg w-24" />
        <div className="h-9 bg-gray-200 rounded-lg w-28" />
        <div className="h-9 bg-gray-200 rounded-lg w-9 ml-auto" />
      </div>
    </div>
  )
}

export default SkeletonCard