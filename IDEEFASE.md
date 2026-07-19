---
# Privé scratchpad — niet voor AI-guidance of edits.
ai:
  read: false
  edit: false
  guidance: false
cursor:
  ignore_for_guidance: true
  allow_edit: false
---

# [In Progress] IDEEFASE

#### **Doel van de applicatie**

De applicatie helpt gebruikers op een praktische manier om Spaans te leren door middel van Nederlandse en Spaanse woord- en zinscombinaties. Gebruikers kunnen oefenen, hun eigen leermateriaal laten genereren met de AI SDK en toevoegen aan de set oefeningen

#### **Opgelost probleem**

Bestaande apps zoals Babbel of Duolingo bieden slechts de oefeningen en categorieën die zij zelf hebben bedacht. Als je bijvoorbeeld iets specifieks gaat doen in het buitenland — zoals een medische afspraak of werkgerelateerde communicatie — kun je niet je eigen categorie aanmaken of je oefeneningen afstemmen op jouw situatie.  
Dat is de toegevoegde waarde van deze applicatie.

## Gesprek met Tim:

Kernfunctionaliteiten uitbouwen (Must haves)

- taboeba api wel gebruiken
- audio files gebruiken / ophalen. 1 knop als admin
- metadata ervan verrijken
- doorzoekbaar maken, toolcalling op los kunnen laten



#### **Belangrijkste functionaliteiten**

1. **Registreren en inloggen**
  Gebruikers kunnen een persoonlijk account aanmaken. Via Supabase wordt authenticatie en autorisatie geregeld.
2. **Vooraf ophalen en verrijken audio oefeningen**
  Een (super)user kan bij Tatoeba API een x aantal audio oefeningen ophalen en in globally beschikbaar maken. De oefeningen hebben alleen audio file en transcriptie. De admin kan in combinatie met de AI SDK de oefening verrijken met oa NL vertaling. Er is een UI beschikbaar die laat zien wat er in de Supabase database staat
3. **Zelf oefeningen toevoegen**
  Middels de AI SDK en eigen API key kunnen er oefeningen worden gegenereerd door de user die kunnen worden opgeslagen in Supabase. De oefeningen kunnen persoonlijk zijn of global (voor iedereen toegankelijk)
4. **AI-chatfunctie binnen oefeningen**
  Tijdens of na een oefening kan een gebruiker vragen stellen aan de AI SDK. De AI geeft uitleg over grammatica, vervoegingen of alternatieve vertalingen. Zo wordt taal leren interactiever en persoonlijker. Er worden guardrails ingesteld die zorgen dat de vraag alleen over de specifieke oefening kan gaan
5. **Taaloefeningen kunnen maken**
  Een UI om oefeningengroepen te kunnen kiezen om te maken. Opties flashcards en zelf typen (met evt hint).
6. **Oefeningen herhalen met eerder zwak resultaat**
  Spaced repetition, optie om oefening niet meer te doen.
7. **Voortgangsdashboard**
  Een persoonlijk dashboard laat zien hoeveel woorden en zinnen de gebruiker heeft geleerd, welke thema’s goed gaan en waar nog verbetering mogelijk is. Dit is gebaseerd op opgeslagen scores en oefenresultaten in Supabase.

---






====================================================

**Global**

- loading state maken
- skeleton loader maken
- standaard verversknop component (met loading state)
- Audio oefeningen moeten door de hele app een tag krijgen (Audio) of kolom Audio > Ja/Nee
- Zoeken binnen data gebeurt overal zonder onderscheid in caps of met leestekens




## Nice to haves

- Inloggen met SSO 
 (Login knop met Google, of Github). 
 (Kan ook EU: Zitadel of LogTo)
- Eigen api key toevoegen
- Grammatica theorie en oefeningen

