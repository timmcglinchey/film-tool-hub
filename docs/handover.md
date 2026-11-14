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
- **Shared projects** (added 12 November 2026): see "How shared projects work" below. They need the **Google Picker API** switched on in the Google Cloud project. `hub/config.json` can also take an optional `googleApiKey` (a browser key limited to the Picker API and the site's addresses); the Picker is built without one if it's missing.

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
- **How shared projects work** (all in `hub/hub.js`, the "shared projects" section). There is no server; everything goes through the project's one Drive file.
  - **Share:** the owner adds crew as editors of the file (Drive permissions) and marks it `shared: '1'` in the file's `appProperties`. Crew open `#/join/<fileId>`; because the site only has the `drive.file` permission, they must choose the file once in Google Picker before the site can read it. After that it shows up in the normal Drive sync as a file they don't own (`p.sharedBy`).
  - **Tracking changes:** the storage shim tells the hub exactly which localStorage key or IndexedDB database each tool wrote (`__fthHub.dirty`), kept in `p.dirty`.
  - **Save** (`sharedSave`): fetch the Drive copy if it has changed (`headRevisionId` differs from `p.driveRev`), lay only the `p.dirty` items on top (`mergeSnap`), upload, then check the revision list in case someone saved at the same moment and merge again if so. `fth-tool-data` (the `fthStore` database every tool shares) is merged entry by entry, by its `<tool>:` key prefix.
  - **Staying up to date:** while a shared project is open the hub checks the file every 8 seconds (`tick`) and pulls in other people's saves (`syncDown`).
  - **One editor per tool:** a hold is a note on the file, `appProperties["lk.<tool>"] = time|email|session|name`; a request is `rq.<tool>`. A hold lapses 5 minutes after its last heartbeat; the hub lets go after 4 minutes without activity, saving first. Tools not held are view-only: the shim drops their writes and blocks typing (`__fthHub.readOnly`).
  - **Crew list** (added 13 November 2026): `p.crew = [{email, name}]` with `p.crewAt`, edited only by the owner in the Share box (a name beside each email when adding; click a name later to change it). It travels in the project file's `project` details and everyone takes the newest one (`takeCrew`). Tools ask for it with `__fthHub.people()`, which returns `[{name, email, role, me}]`, owner first, and `[]` when the project isn't shared. The Task Board uses it for its Who list (`getProjectPeople` in `tools/tasks.html`). Tasks store the name, not the email, so renaming someone doesn't rename them on existing tasks. `tests/sharing/test6.js` covers this.
  - **Roles and earlier names:** each crew entry can also carry `role` (typed in the Share box, with suggestions; the owner has their own row) and `aka` (the names they had before a rename, so tasks filed under an old name still count as theirs). `people()` returns `{name, email, role, me, owner, aka}`.
  - **Conversations** (added 13 November 2026, hub.js "Conversations"): in a shared project the tab strip of every tool has a **Conversation** button that opens a panel beside the tool. Comments belong to the hub (the `msgs` store), not the tool, so nobody needs to hold the tool to write one. Each is `{id, tool, text, to:[emails], by, at, mod, deleted}`; `tool: '*'` is the whole-project conversation. They travel in the project file as `snap.msgs` and are merged one by one (`msgsMergeIn`), and posting one sends the project file straight away (through `p.docsDirty`, like Documentation). What a person has read is kept per browser in `p.msgSeen`.
  - **My work** (`#/me`, hub.js "My work"): the signed-in person's open tasks (read from the Task Board's saved data, matched by name), comments that tag them or are for everyone, and the documents they saved. The **My work** button's badge counts new comments for them plus their tasks due; the **Task Board** button in the top bar shows the tasks-due count.
  - **Crew names inside tools:** `PEOPLE_FIELDS` in hub.js lists, per tool, the name fields that should offer the crew (Call Sheet, Risk Assessment, Location Recce). The shim attaches a suggestion list to them; they stay ordinary text boxes, so any name can be typed. Tools can also call `window.fthPeople()`: the Call Sheet's **Add project crew** button and Script Coverage's default reader and comment names use it.
  - **Sign-off:** a document in Documentation can be signed off (`signed: {email, name, at}` on its entry); anyone on the project can do it or take it back. `tests/sharing/test7.js` covers conversations, My work, the name fields and sign-off.
  - **When Drive won't show the file** (`sh.lost`, set only when the look at the file itself fails in `tick1`): crew are told they've lost access and can choose the file again (**Open it again**); the owner is told the file can't be opened or is in the bin, never to "ask the owner". Every time Google connects, `tokenIsFor` checks the connection belongs to the person signed in to the hub; with two Google accounts in one browser Google can hand back the other one, and that is refused with an explanation. `tests/sharing/test5.js` covers this.
  - **Unsaved changes in a tool someone else now holds** are never pushed: they're backed up locally and replaced by the shared version (`strand`).
  - **Tests:** `node tests/sharing/run.js` runs two pretend people against a pretend Google Drive (needs Playwright). Real Google sign-in can't be tested off the live site, so check with two real accounts after any change here.
- **Layout** (changed 14 November 2026): two rows. The top bar (`#bar`) has the logo, project picker, **Task Board**, Documentation, My work, Save, Share, Google account and theme. Under it, the tab strip (`#tabbar`, height `--tabbar`) holds pinned then open tools as compact tabs, with the open tool's Conversation / Reload / New tab / ⋯ buttons at its right end. It shows on every page; anything placed under the bars uses `--top` (bar + strip) as its offset.
- **Task Board** (changed 14 November 2026): no longer a card in the tools grid or a tab. The **Task Board** button (`#tasksBtn`, `TASKS` in hub.js) opens it like a page; underneath it is still the `tasks` tool in a frame, so storage, locking and Conversations work as for any tool. Leaving it closes its frame, which saves and frees it in a shared project. Tasks are still kept per project.
- **Pinned tools** (added 13 November 2026; in `hub/hub.js`, the "pinned tools" section). A pin keeps a tool's tab at the left of the tab strip even when the tool isn't open. Pins belong to the person, not the project.
  - In the browser they're kept in `localStorage` under `filmtoolhub-pins`, one list per signed-in email (and one for "not signed in").
  - Once signed in, they're also kept in a small file, `Settings.filmtoolhub.json`, in the person's Film Tool Hub folder on Drive (marked `fth: 'settings'`). `syncPins` compares the two and the most recent change wins. It runs whenever Google is connected, after a pin changes, and when the person comes back to the page.
  - Pins made on a device before signing in are added to the person's own pins, not swapped for them.
  - `tests/sharing/test4.js` covers this.
- **Documentation** (added 13 November 2026; in `hub/hub.js`, the "Documentation" section, plus the `fthDocs` part of the storage shim). A page (`#/docs`, button in the top bar) with one folder per tool, holding a copy of every export made in the current project.
  - **One helper.** Tools never store documents themselves. They call `window.fthDocs.save({type, filename, blob})` for a real file, or `window.fthDocs.page({type, name})` for a tool that uses the print window. Both end up at `window.__fthHub.saveDoc`. `fthDocs` doesn't exist when a tool is opened on its own, and every tool checks for it. `docs/tool-guide.md` rule 6 shows the pattern.
  - **Print-window tools** (Script Development, Coverage, Casting, Task Board, Shot List, Call Sheet, Risk Assessment, Schedule, Recce) can't hand over a PDF, so the hub keeps a "print-ready page": the page as it prints, with print-only styles made permanent and everything that doesn't print removed (`capture` in the shim, `prunePage` in the hub). In Documentation, Open shows it and "Save as PDF" opens the print window.
  - **Drafts.** Saving never overwrites. Each save gets the next draft number for that tool and `group` (the document type, or type + subject such as a scene name). The highest live draft is "Latest". A deleted draft's number isn't reused.
  - **Which tools have folders:** the `DOC_TYPES` list in `hub/hub.js` (16 tools). The three pipelines and the three labs have no exports, so no folder.
  - **Where it's kept:**
    - Always in this browser: the hub's own database gained two stores, `docs` (the list) and `docfiles` (the files), both filed by project id.
    - Signed in, your own project: each file is also uploaded to **Film Tool Hub → Documentation → project name → tool name** in the person's Drive (`docsPush`), marked `fth: 'doc'`. Files found there are added to the list (`docsPull`), which is how a second computer gets them; the file itself is fetched the first time it's opened.
    - Shared project: the list **and the files** travel inside the shared project file (`snap.docs`, `snap.docFiles`). This is deliberate: Google only lets each crew member's sign-in open files they picked, and the project file is the one file everyone has picked. Saving a document in a shared project therefore saves the project straight away. The owner's hub also copies everyone's documents into the owner's Drive folder. Shared Documentation is capped at about 200 MB so saving stays quick.
  - **Backups** hold the list, not the files. Restoring a backup puts the list back as it was (`docsRestore`). A deleted document's file is kept for 30 days (in the browser and in Drive's bin) so a restore can bring it back.
  - **Storage warning:** without sign-in, a message appears when the browser's storage is over 80% full.
  - **Not saved to Documentation:** `.json` project and backup files.
  - **Tests:** `node tests/docs/run.js` (three files: the tools, the page, Drive and sharing). Set `FTH_TEST_LIBS` to a folder with local copies of the PDF and Excel libraries to include those steps; the top of `tests/docs/test1.js` lists the file names.
  - **Still needs a real-world check:** Drive upload and sharing were only tested against the pretend Google Drive. Check on the live site with two real accounts.
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
- Playwright with Chrome works well. `node tests/sharing/run.js` runs the shared-project tests.
- The workspace can't reach the font, pdf.js or jsPDF CDNs, so block or stub those requests.
- PDF tools: inject a local copy of pdf.js into the tool's frame. The npm package `pdfjs-dist@3.11.174` is the same version the tools use.

## Other things Tim has
- **"Film Tool Hub - tool session prompts.docx":** one copy-paste prompt per tool for separate improvement sessions, plus a "new tool" prompt. Update it when tools are added or renamed.
- **A Claude Docs guide** explaining how the parts fit together.
