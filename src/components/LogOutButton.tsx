'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'

export default function LogOutButton() {
  const [loading, setLoading] = useState(false)
  const [isHub, setIsHub] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const host = window.location.hostname
    setIsHub(host === 'liveshala.com' || host === 'www.liveshala.com')
  }, [])

  const handleLogout = async () => {
    if (loading) return
    setLoading(true)
    try {
      await fetch('/ard/api/auth/logout', { method: 'POST' })
      router.push('/')
      router.refresh()
    } catch {
      setLoading(false)
    }
  }

  if (isHub) {
    return (
      <a
        href="/"
        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors shadow-xs"
      >
        ← Back to Liveshala
      </a>
    )
  }

  return (
    <button
      type="button"
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
