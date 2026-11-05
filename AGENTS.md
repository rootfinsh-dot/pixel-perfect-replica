<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- AI chat goes through the server route `src/routes/api/chat.ts` (Responses API, raw SSE passthrough); it checks the caller's sign-in token and keeps the API key server-side.
- Data lives in Lovable Cloud: `projects`, `documents` (files in private `documents` bucket under `<userId>/<projectId>/`), `reports` (every assistant answer auto-saved as markdown); all rows owner-only via RLS.
- Documents are parsed in the browser (`src/lib/documents.ts`); PDF reports use client-side html2canvas + jsPDF inside an isolated iframe, with DOM pagination before per-page capture, so app colors cannot break rendering and table rows remain intact with repeated headers.
- Chat request bounds are shared by the client and streaming HTTP reader, so client feedback and server enforcement cannot diverge.
- Chat history is temporarily browser-local, keyed by owner and project, with saved reports as an initial fallback; Cloud conversation storage is blocked until the paused backend is resumed.
- Project deletion enumerates and removes storage files before deleting the project row, so storage errors cannot silently orphan files.
- Project preview and report windows use Radix dialogs with focus restoration, preserving their existing appearance.
