'use client'

import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'

export default function LogOutButton() {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    if (loading) return
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/'
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
      title="Sign out of your account"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" /> : <LogOut className="w-3.5 h-3.5 text-gray-500" />}
      <span>Logout</span>
    </button>
  )
}
