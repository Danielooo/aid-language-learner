# [In Progress] IDEEFASE

## Doel

De applicatie moet het makkelijk maken voor de gebruiker om Spaans te leren. De gebruiker moet (random) oefeningen voorgeschoteld krijgen. De gebruiker moet zijn voortgang en scores kunnen zien. De gebruiker moet kunnen oefenen op de zwakke plekken

## Kernfunctionaliteiten

1. Inloggen registreren
2. AI chat functie (AI SDK van Vercel) - Geef extra uitleg over de zinnen (wat is grammatica van bepaald werkwoord, wat betekent specifiek woord)
3. Random spaanse zinnen met NL vertaling (Tatoeba API)
4. Dashboard: hoeveel zinnen geleerd. Hoeveel goed / fout
5. Zelf gegenereerde oefeningen toevoegen (via seed script? of andere methode injecteren in Supabase)
6. Chatfunctie binnen de oefening | doel: uitleg krijgen, vragen stellen over het antwoord. (Sterke guardrail maken die alleen vragen beantwoord over de specifieke vraag)

## TODO

- ~~In dev/ gegenereerde oefeningen quiz feature bouwen~~
- ~~In dev/ oefeningen maken op basis van Supabase data~~
- ~~In dev/ dashboard maken op basis van gemaakte oefeningen~~
- In dev/ oefeningen quiz chat functie toevoegen waar je vragen kan stellen over de oefening
- In dev/ inlog maken, account waar je persoonlijke dashboard, oefeningen zijn te zien
