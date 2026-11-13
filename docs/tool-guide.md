# Working on a Film Tool Hub tool

Attach this guide, plus the tool's HTML file, when you ask Claude (or anyone) to improve a tool. It explains the few rules that keep the tool working inside Film Tool Hub.

## What the file is

Each tool is one self-contained HTML file. It runs inside Film Tool Hub, which gives it the shared look, light/dark mode, projects, saving and Google Drive. The file also opens on its own in a browser, for trying out changes.

## Rules

1. **Return the whole file, with the same file name.** Make changes in place. Don't rename the tool or split it into several files.

2. **Leave the block between `<!--fth-standalone-->` and `<!--/fth-standalone-->` as it is.** It only exists so the file looks right when opened on its own; the hub removes it. To change the look of every tool, edit `hub/kit.css` in the site instead.

3. **Use the shared look, not new colours or fonts.**
   - Colours come from the `--fth-*` CSS variables: `--fth-bg`, `--fth-bg2`, `--fth-surface`, `--fth-surface2`, `--fth-surface3`, `--fth-line`, `--fth-line2`, `--fth-line3`, `--fth-text`, `--fth-muted`, `--fth-faint`, `--fth-good`, `--fth-warn`, `--fth-bad`. The tool's category colour is `--fth-accent` (for fills), `--fth-accent-ink` (for text), `--fth-accent-soft` and `--fth-accent-line`, with `--fth-on-accent` for text on an accent fill.
   - Fonts: `var(--fth-display)` (Archivo) for text and headings, `var(--fth-mono)` (JetBrains Mono) for labels and numbers, and `var(--fth-script)` (Courier Prime) for screenplay text only.
   - Ready-made parts: the header (`.fth-head` with `.fth-id`, `.fth-eyebrow[data-fth-cat]`, `.fth-title`, `.fth-actions`), buttons (`.fth-btn`, plus `.primary`, `.ghost`, `.sm`, `.icon`, `.danger`), fields (`.fth-input`, `.fth-label`), section headings (`.fth-sec`), notes (`.fth-tip`, `.fth-warn`, `.fth-info`), cards (`.fth-card`), the toast (`.fth-toast`) and printed-page previews (`.fth-paper-wrap`, `.fth-paper`).
   - **Light and dark:** the hub sets `data-theme="light"` or `"dark"` on the page, and the `--fth-*` variables switch automatically. Don't add a light/dark switch to the tool. Check that anything new looks right in both.
   - A printed-page preview stays white in both modes. Colours that carry meaning (breakdown categories, lining colours, department colours and so on) stay as they are.

4. **Keep saved work safe.**
   - Don't change the names the tool saves under (its localStorage keys or IndexedDB names). Saved work is filed under them.
   - If you change the shape of what's saved, the tool must still open work saved in the old shape.
   - Anything saved with `localStorage` or IndexedDB is automatically kept per project and included in Save, backups and Google Drive. Tools that save through `window.fthStore` / `window.fthAutosave` (look for `/* fth-adapter */`) must keep that code, and must check that `window.fthStore` exists before using it.

5. **No "download a copy of this page" features.** Saving is done by the hub's Save button. Exports people actually hand out (PDF, Excel, CSV, images) are fine.

6. **Exports also go to Documentation.** The hub keeps a copy of every export in the project's Documentation folder, through one shared helper, `window.fthDocs`. It only exists inside the hub, so always check for it first; opened on its own, the tool just exports as normal. Never store documents yourself.
   - A real file (PDF, CSV, Excel, picture): `window.fthDocs.save({type: 'Shot List CSV', filename: 'my-film.csv', blob})`.
   - A tool that uses the print window: call `window.fthDocs.page({type: 'Call Sheet PDF', name: 'Call Sheet 12 May'})` at the moment you would call `window.print()`. It keeps the page exactly as it prints.
   - Both return `true` when the person pressed **Save to Documentation**. That means: skip the download or the print window. So the pattern is `if (!fthDocs.save(...)) download(...)`.
   - Give each tool a hidden button with `data-fth-doc hidden`, and switch it on with `window.fthDocs.attach(button, [{label: 'Shot List PDF', fn: exportPdf}, …])`. One item saves straight away; several open a small menu.
   - `type` is the kind of document. Saving the same `type` again makes the next draft. Use `group` when one type covers separate things (for example one picture per scene).
   - A new tool's document types also go in the `DOC_TYPES` list in `hub/hub.js`, which is what gives it a folder.
   - Project and backup files (`.json`) stay as downloads only.

7. **Outside services.** Libraries from cdnjs.cloudflare.com are fine. If a change makes the tool send anything to a new website or service, say so, because the privacy policy (privacy.html) would need updating.

## Putting a finished tool back on the site

Replace its file in the `tools` folder on GitHub. Then set that tool's `rev` in `tools/tools.json` to the current date and time written as YYYYMMDDHHMM (for example `202611091430` for 9 November 2026 at 14:30), so everyone gets the new version. Or hand the file to Claude in the main Film Tool Hub chat to do both.
