'use client'

export default function FeedHeader() {
  return (
    <div className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-[53px] z-30">
      <div className="px-4 py-3">
        <h1 className="text-xl font-bold">KeyYap!</h1>
        <p className="text-sm text-gray-500">The good place for yapping.</p>
      </div>
    </div>
  )
}