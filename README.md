# Film Tool Hub

The website for Film Tool Hub: 14 filmmaking tools in one place, with projects and saving.

## What's in this folder

| File or folder | What it is |
| --- | --- |
| `index.html` | The hub page: the home screen people see first |
| `hub/hub.css` | How the hub page looks |
| `hub/hub.js` | How the hub works (tabs, projects, saving, light/dark) |
| `hub/kit.css` | The shared look every tool uses: fonts, colours, buttons, the tool header |
| `hub/config.json` | Settings: the Google sign-in key (Client ID) and the email addresses that see the admin controls |
| `privacy.html` | The privacy policy (linked from the home page) |
| `assets/` | The logo (`logo.png`, used on Google's sign-in screen) and the favicon |
| `sitemap.xml`, `robots.txt` | Help Google Search find and list the site |
| `tools/tools.json` | The list of tools: name, category, description and order |
| `tools/<name>.html` | One file per tool |
| `tools/research.html` | My Research: the Specialist Research Hub, private to each person (see below) |
| `tools/ideas.html` | Ideas: catch ideas (typed or spoken), grow them in the Script Development Tool, graduate them into projects. Private to each person |
| `scripts/import_research_hub.py` | Brings a new version of the Specialist Research Hub file into the hub |
| `tests/sharing/` | Automatic tests for shared projects (run with `node tests/sharing/run.js`) |

## Common jobs

**Fix or update a tool.** Open its file in `tools/`, click the pencil (Edit), make the change, then click **Commit changes**. The live site updates within about a minute.

**Add a tool.** Upload its file into `tools/`, then add an entry for it in `tools/tools.json` (copy an existing entry and change the details). A new tool should use the shared look in `hub/kit.css`.

**Work on a tool in a separate chat.** Download its file from `tools/` and attach it together with `docs/tool-guide.md`, which explains the rules that keep it working in the hub. Each tool file also opens on its own in a browser.

**Update the Specialist Research Hub.** Run `python3 scripts/import_research_hub.py "<new file>.html"`. It writes `tools/research.html` with the hub's look and saving; the content stays exactly as written.

**Change a tool's name, description or category.** Edit its entry in `tools/tools.json`.

**Undo a change.** Every change is kept in the history (the clock icon, "History"). Any earlier version can be brought back.

## Who sees the admin controls

The buttons for adding and replacing tools (Add tool, the ⋯ menus) only show for the Google accounts listed under `adminEmails` in `hub/config.json`, once they've signed in. Add an address in quotes, separated by commas, e.g. `"adminEmails": ["you@gmail.com", "colleague@gmail.com"]`.

## Rules that keep people's saved work safe

1. **Never change a tool's `id`** in `tools.json`. Its saved work is filed under that id. Changing the display `name` is fine.
2. **When a tool changes what it saves, it must still read the old format.**
3. **When a tool's file changes, update its `rev`** in `tools.json` to the current date and time written as YYYYMMDDHHMM (e.g. `202611091430` for 9 November 2026 at 14:30). This makes sure everyone gets the new version rather than an older copy someone tried out in their browser.
4. **When `hub/hub.js` or `hub/hub.css` changes, update the `?v=` after it in `index.html`** the same way. Browsers keep these two files for a few minutes; without a new `?v=`, someone can end up with a new tool running inside the old hub.

## Trying the site on your own computer

Double-clicking `index.html` won't work, because browsers block a page opened from a folder from reading its other files. Use the host's preview link instead, or run a small local web server from this folder (for example `python3 -m http.server`) and open http://localhost:8000.
