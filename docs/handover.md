# Film Tool Hub: handover notes

Read this first, then `docs/tool-guide.md` (how a tool fits the hub) and `docs/next-steps.md` (what's next).

## About the owner
Tim McGlinchey is a film lecturer at Belfast Met. He isn't technical, so:
- explain things in plain, simple steps;
- don't use jargon;
- when he has to do something himself (in Google Cloud, Cloudflare or GitHub), give click-by-click instructions.

## What the site is
- **Address:** https://filmtoolhub.com
- **Hosting:** GitHub Pages from this repo's `main` branch. The domain is bought through Cloudflare. DNS: four A records for GitHub Pages, plus `www` as a CNAME to `timmcglinchey.github.io`, all with the grey cloud (DNS only).
- **Visitors:** sign in with Google. Each project is saved to the visitor's own Google Drive, in a "Film Tool Hub" folder with "Projects" and "Backups" folders inside it.
- **Google OAuth client:** set in `hub/config.json`.
  - The app is still in **Testing** mode, so every user must be added as a test user (up to 100). Publishing the app is a later step.
  - Authorised origins: timmcglinchey.github.io, filmtoolhub.com and www.filmtoolhub.com.
- **Admin controls:** shown only to emails listed in `adminEmails` in `hub/config.json`.

## How it's built
- `index.html`, `hub/hub.css` and `hub/hub.js` make up the hub.
- `hub/kit.css` holds the shared styles: `--fth-*` design tokens and `.fth-*` components. Fonts are Archivo and JetBrains Mono, with Courier for screenplay text.
- `tools/tools.json` is the manifest:
  - six categories, each with its own colour;
  - each tool's `id`, `name`, `desc`, `category`, `tags`, `icon` and `file`;
  - a `rev` value in the format YYYYMMDDHHMM. **Bump `rev` whenever a tool file changes.**
- Each tool is a single file, `tools/<id>.html`. The hub loads it in an iframe and injects into it:
  - the kit CSS and the category accent;
  - the light/dark theme engine;
  - the per-project storage shim.
- **Storage shim:** it gives each project its own copy of `localStorage` and IndexedDB. It also provides `window.fthStore` and `window.fthAutosave`, and `window.__fthHub` exposes `save` and `projectInfo`.
- **Standalone blocks:** each tool file contains a `<!--fth-standalone-->…<!--/fth-standalone-->` block, so the file also works when opened on its own. Run `python3 scripts/refresh_standalone.py` after editing `tools.json` or adding a tool; it regenerates these blocks and the category labels.
- **Per-tool settings:** `hub/hub.js` has a per-tool settings table (`kit: true` etc.) and an icon set (`P('<svg paths>')`). A new tool needs an entry in both.
- **Tools that read each other's saved data:**
  - Casting Tracker reads Script Breakdown's IndexedDB (`script-breakdown`, key `last`) and Script Development's data.
  - Location Recce reads the Production Schedule Builder (`fth-schedule-v1`) and writes to the Call Sheet Builder (`fth-callsheet-v1`).
  - If a tool's saved data changes shape, check these links still work.
- **No HTML exports.** Tools must not offer to download a copy of the page. PDF, CSV, Excel and .json data exports are fine.

## Adding or updating a tool (Tim sends a file)
1. Put the file at `tools/<id>.html`.
2. Match the house style:
   - an `fth-head` header with the eyebrow `<span class="fth-eyebrow" data-fth-cat>NN · Category</span>`;
   - colours mapped to the kit tokens;
   - no Google font links of its own;
   - saving through `fthStore`/`fthAutosave` or `localStorage`.
3. Add the tool to `tools/tools.json` and to the per-tool settings table and icon set in `hub/hub.js`.
4. Run `scripts/refresh_standalone.py`.
5. Test it inside the hub, in light and dark, and check that switching projects keeps each project's work separate.
6. Commit and push to `main`. The site updates about a minute later.

## Offline single-file version
`python3 scripts/build_offline.py` builds `Film Tool Hub (offline).html`, a file you can double-click with everything embedded. Google sign-in is off in it and the admin controls are on. It was used while GitHub was suspended (9 to 12 November 2026), and is handy for sending Tim a preview.

## Testing tips
- Playwright with Chrome works well.
- The workspace can't reach the font, pdf.js or jsPDF CDNs, so block or stub those requests.
- PDF tools: inject a local copy of pdf.js into the tool's frame. The npm package `pdfjs-dist@3.11.174` is the same version the tools use.

## Other things Tim has
- **"Film Tool Hub - tool session prompts.docx":** one copy-paste prompt per tool for separate improvement sessions, plus a "new tool" prompt. Update it when tools are added or renamed.
- **A Claude Docs guide** explaining how the parts fit together.
