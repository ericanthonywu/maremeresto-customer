import React, { useState, useRef, useEffect } from 'react'

interface FeedbackReasonInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  suggestions: string[]
  chips?: string[]
  maxLength?: number
  label?: string
}

export const FeedbackReasonInput: React.FC<FeedbackReasonInputProps> = ({
  value,
  onChange,
  placeholder = 'Tuliskan alasan atau pilih saran di bawah...',
  suggestions,
  chips = [],
  maxLength = 500,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter suggestions based on current input text
  const trimmed = value.trim().toLowerCase()
  const filteredSuggestions = suggestions.filter((item) => {
    if (!trimmed) return true
    return item.toLowerCase().includes(trimmed) && item.toLowerCase() !== trimmed
  }).slice(0, 6)

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion)
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleChipClick = (chip: string) => {
    if (!value.trim()) {
      onChange(chip)
      return
    }

    // If already contains this chip, don't duplicate; toggle it off
    const parts = value.split(',').map((p) => p.trim()).filter(Boolean)
    const existsIndex = parts.findIndex((p) => p.toLowerCase() === chip.toLowerCase())
    if (existsIndex >= 0) {
      parts.splice(existsIndex, 1)
      onChange(parts.join(', '))
    } else {
      onChange(`${value.trim()}, ${chip}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault()
        handleSelectSuggestion(filteredSuggestions[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Helper to highlight matching text in suggestion
  const renderHighlighted = (text: string) => {
    if (!trimmed) return text
    const idx = text.toLowerCase().indexOf(trimmed)
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-extrabold text-brand-700 bg-amber-100/80 rounded px-0.5">
          {text.slice(idx, idx + trimmed.length)}
        </span>
        {text.slice(idx + trimmed.length)}
      </>
    )
  }

  return (
    <div className="space-y-2 text-left" ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-bold text-stone-600">
          {label}
        </label>
      )}

      {/* Autocomplete Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <i
            className="fa-solid fa-pen text-[11px] text-stone-400 absolute left-3 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            maxLength={maxLength}
            onChange={(e) => {
              onChange(e.target.value)
              setIsOpen(true)
              setHighlightedIndex(-1)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-8 pr-8 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white text-stone-800 placeholder:text-stone-400 transition-colors"
          />
          {value && (
            <button
              type="button"
              aria-label="Hapus teks"
              onClick={() => {
                onChange('')
                setIsOpen(false)
                inputRef.current?.focus()
              }}
              className="absolute right-2.5 w-5 h-5 flex items-center justify-center text-stone-400 hover:text-stone-600 text-[11px] rounded-full hover:bg-stone-200/60"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Autocomplete suggestions dropdown */}
        {isOpen && filteredSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-amber-200/80 rounded-2xl shadow-xl z-30 overflow-hidden max-h-52 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800/80 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-wand-magic-sparkles text-[9px] text-brand-600" aria-hidden="true" />
                Saran Alasan (Autocomplete)
              </span>
              <span className="text-[9px] text-stone-400 font-normal">Klik untuk memilih</span>
            </div>
            {filteredSuggestions.map((item, i) => {
              const isSelected = i === highlightedIndex
              return (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault() // prevent input blur
                    handleSelectSuggestion(item)
                  }}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors ${
                    isSelected ? 'bg-amber-100/70 text-brand-900 font-semibold' : 'text-stone-700 hover:bg-amber-50/60'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <i className="fa-regular fa-comment-dots text-[11px] text-amber-500 shrink-0" aria-hidden="true" />
                    <span className="truncate">{renderHighlighted(item)}</span>
                  </span>
                  <i className="fa-solid fa-plus text-[10px] text-stone-400 shrink-0" aria-hidden="true" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      {chips.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-stone-500 font-semibold flex items-center gap-1">
            <i className="fa-solid fa-bolt text-amber-500 text-[10px]" aria-hidden="true" />
            Pilihan cepat:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => {
              const isActive = value.toLowerCase().includes(chip.toLowerCase())
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 border ${
                    isActive
                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <i
                    className={`fa-solid ${isActive ? 'fa-check text-brand-600' : 'fa-plus text-stone-400'} text-[9px]`}
                    aria-hidden="true"
                  />
                  <span>{chip}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
