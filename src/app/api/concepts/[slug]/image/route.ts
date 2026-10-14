import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { writeFile } from 'fs/promises'
import path from 'path'

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp']
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'image/bmp'
]

export function isValidImageUrl(url: string): { valid: boolean; reason?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'URL cannot be empty' }
  }
  const trimmed = url.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/uploads/')) {
    return { valid: false, reason: 'URL must start with http:// or https://' }
  }

  try {
    const parsed = new URL(trimmed, 'http://localhost')
    const pathname = parsed.pathname.toLowerCase()

    const hasImageExt = SUPPORTED_EXTENSIONS.some(ext => pathname.endsWith(ext))
    const formatParam = (
      parsed.searchParams.get('format') ||
      parsed.searchParams.get('fm') ||
      parsed.searchParams.get('ext') ||
      ''
    ).toLowerCase()
    const hasFormatParam = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes(formatParam)

    const hostname = parsed.hostname.toLowerCase()
    const isImageHost =
      hostname.includes('wikimedia.org') ||
      hostname.includes('imgur.com') ||
      hostname.includes('unsplash.com') ||
      hostname.includes('cloudinary.com') ||
      hostname.includes('githubusercontent.com')

    if (!hasImageExt && !hasFormatParam && !isImageHost) {
      return {
        valid: false,
        reason: 'URL must end with a valid image extension (.jpg, .jpeg, .png, .webp, .gif, .svg, .avif, .bmp) or be a direct image CDN link.'
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await props.params
    const slug = params.slug
    const { searchParams } = new URL(request.url)
    const chapterIdStr = searchParams.get('chapterId')

    const where: any = { slug }
    if (chapterIdStr) {
      const chapterId = parseInt(chapterIdStr, 10)
      if (!isNaN(chapterId)) where.chapterId = chapterId
    }

    const concept = await prisma.chapterConcept.findFirst({
      where,
      select: { id: true, term: true, chapterId: true, imageUrl: true, imageCaption: true, sourceUrl: true }
    })

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    const contentType = request.headers.get('content-type') || ''
    const itemsToAdd: Array<{ url: string; title: string; sourceUrl?: string }> = []

    // 1. FILE UPLOAD VIA FORMDATA (Single or Multiple)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const files = (formData.getAll('files') as File[]).filter(f => f && typeof f !== 'string')
      if (files.length === 0) {
        const singleFile = formData.get('file') as File | null
        if (singleFile && typeof singleFile !== 'string') {
          files.push(singleFile)
        }
      }

      if (files.length === 0) {
        return NextResponse.json({ error: 'No image files uploaded' }, { status: 400 })
      }

      const caption = (formData.get('caption') as string) || ''
      const sourceUrl = (formData.get('sourceUrl') as string) || ''
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'concepts')

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          continue
        }
        if (file.size > 10 * 1024 * 1024) {
          continue
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const ext = path.extname(file.name) || (file.type === 'image/png' ? '.png' : '.jpg')
        const sanitizedSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30)
        const filename = `${Date.now()}_${i}_${sanitizedSlug}${ext}`
        const filePath = path.join(uploadDir, filename)

        await writeFile(filePath, buffer)
        itemsToAdd.push({
          url: `/uploads/concepts/${filename}`,
          title: caption.trim()
            ? (files.length > 1 ? `${caption.trim()} (${i + 1})` : caption.trim())
            : `${concept.term} photo ${i + 1}`,
          sourceUrl: sourceUrl.trim() || undefined
        })
      }

      if (itemsToAdd.length === 0) {
        return NextResponse.json(
          { error: 'No valid image files could be processed. Allowed types: JPEG, PNG, WebP, GIF, SVG under 10MB.' },
          { status: 400 }
        )
      }
    }
    // 2. IMAGE URL VIA JSON (Single or Multiple)
    else {
      const body = await request.json()
      const { imageUrl, imageUrls, images, imageCaption, sourceUrl } = body

      const rawList: Array<{ url: string; title?: string; sourceUrl?: string }> = []

      if (Array.isArray(images)) {
        images.forEach(img => {
          if (img && typeof img.imageUrl === 'string') {
            rawList.push({
              url: img.imageUrl.trim(),
              title: img.imageCaption || imageCaption,
              sourceUrl: img.sourceUrl || sourceUrl
            })
          }
        })
      } else if (Array.isArray(imageUrls)) {
        imageUrls.forEach((u, i) => {
          if (typeof u === 'string' && u.trim()) {
            rawList.push({
              url: u.trim(),
              title: imageCaption
                ? (imageUrls.length > 1 ? `${imageCaption} (${i + 1})` : imageCaption)
                : undefined,
              sourceUrl: sourceUrl || undefined
            })
          }
        })
      } else if (imageUrl && typeof imageUrl === 'string') {
        rawList.push({
          url: imageUrl.trim(),
          title: imageCaption,
          sourceUrl: sourceUrl
        })
      }

      for (let i = 0; i < rawList.length; i++) {
        const item = rawList[i]
        const validation = isValidImageUrl(item.url)
        if (validation.valid) {
          itemsToAdd.push({
            url: item.url,
            title: (item.title || '').trim() || `${concept.term} reference photo`,
            sourceUrl: item.sourceUrl ? item.sourceUrl.trim() : undefined
          })
        }
      }

      if (itemsToAdd.length === 0) {
        return NextResponse.json({
          error: 'No valid image URLs provided. URLs must start with http/https and end with .jpg, .png, .webp, .gif, or .svg'
        }, { status: 400 })
      }
    }

    // Parse existing gallery or single image
    let currentGallery: Array<{ url: string; title: string; sourceUrl?: string }> = []
    if (concept.imageUrl) {
      if (concept.imageUrl.startsWith('[')) {
        try {
          currentGallery = JSON.parse(concept.imageUrl)
        } catch {
          currentGallery = []
        }
      } else {
        currentGallery = [
          {
            url: concept.imageUrl,
            title: concept.imageCaption || concept.term,
            sourceUrl: concept.sourceUrl || undefined
          }
        ]
      }
    }

    // Append new items to gallery (updating if identical URL exists)
    for (const newItem of itemsToAdd) {
      const existingIdx = currentGallery.findIndex(g => g.url === newItem.url)
      if (existingIdx >= 0) {
        currentGallery[existingIdx] = newItem
      } else {
        currentGallery.push(newItem)
      }
    }

    // Save multi-image gallery to database
    const updated = await prisma.chapterConcept.update({
      where: { id: concept.id },
      data: {
        imageUrl: JSON.stringify(currentGallery),
        thumbnailUrl: currentGallery[0].url,
        imageCaption: currentGallery[0].title,
        sourceUrl: currentGallery[0].sourceUrl || null
      }
    })

    return NextResponse.json({
      success: true,
      addedCount: itemsToAdd.length,
      galleryImages: currentGallery,
      concept: {
        ...updated,
        imageUrl: currentGallery[0].url,
        imageCaption: currentGallery[0].title
      },
      message: `${itemsToAdd.length} photo${itemsToAdd.length > 1 ? 's' : ''} added to concept gallery successfully`
    })
  } catch (error: any) {
    console.error('Error adding community image:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update image' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await props.params
    const slug = params.slug
    const { searchParams } = new URL(request.url)
    const chapterIdStr = searchParams.get('chapterId')
    const indexStr = searchParams.get('index')
    const targetUrl = searchParams.get('url')

    const where: any = { slug }
    if (chapterIdStr) {
      const chapterId = parseInt(chapterIdStr, 10)
      if (!isNaN(chapterId)) where.chapterId = chapterId
    }

    const concept = await prisma.chapterConcept.findFirst({
      where,
      select: { id: true, term: true, imageUrl: true, imageCaption: true, sourceUrl: true }
    })

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    // Parse existing gallery
    let currentGallery: Array<{ url: string; title: string; sourceUrl?: string }> = []
    if (concept.imageUrl) {
      if (concept.imageUrl.startsWith('[')) {
        try {
          currentGallery = JSON.parse(concept.imageUrl)
        } catch {
          currentGallery = []
        }
      } else {
        currentGallery = [
          {
            url: concept.imageUrl,
            title: concept.imageCaption || concept.term,
            sourceUrl: concept.sourceUrl || undefined
          }
        ]
      }
    }

    // Remove specific image by index or URL
    if (indexStr !== null) {
      const idx = parseInt(indexStr, 10)
      if (!isNaN(idx) && idx >= 0 && idx < currentGallery.length) {
        currentGallery.splice(idx, 1)
      }
    } else if (targetUrl) {
      currentGallery = currentGallery.filter(g => g.url !== targetUrl)
    } else {
      // Clear all
      currentGallery = []
    }

    let updateData: any = {}
    if (currentGallery.length === 0) {
      updateData = {
        imageUrl: null,
        thumbnailUrl: null,
        imageCaption: null,
        sourceUrl: null
      }
    } else {
      updateData = {
        imageUrl: JSON.stringify(currentGallery),
        thumbnailUrl: currentGallery[0].url,
        imageCaption: currentGallery[0].title,
        sourceUrl: currentGallery[0].sourceUrl || null
      }
    }

    const updated = await prisma.chapterConcept.update({
      where: { id: concept.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      galleryImages: currentGallery,
      concept: {
        ...updated,
        imageUrl: currentGallery[0]?.url || null,
        imageCaption: currentGallery[0]?.title || null
      },
      message: 'Image removed from concept gallery'
    })
  } catch (error: any) {
    console.error('Error removing concept image:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove image' },
      { status: 500 }
    )
  }
}
