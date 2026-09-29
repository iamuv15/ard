'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, Loader2, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'

export function UploadForm({ chapters }: { chapters: { id: number, name: string }[] }) {
  const [files, setFiles] = useState<File[]>([])
  const [chapterId, setChapterId] = useState<string>('')
  const [chunkSize, setChunkSize] = useState<string>('40')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files))
      setStatus(null)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0 || !chapterId) return

    setLoading(true)
    setStatus(null)

    const formData = new FormData()
    formData.append('chapterId', chapterId)
    formData.append('chunkSize', chunkSize)
    
    files.forEach(file => {
      formData.append('files', file)
    })

    try {
      const res = await fetch('/api/questions/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setStatus({ type: 'success', message: `Successfully loaded ${data.count} questions into ${data.quizCount} quizzes!` })
        setFiles([])
        if (fileInputRef.current) fileInputRef.current.value = ''
        router.refresh()
      } else {
        setStatus({ type: 'error', message: data.error || 'Upload failed' })
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="chapterSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target Chapter
          </label>
          <select
            id="chapterSelect"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          >
            <option value="" disabled>Select a Chapter...</option>
            {chapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="chunkSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Questions per Quiz (Chunk Size)
          </label>
          <input
            type="number"
            id="chunkSize"
            value={chunkSize}
            onChange={(e) => setChunkSize(e.target.value)}
            min="1"
            placeholder="e.g. 40"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">Leave as 40 or empty to keep it default.</p>
        </div>

        <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-500 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            multiple
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <UploadCloud className="w-10 h-10 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {files.length > 0 ? `${files.length} file(s) selected` : 'Click to select multiple Excel files'}
            </p>
            {files.length > 0 && (
              <div className="mt-2 text-left w-full max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <FileSpreadsheet className="w-3 h-3 mr-1" />
                    {f.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={files.length === 0 || !chapterId || loading}
          className="flex items-center justify-center w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Quizzes'
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
