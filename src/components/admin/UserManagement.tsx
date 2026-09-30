'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type User = {
  id: number
  name: string
  email: string
  cohort: string
}

export function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const router = useRouter()

  const toggleCohort = async (userId: number, currentCohort: string) => {
    setUpdatingId(userId)
    const newCohort = currentCohort === 'BETA' ? 'ALPHA' : 'BETA'
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cohort: newCohort })
      })
      
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, cohort: newCohort } : u))
        router.refresh()
      }
    } catch (e) {
      console.error('Failed to update user', e)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Cohort (Access)</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b dark:border-gray-700 bg-white dark:bg-gray-800">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{user.name}</td>
              <td className="px-4 py-3">{user.email}</td>
              <td className="px-4 py-3">
                {user.cohort === 'ALPHA' ? (
                  <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-purple-900 dark:text-purple-300">
                    ALPHA (All Content)
                  </span>
                ) : (
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                    BETA (Beta Only)
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => toggleCohort(user.id, user.cohort)}
                  disabled={updatingId === user.id}
                  className="px-3 py-1.5 text-xs font-medium text-center text-white bg-gray-800 rounded-lg hover:bg-gray-900 focus:ring-4 focus:outline-none focus:ring-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800 disabled:opacity-50"
                >
                  {updatingId === user.id ? 'Updating...' : `Switch to ${user.cohort === 'BETA' ? 'ALPHA' : 'BETA'}`}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
