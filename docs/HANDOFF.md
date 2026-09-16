# Handoff: Anusha Upadhyay portfolio

Everything decided and built so far, written so a fresh session can pick up without the original conversation. Last updated 16 September 2026.

---

## 1. What this is

A cinematic personal portfolio for Anusha Upadhyay, MS Computer Science at NC State (graduating December 2026), targeting machine learning engineering, applied AI and evaluation roles. TypeScript end to end.

The single idea: **every figure on the site is a grid of characters, not an image.** The flower, the portrait, every chart and graph are drawn from an eleven-character ramp rendered to a canvas. The site's thesis line is "Signal from noise", and every transition is that move: the characters of one figure come apart and settle as the next.

Owner: Anusha. Repo: `github.com/AnushaU1111/anusha-portfolio` (public). Local copy: `C:\Users\anush\Portfolio\anusha-portfolio`.

---

## 2. Design system

**Palette, three values only.** Background `#0b0708` (near-black, warm cast). Ink `#e6dfd8`. Rose `#c46e78` for emphasis and data. Muted text `#6f6366`. Hairlines `#1f1417`. Tokens live in `app/globals.css`.

**Type.** Cormorant (weights 300 and 400, with italic) for display and body. JetBrains Mono (300, 400) for figures, labels and anything numeric. Loaded via `next/font/google` in `app/layout.tsx`.

**The ramp.** `" .·:-=+o8O@"`, index 0 is empty. Defined once in `lib/ascii/ramp.ts`. Luminance maps to a ramp index; brightness in the rendered type carries the rest.

**The chars layer.** The photographic figures, the lily and the portrait, are sampled into the eleven and nothing else. The generated charts and graphs also carry an optional `chars` layer on the Grid: a literal character per cell, outside the ramp, for the brackets, slashes and markers that say what a node or a point *is*. The index still decides brightness, so the rule that category never rides on brightness is unchanged. Interpolation flips a cell's literal character at the midpoint of that cell's own eased ramp, so labels sweep in with the glyphs around them.

**Rules that were learned the hard way.**
- Brightness only ever encodes density or emphasis. Category is always carried by the glyph itself. An early emotion chart broke this and was unreadable.
- Never name a CSS class `hero` inside a figure; the page's `.hero` block is absolutely positioned and will steal the element. (Scoped CSS modules avoid this class of bug in the real build.)
- Every figure marked illustrative says so on the figure. Every number traces to a report, repository or poster. This is a stated commitment on the About page and the colophon.
- Layout rhythm: figures alternate sides. Lily right, portrait left, Pareto right, and so on.
- Headlines lead with the achievement, not the caveat. One acknowledged limitation per page, stated once. The acoustic page was rewritten after it foregrounded a weakness six different ways.

**Tone.** Concise, honest, low-flourish. No em dashes, no Oxford commas. Prose over bullets in copy.

---

## 3. Site structure (final)

Nine scenes in one scroll, plus a contact drawer and a colophon. Nav is **About / Work / Contact**. A "Method" section was designed and then cut as redundant; its through-line was folded into About.

| # | Scene | Section id | Entry figure | Pinned |
|---|---|---|---|---|
| | Cold open | `top` | lily assembling from noise; cursor brightens it | yes |
| 01 | About | `about` | portrait in characters, resolving toward the photograph | yes |
| 02 | Neuraluna AI | `neuraluna` | Pareto frontier | yes |
| 03 | Temple RAG | `temple-rag` | request-path pipeline | no |
| 04 | ReqTrace | `reqtrace` | knowledge graph | no |
| 05 | Affordability | `affordability` | corpus wall resolving into distributions | yes |
| 06 | Wearable acoustic | `acoustic` | log-mel spectrogram | no |
| 07 | Skin cancer | `skin-cancer` | contact sheet, one glyph per image | no |
| | Contact | `contact` | lily returns, dimmed | no |

Order rationale: Neuraluna opens because it is the most legible to a hiring manager. Skin cancer closes because the threshold judgement is the most senior thinking on the site. Temple sits second so the two systems-with-users projects are together and the two medical projects are not adjacent.

**Transitions.** Nothing cuts. Lily glyphs drift and re-form as the portrait; the resolved face scatters into plotted points; frontier points slide into pipeline nodes; pipeline nodes redistribute into a graph; graph nodes multiply into the corpus; cluster blobs stretch into frequency bands; bands fragment into the image grid; the grid contracts back into the lily. Only the lily ↔ portrait ↔ contact ones are built so far.

**Scroll.** Natural scroll, no hijacking. Four scenes pin for one viewport while they resolve; the rest resolve as they scroll into view. About eleven viewports total. Reduced motion: nothing pins, every figure renders resolved.

**Contact, twice, on purpose.** The closing scene ends the arc. A nav drawer (off-canvas panel from the right, focus trap, Escape, scrim click, `/#contact` route) serves someone mid-figure who just wants the email. Both read `content/links.ts` so they cannot disagree.

**Colophon** at `/colophon`, linked from the footer only. Shows the ramp, the three colour tokens, type, motion, stack, and a repository link. Outside the main scroll.

**No custom social preview image.** Designed, then dropped at Anusha's request. OG title and description tags remain.

---

## 4. Page content (headlines are final unless noted)

**Cold open.** Eyebrow: Anusha Upadhyay · ML engineer. H1: *Signal from noise.* Line: Machine learning systems for messy, high-stakes data. Hint: Move the cursor.

**About (01).** *I work where the data is messy.* Body covers NC State, VIT Vellore, Temple; the "pile of data nobody has made sense of" paragraph; the pull quote about evaluation being the work; then the folded-in method paragraph (thresholds from cost, per-class before average, held-out subjects, everything traces to a source). Facts row: Now / Recently / Focus. Location deliberately not here.

**02 Neuraluna AI, Summer 2026.** *Thirty-two models, one wrong default.* 32 models × 8 production agents scored on quality, cost, latency. Frontier exposed a dominated model in production; swap cut cost ~33% and improved quality and latency. 6 A/B-validated fixes. Chart labelled "one agent, representative", model names withheld, hover reveals a model's numbers and its dominating alternative.

**03 Temple RAG, Spring 2025.** *A patient who cannot read still needs the answer.* RAG chatbot for colorectal cancer screening over 1,000+ curated docs (USPSTF, ACG, textbook, colonoscopy Q&A). Ingestion via pdfplumber/PyPDF2, all-MiniLM-L6-v2 embeddings, three FAISS indexes with runtime-adjustable weights, hybrid semantic+keyword scoring with tunable alpha. Inputs: text, image+Tesseract OCR, PDF, voice via Whisper. Any language via langdetect + Google Translate, back-translated. gTTS audio out. Granite Guardian safety gate. Session memory, permanent audit log, one-click clear. 5 LLM configs via Ollama (Granite 3.3 2B, LLaVA, Granite Guardian) assessed on medical accuracy, hallucination rate, coherence; per-config scores not published. Advised by Dr Vikas Khurana (gastroenterologist) and Prof. Subodha Kumar. Semester Abroad Program.

**04 ReqTrace, CSC 510, Fall 2025.** *Every node points back to something someone said.* Whisper → spaCy NER → Neo4j graph. Nodes: requirement, feature, test, stakeholder. Edges: depends, validates, owns. Provenance: each node keeps a pointer to the utterance that produced it. 91% Codecov. Top 3 in class, recognised by Tim Menzies. Team of five, MIT, Zenodo DOI 10.5281/zenodo.17544380. Repo is `tiva710/SE_Project_2`. Graph instance, quote and timestamps in the mockup are illustrative.

**05 Affordability, NC State GRA, 2026.** *1.1 million posts, three model heads, one pass.* Preprocessing pipeline over 1.1M social posts; RoBERTa sentiment (cardiffnlp/twitter-roberta), DistilRoBERTa emotion (j-hartmann), BERTopic. Findings and topic labels withheld pending publication; figures show only distributions over the models' own label sets and unlabelled clusters. Two metrics are placeholders (see open items).

**06 Wearable acoustic, Spring 2026.** *Trained on ten people. Tested on three it had never heard.* Four-class frame-level classification from chest-mic recordings. Five-fold log-mel CNN + LightGBM over PANNs CNN14 embeddings, Viterbi decoding with per-class offset tuning. Real report: speech 0.90/0.96/0.93 (116,416), cough 0.76/0.82/0.79 (45,231), non-verbal 0.65/0.35/0.46 (26,331), other 0.96/0.96/0.96 (484,225); accuracy 0.93, macro F1 0.78, weighted F1 0.92; n = 672,203. Top 5 in the class competition. Non-verbal stated once as needing more data. Subject counts unconfirmed.

**07 Skin cancer, CSC 542, Spring 2026.** *Missing a cancer costs more than a false alarm.* HAM10000, 10,015 images, 4:1 benign:malignant (1,954 malignant), 70/15/15 stratified split, test n = 1,503. EfficientNet-B3, B5, multiclass-pretrained B5, EVA02 ViT; focal loss (α 0.75, γ 2.0), MixUp/CutMix, WeightedSampler, AMP + OneCycleLR, five-pass TTA weighted by validation AUC. AUC progression: LR 0.756 → B3 0.931 → B5 0.933 → B5+pretrain 0.936 → EVA02 0.962 → ensemble 0.964. Final: ROC-AUC 0.9640, recall 93.9%, precision 0.60, F1 0.730, accuracy 86.5%. Confusion at threshold 0.40: 1025 / 185 / 18 / 275. Threshold 0.40 chosen over 0.50 (best F1 0.808) for clinical screening. Team of three (Aditya Purohit, Anusha Upadhyay, Swasti Sadanand), NC State AI Student Symposium 2026.

**Contact.** *If you have messy data, I would like to see it.* Lede: graduating December 2026, looking for ML engineering, applied AI and evaluation roles. Links as labelled words (Email, GitHub, LinkedIn, Résumé) with the destination revealed on hover. Facts: Raleigh, North Carolina, open to relocating; full time from January 2027; US citizen, no sponsorship required. Footer: © 2026, colophon link, "Built in TypeScript". Phone number deliberately omitted.

---

## 5. Verified facts and their sources

- Email: `anushaupadhyay1111@gmail.com` (four ones). Confirmed by Anusha. The two-ones variant appears on some accounts and is wrong for the site.
- GitHub: `AnushaU1111`. LinkedIn: `linkedin.com/in/upadhyay-anusha`.
- Location: Raleigh, NC (earlier notes said Cary; corrected).
- Graduation: December 2026 (resume; confirmed over an earlier May 2027).
- Neuraluna: 32 models, 8 agents (resume; confirmed over earlier notes saying 24).
- Acoustic and skin cancer numbers: from classification reports and the symposium poster Anusha pasted.
- Temple: from a project description Anusha pasted.
- ReqTrace: from the `tiva710/SE_Project_2` README.

---

## 6. Open items

**Content placeholders (search the code for `TODO`).**
- Affordability: posts surviving preprocessing and topics recovered currently render as the literal string "TODO". Anusha said to ignore for now; they must be replaced or removed before launch.
- Acoustic: confirm 10 training / 3 held-out subjects. An earlier note also called speech the bottleneck; the report shows non-verbal is. Trust the report.
- Neuraluna: whether real model names can be shown.
- Availability date: January 2027 is inferred from graduation; confirm.
- Domain: not chosen. `metadataBase` in `app/layout.tsx` and the résumé link depend on it.
- `assets/lily.png` is the synthetic flower from the mockups. A real lily photograph converted through the same script will look better.

**Outside the repo.**
- Resume: drop the ReqTrace "impact analysis" claim (not in the completed milestones; graph comparison is listed as future work). Add the Zenodo DOI and the 91% coverage. Make sure the email is the four-ones version everywhere.
- GitHub: ReqTrace lives under `tiva710`, not Anusha's account; backend CI is failing there. Her profile has no README and pins forked notebooks. The portfolio repo itself is now the strongest thing on it.
- LinkedIn: same graduation date, email and project descriptions as the site.

**Flagged while building phase 05.**
- The colophon's opening line claimed every figure was drawn from the eleven. That stopped being true when the Pareto, pipeline and graph figures gained brackets, slashes and an X. The line has been rewritten to scope the ramp claim to the flower and the portrait. The `figures` row further down was already correct.
- The mockups disagree with each other and with the code on the scene denominator: `02 / 06` on 02-neuraluna, `06 / 06` on 07-skin-cancer, `07 / 07` on 03-temple-rag. The code says `/ 07` everywhere, which is the coherent reading: About is 01 and the six projects are 02 to 07. The mockups are the ones that are wrong.
- `docs/design/generators/` never had a Pareto or a pipeline script; only 05, 06, 07, 10 and the graph. Those two were written from the mockup images.
- The affordability corpus caption in mockup 05 says one glyph is about 3,000 posts. A wall that size holds nowhere near 1.1M at that rate. The number is now derived from the wall that was actually drawn (`postsPerGlyph`) instead of declared, so the caption can read it rather than assert it.
- The nav sits over the corpus wall and the contact sheet and gets hard to read. The corpus has been dropped a few cells to clear it; the contact sheet is still close. A small scrim behind the nav would settle it for good.

**Deferred design ideas.**
- Three.js point-cloud treatment for the lily (possible; heavier; post-launch, cold open and contact only).
- Mobile: figures must regenerate at lower column counts, not scale. Unsolved.

---

## 7. Repository state

**Commits on `main`** (Anusha has pushed the first two plus her own assets commit; the third and fourth exist in the working copy on her laptop and in the session, not yet pushed):
1. Scaffold: routes, content model, ASCII spine, drawer, CI.
2. (Anusha) assets added.
3. Add the field: scene targets, scroll interpolation, cold open and About.
4. Field: log startup errors, add `?motion` override.
5. Phase 05: chars layer, figure data in the content model, six generators, nine scenes, transition timing. (Written into the working copy by this session, not yet committed.)

Uncommitted in her working copy after the last file delivery: `suppressHydrationWarning` on `<body>` (silences Grammarly's injected attributes), `build` script changed from `pnpm grids` to `npm run grids`, and the phase 05 files. The `check` script now uses npm too, since pnpm does not run on her laptop.

**Layout.**
```
app/                 /, /colophon, 404; layout with fonts and OG tags
components/          Field (the persistent canvas), AsciiField (standalone figure),
                     Nav, ContactDrawer
content/             schema.ts (Zod), projects.ts, about.ts, profile.ts, links.ts
lib/ascii/           ramp, types, draw, imageToGrid, interpolate, noise, place, scenes
lib/ascii/figures/   canvas, context, index, pareto, pipeline, graph, corpus,
                     spectrogram, contactSheet
scripts/             build-grids.ts (assets/ → public/grids/*.json)
assets/              lily.png, portrait.png, portrait-mask.png (committed by Anusha)
tests/               18 vitest unit tests; playwright smoke test in tests/e2e
docs/design/         mockups 00–10, flow.png, plan.png, generators/ (python)
```

**Phases.** 01 scaffold done. 02 content model done. 03 field done. 04 cold open + About done. **05 done:** six figure generators in `lib/ascii/figures/` produce each project's entry grid from `content/projects.ts`, and all nine scenes are registered in `lib/ascii/scenes.ts`; verified in a headless browser at every scene. 06 contact drawer exists; closing-scene lily exists. **Next:** the scrolled detail figures for each project (bar charts, per-class report, confusion matrix, cluster map), which are DOM rather than canvas and read the same figure data. 07 chrome (scroll indicator, sitemap, favicon) not started. 08 performance/mobile not started.

**How the figures work.** `content/schema.ts` has a `FigureSpec` discriminated union and every project declares a `figure` alongside its metrics, so a figure and the caption beside it read one object. `lib/ascii/figures/index.ts` turns a spec into a Grid; each generator sizes itself from the viewport in cells rather than scaling, which is what makes mobile a regeneration. Two numbers are derived from the drawing rather than declared, so they cannot overstate it: `postsPerGlyph` for the corpus wall and `imagesPerGlyph` for the contact sheet, which is 1 on a desktop and higher where the sheet cannot fit. The Pareto ceiling is fitted so it passes through the recommended model, which is what puts that model on the frontier rather than merely drawing it there.

**How the field works.** `Field.tsx` mounts one fixed canvas. `lib/ascii/scenes.ts` declares scenes (figure builder, anchor, top offset, pinned, entry mode). `prepareScenes` builds each figure at the current viewport size and places it into a viewport-sized grid; a figure that fails to load leaves its own scene empty rather than taking the other eight with it. GSAP ScrollTrigger gives per-section progress; the active scene is the last one that has begun, where beginning means the section is about half on screen, not first visible. A pinned section gets a second, non-pinning trigger for its approach, and the approach is worth the whole resolve, so a pinned figure finishes arriving exactly as its section pins. A scene's grid is `interpolateGrid(entry, target, min(1, progress/0.6))`. The cold open's entry is time-driven (`assemble` tween). About sets `resolvesToNeutral`, which `drawGrid` uses to shift the palette. Lenis provides smooth scroll. `?motion=1` forces animation on, `?motion=0` off; reduced motion otherwise honoured.

---

## 8. Environment quirks on Anusha's laptop (Windows 11, ARM64, Node 24)

- **pnpm does not run.** Every invocation (shim, `.cmd`, `npx pnpm`) exits silently with no output. Cause unknown, possibly ARM-specific. **Use npm.** `npm install`, `npm run grids`, `npm run dev`. The `build` script is now manager-neutral.
- **PowerShell execution policy** was set to RemoteSigned for the current user during troubleshooting.
- **Google Fonts** fetch at build time; needs network. Worked on her machine.
- **Grammarly** injects `data-gr-*` attributes into `<body>` and triggers a harmless hydration warning; `suppressHydrationWarning` on `<body>` silences it.
- **"No animations"**: most likely Windows Settings → Accessibility → Visual effects → Animation effects is off, which Chrome reports as `prefers-reduced-motion: reduce`. Test with `matchMedia('(prefers-reduced-motion: reduce)').matches` in the console, or open `localhost:3000/?motion=1`. This was unresolved when the conversation ended.
- Claude's cloud workspace could not create the GitHub remote (API blocked) and could not push; Anusha created the repo on github.com and pushed. Claude wrote changed files directly into `C:\Users\anush\Portfolio\anusha-portfolio` via the desktop link, and Anusha commits and pushes. The desktop shell on her laptop was broken by a Windows update, so files were written one by one rather than extracted from an archive.

**Commands.**
```
npm install
npm run grids        # converts assets/ to public/grids/
npm run dev          # localhost:3000
npm run check        # typecheck + lint + unit tests (uses pnpm in package.json; run the three separately with npm if needed)
git add -A && git commit -m "..." && git push
```

---

## 9. Design artefacts

`docs/design/` in the repo has every mockup at 1440 wide: `00-cold-open`, `01-about`, `02-neuraluna`, `03-temple-rag`, `04-reqtrace`, `05-affordability`, `06-acoustic`, `07-skin-cancer`, `08-contact`, `09-contact-drawer`, `10-colophon`, plus `flow.png` (order and transitions) and `plan.png` (build plan). The Python generators that drew the ASCII figures for the mockups are in `docs/design/generators/` and are the reference for the TypeScript ports in phase 05.

Discarded along the way: an amber "Instrument Serif + terminal" first concept; a method/principles page with a self-graded coverage matrix; an OG image; a work index on the contact page; the About page's location line; a right-hand contact panel on the intro page (became the nav drawer instead).

---

## 10. If starting a new session

Say: "Continue the anusha-portfolio build from docs/HANDOFF.md. Phase 05: port the six figure generators to TypeScript and register them as scenes." Attach or point at the repo. The two things most likely to need attention first are the reduced-motion question on Anusha's laptop and committing the two small uncommitted edits.
