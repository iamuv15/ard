import React from 'react'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import {
  Headphones,
  ArrowLeft,
  Sparkles,
  Zap,
  Radio,
  Clock,
  HardDrive,
  ShieldCheck,
  Layers
} from 'lucide-react'
import { AudioHubClient, ChapterAudioSummary } from './AudioHubClient'

export const dynamic = 'force-dynamic'

export default async function AdminAudioMasterclassesHubPage() {
  const chaptersRaw = await prisma.chapter.findMany({
    include: {
      audioTracks: {
        select: {
          id: true,
          durationSec: true,
          fileSizeBytes: true
        }
      },
      concepts: {
        select: {
          id: true,
          audioTrackId: true
        }
      },
      quizzes: {
        select: {
          _count: {
            select: { questions: true }
          }
        }
      }
    },
    orderBy: { id: 'asc' }
  })

  const chapters: ChapterAudioSummary[] = chaptersRaw.map(ch => {
    const totalConcepts = ch.concepts.length
    const coveredConcepts = ch.concepts.filter(c => c.audioTrackId !== null).length
    const pendingConcepts = ch.concepts.filter(c => c.audioTrackId === null).length
    const coveragePercent = totalConcepts > 0 ? Math.round((coveredConcepts / totalConcepts) * 100) : 0
    const tracksCount = ch.audioTracks.length
    const durationSec = ch.audioTracks.reduce((acc, t) => acc + (t.durationSec || 0), 0)
    const storageBytes = ch.audioTracks.reduce((acc, t) => acc + (t.fileSizeBytes || 0), 0)
    const totalQuestions = ch.quizzes.reduce((acc, q) => acc + q._count.questions, 0)

    return {
      id: ch.id,
      name: ch.name,
      cohort: ch.cohort || 'BETA',
      totalQuestions,
      totalConcepts,
      coveredConcepts,
      pendingConcepts,
      coveragePercent,
      tracksCount,
      durationSec,
      storageBytes
    }
  })

  const globalStats = {
    totalChapters: chapters.length,
    totalConcepts: chapters.reduce((acc, c) => acc + c.totalConcepts, 0),
    totalCoveredConcepts: chapters.reduce((acc, c) => acc + c.coveredConcepts, 0),
    totalTracks: chapters.reduce((acc, c) => acc + c.tracksCount, 0),
    totalDurationSec: chapters.reduce((acc, c) => acc + c.durationSec, 0),
    totalStorageBytes: chapters.reduce((acc, c) => acc + c.storageBytes, 0)
  }

  const overallCoverage = globalStats.totalConcepts > 0
    ? Math.round((globalStats.totalCoveredConcepts / globalStats.totalConcepts) * 100)
    : 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <Link 
          href="/admin" 
          className="inline-flex items-center text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Dashboard
        </Link>

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-500/30 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>Bulk Audio Masterclasses Studio</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                AI Audio Masterclasses Hub
              </h1>
              <p className="text-sm text-purple-200/80 leading-relaxed font-medium">
                Synthesize high-yield conversational podcast masterclasses in Devanagari Hinglish. Ultra-compressed 32 kbps Opus audio encoded in-memory and deployed to Supabase CDN.
              </p>
            </div>

            {/* Quick Engine Spec Badges */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-purple-200/70">Engine:</span>
                <span className="font-bold text-white">Gemini 3.8 Flash-Lite TTS</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-purple-200/70">Speakers:</span>
                <span className="font-bold text-emerald-300">Aoede & Fenrir (Hinglish)</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-purple-200/70">Format:</span>
                <span className="font-bold text-amber-300">Opus Mono 32 kbps (~1.2 MB)</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-purple-200/70">Fallback Chain:</span>
                <span className="font-bold text-purple-200">Free #1–#4 → Paid Key</span>
              </div>
            </div>
          </div>

          {/* Global Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-purple-500/30">
            <div className="bg-purple-950/40 rounded-xl p-3 border border-purple-500/20">
              <div className="text-[11px] font-semibold text-purple-300">Total Masterclasses</div>
              <div className="text-xl font-black mt-0.5 text-white">{globalStats.totalTracks} Tracks</div>
            </div>
            <div className="bg-purple-950/40 rounded-xl p-3 border border-purple-500/20">
              <div className="text-[11px] font-semibold text-purple-300">Concepts Covered</div>
              <div className="text-xl font-black mt-0.5 text-emerald-400">
                {globalStats.totalCoveredConcepts} <span className="text-xs text-slate-300 font-normal">/ {globalStats.totalConcepts} ({overallCoverage}%)</span>
              </div>
            </div>
            <div className="bg-purple-950/40 rounded-xl p-3 border border-purple-500/20">
              <div className="text-[11px] font-semibold text-purple-300">Total Audio Time</div>
              <div className="text-xl font-black mt-0.5 text-amber-400">
                {(globalStats.totalDurationSec / 60).toFixed(0)} <span className="text-xs text-slate-300 font-normal">minutes</span>
              </div>
            </div>
            <div className="bg-purple-950/40 rounded-xl p-3 border border-purple-500/20">
              <div className="text-[11px] font-semibold text-purple-300">Storage Used</div>
              <div className="text-xl font-black mt-0.5 text-indigo-300">
                {(globalStats.totalStorageBytes / (1024 * 1024)).toFixed(1)} <span className="text-xs text-slate-300 font-normal">MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chapter List & Filter */}
        <AudioHubClient chapters={chapters} globalStats={globalStats} />
      </div>
    </div>
  )
}
