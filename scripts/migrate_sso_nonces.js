require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Running SSO nonces migration on Supabase DB...');
  await prisma.$executeRawUnsafe(`
    create table if not exists public.sso_used_nonces (
      jti uuid primary key,
      expires_at timestamptz not null
    );
  `);
  console.log('Table public.sso_used_nonces created/verified.');

  await prisma.$executeRawUnsafe(`
    create index if not exists idx_sso_used_nonces_expires_at
      on public.sso_used_nonces(expires_at);
  `);
  console.log('Index idx_sso_used_nonces_expires_at created/verified.');

  await prisma.$executeRawUnsafe(`
    alter table public.sso_used_nonces enable row level security;
  `);
  console.log('RLS enabled on sso_used_nonces.');

  await prisma.$executeRawUnsafe(`
    revoke all on public.sso_used_nonces from anon, authenticated, public;
    grant usage on schema public to service_role;
    grant all on public.sso_used_nonces to service_role;
  `);
  console.log('Privileges granted to service_role and revoked from anon/authenticated/public.');

  const res = await prisma.$queryRawUnsafe(`
    select count(*) from public.sso_used_nonces;
  `);
  console.log('Verification query successful:', res);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
