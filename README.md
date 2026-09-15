# Anusha Upadhyay — portfolio

A cinematic portfolio in which every figure is a grid of characters rather than an image. TypeScript end to end.

## Structure

Nine scenes in one scroll, plus a colophon and a contact drawer available from the nav on every scene.

| # | Scene | Entry figure | Pinned |
|---|---|---|---|
|   | Cold open | the lily, assembling from noise | yes |
| 01 | About | portrait resolving toward the photograph | yes |
| 02 | Neuraluna AI | Pareto frontier | yes |
| 03 | Temple RAG | request path | |
| 04 | ReqTrace | knowledge graph | |
| 05 | Affordability | corpus into distributions | yes |
| 06 | Wearable acoustic | log-mel spectrogram | |
| 07 | Skin cancer | contact sheet, one glyph per image | |
|   | Contact | the lily returns | |

Design mockups for every scene, the flow map and the build plan are in `docs/design/`.

## Principles the code enforces

- **One content model.** Every number on the site lives in `content/` behind a Zod schema (`content/schema.ts`). A figure and the caption beside it read the same object, so they cannot disagree. `pnpm test` fails if the model is malformed.
- **One links module.** The closing scene and the nav drawer both read `content/links.ts`. An address is edited in exactly one place.
- **One ramp.** `lib/ascii/ramp.ts` is the eleven-character alphabet every figure is drawn from. Brightness only ever encodes density or emphasis. Category is always carried by the glyph.
- **Illustrative figures say so.** A scene lists its illustrative figures in `illustrative`, and the figure renders that note.

## Layout

```
app/                 routes: /, /colophon, 404
components/          AsciiField (canvas renderer), Nav, ContactDrawer
content/             schema + the data every scene reads
lib/ascii/           ramp, image→grid conversion, grid interpolation
scripts/             build-grids.ts, runs before next build
assets/              photographic sources (see assets/README.md)
public/grids/        generated grids, gitignored
tests/               vitest unit tests, playwright smoke test
docs/design/         mockups and plan
```

## Commands

```
pnpm install
pnpm dev          # http://localhost:3000
pnpm check        # typecheck + lint + unit tests
pnpm e2e          # playwright smoke test against the dev server
pnpm build        # generates grids, then next build
```

Node 22 and pnpm 10.

## Build phases

1. Scaffold — this commit. Routes, content model, tokens, CI.
2. Content model — done here; TODOs below remain.
3. AsciiField — renderer exists; scene targets and scroll interpolation next.
4. Cold open and About — first two scenes on the field.
5. Six project scenes.
6. Contact, twice — closing scene and drawer share `content/links.ts`.
7. Chrome — scroll indicator, OG image, sitemap, favicon.
8. Performance and access — reduced motion, mobile grids, Lighthouse.

## Open items before launch

Search the codebase for `TODO`.

- Affordability: real figures for posts surviving preprocessing and topics recovered, or drop both metrics.
- Acoustic: confirm ten training and three held-out subjects.
- Neuraluna: whether real model names can be shown.
- Profile: confirm availability date.
- `metadataBase` in `app/layout.tsx` once the domain exists.
- `assets/`: add `lily.png`, `portrait.png`, `portrait-mask.png`.

## Outside this repo

- Resume: drop the ReqTrace "impact analysis" claim, add the Zenodo DOI (10.5281/zenodo.17544380) and the 91% coverage.
- GitHub: ReqTrace lives at `tiva710/SE_Project_2`; nothing is under your own account yet.
