-- Dev-only tabel voor quiz-attempts uit /dev/exercise-generator-quiz.
-- Eén rij per controleer-klik. Was eerst localStorage; nu Supabase
-- zodat het /dev/dashboard met echte data werkt en historie meegaat
-- over apparaten heen.
--
-- Net als `dev_exercises`: geen RLS, geen `user_id`, alleen toegankelijk
-- via de service-role (server-only route handler). Productie-versie
-- krijgt later `user_id` + RLS policies.

create table if not exists public.dev_quiz_attempts (
  id          uuid        primary key default gen_random_uuid(),
  exercise_id uuid        not null references public.dev_exercises(id) on delete cascade,
  user_answer text        not null,
  is_correct  boolean     not null,
  created_at  timestamptz not null default now()
);

-- Index op created_at voor de "recente eerst"-listing van het dashboard
-- en de quiz-historie.
create index if not exists dev_quiz_attempts_created_at_idx
  on public.dev_quiz_attempts (created_at desc);

-- FK is al impliciet geïndexeerd door sommige Postgres-setups, maar
-- expliciet houden we 'm voor de "zwakke oefeningen"-aggregatie die
-- per `exercise_id` groepeert.
create index if not exists dev_quiz_attempts_exercise_id_idx
  on public.dev_quiz_attempts (exercise_id);
