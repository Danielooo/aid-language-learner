# [In Progress] IDEEFASE


#### **Doel van de applicatie**
De applicatie helpt gebruikers op een praktische manier om Spaans te leren door middel van Nederlandse en Spaanse woord- en zinscombinaties. Gebruikers kunnen oefenen, hun eigen leermateriaal laten genereren met de AI SDK en toevoegen aan de set oefeningen

#### **Opgelost probleem**
Bestaande apps zoals Babbel of Duolingo bieden slechts de oefeningen en categorieën die zij zelf hebben bedacht. Als je bijvoorbeeld iets specifieks gaat doen in het buitenland — zoals een medische afspraak of werkgerelateerde communicatie — kun je niet je eigen categorie aanmaken of je oefeneningen afstemmen op jouw situatie.  
Dat is de toegevoegde waarde van deze applicatie

#### **Belangrijkste functionaliteiten**
1. **Registreren en inloggen**  
   Gebruikers kunnen een persoonlijk account aanmaken. Via Supabase wordt authenticatie en autorisatie geregeld. 

2. **Vooraf gegenereerde oefeningen**  
   De applicatie bevat een database met vooraf samengestelde oefeningen (Nederlands–Spaans). Gebruikers kunnen deze ophalen en maken. Antwoorden en resultaten worden opgeslagen in Supabase, zodat voortgang later inzichtelijk is.

3. **Zelf oefeningen toevoegen**  
   Gebruikers kunnen eigen oefeningen genereren en toevoegen. Deze kunnen privé blijven of ter goedkeuring aangeboden worden voor de algemene publieke database. Op deze manier kunnen gebruikers hun eigen categorieën bouwen.

4. **AI-chatfunctie binnen oefeningen**  
   Tijdens of na een oefening kan een gebruiker vragen stellen aan een geïntegreerde AI-chat. De AI geeft uitleg over grammatica, vervoegingen of alternatieve vertalingen. Zo wordt taal leren interactiever en persoonlijker. Er worden guardrails ingesteld die zorgen dat de vraag alleen over de specifieke oefening kan gaan

5. **Voortgangsdashboard**  
   Een persoonlijk dashboard laat zien hoeveel woorden en zinnen de gebruiker heeft geleerd, welke thema’s goed gaan en waar nog verbetering mogelijk is. Dit is gebaseerd op opgeslagen scores en oefenresultaten in Supabase.

6. **Fallback functionaliteit:**
   Voor het geval een externe databron vereist is voor de eindopdracht, wordt de **TATOEBA API** gekoppeld om willekeurige Spaanse zinnen op te halen. Deze API levert alleen zinnen en vertalingen; Supabase wordt dan ingezet om  de scores en voortgang te beheren. Dat wordt dan gekoppeld aan het id van het Tatoeba oefening


#### **Technische opzet**
De backend en database draaien op **Supabase**, waar tabellen voor gebruikers, oefeningen, resultaten en feedback aanwezig zijn. RLS-policies waarborgen dat gebruikers alleen hun eigen voortgang en privé-oefeningen kunnen beheren. De AI-functionaliteit wordt ingebouwd via **OpenAI**.
Voor het geval een externe databron nodig is, wordt de **TATUBA API** gekoppeld om willekeurige Spaanse zinnen op te halen. Deze API levert de zinnen en vertalingen; Supabase beheert de scores en voortgang.


---


## TODO

Gebleven bij execute plan: /Users/daniel/.cursor/plans/tatoeba_audio_translate_26f4fa35.plan.md 

- ~~In dev/ gegenereerde oefeningen quiz feature bouwen~~
- ~~In dev/ oefeningen maken op basis van Supabase data~~
- ~~In dev/ dashboard maken op basis van gemaakte oefeningen~~
- ~~In dev/ oefeningen quiz chat functie toevoegen waar je vragen kan stellen over de oefening~~
- ~~In dev/ inlog maken, account waar je persoonlijke dashboard, oefeningen zijn te zien~~
- **Tatoeba audio files ophalen**
   Alle audio file metadata ophalen en in een filterbare tabel zet in de UI
   Bij de oefening de auteur + bron + license vermelden
   Mogelijk om audio files in Bucket van Supabase te zetten?
   Mogelijk om altijd te refereren naar directe url?
- **Admin-knop:**  
  Haalt in één keer 100 Tatoeba audio files op en verrijkt de bijbehorende metadata.
  - Transcript ophalen:
    Voor elke audio file wordt indien mogelijk automatisch het transcript opgehaald.
  - Verrijken met categorie/onderwerp:
    - Bestaande categorieën ophalen uit Supabase.
    - Met de AI SDK categorieën toewijzen aan de nieuwe audio files, zoveel mogelijk uit de bestaande categorieën.
    - Gekozen categorie (label/tag) toevoegen aan de audio file metadata.
  - Batch toevoeging in database: 
    Voeg alle verrijkte audio files in bulk toe aan Supabase. Deze batch valt binnen het bereik "algemeen toegankelijk".
- **Updaten Ideefase functionaliteiten**

## Nice to haves
- markAsAlsoCorrect functie binnen quiz. Alternatieve vertalingen
- Inloggen met SSO 
   (Login knop met Google, of Github). 
   (Kan ook EU: Zitadel of LogTo)
- 


## Settings
- Naar sandbox


## Gesprek met Tim:
Kernfunctionaliteiten uitbouwen (Must haves)
- taboeba api wel gebruiken
- audio files gebruiken / ophalen. 1 knop als admin
- metadata ervan verrijken
- doorzoekbaar maken, toolcalling op los kunnen laten