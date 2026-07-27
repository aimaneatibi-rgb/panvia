-- ==========================================================================
-- PANVIA — Supabase-schema: betalingen, accounts, sessies
--
-- EENMALIG UITVOEREN: Supabase Dashboard → SQL Editor → plak dit → Run.
-- Dit bestand is idempotent en veilig opnieuw uit te voeren: het migreert
-- ook een bestaande installatie (accounts had eerst unique(email, soort)).
--
-- De API-routes (api/mollie/*, api/auth/*) schrijven hier met de service-role
-- key; RLS staat aan zonder policies, dus de anon key kan hier NIETS lezen.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. BETALINGEN — alle betaalpogingen (audit-trail). Eén rij per Mollie-payment.
-- --------------------------------------------------------------------------
create table if not exists betalingen (
  id uuid primary key default gen_random_uuid(),
  ref uuid unique not null,                -- onze referentie in de redirect-URL
  mollie_payment_id text unique,           -- tr_xxx (na aanmaken bekend)
  mollie_customer_id text,                 -- cst_xxx (koper + projecten: abonnement)
  mollie_subscription_id text,             -- sub_xxx (na de eerste betaling)
  soort text not null,
  naam text,
  email text not null,
  bedrag numeric not null,
  status text not null default 'open',     -- open/paid/failed/canceled/expired
  metadata jsonb,                          -- verkoper: pandgegevens · project: projectgegevens
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Toegestane soorten. Apart van de create table, want bestaande installaties
-- kenden alleen 'koper' en 'verkoper' — de projectpakketten kwamen er later
-- bij en liepen daardoor stuk op de oude check.
alter table betalingen drop constraint if exists betalingen_soort_check;
alter table betalingen add constraint betalingen_soort_check
  check (soort in ('koper', 'verkoper', 'project_s', 'project_m', 'project_l'));

-- Het wachtwoord dat de bezoeker vóór de betaling koos, meteen gehasht
-- (scrypt). De klaartekst raakt de database nooit. De webhook zet deze hash
-- op het account zodra de betaling geslaagd is.
alter table betalingen add column if not exists wachtwoord_hash text;

-- De terugkeerpagina mag met deze ref één keer een sessie krijgen (direct
-- ingelogd na betalen). Daarna is de ref opgebruikt.
alter table betalingen add column if not exists sessie_uitgegeven boolean not null default false;

-- --------------------------------------------------------------------------
-- 2. ACCOUNTS — één account per e-mailadres, met rollen.
--    Koper én verkoper zijn rollen op hetzelfde account: wie eerst koopt en
--    later verkoopt, houdt één inlog. Een rol wordt pas actief na betaling.
-- --------------------------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  naam text,
  soort text,                              -- legacy, blijft staan voor oude rijen
  betaald boolean not null default false,  -- legacy
  mollie_customer_id text,
  mollie_subscription_id text,
  created_at timestamptz not null default now()
);

alter table accounts add column if not exists wachtwoord_hash text;
alter table accounts add column if not exists telefoon text;
alter table accounts add column if not exists koper_actief boolean not null default false;
alter table accounts add column if not exists verkoper_actief boolean not null default false;
alter table accounts add column if not exists koper_sinds timestamptz;
alter table accounts add column if not exists verkoper_sinds timestamptz;
alter table accounts add column if not exists laatst_ingelogd timestamptz;
-- Rem tegen wachtwoord-raden: na 8 misluk­te pogingen 15 minuten op slot.
alter table accounts add column if not exists mislukte_pogingen integer not null default 0;
alter table accounts add column if not exists geblokkeerd_tot timestamptz;
alter table accounts alter column soort drop not null;

-- E-mail voortaan hoofdletterongevoelig uniek opslaan (we schrijven altijd
-- in kleine letters vanuit de API).
update accounts set email = lower(email) where email <> lower(email);

-- --- Migratie van het oude model (unique(email, soort)) --------------------
-- Oude rijen: rol afleiden uit 'soort' + 'betaald'.
update accounts
   set koper_actief = true,
       koper_sinds  = coalesce(koper_sinds, created_at)
 where soort = 'koper' and betaald and not koper_actief;

update accounts
   set verkoper_actief = true,
       verkoper_sinds  = coalesce(verkoper_sinds, created_at)
 where soort = 'verkoper' and betaald and not verkoper_actief;

-- Stond hetzelfde e-mailadres twee keer in de tabel (koper én verkoper), voeg
-- die rijen samen tot de oudste rij en gooi de dubbele weg.
with samen as (
  select lower(email) as email,
         bool_or(koper_actief)              as koper_actief,
         bool_or(verkoper_actief)           as verkoper_actief,
         min(koper_sinds)                   as koper_sinds,
         min(verkoper_sinds)                as verkoper_sinds,
         max(naam)                          as naam,
         max(mollie_customer_id)            as mollie_customer_id,
         max(mollie_subscription_id)        as mollie_subscription_id,
         max(wachtwoord_hash)               as wachtwoord_hash,
         min(created_at)                    as created_at
    from accounts
   group by lower(email)
  having count(*) > 1
)
update accounts a
   set koper_actief           = s.koper_actief,
       verkoper_actief        = s.verkoper_actief,
       koper_sinds            = s.koper_sinds,
       verkoper_sinds         = s.verkoper_sinds,
       naam                   = coalesce(a.naam, s.naam),
       mollie_customer_id     = coalesce(a.mollie_customer_id, s.mollie_customer_id),
       mollie_subscription_id = coalesce(a.mollie_subscription_id, s.mollie_subscription_id),
       wachtwoord_hash        = coalesce(a.wachtwoord_hash, s.wachtwoord_hash)
  from samen s
 where lower(a.email) = s.email
   and a.created_at = s.created_at;

delete from accounts a
 using accounts b
 where lower(a.email) = lower(b.email)
   and (a.created_at, a.id) > (b.created_at, b.id);

-- Oude sleutel eruit, nieuwe erin: één account per e-mailadres.
alter table accounts drop constraint if exists accounts_email_soort_key;
create unique index if not exists accounts_email_key on accounts (email);

-- --------------------------------------------------------------------------
-- 3. SESSIES — inloggen met e-mail + wachtwoord levert een HttpOnly-cookie.
--    In de tabel staat alleen de SHA-256 van het token; het token zelf staat
--    uitsluitend in de cookie van de bezoeker.
-- --------------------------------------------------------------------------
create table if not exists sessies (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  account_id uuid not null references accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  verloopt_op timestamptz not null
);

-- --------------------------------------------------------------------------
-- 4. WACHTWOORD-RESETS — eenmalige tokens, één uur geldig.
-- --------------------------------------------------------------------------
create table if not exists wachtwoord_resets (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  account_id uuid not null references accounts(id) on delete cascade,
  gebruikt boolean not null default false,
  created_at timestamptz not null default now(),
  verloopt_op timestamptz not null
);

-- --------------------------------------------------------------------------
-- 5. PROFIEL — wat we van iemand weten naast de inlog.
--
--    Opzet: de velden waarop we willen filteren en segmenteren staan als
--    echte kolommen (budget, gebied, timing). De lange staart gaat in jsonb,
--    zodat er geen migratie nodig is elke keer dat er een vraag bijkomt.
--
--    Telefoon is voortaan een tweede inlognaam: uniek, genormaliseerd naar
--    E.164 (+31612345678) door de API.
-- --------------------------------------------------------------------------

-- Bestaande nummers eerst opschonen, anders kan de unieke index er niet op.
update accounts set telefoon = null where telefoon is not null and btrim(telefoon) = '';

create unique index if not exists accounts_telefoon_key
  on accounts (telefoon) where telefoon is not null;

-- Heeft deze rol de onboarding na de betaling afgerond?
alter table accounts add column if not exists koper_profiel_compleet boolean not null default false;
alter table accounts add column if not exists verkoper_profiel_compleet boolean not null default false;

-- Koper: waar zoekt iemand, voor hoeveel, en hoe serieus is het?
alter table accounts add column if not exists zoekgebied text[];
alter table accounts add column if not exists woningtype text[];
alter table accounts add column if not exists budget_min numeric;
alter table accounts add column if not exists budget_max numeric;
alter table accounts add column if not exists koop_timing text;        -- nu / 1-3 / 3-6 / orienterend
alter table accounts add column if not exists financiering text;       -- rond / in-gesprek / nog-niet
alter table accounts add column if not exists eigen_woning_te_koop boolean;

-- Verkoper: waarom, wanneer, en zoekt deze persoon zelf ook?
alter table accounts add column if not exists verkoop_reden text;
alter table accounts add column if not exists verkoop_termijn text;
alter table accounts add column if not exists eerder_via_makelaar boolean;
alter table accounts add column if not exists zoekt_zelf_woning boolean;
alter table accounts add column if not exists eigendomsvorm text;

-- De lange staart: alles wat we vragen maar (nog) niet als kolom nodig hebben.
alter table accounts add column if not exists koper_profiel jsonb;
alter table accounts add column if not exists verkoper_profiel jsonb;

-- Toestemmingen — per doel apart, want dat is precies wat de AVG verlangt.
-- Wat hier niet true staat, gebruiken we niet voor dat doel.
alter table accounts add column if not exists toestemming jsonb not null default '{}'::jsonb;

-- --------------------------------------------------------------------------
-- 6. ZAKELIJK — nodig om een geldige btw-factuur te kunnen uitreiken.
--    Bij een zakelijke afnemer moeten naam, adres en btw-nummer op de
--    factuur; bij een buitenlandse zakelijke afnemer heb je het
--    btw-identificatienummer nodig om de btw te mogen verleggen.
-- --------------------------------------------------------------------------
alter table accounts add column if not exists zakelijk boolean not null default false;
alter table accounts add column if not exists bedrijfsnaam text;
alter table accounts add column if not exists kvk_nummer text;
alter table accounts add column if not exists btw_nummer text;
alter table accounts add column if not exists rechtsvorm text;
alter table accounts add column if not exists vestigingsadres text;
alter table accounts add column if not exists factuur_adres text;
alter table accounts add column if not exists factuur_email text;
alter table accounts add column if not exists po_nummer text;
alter table accounts add column if not exists functie text;

-- --------------------------------------------------------------------------
-- 7. BETAALGEGEVENS VAN MOLLIE — bij iDEAL/SEPA geeft Mollie de naam en het
--    rekeningnummer van de betaler terug. De naam op de rekening is het
--    sterkste signaal dat we hebben dat iemand is wie hij zegt te zijn;
--    daar hebben we geen kopie van een identiteitsbewijs voor nodig.
-- --------------------------------------------------------------------------
alter table betalingen add column if not exists consumer_naam text;
alter table betalingen add column if not exists consumer_iban text;
alter table betalingen add column if not exists consumer_bic text;
alter table betalingen add column if not exists telefoon text;

-- --------------------------------------------------------------------------
-- 8. Indexen & RLS
-- --------------------------------------------------------------------------
create index if not exists betalingen_ref_idx on betalingen (ref);
create index if not exists betalingen_mollie_idx on betalingen (mollie_payment_id);
create index if not exists sessies_token_idx on sessies (token_hash);
create index if not exists sessies_verloop_idx on sessies (verloopt_op);
create index if not exists resets_token_idx on wachtwoord_resets (token_hash);

-- RLS aan, géén policies: alleen de service-role key (server-side) kan erbij.
alter table betalingen enable row level security;
alter table accounts enable row level security;
alter table sessies enable row level security;
alter table wachtwoord_resets enable row level security;
