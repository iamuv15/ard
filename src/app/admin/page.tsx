import { UploadForm } from '@/components/UploadForm'
import prisma from '@/lib/prisma'
import LogOutButton from '@/components/LogOutButton'
import { ChapterList } from '@/components/admin/ChapterList'
import { CreateChapterForm } from '@/components/admin/CreateChapterForm'
import { UserManagement } from '@/components/admin/UserManagement'
import { QuestionReportsHub } from '@/components/admin/QuestionReportsHub'
import Link from 'next/link'
import { Brain, ArrowRight, Headphones } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const count = await prisma.question.count()
  
  const chapters = await prisma.chapter.findMany({
    include: {
      quizzes: {
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: [{ order: 'asc' }, { id: 'asc' }]
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, cohort: true, role: true },
    where: { role: 'USER' },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <LogOutButton />
        </div>

        {/* Dedicated Mind Map & Terminology Management Hub Banner */}
        <Link
          href="/admin/mindmaps"
          className="group block p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-sm hover:shadow-md transition-all border border-emerald-500/20"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-white/10 backdrop-blur-sm rounded-2xl text-white">
                <Brain className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-emerald-100">
                  New Admin Feature
                </div>
                <h2 className="text-xl font-black tracking-tight">
                  Chapter Mind Maps & Terminology Hub
                </h2>
                <p className="text-sm text-emerald-100 font-medium">
                  Manage chapter taxonomies with 10k Gemini reasoning tokens and generate high-yield concept capsules across all chapters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center px-4 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-xs shadow-xs group-hover:bg-emerald-50 transition-colors whitespace-nowrap">
              <span>Open Mind Maps Hub</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Dedicated Audio Masterclasses Studio Banner */}
        <Link
          href="/admin/audio"
          className="group block p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white shadow-sm hover:shadow-md transition-all border border-purple-500/30"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-purple-500/20 backdrop-blur-sm rounded-2xl text-purple-300 border border-purple-500/30">
                <Headphones className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  🎙️ AI Audio Masterclasses & Bulk Studio
                </div>
                <h2 className="text-xl font-black tracking-tight">
                  Chapter Audio Masterclasses & Bulk Automation
                </h2>
                <p className="text-sm text-purple-200/80 font-medium">
                  Batch synthesize multi-speaker Devanagari Hinglish masterclasses with Gemini 3.8 Flash-Lite and ultra-compressed Opus 32 kbps streaming.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center px-4 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-xs shadow-xs group-hover:bg-purple-400 transition-colors whitespace-nowrap">
              <span>Open Bulk Audio Studio</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Question Quality & Corrections Hub (Two Queues) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>Question Quality & Corrections</span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track questions marked as incorrect. High-confidence AI fixes are auto-corrected into the database and logged in the Auto-Corrected Queue for audit/rollback. Uncertain cases are routed to the Manual Verification Queue.
            </p>
          </div>
          <QuestionReportsHub />
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
              Select a chapter and upload multiple JSON, Excel, or HTML files.
            </p>
            <UploadForm chapters={chapters.map((c: any) => ({ id: c.id, name: c.name }))} />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-6">Manage Content</h2>
          <ChapterList initialChapters={chapters} />
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-6">Manage Users</h2>
          <UserManagement initialUsers={users} />
        </div>
      </div>
    </div>
  )
}

