# Later updates

Parked on purpose. Do these after the Get-job pipeline is in use.

1. **Jobcakes collector** — app.jobcakes.com is login-walled. Same Get-job flow once signed in: capture the open job, POST ingest, do not scrape the list.
2. **Hide-job robustness** — HiringCafe card markup may drift. If Hide misses, tighten selectors from a live drawer instead of guessing.
3. **Description wait** — if article.prose is still empty after the Job Description tab click, retry once more instead of posting a blank description.
4. **Next-job loop** — after hide, optionally click the next visible card so the drawer opens again. Keep it a sidepanel action, never a list scrape.
5. **Ingest URL in the sidepanel** — let the user override WXT_INGEST_URL without rebuilding.
6. **Jobcakes apply URL** — same rule as HiringCafe: never click Apply, never use the ATS window.open URL.

Do not: scrape the job list, click Apply now, fill applications, or merge this work into main without an explicit ask.
