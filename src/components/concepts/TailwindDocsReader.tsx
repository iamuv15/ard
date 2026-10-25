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
  Check,
  Edit3,
  RotateCcw
} from 'lucide-react'
import { FormattedExplanation } from '@/components/FormattedExplanation'
import { sanitizeQuestionText } from '@/lib/sanitizeQuestion'
import { findMatchingAudioTrack, AudioTrack } from '@/lib/audioRegistry'
import { ConceptAudioPlayer } from '@/components/concepts/ConceptAudioPlayer'

export interface ConceptSummaryItem {
  id: number
  term: string
  slug: string
  category: string
  subCategory?: string | null
  definition?: string | null
  examTraps?: string | null
  relatedTerms?: string[]
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
    customSearchQuery?: string
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

  // Community Multi-Image Contribution & Removal State
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [mediaTab, setMediaTab] = useState<'url' | 'upload'>('url')
  const [inputImageUrlsText, setInputImageUrlsText] = useState('')
  const [inputCaption, setInputCaption] = useState('')
  const [inputSourceUrl, setInputSourceUrl] = useState('')
  const [uploadFiles, setUploadFiles] = useState<Array<{ file: File; preview: string; id: string }>>([])
  const [mediaSubmitting, setMediaSubmitting] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [mediaSuccess, setMediaSuccess] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<{
    image: { url: string; title: string; sourceUrl?: string }
    index: number
  } | null>(null)
  const [deletingImage, setDeletingImage] = useState(false)

  // Custom Video & Academic Search Query State
  const [editVideoModalOpen, setEditVideoModalOpen] = useState(false)
  const [inputVideoUrl, setInputVideoUrl] = useState('')
  const [inputVideoQuery, setInputVideoQuery] = useState('')
  const [videoSubmitting, setVideoSubmitting] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoSuccess, setVideoSuccess] = useState<string | null>(null)

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

  // Dynamically loaded database audio tracks
  const [dbAudioTracks, setDbAudioTracks] = useState<AudioTrack[]>([])

  useEffect(() => {
    if (!chapterId) return
    fetch(`/api/chapters/${chapterId}/audio`)
      .then(r => r.json())
      .then(data => {
        if (data.tracks && Array.isArray(data.tracks)) {
          const mapped: AudioTrack[] = data.tracks.map((t: any) => ({
            id: t.id,
            title: t.title,
            subtitle: t.subtitle || '',
            audioUrl: t.audioUrl,
            chapterNamePattern: new RegExp(chapterName.replace(/[^a-zA-Z0-9]/g, '.'), 'i'),
            subCategoryPattern: t.subCategory ? new RegExp(t.subCategory.replace(/[^a-zA-Z0-9]/g, '.'), 'i') : undefined,
            keywords: t.concepts?.map((c: any) => c.term) || Object.keys(t.keywordTimestamps || {}),
            keywordTimestamps: t.keywordTimestamps
          }))
          setDbAudioTracks(mapped)
        }
      })
      .catch(() => {})
  }, [chapterId, chapterName])

  // Active audio track for the current category / subcategory / keyword
  const activeAudioTrack = useMemo(() => {
    return findMatchingAudioTrack(
      chapterName,
      activeSummary?.category,
      activeSummary?.subCategory,
      conceptDetail?.term || activeSummary?.term,
      dbAudioTracks
    )
  }, [chapterName, activeSummary, conceptDetail, dbAudioTracks])

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
        if (mediaModalOpen) {
          setMediaModalOpen(false)
          return
        }
        if (confirmDeleteOpen) {
          setConfirmDeleteOpen(false)
          setImageToDelete(null)
          return
        }
        if (editVideoModalOpen) {
          setEditVideoModalOpen(false)
          return
        }
      }

      if (lightboxOpen || reportModalOpen || mediaModalOpen || confirmDeleteOpen || editVideoModalOpen) return

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

  // Validate single image/GIF URL format on client
  const checkSingleUrlValid = (url: string) => {
    if (!url) return false
    const trimmed = url.trim()
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false
    try {
      const parsed = new URL(trimmed)
      const pathname = parsed.pathname.toLowerCase()
      const exts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp']
      if (exts.some(e => pathname.endsWith(e))) return true

      const formatParam = (
        parsed.searchParams.get('format') ||
        parsed.searchParams.get('fm') ||
        parsed.searchParams.get('ext') ||
        ''
      ).toLowerCase()
      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes(formatParam)) return true

      const host = parsed.hostname.toLowerCase()
      if (
        host.includes('gstatic.com') ||
        host.includes('googleusercontent.com') ||
        host.includes('wikimedia.org') ||
        host.includes('imgur.com') ||
        host.includes('unsplash.com') ||
        host.includes('cloudinary.com') ||
        host.includes('githubusercontent.com') ||
        host.includes('twimg.com') ||
        host.includes('pinimg.com') ||
        host.includes('redd.it')
      ) {
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // Parse lines of image URLs
  const parsedImageUrls = useMemo(() => {
    const lines = inputImageUrlsText
      .split(/[\n,]+/)
      .map(l => l.trim())
      .filter(Boolean)
    return lines.map((url, idx) => ({
      idx,
      url,
      isValid: checkSingleUrlValid(url)
    }))
  }, [inputImageUrlsText])

  const validUrls = useMemo(() => {
    return parsedImageUrls.filter(u => u.isValid)
  }, [parsedImageUrls])

  const handleOpenAddImage = () => {
    setInputImageUrlsText('')
    setInputCaption(`${activeSummary?.term || ''} reference photo`)
    setInputSourceUrl('')
    setUploadFiles([])
    setMediaError(null)
    setMediaSuccess(null)
    setMediaModalOpen(true)
  }

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected || selected.length === 0) return

    const validList: Array<{ file: File; preview: string; id: string }> = []
    let errorMsg: string | null = null

    for (let i = 0; i < selected.length; i++) {
      const file = selected[i]
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'].includes(file.type)) {
        errorMsg = `"${file.name}" skipped: only JPEG, PNG, WebP, GIF, or SVG supported.`
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        errorMsg = `"${file.name}" skipped: file size exceeds 10MB.`
        continue
      }
      validList.push({
        file,
        preview: URL.createObjectURL(file),
        id: `${file.name}-${file.size}-${Date.now()}-${i}`
      })
    }

    if (errorMsg) setMediaError(errorMsg)
    else setMediaError(null)

    if (validList.length > 0) {
      setUploadFiles(prev => [...prev, ...validList])
    }
    e.target.value = ''
  }

  const handleRemoveUploadFile = (idToRemove: string) => {
    setUploadFiles(prev => {
      const item = prev.find(p => p.id === idToRemove)
      if (item?.preview) {
        URL.revokeObjectURL(item.preview)
      }
      return prev.filter(p => p.id !== idToRemove)
    })
  }

  const handleRemoveUrlAt = (indexToRemove: number) => {
    const lines = inputImageUrlsText.split(/[\n,]+/).map(l => l.trim()).filter(Boolean)
    lines.splice(indexToRemove, 1)
    setInputImageUrlsText(lines.join('\n'))
  }

  const handleSaveCommunityImage = async () => {
    if (!activeSummary) return
    setMediaSubmitting(true)
    setMediaError(null)

    try {
      let resData: any = null

      if (mediaTab === 'url') {
        const toSubmit = validUrls.map(u => u.url)
        if (toSubmit.length === 0) {
          setMediaError('Please enter at least one valid image URL ending with .jpg, .jpeg, .png, .webp, .gif, or .svg')
          setMediaSubmitting(false)
          return
        }

        const res = await fetch(`/api/concepts/${encodeURIComponent(activeSummary.slug)}/image?chapterId=${chapterId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrls: toSubmit,
            imageCaption: inputCaption.trim() || activeSummary.term,
            sourceUrl: inputSourceUrl.trim() || undefined
          })
        })
        resData = await res.json()
        if (!res.ok) throw new Error(resData?.error || 'Failed to update image')
      } else {
        if (uploadFiles.length === 0) {
          setMediaError('Please select at least one image file to upload')
          setMediaSubmitting(false)
          return
        }

        const formData = new FormData()
        uploadFiles.forEach(item => {
          formData.append('files', item.file)
        })
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

        const newGallery = resData.galleryImages || [
          {
            url: resData.concept.imageUrl,
            title: resData.concept.imageCaption || activeSummary.term,
            sourceUrl: resData.concept.sourceUrl || undefined
          }
        ]
        setGalleryImages(newGallery)
        setActiveImageIdx(newGallery.length - 1)
        setMediaSuccess('Image successfully added to gallery!')
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

  const handlePromptDeleteImage = (
    img: { url: string; title: string; sourceUrl?: string },
    index: number,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation()
    setImageToDelete({ image: img, index })
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDeleteImage = async () => {
    if (!activeSummary || !imageToDelete) return
    setDeletingImage(true)
    try {
      const res = await fetch(
        `/api/concepts/${encodeURIComponent(activeSummary.slug)}/image?chapterId=${chapterId}&index=${imageToDelete.index}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (res.ok) {
        const updatedGallery = data.galleryImages || []
        setGalleryImages(updatedGallery)
        if (activeImageIdx >= updatedGallery.length) {
          setActiveImageIdx(Math.max(0, updatedGallery.length - 1))
        }
        setConceptDetail(prev => prev ? {
          ...prev,
          imageUrl: updatedGallery[0]?.url || null,
          thumbnailUrl: updatedGallery[0]?.url || null,
          imageCaption: updatedGallery[0]?.title || null,
          sourceUrl: updatedGallery[0]?.sourceUrl || null
        } : prev)
        setConfirmDeleteOpen(false)
        setImageToDelete(null)
      } else {
        alert(data.error || 'Failed to remove image')
      }
    } catch (err) {
      console.error('Failed to remove image', err)
    } finally {
      setDeletingImage(false)
    }
  }

  // Custom Video Link & Query Helpers
  const parsedInputVideoId = useMemo(() => {
    if (!inputVideoUrl.trim()) return null
    const match = inputVideoUrl.trim().match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    )
    return match ? match[1] : null
  }, [inputVideoUrl])

  const handleOpenEditVideo = () => {
    const currentVideoId = precisionVideo?.videoId
    const currentUrl = currentVideoId
      ? `https://www.youtube.com/watch?v=${currentVideoId}`
      : (precisionVideo?.videoUrl?.includes('watch?v=') || precisionVideo?.videoUrl?.includes('youtu.be') ? precisionVideo.videoUrl : '')

    setInputVideoUrl(currentUrl)
    setInputVideoQuery(
      precisionVideo?.customSearchQuery ||
      `${activeSummary?.term || ''} ${activeSummary?.subCategory || ''} veterinary demonstration ICAR`.trim()
    )
    setVideoError(null)
    setVideoSuccess(null)
    setEditVideoModalOpen(true)
  }

  const handleSaveVideoSettings = async () => {
    if (!activeSummary) return
    if (inputVideoUrl.trim() && !parsedInputVideoId) {
      setVideoError('Please enter a valid YouTube video link (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)')
      return
    }
    setVideoSubmitting(true)
    setVideoError(null)
    try {
      const res = await fetch(`/api/concepts/${encodeURIComponent(activeSummary.slug)}/video?chapterId=${chapterId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: inputVideoUrl.trim() || null,
          searchQuery: inputVideoQuery.trim() || undefined
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update video settings')

      if (data?.precisionVideo) {
        setPrecisionVideo(data.precisionVideo)
      }
      setVideoSuccess('Video & search query saved successfully!')
      setTimeout(() => {
        setEditVideoModalOpen(false)
        setVideoSuccess(null)
      }, 1200)
    } catch (err: any) {
      setVideoError(err.message || 'Error saving video settings')
    } finally {
      setVideoSubmitting(false)
    }
  }

  const handleResetVideoDefaults = async () => {
    if (!activeSummary) return
    setVideoSubmitting(true)
    setVideoError(null)
    try {
      const res = await fetch(`/api/concepts/${encodeURIComponent(activeSummary.slug)}/video?chapterId=${chapterId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to reset video settings')

      // Refetch concept details to reload automated precision query
      const fetchRes = await fetch(`/api/concepts/${encodeURIComponent(activeSummary.slug)}?chapterId=${chapterId}`)
      const fetchData = await fetchRes.json()
      if (fetchData?.precisionVideo) {
        setPrecisionVideo(fetchData.precisionVideo)
      }
      setVideoSuccess('Reset to automated video & search query!')
      setTimeout(() => {
        setEditVideoModalOpen(false)
        setVideoSuccess(null)
      }, 1200)
    } catch (err: any) {
      setVideoError(err.message || 'Error resetting video settings')
    } finally {
      setVideoSubmitting(false)
    }
  }

  // Concept lookup map for fast relatedTerms check
  const conceptLookupMap = useMemo(() => {
    const map = new Map<string, ConceptSummaryItem>()
    allConcepts.forEach(c => {
      map.set(c.term.toLowerCase().trim(), c)
      map.set(c.slug.toLowerCase().trim(), c)
    })
    return map
  }, [allConcepts])

  // Filtered categories and keywords in left sidebar
  const filteredNavCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories

    const q = searchQuery.toLowerCase().trim()
    return categories
      .map(cat => {
        const matchingSub = cat.subCategories
          .map(sub => {
            const matchingKeywords = sub.keywords.filter(kw => {
              if (kw.toLowerCase().includes(q)) return true
              const item = conceptLookupMap.get(kw.toLowerCase().trim())
              if (item?.relatedTerms && item.relatedTerms.some(rt => rt.toLowerCase().includes(q))) {
                return true
              }
              return false
            })
            return { ...sub, keywords: matchingKeywords }
          })
          .filter(sub => sub.keywords.length > 0)

        return { ...cat, subCategories: matchingSub }
      })
      .filter(cat => cat.subCategories.length > 0)
  }, [categories, conceptLookupMap, searchQuery])

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
                                {findMatchingAudioTrack(chapterName, cat.name, sub.name) && (
                                  <span
                                    title="Audio Masterclass Available"
                                    className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 shrink-0 flex items-center gap-0.5"
                                  >
                                    🎧 Audio
                                  </span>
                                )}
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

                                  const q = searchQuery.toLowerCase().trim()
                                  let matchedSubTerm: string | null = null
                                  if (q && item?.relatedTerms && !kw.toLowerCase().includes(q)) {
                                    matchedSubTerm = item.relatedTerms.find(rt => rt.toLowerCase().includes(q)) || null
                                  }

                                  return (
                                    <button
                                      key={kwIdx}
                                      onClick={() => {
                                        setActiveSlug(itemSlug)
                                        if (matchedSubTerm) {
                                          setTimeout(() => {
                                            const container = document.getElementById('docs-main-content')
                                            if (container) {
                                              const headings = container.querySelectorAll('h2, h3, h4, strong')
                                              const queryTerm = matchedSubTerm!.toLowerCase().trim()
                                              for (const h of Array.from(headings)) {
                                                if (
                                                  h.textContent?.toLowerCase().includes(queryTerm) ||
                                                  (h.id && h.id.includes(queryTerm.replace(/[^a-z0-9]+/g, '-')))
                                                ) {
                                                  h.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                  return
                                                }
                                              }
                                            }
                                            document.getElementById('docs-main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
                                          }, 150)
                                        } else {
                                          document.getElementById('docs-main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
                                        }
                                      }}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                        isActive
                                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold border-l-2 border-emerald-500 shadow-2xs'
                                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 font-medium'
                                      }`}
                                    >
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="truncate">{kw}</span>
                                        {matchedSubTerm && (
                                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1 mt-0.5">
                                            <span className="opacity-70">↳</span>
                                            <span className="truncate">Sub-topic: {matchedSubTerm}</span>
                                          </span>
                                        )}
                                      </div>
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

            {/* Macro / SubCategory Audio Guide Player */}
            {activeAudioTrack && (
              <ConceptAudioPlayer
                track={activeAudioTrack}
                currentKeyword={conceptDetail?.term || activeSummary?.term}
                onSelectKeyword={(kw) => {
                  const item = flattenedConcepts.find(
                    c => c.term.toLowerCase().trim() === kw.toLowerCase().trim()
                  )
                  if (item) {
                    setActiveSlug(item.slug)
                    document.getElementById('docs-main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
              />
            )}

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
                    const normalizedCorrectAnswer = (q.correctAnswer || '').trim().toUpperCase()
                    const selected = userAnswers[q.id]?.trim().toUpperCase()
                    const isAnswered = Boolean(selected)
                    const isCorrect = selected === normalizedCorrectAnswer

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
                            {sanitizeQuestionText(q.questionText)}
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
                              if (optKey === normalizedCorrectAnswer) {
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
                                <span className="flex-1">{sanitizeQuestionText(optText)}</span>
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
                                <span>Incorrect (Correct answer is: Option {normalizedCorrectAnswer})</span>
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
              {galleryImages.length > 0 && (
                <span className="text-[10px] text-slate-400 font-bold">
                  {activeImageIdx + 1} of {galleryImages.length}
                </span>
              )}
            </div>

            {activeImage ? (
              <div className="space-y-2.5">
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

                {/* Multiple Images Selector Strip with Hover-To-Delete */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                  {galleryImages.map((img, idx) => {
                    const isSelected = activeImageIdx === idx
                    return (
                      <div key={idx} className="relative group/thumb shrink-0">
                        <button
                          onClick={() => setActiveImageIdx(idx)}
                          title={img.title || `Photo ${idx + 1}`}
                          className={`h-13 w-13 rounded-xl overflow-hidden border-2 transition-all cursor-pointer block relative ${
                            isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-400'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0.5 right-0.5 px-1 rounded text-[8px] font-bold bg-black/75 text-white">
                            {idx + 1}
                          </span>
                        </button>

                        {/* Hover-to-Delete Trash Button on Thumbnail */}
                        <button
                          onClick={(e) => handlePromptDeleteImage(img, idx, e)}
                          title={`Delete photo #${idx + 1}`}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity shadow-md cursor-pointer z-10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}

                  {/* Add Photo Mini-Tile */}
                  <button
                    onClick={handleOpenAddImage}
                    title="Add another photo to this gallery"
                    className="h-13 w-13 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex flex-col items-center justify-center gap-0.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span className="text-[8px] font-bold">Add</span>
                  </button>
                </div>

                {/* Caption & Actions */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
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

                {/* Community Contribution & Delete Active Photo Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleOpenAddImage}
                    className="flex-1 py-1.5 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3 text-emerald-500" />
                    <span>Add Photo</span>
                  </button>
                  <button
                    onClick={() => handlePromptDeleteImage(activeImage, activeImageIdx)}
                    className="py-1.5 px-2.5 rounded-xl border border-rose-200 dark:border-rose-950/40 bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold hover:bg-rose-100/70 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Delete this specific photo from gallery"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Photo</span>
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
              <button
                onClick={handleOpenEditVideo}
                className="text-[10px] font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Edit featured video link or YouTube search query"
              >
                <Edit3 className="w-3 h-3 text-emerald-500" />
                <span>Edit Video & Query</span>
              </button>
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
                    💡 Practical Viewing Guide:
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
                  <div className="space-y-1">
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
                    {precisionVideo.customSearchQuery && (
                      <p className="text-[10px] text-slate-400 text-center font-mono truncate px-1">
                        Query: &quot;{precisionVideo.customSearchQuery}&quot;
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 text-xs text-slate-400">
                <p>No video linked yet.</p>
                <button
                  onClick={handleOpenEditVideo}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Link YouTube Video</span>
                </button>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Image URLs (one per line): <span className="text-red-500">*</span>
                    </label>
                    {validUrls.length > 0 && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> {validUrls.length} valid photo{validUrls.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    placeholder={`https://upload.wikimedia.org/.../surti_buffalo.jpg\nhttps://upload.wikimedia.org/.../surti_horns.jpg`}
                    value={inputImageUrlsText}
                    onChange={e => {
                      setInputImageUrlsText(e.target.value)
                      setMediaError(null)
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-emerald-500 font-mono text-[11px] leading-relaxed resize-y"
                  />
                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span className="text-slate-400">
                      Paste 1 or multiple direct links (.jpg, .png, .gif, .webp, or Google/Wikimedia/Imgur photos)
                    </span>
                    {parsedImageUrls.length > validUrls.length && (
                      <span className="text-amber-500 font-medium">
                        {parsedImageUrls.length - validUrls.length} non-image link(s) skipped
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Preview Strip for Valid URLs */}
                {validUrls.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                      <span>Detected Photo Previews ({validUrls.length}):</span>
                      <button
                        type="button"
                        onClick={() => setInputImageUrlsText('')}
                        className="text-rose-500 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                      {validUrls.map((item, idx) => (
                        <div
                          key={idx}
                          className="relative group/prev shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 shadow-xs"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={`URL Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).classList.add('opacity-30')
                            }}
                          />
                          <span className="absolute bottom-1 left-1 px-1 rounded text-[8px] font-bold bg-black/75 text-white">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveUrlAt(item.idx)}
                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-80 hover:opacity-100 cursor-pointer shadow-xs"
                            title="Remove this URL"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select One or Multiple Files: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    onChange={handleFilesChange}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 pt-1">
                    Select 1 or more images (JPEG, PNG, WebP up to 10MB each).
                  </p>
                </div>

                {/* Multiple Upload Previews Grid */}
                {uploadFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                      <span>Selected Photos ({uploadFiles.length} • {(uploadFiles.reduce((acc, f) => acc + f.file.size, 0) / (1024 * 1024)).toFixed(2)} MB):</span>
                      <button
                        type="button"
                        onClick={() => {
                          uploadFiles.forEach(f => URL.revokeObjectURL(f.preview))
                          setUploadFiles([])
                        }}
                        className="text-rose-500 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                      {uploadFiles.map((item, idx) => (
                        <div
                          key={item.id}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-square shadow-2xs"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 p-1 bg-black/75 text-[8px] text-white truncate font-mono">
                            {item.file.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveUploadFile(item.id)}
                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 cursor-pointer shadow-xs"
                            title="Remove this file"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Caption & Source inputs */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Base Caption / Label:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Surti buffalo cow at Anand Agricultural University"
                  value={inputCaption}
                  onChange={e => setInputCaption(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
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
                className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                disabled={
                  mediaSubmitting ||
                  (mediaTab === 'url' ? validUrls.length === 0 : uploadFiles.length === 0)
                }
                onClick={handleSaveCommunityImage}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs text-xs"
              >
                {mediaSubmitting
                  ? 'Saving Photos...'
                  : mediaTab === 'url'
                    ? (validUrls.length > 1 ? `Add ${validUrls.length} Photos to Gallery` : 'Add Photo to Gallery')
                    : (uploadFiles.length > 1 ? `Upload ${uploadFiles.length} Photos to Gallery` : 'Upload Photo to Gallery')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Confirmation Dialog to Delete Specific Image */}
      {confirmDeleteOpen && imageToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Remove This Photo?
                </h4>
                <p className="text-[11px] text-slate-400">
                  Concept: &ldquo;{activeSummary?.term}&rdquo; • Photo #{imageToDelete.index + 1}
                </p>
              </div>
            </div>

            {/* Visual Photo Preview */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 p-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageToDelete.image.url}
                alt={imageToDelete.image.title}
                className="max-h-40 mx-auto rounded-xl object-contain"
              />
              <p className="text-[11px] font-bold text-slate-300 mt-2 truncate px-2">
                {imageToDelete.image.title}
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove this photo? It will be delinked from this concept gallery for all users.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setConfirmDeleteOpen(false)
                  setImageToDelete(null)
                }}
                className="px-3.5 py-1.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                disabled={deletingImage}
                onClick={handleConfirmDeleteImage}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingImage ? 'Removing...' : 'Yes, Remove Photo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Link & Academic Search Query Modal */}
      {editVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-red-500 fill-current" />
                  <span>Customize Video & Query for &ldquo;{activeSummary?.term}&rdquo;</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Update the linked demonstration video and fine-tune YouTube search.
                </p>
              </div>
              <button
                onClick={() => setEditVideoModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {videoError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{videoError}</span>
              </div>
            )}

            {videoSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{videoSuccess}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* YouTube Video URL */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Featured YouTube Video URL:
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={inputVideoUrl}
                  onChange={e => {
                    setInputVideoUrl(e.target.value)
                    setVideoError(null)
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-emerald-500 font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-400 pt-1">
                  Accepts standard YouTube watch links, youtu.be short links, or embed links.
                </p>
              </div>

              {/* Live Video Preview if valid ID */}
              {parsedInputVideoId && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 aspect-video">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${parsedInputVideoId}?rel=0`}
                    title="Live Video Preview"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* YouTube Search Query */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    YouTube Search Query:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setInputVideoQuery(`${activeSummary?.term || ''} ${activeSummary?.subCategory || ''} veterinary demonstration ICAR`.trim())
                    }}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    Reset to Default Query
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Surti buffalo breed characteristics NDRI ICAR"
                  value={inputVideoQuery}
                  onChange={e => setInputVideoQuery(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-emerald-500 text-xs"
                />
                <p className="text-[10px] text-slate-400 pt-1">
                  Powers the &ldquo;View Similar Results on YouTube&rdquo; button. Recommended format: [Term] [Breed/Subtopic] [ICAR / NDRI].
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={videoSubmitting}
                onClick={handleResetVideoDefaults}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Reset to automated AI recommendations"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Automated</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditVideoModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={videoSubmitting}
                  onClick={handleSaveVideoSettings}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs text-xs"
                >
                  {videoSubmitting ? 'Saving...' : 'Save Video & Query'}
                </button>
              </div>
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
