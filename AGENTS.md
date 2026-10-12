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
- Documents are parsed in the browser (`src/lib/documents.ts`); PDF reports are generated client-side from markdown (`src/lib/pdf.ts`: html2canvas + jsPDF, rendered inside an isolated iframe because the PDF renderer cannot parse the app's oklch colors).
