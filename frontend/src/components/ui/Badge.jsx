import React from 'react'

const variants = {
  success: 'bg-green-100 text-green-700 border border-green-200',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200',
  danger:  'bg-red-100 text-red-700 border border-red-200',
  info:    'bg-blue-100 text-blue-700 border border-blue-200',
  gray:    'bg-gray-100 text-gray-600 border border-gray-200'
}

const Badge = ({ variant = 'gray', children, className = '' }) => {
  return (
    <span
      className={
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ' +
        (variants[variant] || variants.gray) +
        (className ? ' ' + className : '')
      }
    >
      {children}
    </span>
  )
}

export default Badge