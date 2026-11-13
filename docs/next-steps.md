# Next steps

GitHub access came back on 12 November 2026. Everything built offline is now published: 22 tools in six stages.

## To do
1. **Shared projects: built 12 November 2026, needs a real-world check.** Share button, "Shared with me", merging saves and one editor per tool are in (see `docs/handover.md`). Still to do:
   - Tim switches on the **Google Picker API** in Google Cloud and adds each crew member as a **test user**.
   - Try it on the live site with two real Google accounts (it could only be tested against a pretend Google Drive). Things to watch: the file chooser opening on the shared file, and Google's sharing email arriving.
   - Possible later improvement: save shared projects automatically every few minutes, so crew see each other's work without anyone pressing Save.
   - **Documentation** (built 13 November 2026) also needs this check: save a document signed in and look for it in Drive under Film Tool Hub → Documentation; then, in a shared project, check a second account sees it and can open it.
2. **Crew, roles and progress** (build after sharing):
   - **Crew list:** name and email are in (13 November 2026, see `docs/handover.md`) and feed the Task Board. Still to add: a role for each person (`people()` already has a `role` field; only the owner's is filled in).
   - **Default owners:** each document defaults to who completes it and who signs it off, worked out from the roles. These can be changed per project.
   - **Statuses:** Not started → In progress → Ready for review → Signed off. "Changes requested" is also possible. A document edited after sign-off is flagged as "changed since sign-off".
   - **Project board:** shows every document with who's doing it, its status and its due date.
   - **Update requests:** the Producer, 1st AD, Director or owner can request an update from a crew member, with a note and a due date. Overdue items are highlighted. Emails are written in the person's own mail app, so no extra Google permission is needed.
   - **Sign-off on exports:** the name and date of the sign-off print on PDF exports.
   - Optional **tutor view** (to be decided).
3. **Casting Tracker privacy:** it stores actors' names, emails, phone numbers and headshots. `privacy.html` now covers this and the Share box warns the owner. Still to decide: limiting who in a crew can open this tool (fits with the roles work above).
4. **Later launch steps:**
   - prove ownership of the domain in Google Search Console;
   - add a logo;
   - remove timmcglinchey.github.io from the authorised domains;
   - publish the Google app and get it verified.
