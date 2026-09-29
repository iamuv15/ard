import { UploadForm } from '@/components/UploadForm'
import prisma from '@/lib/prisma'
import LogOutButton from '@/components/LogOutButton'
import { ChapterList } from '@/components/admin/ChapterList'
import { CreateChapterForm } from '@/components/admin/CreateChapterForm'

export default async function AdminDashboard() {
  const count = await prisma.question.count()
  
  const chapters = await prisma.chapter.findMany({
    include: {
      quizzes: {
        include: {
          _count: {
            select: { questions: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <LogOutButton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-2">Database Stats</h2>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{count}</p>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Total questions loaded</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4">1. Create Chapter</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Create a container for your quizzes.
              </p>
              <CreateChapterForm />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4">2. Upload Quizzes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Select a chapter, define questions per quiz, and upload multiple Excel files.
            </p>
            <UploadForm chapters={chapters.map((c: any) => ({ id: c.id, name: c.name }))} />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-6">Manage Content</h2>
          <ChapterList initialChapters={chapters} />
        </div>
      </div>
    </div>
  )
}
