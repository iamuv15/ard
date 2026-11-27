import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ChapterPracticePage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await props.params
  const searchParams = await props.searchParams

  const qs = new URLSearchParams()
  for (const [key, val] of Object.entries(searchParams)) {
    if (typeof val === 'string' && val.length > 0) {
      qs.set(key, val)
    }
  }

  const queryString = qs.toString()
  redirect(`/quiz/chapter-${params.id}/practice${queryString ? `?${queryString}` : ''}`)
}
