-- ==========================================================================
-- PANVIA — Supabase-schema voor betalingen & accounts (Mollie pay-first)
--
-- EENMALIG UITVOEREN: Supabase Dashboard → SQL Editor → plak dit → Run.
-- De API-routes (api/mollie/*) schrijven hier met de service-role key;
-- RLS staat aan zonder policies, dus de anon key kan hier NIETS lezen.
-- ==========================================================================

-- Alle betaalpogingen (audit-trail). Eén rij per Mollie-payment.
create table if not exists betalingen (
  id uuid primary key default gen_random_uuid(),
  ref uuid unique not null,                -- onze referentie in de redirect-URL
  mollie_payment_id text unique,           -- tr_xxx (na aanmaken bekend)
  mollie_customer_id text,                 -- cst_xxx (alleen koper/abonnement)
  mollie_subscription_id text,             -- sub_xxx (na eerste betaling koper)
  soort text not null check (soort in ('koper', 'verkoper')),
  naam text,
  email text not null,
  bedrag numeric not null,
  status text not null default 'open',     -- open/paid/failed/canceled/expired
  metadata jsonb,                          -- verkoper: de pandgegevens
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Accounts: pas 'betaald' na een geslaagde betaling (bron van waarheid).
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  naam text,
  soort text not null check (soort in ('koper', 'verkoper')),
  betaald boolean not null default false,
  mollie_customer_id text,
  mollie_subscription_id text,
  created_at timestamptz not null default now(),
  unique (email, soort)
);

create index if not exists betalingen_ref_idx on betalingen (ref);
create index if not exists betalingen_mollie_idx on betalingen (mollie_payment_id);

-- RLS aan, géén policies: alleen de service-role key (server-side) kan erbij.
alter table betalingen enable row level security;
alter table accounts enable row level security;
