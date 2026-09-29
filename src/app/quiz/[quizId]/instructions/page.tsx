import Link from 'next/link'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function InstructionsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const quiz = await prisma.quiz.findUnique({
    where: { id: parseInt(quizId, 10) },
    include: { _count: { select: { questions: true } } }
  })

  if (!quiz) notFound()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
          ← {quiz.name}
        </Link>
      </div>

      {/* Instructions Content */}
      <div className="flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-3xl space-y-8">

          <div>
            <h2 className="text-lg font-bold text-[#0088cc] mb-4">General Instructions</h2>
            <ol className="list-decimal list-outside ml-5 space-y-4 text-[14px] text-gray-700 leading-relaxed">
              <li>The clock has been set on the server and countdown timer at top right corner of your screen will display the remaining time for you to complete the exam. When the clock runs out the exams ends by default – you are not required to end or submit your exam.</li>
              <li>The questions palette at the right of screen shows one of the following status of each of the questions numbered:
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold text-xs shrink-0">15</div>
                    <span>You have <strong>not visited</strong> the question yet</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-xs shrink-0">15</div>
                    <span>You have <strong>not answered</strong> the question</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs shrink-0">15</div>
                    <span>You have <strong>answered</strong> the question</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">15</div>
                    <span>You have <strong>NOT answered</strong> the question but have <strong>marked the question for review</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs">15</div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"></div>
                    </div>
                    <span>You have <strong>answered</strong> the question but <strong>marked it for review</strong></span>
                  </div>
                </div>
                <p className="mt-3 text-gray-500 text-[13px]">The Marked for Review status simply acts as a reminder that you have set to look at the question again. If an answer is selected for a question that is Marked for Review, the answer will be considered in the final evaluation.</p>
              </li>
            </ol>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#0088cc] mb-4">Navigation to a question</h2>
            <ol className="list-decimal list-outside ml-5 space-y-2 text-[14px] text-gray-700 leading-relaxed" start={3}>
              <li>To select a question to answer, you can do one of the following:
                <ul className="mt-2 space-y-1 text-[13px] text-gray-500 list-none">
                  <li>Click on the <strong className="text-gray-700">question</strong> number on the question palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                  <li>Click on Save and Next to save answer to current question, <strong className="text-gray-700">mark it for review</strong>, and to go to the next question.</li>
                  <li>Click on Mark for Review and <strong className="text-gray-700">Next</strong> to save answer to current question.</li>
                </ul>
              </li>
              <li>You can view the entire paper by clicking on the <strong>All Questions</strong> button.</li>
            </ol>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#0088cc] mb-4">Answering questions</h2>
            <ol className="list-decimal list-outside ml-5 space-y-2 text-[14px] text-gray-700 leading-relaxed" start={5}>
              <li>For multiple choice type question, select the option by clicking on the radio button.</li>
            </ol>
          </div>

          <div className="flex justify-center pt-8">
            <Link
              href={`/quiz/${quiz.id}/mock`}
              className="px-16 py-3 bg-[#007bff] hover:bg-[#0069d9] text-white font-bold rounded text-sm transition-colors"
            >
              START TEST
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
