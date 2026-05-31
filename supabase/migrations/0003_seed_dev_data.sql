-- Schone dev-seed voor /dev/dashboard. Wipet beide dev-tabellen en
-- vult ze opnieuw met:
--   * 12 oefeningen (4 topics × 3 zinnen)
--   * ~50 attempts per oefening met random goed/fout (topic-skew op
--     'autogarage' zodat de TopicList iets om te tonen heeft) en
--     timestamps gespreid over de afgelopen 7 dagen.
--
-- Determinisme via `setseed(0.42)` — bij hercreatie van de migration
-- krijg je dezelfde counts en dezelfde verdeling, handig voor demo's.
-- Bestaande hand-ingevoegde rijen verdwijnen door de truncate; dat is
-- gewenste seed-semantiek (anders raakt de topic-lijst vervuild).

truncate table public.dev_quiz_attempts, public.dev_exercises restart identity cascade;

select setseed(0.42);

insert into public.dev_exercises (source_text, target_text, topic) values
  ('¿Tienen una mesa para dos?',                       'Hebben jullie een tafel voor twee?',                'restaurant'),
  ('La cuenta, por favor.',                            'De rekening, alstublieft.',                          'restaurant'),
  ('¿Qué recomienda el chef hoy?',                     'Wat raadt de chef vandaag aan?',                     'restaurant'),
  ('¿Dónde está la puerta de embarque?',               'Waar is de gate?',                                   'luchthaven'),
  ('Mi maleta no ha llegado.',                         'Mijn koffer is niet aangekomen.',                    'luchthaven'),
  ('¿A qué hora sale el próximo vuelo?',               'Hoe laat vertrekt de volgende vlucht?',              'luchthaven'),
  ('Necesito cambiar las ruedas del coche.',           'Ik moet de wielen van de auto vervangen.',           'autogarage'),
  ('¿Cuánto cuesta la revisión del vehículo?',         'Wat kost de keuring van het voertuig?',              'autogarage'),
  ('Quiero hacer una cita para un cambio de aceite.',  'Ik wil een afspraak maken voor een olieverversing.', 'autogarage'),
  ('¿Qué sabores de helado tienen hoy?',               'Welke smaken ijs hebben jullie vandaag?',            'ijsjeszaak'),
  ('Me gustaría un helado de chocolate, por favor.',   'Ik zou graag een chocolade-ijsje willen, alstublieft.', 'ijsjeszaak'),
  ('¿Puedo probar un poco del helado de fresa?',       'Mag ik een beetje van het aardbeienijs proeven?',    'ijsjeszaak');

-- Per oefening 3-6 attempts, random goed/fout met topic-skew, timestamps
-- gespreid over de afgelopen 7 dagen. Skew op 'autogarage' (40% correct)
-- zodat dat topic prominent in TopicList opduikt. Sommige oefeningen
-- krijgen automatisch meerdere foute pogingen → vult `weakExercises`.
insert into public.dev_quiz_attempts (exercise_id, user_answer, is_correct, created_at)
select
  e.id,
  case when r.is_correct then e.target_text else 'no sé exactamente' end,
  r.is_correct,
  now() - (random() * interval '7 days')
from public.dev_exercises e
cross join lateral (
  select
    (random() < case when e.topic = 'autogarage' then 0.40 else 0.75 end) as is_correct
  from generate_series(1, 3 + (random() * 3)::int)
) r;
