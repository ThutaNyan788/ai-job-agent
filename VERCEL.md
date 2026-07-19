# Vercel deployment

1. Import the repository into Vercel. The project uses `npm run build` and publishes `dist/`; `vercel.json` routes `/api/*` to the Express Function and all other paths to the SPA entrypoint.
2. Set these production environment variables in Vercel:

   `DATABASE_URL`, `OPENAI_API_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `APP_ORIGIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ZEGO_APP_ID`, `ZEGO_SERVER_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`.

3. Set Better Auth trusted origins and the Google OAuth callback to the deployed Vercel origin (`https://<project>.vercel.app`).
4. Run `npm run db:migrate` with the production `DATABASE_URL` before the first login.

The backend is stateless: task execution and application transitions are explicit HTTP requests, durable events are read from Postgres with `GET /api/events?after=<sequence>`, and the browser polls with exponential backoff.
