# Question Generator — Project Notes

## Overview
Client-side web app for EFL learners (Elementary–Intermediate) to practice forming questions from declarative sentences. Users input a sentence and select one or more question types; the app generates the questions with labels explaining what each one asks about.

## Question types
- **Closed (yes/no)** — auxiliary or do-support fronted: "Did Charles love Di for 10 years?"
- **Tag** — sentence + negative tag: "Charles loved Di for 10 years, didn't they?"
- **Open (wh-)** — one question per major constituent (subject, object, PP modifiers): "Who loved Di?", "How long did Charles love Di?"

## Stack
- React 18 + TypeScript + Vite + Tailwind CSS
- NLP: compromise.js v14 (client-side POS tagging — no backend needed)
- Deployment: GitHub Pages via GitHub Actions

## Local development
```
cd question-generator-client
npm install
npm run dev
```

## Build
```
npm run build
```

## Deployment
Pushing to `master` triggers `.github/workflows/deploy.yml`, which builds and deploys to:
`https://john6938.github.io/new_question_generator/`

## Push credentials fix (Windows)
If `git push` returns 403:
1. Control Panel → Credential Manager → Windows Credentials → remove `git:https://github.com`
2. `git remote set-url origin https://john6938:YOUR_TOKEN@github.com/john6938/new_question_generator.git`
3. `git push -u origin master`

## Architecture
```
question-generator-client/
  src/
    App.tsx                      # UI — input + output screens
    generators/
      questionGenerator.ts       # Core NLP and question generation logic
    assets/tnt-logo.svg
  .github/workflows/deploy.yml
```

## TODO
- [ ] Check overall accuracy of the tool across a range of sentence types
- [ ] Fix closed question regular verb manipulation (e.g. "loved" → "lov" instead of "love")
- [ ] Ensure all possible open questions are generated for each sentence

## Known limitations
- Common people nouns ("students", "children") generate "What" instead of "Who" in subject questions (compromise does not tag them as Person)
- Time adverbials without a preposition ("last week") bundle into the direct object
- Complex and subordinate clauses may not parse cleanly
