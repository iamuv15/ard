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
        reason: 'URL must end with a valid image extension (.jpg, .jpeg, .png, .webp, .gif, .svg, .avif) or be an image CDN link.'
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
      select: { id: true, term: true, chapterId: true }
    })

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    const contentType = request.headers.get('content-type') || ''

    let finalImageUrl = ''
    let finalCaption = ''
    let finalSourceUrl: string | null = null

    // 1. FILE UPLOAD VIA FORMDATA
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const caption = (formData.get('caption') as string) || ''
      const sourceUrl = (formData.get('sourceUrl') as string) || ''

      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 })
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, SVG.`
          },
          { status: 400 }
        )
      }

      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = path.extname(file.name) || (file.type === 'image/png' ? '.png' : '.jpg')
      const sanitizedSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30)
      const filename = `${Date.now()}_${sanitizedSlug}${ext}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'concepts')
      const filePath = path.join(uploadDir, filename)

      await writeFile(filePath, buffer)
      finalImageUrl = `/uploads/concepts/${filename}`
      finalCaption = caption.trim() || `${concept.term} community reference image`
      finalSourceUrl = sourceUrl.trim() || null
    }
    // 2. IMAGE URL VIA JSON
    else {
      const body = await request.json()
      const { imageUrl, imageCaption, sourceUrl } = body

      const validation = isValidImageUrl(imageUrl)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.reason }, { status: 400 })
      }

      finalImageUrl = imageUrl.trim()
      finalCaption = (imageCaption || '').trim() || `${concept.term} reference image`
      finalSourceUrl = sourceUrl ? sourceUrl.trim() : null
    }

    // Save to database
    const updated = await prisma.chapterConcept.update({
      where: { id: concept.id },
      data: {
        imageUrl: finalImageUrl,
        thumbnailUrl: finalImageUrl,
        imageCaption: finalCaption,
        sourceUrl: finalSourceUrl
      }
    })

    return NextResponse.json({
      success: true,
      concept: updated,
      message: 'Community image updated successfully'
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

    const where: any = { slug }
    if (chapterIdStr) {
      const chapterId = parseInt(chapterIdStr, 10)
      if (!isNaN(chapterId)) where.chapterId = chapterId
    }

    const concept = await prisma.chapterConcept.findFirst({
      where,
      select: { id: true, term: true }
    })

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    // Clear the image from the database
    const updated = await prisma.chapterConcept.update({
      where: { id: concept.id },
      data: {
        imageUrl: null,
        thumbnailUrl: null,
        imageCaption: null,
        sourceUrl: null
      }
    })

    return NextResponse.json({
      success: true,
      concept: updated,
      message: `Image removed for concept "${concept.term}"`
    })
  } catch (error: any) {
    console.error('Error removing concept image:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove image' },
      { status: 500 }
    )
  }
}
