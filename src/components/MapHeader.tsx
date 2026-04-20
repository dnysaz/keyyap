'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

interface MapHeaderProps {
  lat: number
  lng: number
  locationName: string
}

export default function MapHeader({ lat, lng, locationName }: MapHeaderProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  const initMap = () => {
    if (typeof window === 'undefined' || !window.L || !mapRef.current) return
    if (mapInstance.current) return

    const L = window.L
    // Initialize map
    mapInstance.current = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 10,
      scrollWheelZoom: false,
    })

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance.current)

    // Add Marker
    L.marker([lat, lng])
      .addTo(mapInstance.current)
      .bindPopup(`<b>${locationName.split(',')[0]}</b>`)
      .openPopup()
  }

  // Effect to handle script load
  useEffect(() => {
    if (window.L) {
      initMap()
    }
  }, [lat, lng])

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossOrigin=""
        onLoad={initMap}
      />
      
      <div className="relative w-full h-[300px] border-b border-gray-100 bg-gray-50 overflow-hidden max-w-full">
        <div ref={mapRef} className="w-full h-full z-0" />
        
        {/* Overlay info */}
        <div className="absolute bottom-4 left-4 right-4 z-10 overflow-hidden">
          <div className="bg-white/90 backdrop-blur-md p-3 px-4 rounded-2xl shadow-xl flex items-start gap-2 border border-white/50 animate-in slide-in-from-bottom-2 duration-500 max-w-full">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse mt-1.5 shrink-0" />
            <span className="text-sm font-bold text-gray-900 break-words whitespace-normal min-w-0">{locationName}</span>
          </div>
        </div>
      </div>
    </>
  )
}

declare global {
  interface Window {
    L: any
  }
}
