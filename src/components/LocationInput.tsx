'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, X, Search, Loader2 } from 'lucide-react'

interface LocationSuggestion {
  display_name: string
  lat: string
  lon: string
  place_id: number
}

interface LocationInputProps {
  onSelect: (location: { name: string; lat: number; lng: number } | null) => void
  initialValue?: string
}

export default function LocationInput({ onSelect, initialValue }: LocationInputProps) {
  const [query, setQuery] = useState(initialValue || '')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(initialValue || null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length < 3 || selectedLocation === query) {
      setSuggestions([])
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
        )
        const data = await response.json()
        setSuggestions(data)
        setShowSuggestions(true)
      } catch (error) {
        console.error('Error fetching locations:', error)
      } finally {
        setLoading(false)
      }
    }, 600)

    return () => clearTimeout(delayDebounceFn)
  }, [query, selectedLocation])

  const handleSelect = (suggestion: LocationSuggestion) => {
    const loc = {
      name: suggestion.display_name,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    }
    setQuery(suggestion.display_name)
    setSelectedLocation(suggestion.display_name)
    setSuggestions([])
    setShowSuggestions(false)
    onSelect(loc)
  }

  const clearLocation = () => {
    setQuery('')
    setSelectedLocation(null)
    onSelect(null)
    setSuggestions([])
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-xs font-black text-gray-300 mb-2 uppercase tracking-[0.2em]">
        Add Location
      </label>
      <div className="relative flex items-center group">
        <MapPin className={`absolute left-0 w-5 h-5 transition-colors ${selectedLocation ? 'text-primary' : 'text-gray-300'}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Where are you yapping from?"
          className="w-full py-2 pl-7 pr-10 border-0 focus:border-transparent focus:ring-0 outline-none bg-transparent text-lg text-gray-900 placeholder:text-gray-200 font-medium"
        />
        {loading && <Loader2 className="absolute right-0 w-4 h-4 text-gray-400 animate-spin" />}
        {selectedLocation && !loading && (
          <button
            type="button"
            onClick={clearLocation}
            className="absolute right-0 p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[60] mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
          <div className="py-2">
            {suggestions.map((s) => (
              <button
                key={s.place_id}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full flex items-start gap-3 p-3 px-4 hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="mt-0.5 p-1.5 bg-gray-50 rounded-lg group-hover:bg-primary/10 transition-colors">
                  <MapPin className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 truncate">{s.display_name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
