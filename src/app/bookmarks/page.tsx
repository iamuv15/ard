import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import BookmarksClient from '@/components/BookmarksClient'

export const dynamic = 'force-dynamic'

export default async function BookmarksPage() {
  const session = await getUserSession()
  if (!session) {
    redirect('/login')
  }

  const bookmarks = await prisma.userBookmark.findMany({
    where: { userId: session.id },
    include: {
      question: {
        include: {
          quiz: {
            include: {
              chapter: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <BookmarksClient 
      initialBookmarks={bookmarks as any} 
      userName={session.name || null} 
    />
  )
}
