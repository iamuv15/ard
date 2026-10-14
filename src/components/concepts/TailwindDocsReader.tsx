'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ImageIcon,
  Play,
  ExternalLink,
  Flag,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileQuestion,
  BookOpen,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  Upload,
  Trash2,
  PlusCircle,
  Link2,
  AlertCircle,
  Check
} from 'lucide-react'
import { FormattedExplanation } from '@/components/FormattedExplanation'

export interface ConceptSummaryItem {
  id: number
  term: string
  slug: string
  category: string
  subCategory?: string | null
  definition?: string | null
  examTraps?: string | null
  imageUrl?: string | null
  thumbnailUrl?: string | null
  imageCaption?: string | null
  videoUrl?: string | null
  _count?: { questions: number }
}

interface MindMapCategory {
  name: string
  description?: string
  subCategories: {
    name: string
    keywords: string[]
  }[]
}

interface TailwindDocsReaderProps {
  chapterId: number
  chapterName: string
  categories: MindMapCategory[]
  allConcepts: ConceptSummaryItem[]
  totalQuestions: number
}

interface ConceptFullDetail {
  id: number
  term: string
  slug: string
  category: string
  subCategory?: string | null
  definition: string
  content: string
  examTraps?: string | null
  relatedTerms: string[]
  imageUrl?: string | null
  thumbnailUrl?: string | null
  imageCaption?: string | null
  sourceUrl?: string | null
  videoUrl?: string | null
  questions?: {
    id: number
    questionText: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    optionE?: string | null
    correctAnswer: string
    explanation?: string | null
    simpleExplanation?: string | null
  }[]
}

export function TailwindDocsReader({
  chapterId,
  chapterName,
  categories,
  allConcepts,
  totalQuestions
}: TailwindDocsReaderProps) {
  // Ordered flat list of all concept items
  const flattenedConcepts = useMemo(() => {
    const list: ConceptSummaryItem[] = []
    const conceptMap = new Map<string, ConceptSummaryItem>()
    allConcepts.forEach(c => conceptMap.set(c.term.toLowerCase().trim(), c))

    categories.forEach(cat => {
      cat.subCategories.forEach(sub => {
        sub.keywords.forEach(kw => {
          const found = conceptMap.get(kw.toLowerCase().trim())
          if (found) {
            list.push(found)
          } else {
            list.push({
              id: -(list.length + 1),
              term: kw,
              slug: kw.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'),
              category: cat.name,
              subCategory: sub.name,
              definition: `Key technical concept for ${sub.name}.`,
              _count: { questions: 0 }
            })
          }
        })
      })
    })

    return list.length > 0 ? list : allConcepts
  }, [categories, allConcepts])

  // Active concept slug state
  const [activeSlug, setActiveSlug] = useState<string>(
    flattenedConcepts[0]?.slug || ''
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Collapsible Sidebar States
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})
  const [collapsedSubCategories, setCollapsedSubCategories] = useState<Record<string, boolean>>({})

  // Detailed data for active concept
  const [conceptDetail, setConceptDetail] = useState<ConceptFullDetail | null>(null)
  const [galleryImages, setGalleryImages] = useState<Array<{ url: string; title: string; sourceUrl?: string }>>([])
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [precisionVideo, setPrecisionVideo] = useState<{
    videoUrl: string
    searchUrl?: string
    embedUrl: string | null
    videoId?: string | null
    thumbnailUrl?: string | null
    videoCaption: string
  } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // In-line interactive quiz state
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [revealedExplanations, setRevealedExplanations] = useState<Record<number, boolean>>({})

  // Flag Report State
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportReason, setReportReason] = useState('Inaccurate entity / image')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)

  // Community Image Contribution & Removal State
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [mediaTab, setMediaTab] = useState<'url' | 'upload'>('url')
  const [inputImageUrl, setInputImageUrl] = useState('')
  const [inputCaption, setInputCaption] = useState('')
  const [inputSourceUrl, setInputSourceUrl] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadFilePreview, setUploadFilePreview] = useState<string | null>(null)
  const [mediaSubmitting, setMediaSubmitting] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [mediaSuccess, setMediaSuccess] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deletingImage, setDeletingImage] = useState(false)

  // E-commerce Image Zoom State & Lightbox
  const [imageZoom, setImageZoom] = useState<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 50,
    y: 50
  })
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    setImageZoom({ active: true, x, y })
  }

  const handleImageMouseLeave = () => {
    setImageZoom({ active: false, x: 50, y: 50 })
  }

  // Current active concept summary
  const activeSummary = useMemo(() => {
    return (
      flattenedConcepts.find(c => c.slug === activeSlug) ||
      flattenedConcepts[0]
    )
  }, [flattenedConcepts, activeSlug])

  const currentIndex = useMemo(() => {
    return flattenedConcepts.findIndex(c => c.slug === activeSummary?.slug)
  }, [flattenedConcepts, activeSummary])

  // Automatically expand parent Category and SubCategory of the active concept
  useEffect(() => {
    if (activeSummary?.category) {
      setCollapsedCategories(prev => ({ ...prev, [activeSummary.category]: false }))
    }
    if (activeSummary?.subCategory) {
      setCollapsedSubCategories(prev => ({ ...prev, [activeSummary.subCategory!]: false }))
    }
  }, [activeSummary])

  const toggleCategory = (catName: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catName]: !prev[catName] }))
  }

  const toggleSubCategory = (subName: string) => {
    setCollapsedSubCategories(prev => ({ ...prev, [subName]: !prev[subName] }))
  }

  const handleCollapseAll = () => {
    const allSubs: Record<string, boolean> = {}
    categories.forEach(c => c.subCategories.forEach(s => { allSubs[s.name] = true }))
    setCollapsedSubCategories(allSubs)
  }

  const handleExpandAll = () => {
    setCollapsedSubCategories({})
    setCollapsedCategories({})
  }

  // Fetch full details whenever activeSlug changes
  useEffect(() => {
    if (!activeSlug) return

    let cancelled = false
    setLoadingDetail(true)
    setUserAnswers({})
    setRevealedExplanations({})
    setActiveImageIdx(0)

    const url = `/api/concepts/${encodeURIComponent(activeSlug)}?chapterId=${chapterId}`
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.concept) {
          setConceptDetail(data.concept)
          setGalleryImages(data.galleryImages || [])
          setPrecisionVideo(data.precisionVideo || null)
        }
      })
      .catch(err => console.error('Failed to load concept detail', err))
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeSlug, chapterId])

  // Keyboard navigation (Left / Right arrow to navigate between concepts, Escape to close modals)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape') {
        if (lightboxOpen) {
          setLightboxOpen(false)
          return
        }
        if (reportModalOpen) {
          setReportModalOpen(false)
          return
        }
      }

      if (lightboxOpen || reportModalOpen) return

      if (e.key === 'ArrowRight' && currentIndex < flattenedConcepts.length - 1) {
        setActiveSlug(flattenedConcepts[currentIndex + 1].slug)
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setActiveSlug(flattenedConcepts[currentIndex - 1].slug)
      }
    },
    [currentIndex, flattenedConcepts, lightboxOpen, reportModalOpen]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // In-line quiz option select
  const handleSelectOption = (questionId: number, optKey: string) => {
    if (userAnswers[questionId]) return // Locked once answered
    setUserAnswers(prev => ({ ...prev, [questionId]: optKey }))
    setRevealedExplanations(prev => ({ ...prev, [questionId]: true }))
  }

  // Submit media report
  const handleSendReport = async () => {
    if (!conceptDetail) return
    try {
      setReportSubmitting(true)
      const res = await fetch('/api/reports/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: conceptDetail.id,
          reportedUrl: galleryImages[activeImageIdx]?.url || conceptDetail.imageUrl,
          reason: reportReason,
          details: 'Reported from 3-Column Docs Reader'
        })
      })
      if (res.ok) {
        setReportSuccess(true)
        setTimeout(() => {
          setReportModalOpen(false)
          setReportSuccess(false)
        }, 1500)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setReportSubmitting(false)
    }
  }

  // Validate image URL format on client
  const isUrlValid = useMemo(() => {
    if (!inputImageUrl.trim()) return false
    const trimmed = inputImageUrl.trim().toLowerCase()
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false
    const exts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp']
    const hasExt = exts.some(e => trimmed.split('?')[0].endsWith(e))
    const isCdn = ['wikimedia.org', 'imgur.com', 'unsplash.com', 'cloudinary.com', 'githubusercontent.com'].some(d => trimmed.includes(d))
    return hasExt || isCdn
  }, [inputImageUrl])

  const handleOpenAddImage = () => {
    setInputImageUrl('')
    setInputCaption(`${activeSummary?.term || ''} reference photo`)
    setInputSourceUrl('')
    setUploadFile(null)
    setUploadFilePreview(null)
    setMediaError(null)
    setMediaSuccess(null)
    setMediaModalOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'].includes(file.type)) {
        setMediaError('Only JPEG, PNG, WebP, GIF, or SVG images are supported.')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setMediaError('Image file must be under 10MB.')
        return
      }
      setMediaError(null)
      setUploadFile(file)
      const previewUrl = URL.createObjectURL(file)
      setUploadFilePreview(previewUrl)
    }
  }

  const handleSaveCommunityImage = async () => {
    if (!activeSummary) return
    setMediaSubmitting(true)
    setMediaError(null)

    try {
      let resData: any = null

      if (mediaTab === 'url') {
        if (!isUrlValid) {
          setMediaError('Please enter a valid image URL ending with .jpg, .jpeg, .png, .webp, .gif, or .svg')
          setMediaSubmitting(false)
          return
        }

        const res = await fetch(`/api/concepts/${encodeURIComponent(activeSummary.slug)}/image?chapterId=${chapterId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: inputImageUrl.trim(),
            imageCaption: inputCaption.trim() || activeSummary.term,
            sourceUrl: inputSourceUrl.trim() || undefined
          })
        })
        resData = await res.json()
        if (!res.ok) throw new Error(resData?.error || 'Failed to update image')
      } else {
        if (!uploadFile) {
          setMediaError('Please select an image file to upload')
          setMediaSubmitting(false)
          return
        }

        const formData = new FormData()
        formData.append('file', uploadFile)
        formData.append('caption', inputCaption.trim() || activeSummary.term)
        if (inputSourceUrl.trim()) formData.append('sourceUrl', inputSourceUrl.trim())

        const res = await fetch(`/api/concepts/${encodeURIComponent(activeSummary.slug)}/image?chapterId=${chapterId}`, {
          method: 'POST',
          body: formData
        })
        resData = await res.json()
        if (!res.ok) throw new Error(resData?.error || 'Failed to upload image')
      }

      if (resData?.concept) {
        setConceptDetail(prev => prev ? {
          ...prev,
          imageUrl: resData.concept.imageUrl,
          thumbnailUrl: resData.concept.thumbnailUrl,
          imageCaption: resData.concept.imageCaption,
          sourceUrl: resData.concept.sourceUrl
        } : prev)

        setGalleryImages([
          {
            url: resData.concept.imageUrl,
            title: resData.concept.imageCaption || activeSummary.term,
            sourceUrl: resData.concept.sourceUrl || undefined
          }
        ])
        setActiveImageIdx(0)
        setMediaSuccess('Image successfully updated!')
        setTimeout(() => {
          setMediaModalOpen(false)
          setMediaSuccess(null)
        }, 1200)
      }
    } catch (err: any) {
      setMediaError(err.message || 'Error saving image')
    } finally {
      setMediaSubmitting(false)
    }
  }

  const handleRemoveImage = async () => {
    if (!activeSummary) return
    setDeletingImage(true)
    try {
      const res = await fetch(`/api/concepts/${encodeURIComponent(activeSummary.slug)}/image?chapterId=${chapterId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setConceptDetail(prev => prev ? {
          ...prev,
          imageUrl: null,
          thumbnailUrl: null,
          imageCaption: null,
          sourceUrl: null
        } : prev)
        setGalleryImages([])
        setActiveImageIdx(0)
        setConfirmDeleteOpen(false)
      }
    } catch (err) {
      console.error('Failed to remove image', err)
    } finally {
      setDeletingImage(false)
    }
  }

  // Filtered categories and keywords in left sidebar
  const filteredNavCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories

    const q = searchQuery.toLowerCase().trim()
    return categories
      .map(cat => {
        const matchingSub = cat.subCategories
          .map(sub => {
            const matchingKeywords = sub.keywords.filter(kw =>
              kw.toLowerCase().includes(q)
            )
            return { ...sub, keywords: matchingKeywords }
          })
          .filter(sub => sub.keywords.length > 0)

        return { ...cat, subCategories: matchingSub }
      })
      .filter(cat => cat.subCategories.length > 0)
  }, [categories, searchQuery])

  const activeImage = galleryImages[activeImageIdx] || (conceptDetail?.imageUrl ? {
    url: conceptDetail.imageUrl,
    title: conceptDetail.imageCaption || conceptDetail.term,
    sourceUrl: conceptDetail.sourceUrl || undefined
  } : null)

  return (
    <div className="h-screen w-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* 1. TOP NAVBAR (Tailwind Docs Style) */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Toggle Sidebar Collapse Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={sidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>

          <Link
            href={`/chapter/${chapterId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Chapter Quizzes</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 dark:border-slate-800" />

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
              Exam Documentation
            </span>
            <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
              {chapterName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 hidden md:inline">
            {flattenedConcepts.length} Concepts • {totalQuestions} MCQs
          </span>

          <Link
            href={`/chapter/${chapterId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
          >
            <FileQuestion className="w-3.5 h-3.5" />
            <span>Practice Chapter Quizzes</span>
          </Link>
        </div>
      </header>

      {/* 2. BODY 3-COLUMN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* ======================================================== */}
        {/* COLUMN 1: LEFT SIDEBAR (Classification Taxonomy Links)   */}
        {/* ======================================================== */}
        <aside
          className={`border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950 shrink-0 transition-all duration-300 ${
            sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden border-r-0' : 'w-72 sm:w-80 opacity-100'
          }`}
        >
          {/* Search Box & Quick Expand/Collapse Toolbar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter 300+ concepts..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
              <span>{flattenedConcepts.length} terms</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExpandAll}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                >
                  Expand all
                </button>
                <span>•</span>
                <button
                  onClick={handleCollapseAll}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                >
                  Collapse all
                </button>
              </div>
            </div>
          </div>

          {/* Grouped Collapsible Category Tree */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
            {filteredNavCategories.map((cat, catIdx) => {
              const isCatCollapsed = Boolean(collapsedCategories[cat.name])

              return (
                <div key={catIdx} className="space-y-1">
                  {/* Category Header with Collapse Toggle */}
                  <div
                    onClick={() => toggleCategory(cat.name)}
                    className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer select-none group transition-colors"
                  >
                    <span className="truncate">{cat.name}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
                        isCatCollapsed ? '-rotate-90' : ''
                      }`}
                    />
                  </div>

                  {/* Subcategories (only if category not collapsed) */}
                  {!isCatCollapsed && (
                    <div className="space-y-2 pt-1 pl-1">
                      {cat.subCategories.map((sub, subIdx) => {
                        const isSubCollapsed = Boolean(collapsedSubCategories[sub.name])

                        return (
                          <div key={subIdx} className="space-y-1">
                            {/* SubCategory Header with Chevron & Count */}
                            <div
                              onClick={() => toggleSubCategory(sub.name)}
                              className="text-[11px] font-bold text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-between cursor-pointer select-none transition-colors group"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                                    isSubCollapsed ? '-rotate-90' : ''
                                  }`}
                                />
                                <span className="truncate">{sub.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-800">
                                {sub.keywords.length}
                              </span>
                            </div>

                            {/* Keywords List (collapsible) */}
                            {!isSubCollapsed && (
                              <div className="space-y-0.5 border-l-2 border-slate-200 dark:border-slate-800 ml-3.5 pl-2">
                                {sub.keywords.map((kw, kwIdx) => {
                                  const item = flattenedConcepts.find(
                                    c => c.term.toLowerCase().trim() === kw.toLowerCase().trim()
                                  )
                                  const itemSlug = item?.slug || kw.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-')
                                  const isActive = activeSlug === itemSlug
                                  const qCount = item?._count?.questions || 0

                                  return (
                                    <button
                                      key={kwIdx}
                                      onClick={() => {
                                        setActiveSlug(itemSlug)
                                        document.getElementById('docs-main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
                                      }}
                                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                        isActive
                                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold border-l-2 border-emerald-500 shadow-2xs'
                                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 font-medium'
                                      }`}
                                    >
                                      <span className="truncate">{kw}</span>
                                      <div className="flex items-center gap-1 shrink-0 text-[10px]">
                                        {item?.imageUrl && <span title="Photo available">🖼️</span>}
                                        {qCount > 0 && (
                                          <span
                                            className={`px-1.5 py-0.2 rounded-full font-bold ${
                                              isActive
                                                ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                                                : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500'
                                            }`}
                                          >
                                            {qCount}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>

        {/* ======================================================== */}
        {/* COLUMN 2: CENTER READING STREAM (Pure Typography & MCQs) */}
        {/* ======================================================== */}
        <main
          id="docs-main-content"
          className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-12 py-8 bg-white dark:bg-slate-950 min-w-0"
        >
          <div className="max-w-3xl xl:max-w-4xl mx-auto space-y-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[11px] font-bold">
                {activeSummary?.category || 'Animal Husbandry'}
              </span>
              <span>/</span>
              <span className="text-slate-600 dark:text-slate-300">
                {activeSummary?.subCategory || 'Core Concepts'}
              </span>
            </div>

            {/* Concept Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {conceptDetail?.term || activeSummary?.term}
              </h1>
              {/* 1-Line Definition Lead Paragraph */}
              <p className="text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-3 border-b border-slate-100 dark:border-slate-800 pb-6">
                {conceptDetail?.definition || activeSummary?.definition || 'Core technical concept for competitive examination.'}
              </p>
            </div>

            {/* Main Structured Markdown Content */}
            {conceptDetail?.content && (
              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                <FormattedExplanation text={conceptDetail.content} />
              </div>
            )}

            {/* High-Yield Exam Traps Callout Box */}
            {(conceptDetail?.examTraps || activeSummary?.examTraps) && (
              <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>High-Yield Examination Traps & Differentiators</span>
                </div>
                <div className="text-xs sm:text-sm text-amber-950 dark:text-amber-100 font-medium leading-relaxed">
                  <FormattedExplanation
                    text={conceptDetail?.examTraps || activeSummary?.examTraps || ''}
                  />
                </div>
              </div>
            )}

            {/* Mobile/Tablet Fallback for Media (when right sidebar is hidden on small screens) */}
            <div className="lg:hidden space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Visual Media Reference
              </h3>
              {activeImage && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeImage.url} alt={activeImage.title} className="w-full h-48 object-cover" />
                  <p className="p-2 text-xs text-slate-500">{activeImage.title}</p>
                </div>
              )}
              {precisionVideo && (
                <a
                  href={precisionVideo.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-xs text-red-600 font-bold"
                >
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4 fill-current" /> Watch Practical Demonstration
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* ======================================================== */}
            {/* IN-LINE INTERACTIVE PRACTICE QUIZ (No Modals!)           */}
            {/* ======================================================== */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-emerald-500" />
                    Practice MCQs for &ldquo;{activeSummary?.term}&rdquo;
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Test your memory immediately on reverse-mined questions for this concept.
                  </p>
                </div>

                {conceptDetail?.questions && conceptDetail.questions.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                    {conceptDetail.questions.length} Linked Questions
                  </span>
                )}
              </div>

              {loadingDetail ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading practice questions...
                </div>
              ) : !conceptDetail?.questions || conceptDetail.questions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    No specific individual MCQs linked to this keyword yet.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    This keyword is an umbrella or derived entity mined from adjacent chapter questions.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {conceptDetail.questions.map((q, qIdx) => {
                    const selected = userAnswers[q.id]
                    const isAnswered = Boolean(selected)
                    const isCorrect = selected === q.correctAnswer

                    return (
                      <div
                        key={q.id}
                        className="p-5 sm:p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {qIdx + 1}
                          </span>
                          <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                            {q.questionText}
                          </p>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-9">
                          {(['A', 'B', 'C', 'D', 'E'] as const).map(optKey => {
                            const optText = (q as any)[`option${optKey}`]
                            if (!optText) return null

                            let btnStyle =
                              'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'

                            if (isAnswered) {
                              if (optKey === q.correctAnswer) {
                                btnStyle =
                                  'bg-emerald-500 text-white border-emerald-600 font-bold shadow-xs'
                              } else if (selected === optKey) {
                                btnStyle =
                                  'bg-rose-500 text-white border-rose-600 font-bold shadow-xs'
                              } else {
                                btnStyle = 'opacity-40 border-slate-200 dark:border-slate-800'
                              }
                            }

                            return (
                              <button
                                key={optKey}
                                disabled={isAnswered}
                                onClick={() => handleSelectOption(q.id, optKey)}
                                className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-start gap-2.5 cursor-pointer ${btnStyle}`}
                              >
                                <span className="font-black text-[11px] uppercase shrink-0 mt-0.5">
                                  {optKey}.
                                </span>
                                <span className="flex-1">{optText}</span>
                              </button>
                            )
                          })}
                        </div>

                        {/* Explanation Box */}
                        {isAnswered && (
                          <div
                            className={`p-4 rounded-xl border text-xs ml-9 space-y-1.5 animate-in fade-in duration-200 ${
                              isCorrect
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-black uppercase text-[10px]">
                              {isCorrect ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Correct Answer!</span>
                                </>
                              ) : (
                                <span>Incorrect (Correct answer is: {q.correctAnswer})</span>
                              )}
                            </div>
                            <p className="leading-relaxed font-medium">
                              {q.simpleExplanation || q.explanation || 'Exam reference explanation.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between pb-12">
              <button
                disabled={currentIndex === 0}
                onClick={() => {
                  if (currentIndex > 0) {
                    setActiveSlug(flattenedConcepts[currentIndex - 1].slug)
                    document.getElementById('docs-main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <div className="text-left">
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">Previous</span>
                  <span className="truncate max-w-[140px] block">
                    {currentIndex > 0 ? flattenedConcepts[currentIndex - 1].term : 'Beginning'}
                  </span>
                </div>
              </button>

              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                Concept {currentIndex + 1} of {flattenedConcepts.length} (Use ← / → keys)
              </span>

              <button
                disabled={currentIndex === flattenedConcepts.length - 1}
                onClick={() => {
                  if (currentIndex < flattenedConcepts.length - 1) {
                    setActiveSlug(flattenedConcepts[currentIndex + 1].slug)
                    document.getElementById('docs-main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 cursor-pointer shadow-2xs"
              >
                <div className="text-right">
                  <span className="block text-[10px] text-emerald-200 uppercase font-semibold">Next</span>
                  <span className="truncate max-w-[140px] block">
                    {currentIndex < flattenedConcepts.length - 1 ? flattenedConcepts[currentIndex + 1].term : 'End'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        {/* ======================================================== */}
        {/* COLUMN 3: RIGHT FIXED SIDEBAR (Visual Media & Spec Hub)  */}
        {/* ======================================================== */}
        <aside className="w-80 xl:w-96 border-l border-slate-200 dark:border-slate-800 shrink-0 hidden lg:flex flex-col bg-slate-50/60 dark:bg-slate-950 overflow-y-auto p-5 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Visual & Practical Media
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              Fixed Reference Hub
            </span>
          </div>

          {/* 1. MULTIPLE IMAGES / GALLERY SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                Authentic Image Reference
              </span>
              {galleryImages.length > 1 && (
                <span className="text-[10px] text-slate-400 font-bold">
                  {activeImageIdx + 1} of {galleryImages.length}
                </span>
              )}
            </div>

            {activeImage ? (
              <div className="space-y-2">
                {/* Main Active Image with E-Commerce Zoom Lens */}
                <div
                  onMouseMove={handleImageMouseMove}
                  onMouseEnter={() => setImageZoom(prev => ({ ...prev, active: true }))}
                  onMouseLeave={handleImageMouseLeave}
                  onClick={() => setLightboxOpen(true)}
                  className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-xs relative group cursor-zoom-in select-none"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeImage.url}
                    alt={activeImage.title}
                    style={{
                      transformOrigin: `${imageZoom.x}% ${imageZoom.y}%`,
                      transform: imageZoom.active ? 'scale(2.4)' : 'scale(1)',
                      transition: imageZoom.active ? 'transform 0.05s ease-out' : 'transform 0.25s ease-out'
                    }}
                    className="w-full h-56 object-cover pointer-events-none"
                  />

                  {/* Lens Indicator Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-950/85 text-white backdrop-blur-xs flex items-center gap-1">
                    <ZoomIn className="w-3 h-3 text-emerald-400" />
                    <span>{imageZoom.active ? '2.4x Magnifier' : 'Hover to Zoom'}</span>
                  </div>

                  {/* Lightbox Trigger Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setLightboxOpen(true)
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-600 cursor-pointer shadow-sm"
                    title="Open Fullscreen Lightbox"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Multiple Images Selector Strip (1, 2, 3...) */}
                {galleryImages.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIdx(idx)}
                        className={`h-12 w-12 rounded-lg overflow-hidden border transition-all cursor-pointer shrink-0 ${
                          activeImageIdx === idx
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Caption & Actions */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="truncate max-w-[190px]" title={activeImage.title}>
                    {activeImage.title}
                  </span>
                  <div className="flex items-center gap-2">
                    {activeImage.sourceUrl && (
                      <a
                        href={activeImage.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline flex items-center gap-0.5 font-bold"
                      >
                        <span>Source</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="text-slate-400 hover:text-amber-600 p-0.5"
                      title="Report inaccurate image"
                    >
                      <Flag className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Community Contribution & Remove Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleOpenAddImage}
                    className="flex-1 py-1.5 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-emerald-500" />
                    <span>Replace Image</span>
                  </button>
                  <button
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="py-1.5 px-2.5 rounded-xl border border-rose-200 dark:border-rose-950/40 bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold hover:bg-rose-100/70 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Remove unrelated or inaccurate image"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2.5 bg-slate-100/50 dark:bg-slate-900/30">
                <ImageIcon className="w-6 h-6 text-slate-400 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    No verified photo available
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Rely on ICAR metrics table or add a photo.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Authentic Photo</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. YOUTUBE FIELD & CLINICAL DEMO SECTION */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-red-500 fill-current" />
                Field / Clinical Demo Video
              </span>
            </div>

            {precisionVideo ? (
              <div className="space-y-2.5">
                {/* Responsive Embedded YouTube Player or Thumbnail Fallback */}
                {precisionVideo.embedUrl ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 aspect-video relative group shadow-xs">
                    <iframe
                      src={precisionVideo.embedUrl}
                      title={`${activeSummary?.term} practical demonstration`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : precisionVideo.thumbnailUrl ? (
                  <a
                    href={precisionVideo.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 aspect-video relative group block shadow-xs"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={precisionVideo.thumbnailUrl}
                      alt="YouTube Video Thumbnail"
                      className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </a>
                ) : null}

                {/* AI Viewing Guide Callout */}
                <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-[11px] space-y-1">
                  <span className="font-black text-amber-800 dark:text-amber-300 block">
                    💡 AI Exam Viewing Guide:
                  </span>
                  <p className="text-amber-900 dark:text-amber-200 leading-snug">
                    {precisionVideo.videoCaption}
                  </p>
                </div>

                <a
                  href={precisionVideo.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-red-600" />
                  <span>Watch Featured Video on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {precisionVideo.searchUrl && (
                  <a
                    href={precisionVideo.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Similar Results on YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                Generating video search query...
              </div>
            )}
          </div>

          {/* 3. ON THIS PAGE QUICK TOC */}
          <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              On This Page
            </span>
            <div className="space-y-1 text-xs">
              <a
                href="#docs-main-content"
                className="block text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 py-1"
              >
                • Core Definition & Origin
              </a>
              {conceptDetail?.content && (
                <a
                  href="#docs-main-content"
                  className="block text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 py-1"
                >
                  • Comprehensive Notes & Metrics
                </a>
              )}
              {conceptDetail?.examTraps && (
                <a
                  href="#docs-main-content"
                  className="block text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 py-1"
                >
                  • High-Yield Exam Traps
                </a>
              )}
              {conceptDetail?.questions && conceptDetail.questions.length > 0 && (
                <a
                  href="#docs-main-content"
                  className="block text-emerald-600 dark:text-emerald-400 font-bold py-1"
                >
                  • Practice MCQs ({conceptDetail.questions.length})
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Community Image Contribution Modal */}
      {mediaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>Add Community Image for &ldquo;{activeSummary?.term}&rdquo;</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Provide an authentic agricultural or veterinary photo.
                </p>
              </div>
              <button
                onClick={() => setMediaModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs: Paste URL vs Upload File */}
            <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
              <button
                onClick={() => { setMediaTab('url'); setMediaError(null); }}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaTab === 'url'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Paste Image URL</span>
              </button>
              <button
                onClick={() => { setMediaTab('upload'); setMediaError(null); }}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaTab === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image File</span>
              </button>
            </div>

            {mediaError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{mediaError}</span>
              </div>
            )}

            {mediaSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{mediaSuccess}</span>
              </div>
            )}

            {mediaTab === 'url' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Image URL: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/images/breed.jpg"
                    value={inputImageUrl}
                    onChange={e => {
                      setInputImageUrl(e.target.value)
                      setMediaError(null)
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-emerald-500 font-mono text-[11px]"
                  />
                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span className="text-slate-400">
                      Supported: <span className="font-semibold text-slate-600 dark:text-slate-400">.jpg, .jpeg, .png, .webp, .gif, .svg</span>
                    </span>
                    {inputImageUrl.trim() && (
                      isUrlValid ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Valid Image URL
                        </span>
                      ) : (
                        <span className="text-amber-500 font-medium">
                          Must be direct image link
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Live Preview Box */}
                {inputImageUrl.trim() && isUrlValid && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 p-2 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">Image Preview</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={inputImageUrl}
                      alt="URL Preview"
                      className="max-h-32 mx-auto rounded-lg object-contain"
                      onError={() => setMediaError('Unable to load image from this URL. Please verify the link is accessible.')}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Image File: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    onChange={handleFileChange}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 pt-1">
                    Accepts JPEG, PNG, WebP, GIF, SVG (up to 10MB)
                  </p>
                </div>

                {uploadFilePreview && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 p-2 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">Upload Preview ({((uploadFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB)</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadFilePreview}
                      alt="Upload Preview"
                      className="max-h-32 mx-auto rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Caption & Source inputs */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Image Caption / Label:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Surti buffalo cow at Anand Agricultural University"
                  value={inputCaption}
                  onChange={e => setInputCaption(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Source / Credit Link (optional):
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://agritech.tnau.ac.in or ICAR-NBAGR"
                  value={inputSourceUrl}
                  onChange={e => setInputSourceUrl(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-[11px]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setMediaModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={mediaSubmitting || (mediaTab === 'url' ? !isUrlValid : !uploadFile)}
                onClick={handleSaveCommunityImage}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {mediaSubmitting ? 'Saving...' : 'Save Community Image'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog to Remove Image */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Remove Image?
                </h4>
                <p className="text-[11px] text-slate-400">
                  Concept: &ldquo;{activeSummary?.term}&rdquo;
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure this image is unrelated or inaccurate? Removing it will clear the image for all users so someone can contribute an authentic photo.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                disabled={deletingImage}
                onClick={handleRemoveImage}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer text-xs"
              >
                {deletingImage ? 'Removing...' : 'Yes, Remove Image'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-500" />
                Report Media for &ldquo;{activeSummary?.term}&rdquo;
              </h3>
              <button
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-8 text-center text-emerald-600 font-bold text-sm">
                Thank you! Media report submitted for administrator review.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Reason:
                  </label>
                  <select
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Inaccurate entity / image">Inaccurate entity / image</option>
                    <option value="Mismatched breed appearance">Mismatched breed appearance</option>
                    <option value="Broken media link">Broken media link</option>
                    <option value="Low resolution / unclear">Low resolution / unclear</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={reportSubmitting}
                    onClick={handleSendReport}
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && activeImage && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Top Bar */}
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-5xl flex items-center justify-between text-white pb-3 border-b border-slate-800"
          >
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-md">
                {activeImage.title}
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeSummary?.term} • Wikimedia Commons Reference ({activeImageIdx + 1} of {galleryImages.length || 1})
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeImage.sourceUrl && (
                <a
                  href={activeImage.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-emerald-400 hover:bg-slate-700 transition-colors"
                >
                  <span>Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                title="Close Lightbox (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center High-Res Image */}
          <div
            onClick={e => e.stopPropagation()}
            className="flex-1 flex items-center justify-center p-4 max-w-5xl w-full overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage.url}
              alt={activeImage.title}
              className="max-h-[72vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
          </div>

          {/* Bottom Thumbnails Strip */}
          {galleryImages.length > 1 && (
            <div
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 overflow-x-auto pb-2 max-w-md"
            >
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`h-14 w-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    activeImageIdx === idx
                      ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-500/20'
                      : 'border-slate-800 opacity-50 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
