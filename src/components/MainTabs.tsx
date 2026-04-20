'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MainTabs() {
  const pathname = usePathname()
  const tabs = [
    { href: '/', label: 'Home' },
    { href: '/global', label: 'Global' },
    { href: '/trending', label: 'Trending' },
    { href: '/blog', label: 'Blog' },
  ]

  return (
    <div className="border-b border-gray-100 sticky top-0 bg-white z-30">
      <div className="flex w-full">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 text-center py-4 border-b-2 transition-all duration-200 ${isActive
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <span className="text-sm sm:text-base">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
