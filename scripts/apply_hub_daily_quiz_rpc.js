const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const url = rawUrl.replace(':6543/', ':5432/');
const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('1. Syncing User.supabaseUserId from auth.users (case-insensitive email match)...');
  const updatedCount = await prisma.$executeRawUnsafe(`
    UPDATE public."User" u
    SET "supabaseUserId" = au.id::text
    FROM auth.users au
    WHERE lower(u.email) = lower(au.email)
      AND (u."supabaseUserId" IS NULL OR u."supabaseUserId" <> au.id::text)
  `);
  console.log(`Synced ${updatedCount} User rows with supabaseUserId.`);

  console.log('2. Creating public.get_hub_ard_quiz_summary(p_user_id uuid) RPC...');
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.get_hub_ard_quiz_summary(p_user_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth
    AS $$
    DECLARE
      v_db_user_id integer;
      v_email text;
      v_period_key text;
      v_completed_quizzes integer := 0;
      v_logged_answers integer := 0;
      v_mistake_count integer := 0;
      v_mistake_days integer := 0;
      v_effective_completed integer := 0;
      v_unlocked boolean := false;
      v_quiz record;
      v_has_active_quiz boolean := false;
      v_answered_count integer := 0;
      v_focus_chapters jsonb := '[]'::jsonb;
    BEGIN
      v_period_key := to_char((now() AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD');

      -- 1. Resolve Supabase auth.users UUID -> public."User".id
      SELECT u.id INTO v_db_user_id
      FROM public."User" u
      WHERE u."supabaseUserId" = p_user_id::text
      LIMIT 1;

      IF v_db_user_id IS NULL THEN
        SELECT lower(au.email) INTO v_email
        FROM auth.users au
        WHERE au.id = p_user_id
        LIMIT 1;

        IF v_email IS NOT NULL THEN
          SELECT u.id INTO v_db_user_id
          FROM public."User" u
          WHERE lower(u.email) = lower(v_email)
          LIMIT 1;
        END IF;
      END IF;

      -- Brand-new Hub user who has never logged into ARDShala yet
      IF v_db_user_id IS NULL THEN
        RETURN jsonb_build_object(
          'unlocked', false,
          'completed_source_quizzes', 0,
          'unlock_threshold', 1,
          'quiz_type', 'daily',
          'period_key', v_period_key,
          'quiz_id', NULL,
          'status', 'not_generated',
          'total_questions', 20,
          'answered_count', 0,
          'score', NULL,
          'focus_chapters', '[]'::jsonb,
          'launch_path', '/ard/daily-quiz'
        );
      END IF;

      -- 2. Check cold-start eligibility (1 completed quiz OR 15+ answered questions OR existing UserMistake backfill)
      SELECT COUNT(*)::int INTO v_completed_quizzes
      FROM public."QuizAttempt"
      WHERE "userId" = v_db_user_id;

      SELECT COUNT(*)::int INTO v_logged_answers
      FROM public."QuestionAttemptLog"
      WHERE "userId" = v_db_user_id
        AND "sourceType" <> 'DAILY_QUIZ';

      SELECT
        COUNT(*)::int,
        COUNT(DISTINCT ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date)::int
      INTO v_mistake_count, v_mistake_days
      FROM public."UserMistake"
      WHERE "userId" = v_db_user_id;

      v_unlocked := (v_completed_quizzes >= 1) OR (v_logged_answers >= 15) OR (v_mistake_count >= 1);
      v_effective_completed := GREATEST(
        v_completed_quizzes,
        CASE WHEN v_logged_answers >= 15 THEN 1 ELSE 0 END,
        v_mistake_days
      );

      IF NOT v_unlocked THEN
        RETURN jsonb_build_object(
          'unlocked', false,
          'completed_source_quizzes', v_effective_completed,
          'unlock_threshold', 1,
          'quiz_type', 'daily',
          'period_key', v_period_key,
          'quiz_id', NULL,
          'status', 'not_generated',
          'total_questions', 20,
          'answered_count', 0,
          'score', NULL,
          'focus_chapters', '[]'::jsonb,
          'launch_path', '/ard/daily-quiz'
        );
      END IF;

      -- 3. Check if today's DailyRetentionQuiz exists (ignore stale 'generating' > 3 min)
      SELECT * INTO v_quiz
      FROM public."DailyRetentionQuiz"
      WHERE "userId" = v_db_user_id
        AND "periodKey" = v_period_key
      LIMIT 1;

      IF FOUND THEN
        IF v_quiz.status = 'generating' AND v_quiz."generationStartedAt" < (now() - interval '3 minutes') THEN
          v_has_active_quiz := false;
        ELSE
          v_has_active_quiz := true;
        END IF;
      END IF;

      IF v_has_active_quiz THEN
        SELECT COUNT(*)::int INTO v_answered_count
        FROM public."DailyRetentionQuestion"
        WHERE "dailyQuizId" = v_quiz.id
          AND "selectedOption" IS NOT NULL;

        v_focus_chapters := COALESCE(to_jsonb(v_quiz."focusChapters"), '[]'::jsonb);

        RETURN jsonb_build_object(
          'unlocked', true,
          'completed_source_quizzes', v_effective_completed,
          'unlock_threshold', 1,
          'quiz_type', 'daily',
          'period_key', v_period_key,
          'quiz_id', v_quiz.id::text,
          'status', v_quiz.status,
          'total_questions', v_quiz."totalQuestions",
          'answered_count', v_answered_count,
          'score', v_quiz.score,
          'focus_chapters', v_focus_chapters,
          'launch_path', '/ard/daily-quiz'
        );
      END IF;

      -- 4. Not generated yet: preview top 2-3 recent chapters as focus_chapters
      WITH chapter_activity AS (
        SELECT c.name, COUNT(*) AS cnt, MAX(qal."createdAt") AS last_seen
        FROM public."QuestionAttemptLog" qal
        JOIN public."Chapter" c ON c.id = qal."chapterId"
        WHERE qal."userId" = v_db_user_id
          AND qal."sourceType" <> 'DAILY_QUIZ'
          AND qal."createdAt" >= (now() - interval '7 days')
        GROUP BY c.name
        UNION ALL
        SELECT c.name, COUNT(*) AS cnt, MAX(qa."createdAt") AS last_seen
        FROM public."QuizAttempt" qa
        JOIN public."Quiz" q ON q.id = qa."quizId"
        JOIN public."Chapter" c ON c.id = q."chapterId"
        WHERE qa."userId" = v_db_user_id
          AND qa."createdAt" >= (now() - interval '7 days')
        GROUP BY c.name
        UNION ALL
        SELECT c.name, COUNT(*) AS cnt, MAX(um."createdAt") AS last_seen
        FROM public."UserMistake" um
        JOIN public."Question" qs ON qs.id = um."questionId"
        JOIN public."Quiz" q ON q.id = qs."quizId"
        JOIN public."Chapter" c ON c.id = q."chapterId"
        WHERE um."userId" = v_db_user_id
        GROUP BY c.name
      ),
      ranked_chapters AS (
        SELECT name, SUM(cnt) AS total_cnt, MAX(last_seen) AS latest
        FROM chapter_activity
        GROUP BY name
        ORDER BY MAX(last_seen) DESC, SUM(cnt) DESC
        LIMIT 3
      )
      SELECT COALESCE(jsonb_agg(name), '[]'::jsonb) INTO v_focus_chapters
      FROM ranked_chapters;

      RETURN jsonb_build_object(
        'unlocked', true,
        'completed_source_quizzes', v_effective_completed,
        'unlock_threshold', 1,
        'quiz_type', 'daily',
        'period_key', v_period_key,
        'quiz_id', NULL,
        'status', 'not_generated',
        'total_questions', 20,
        'answered_count', 0,
        'score', NULL,
        'focus_chapters', v_focus_chapters,
        'launch_path', '/ard/daily-quiz'
      );
    END;
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    REVOKE ALL ON FUNCTION public.get_hub_ard_quiz_summary(uuid) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.get_hub_ard_quiz_summary(uuid) TO service_role;
  `);

  console.log('✅ RPC public.get_hub_ard_quiz_summary(uuid) created and granted to service_role.');

  // Quick smoke test against existing Supabase user
  const testUsers = await prisma.$queryRawUnsafe(`
    SELECT id, email FROM auth.users ORDER BY created_at ASC LIMIT 3
  `);
  for (const u of testUsers) {
    const res = await prisma.$queryRawUnsafe(
      `SELECT public.get_hub_ard_quiz_summary($1::uuid) AS summary`,
      u.id
    );
    console.log(`Test RPC for ${u.email} (${u.id}):`, JSON.stringify(res[0].summary));
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
