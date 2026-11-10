# Next steps (waiting on GitHub)

When GitHub access is back:

1. Publish everything built offline since the suspension:
   - the six-stage layout;
   - the Depth of Field Lab;
   - the Production and Post-Production Pipelines;
   - the Pre-Production rename;
   - the new Script Development Tool.
2. **Build shared projects** (Tim asked to be reminded):
   - A **Share** button on a project: the owner types in the crew's email addresses, and the project file is shared through Google Drive.
   - A **Shared with me** list: crew pick the project after signing in (this uses Google Picker, so Tim needs to switch on the Picker API in Google Cloud).
   - **Save fetches first:** when someone saves, the hub fetches the latest version first and only replaces the tools that person changed, so everyone else's work is kept.
   - **One editor per tool, with handover.** The person who opens a tool first holds it. Anyone else sees it read-only, with a **Request to edit** button. The holder gets a popup to hand over or say "not now". A hold runs out on its own after a few minutes with no activity, so nobody gets stuck. The project owner can always take over.
   - **Test users:** every crew member must be added as a test user until the app is published.
3. **Crew, roles and progress** (build after sharing):
   - **Crew list** when a shared project is set up: name, email and role for each person.
   - **Default owners:** each document defaults to who completes it and who signs it off, worked out from the roles. These can be changed per project.
   - **Statuses:** Not started → In progress → Ready for review → Signed off. "Changes requested" is also possible. A document edited after sign-off is flagged as "changed since sign-off".
   - **Project board:** shows every document with who's doing it, its status and its due date.
   - **Update requests:** the Producer, 1st AD, Director or owner can request an update from a crew member, with a note and a due date. Overdue items are highlighted. Emails are written in the person's own mail app, so no extra Google permission is needed.
   - **Sign-off on exports:** the name and date of the sign-off print on PDF exports.
   - Optional **tutor view** (to be decided).
