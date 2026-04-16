import React, { useState, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * TagInput — reusable free-type tag input
 * - Press Enter or comma to add a tag
 * - Click X to remove a specific tag
 * - Backspace on empty input removes last tag
 * - No fixed list — accepts anything
 *
 * Props:
 *   tags        {string[]}  — current tags array
 *   onChange    {fn}        — called with new tags array on every change
 *   placeholder {string}    — input placeholder text
 *   disabled    {boolean}   — disable all interaction
 *   maxTags     {number}    — optional max number of tags
 *   colorScheme {string}    — 'indigo' | 'green' | 'violet' (default: 'indigo')
 */
const TagInput = ({
  tags = [],
  onChange,
  placeholder = 'Type and press Enter to add...',
  disabled = false,
  maxTags = null,
  colorScheme = 'indigo'
}) => {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  const colors = {
    indigo: {
      tag:    'bg-indigo-100 text-indigo-800 border-indigo-200',
      x:      'hover:bg-indigo-200 text-indigo-500',
      ring:   'focus-within:ring-indigo-500 focus-within:border-indigo-500'
    },
    green: {
      tag:    'bg-green-100 text-green-800 border-green-200',
      x:      'hover:bg-green-200 text-green-500',
      ring:   'focus-within:ring-green-500 focus-within:border-green-500'
    },
    violet: {
      tag:    'bg-violet-100 text-violet-800 border-violet-200',
      x:      'hover:bg-violet-200 text-violet-500',
      ring:   'focus-within:ring-violet-500 focus-within:border-violet-500'
    }
  }

  const c = colors[colorScheme] || colors.indigo

  const addTag = (value) => {
    const trimmed = value.trim().replace(/,$/, '').trim()
    if (!trimmed) return
    if (tags.map((t) => t.toLowerCase()).includes(trimmed.toLowerCase())) return
    if (maxTags && tags.length >= maxTags) return
    onChange([...tags, trimmed])
    setInputValue('')
  }

  const removeTag = (index) => {
    const updated = tags.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const handleChange = (e) => {
    const val = e.target.value
    // Auto-add if user types a comma
    if (val.endsWith(',')) {
      addTag(val)
    } else {
      setInputValue(val)
    }
  }

  const handleBlur = () => {
    // Add whatever is typed when focus leaves
    if (inputValue.trim()) addTag(inputValue)
  }

  const isAtMax = maxTags && tags.length >= maxTags

  return (
    <div
      onClick={() => !disabled && inputRef.current?.focus()}
      className={`min-h-[42px] w-full flex flex-wrap gap-2 items-center px-3 py-2 border border-gray-300 rounded-lg bg-white cursor-text transition-all duration-150 focus-within:ring-2 focus-within:ring-offset-0 ${c.ring} ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}`}
    >
      {tags.map((tag, index) => (
        <span
          key={index}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.tag}`}
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(index) }}
              className={`rounded-full p-0.5 transition-colors ${c.x}`}
              aria-label={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}

      {!isAtMax && (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[140px] outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent disabled:cursor-not-allowed"
        />
      )}

      {isAtMax && (
        <span className="text-xs text-gray-400 italic">Max {maxTags} tags reached</span>
      )}
    </div>
  )
}

export default TagInput