# Language Learner

Met deze tool kun je Spaanse zinnen leren. Je kunt zelf met AI oefeningen genereren en bijhouden hoe je scoort. Daarnaast heb je een voortgangsoverzicht met grafieken die je scores weergeven.

- **Live:** [https://aid-language-learner.vercel.app](https://aid-language-learner.vercel.app)
- **GitHub:** [https://github.com/Danielooo/aid-language-learner](https://github.com/Danielooo/aid-language-learner)
- **Supabase REST API:** `https://inpdstwtqcfcjnrqvemp.supabase.co`

## Lokaal draaien

1. Open een terminal en ga naar de map waar je het project wilt zetten:

```bash
cd pad/naar/jouw/map
```

2. Kloon de repository:

```bash
git clone https://github.com/Danielooo/aid-language-learner.git
```

3. Ga naar de projectmap:

```bash
cd aid-language-learner
```

4. Installeer de afhankelijkheden:

```bash
npm install
```

5. Zorg dat je je eigen sleutels aanmaakt en in het project zet. Volg hiervoor de volgende stappen
    - Maak in de root van dit project een bestand .env.local aan
    - Kopieer de inhoud van `.env.example` naar `.env.local` en vul je eigen sleutels achter de '=' 
    - Je hebt sleutels nodig van [Supabase](https://supabase.com/) (gratis backend dienst) en van [OpenAI](https://platform.openai.com) (betaalde AI tool, bekend van chatGPT)

6. Start de development-server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

## Scripts en commando's

| Commando | Doel |
| --- | --- |
| `npm run dev` | Development-server |
| `npm run build` | Productie-build |
| `npm start` | Productie-server (na `build`) |
| `npm test` | Unit tests |
| `npm run seed:dummy` | Seed demo-users en -data (vereist server-keys in `.env.local`) |

## Demo-account

Na `npm run seed:dummy` kun je inloggen met:

- **Gebruikersnaam:** `testuser1`
- **Wachtwoord:** `q1q1Q!Q!`

Alternatief: `testuser2` of `testadmin` (zelfde wachtwoord).
