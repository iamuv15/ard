'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export function CreateChapterForm() {
  const [name, setName] = useState('')
  const [cohort, setCohort] = useState('BETA')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setStatus(null)

    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim(), cohort }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus({ type: 'success', message: `Chapter "${data.chapter.name}" created successfully!` })
        setName('')
        router.refresh()
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to create chapter' })
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="newChapterName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            New Chapter Name
          </label>
          <input
            type="text"
            id="newChapterName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Biology 101"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="cohortSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Assign To (Cohort)
          </label>
          <select
            id="cohortSelect"
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="BETA">Everyone (Beta & Alpha)</option>
            <option value="ALPHA">Alpha Only</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="flex items-center justify-center w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusCircle className="w-5 h-5 mr-2" />
              Create Chapter
            </>
          )}
        </button>
      </div>

      {status && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}
    </form>
  )
}
