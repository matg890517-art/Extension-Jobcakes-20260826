import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CssBaseline,
  Divider,
  Paper,
  TextField,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';

const theme = createTheme({
  palette: { mode: 'light' },
});

type JobResult = {
  ok: boolean;
  error?: string;
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  apply_url?: string;
  description?: string;
};

type PostingResult = {
  ok: boolean;
  status: number;
  url: string;
  body: string;
};

const INGEST_URL =
  (import.meta.env.WXT_INGEST_URL as string | undefined)?.replace(/^['"]|['"]$/g, '') ??
  'http://127.0.0.1:8980/api/jobs/ingest';


function readDrawer(): JobResult {
  let drawer = document.querySelector('.modal-content--job-drawer') || document.querySelector(
    'div[role="dialog"][aria-modal="true"].chakra-modal__content',
  );
  if (!drawer) {
    const hide = [...document.querySelectorAll('button')].find((b) =>
      /hide job/i.test((b.textContent ?? '').trim()),
    );
    drawer = hide?.closest('.modal-content--job-drawer') || hide?.closest('[role="dialog"]') || hide?.closest('.modal-content') || null;
  }
  if (!drawer) return { ok: false, error: 'no panel' };


  const title = drawer.querySelector('.jobs-drawer-company-copy h2')?.textContent?.trim() ?? '';
  const company = (drawer.querySelector('.job-detail-company-name')?.textContent ?? '').replace(/^@\s*/, '').trim();
  const location =
    drawer.querySelector('.jobs-drawer-company-meta span:first-child')?.textContent?.trim() ?? '';
  const salary =
    [...drawer.querySelectorAll('.jobs-drawer-company-meta span')]
      .map((el) => el.textContent?.trim())
      .find((t) => t && /\$[0-9]/.test(t)) ?? '';
  const prep = drawer.querySelector('a[href*="jobId="]')?.getAttribute('href') ?? '';
  let apply_url = '';
  if (prep) {
    try {
      const jobId = new URL(prep, window.location.origin).searchParams.get('jobId');
      if (jobId) apply_url = 'https://app.jobcakes.com/jobs#' + jobId;
    } catch {
      /* ignore */
    }
  }
  const description = drawer.querySelector('.modal-body')?.textContent?.trim() ?? '';

  return { ok: true, title, company, location, salary, apply_url, description };
}

function clickJobDescriptionTab() {
  let drawer = document.querySelector('.modal-content--job-drawer') || document.querySelector(
    'div[role="dialog"][aria-modal="true"].chakra-modal__content',
  );
  if (!drawer) return false;
  const descTab = [...drawer.querySelectorAll('button')].find((b) =>
    /job description/i.test(b.textContent ?? ''),
  );
  // description is in .modal-body; do not click Apply
  return Boolean(descTab);
}

function closeAndHide(title: string) {
  let drawer = document.querySelector('.modal-content--job-drawer') || document.querySelector(
    'div[role="dialog"][aria-modal="true"].chakra-modal__content',
  ) as HTMLElement | null;

  const panel = drawer;

  const hideBtn = [...(panel?.querySelectorAll('button') ?? [])].find((b) => {
    const t = `${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`;
    return /hide job/i.test(t);
  });
  hideBtn?.click();

  const closeBtn =
    (document.querySelector('.modal-content--job-drawer .modal-close') as HTMLElement | null) ??
    ([...(drawer?.querySelectorAll('button') ?? [])].find((b) =>
      /close/i.test(b.getAttribute('aria-label') ?? ''),
    ) as HTMLElement | undefined) ??
    null;
  closeBtn?.click();

  if (title) {
    const card = [...document.querySelectorAll('button, a, div')].find((el) => {
      const text = el.textContent ?? '';
      return text.includes(title) && /\bhide\b/i.test(text);
    });
    const hideOnCard = card
      ? [...card.querySelectorAll('button')].find((b) =>
          /\bhide\b/i.test(`${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`),
        )
      : [...document.querySelectorAll('button')].find((b) => {
          const label = `${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`;
          if (!/\bhide\b/i.test(label)) return false;
          const host = b.closest('[class]') as HTMLElement | null;

          return !!host && (host.textContent ?? '').includes(title);
        });
    hideOnCard?.click();
  }

  return { closed: true };
}

export default function App() {
  const [status, setStatus] = useState('Open a job in Jobcakes, then Get job');
  const [job, setJob] = useState<JobResult | null>(null);
  const [posting, setPosting] = useState<PostingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [ingestUrl, setIngestUrl] = useState(INGEST_URL);

  useEffect(() => {
    browser.storage.local.get('ingestUrl').then((stored) => {
      const value = stored.ingestUrl;
      if (typeof value === 'string' && value.trim()) setIngestUrl(value.trim());
    });
  }, []);

  useEffect(() => {
    if (ingestUrl) browser.storage.local.set({ ingestUrl });
  }, [ingestUrl]);

  async function getJob() {
    setBusy(true);
    setPosting(null);
    try {
      const tabs = await browser.tabs.query({
        url: ['*://app.jobcakes.com/*', '*://*.jobcakes.com/*'],
      });
      const tab = tabs.find((t) => t.active) ?? tabs[0];
      if (!tab?.id) {
        setStatus('no jobcakes tab');
        return;
      }

      const [injected] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: readDrawer,
      });
      let extracted = injected?.result as JobResult | undefined;
      if (injected?.error) {
        setStatus(String(injected.error.message ?? injected.error));
        return;
      }
      if (!extracted?.ok) {
        setStatus(extracted?.error ?? 'failed');
        return;
      }
      setJob(extracted);

      if (!extracted.description) {
        setStatus('looking for job description');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: clickJobDescriptionTab,
        });
        await new Promise((r) => setTimeout(r, 450));
        const [again] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: readDrawer,
        });
        if (again?.result?.ok) {
          extracted = again.result as JobResult;
          setJob(extracted);
        }
      }
      if (extracted && !extracted.description) {
        await new Promise((r) => setTimeout(r, 450));
        const [third] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: readDrawer,
        });
        if (third?.result?.ok) {
          extracted = third.result as JobResult;
          setJob(extracted);
        }
      }

      const res = await fetch(ingestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: 'jobcakes',
          title: extracted.title,
          company: { name: extracted.company },
          details: {
            location: extracted.location,
            salary: extracted.salary,
          },
          description: extracted.description,
          applyLink: extracted.apply_url,
          scrapefrom: 'jobcakes',
          collectedAt: new Date().toISOString(),
        }),
      });

      const raw = await res.text();
      let body = raw;
      try {
        body = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        /* keep raw text */
      }
      setPosting({
        ok: res.ok,
        status: res.status,
        url: ingestUrl,
        body: body || "(empty body)",
      });
      if (!res.ok) {
        setStatus(`ingest failed ${res.status}`);
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: closeAndHide,
        args: [extracted.title ?? ''],
      });

      setStatus(`ingested ${extracted.title}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPosting({
        ok: false,
        status: 0,
        url: ingestUrl,
        body: message,
      });
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 2, width: 360 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Jobcakes collector</Typography>
          <Button variant="contained" onClick={getJob} disabled={busy} fullWidth>
            {busy ? 'Working…' : 'Get job'}
          </Button>
          <TextField
            label="Ingest URL"
            size="small"
            fullWidth
            value={ingestUrl}
            onChange={(e) => setIngestUrl(e.target.value)}
            disabled={busy}
          />
          <Typography variant="body2" color="text.secondary">
            {status}
          </Typography>
          {posting && (
            <>
              <Divider />
              <Typography variant="subtitle2">Posting result</Typography>
              <Alert severity={posting.ok ? "success" : "error"}>
                {posting.ok ? "Posted" : "Post failed"} · HTTP {posting.status}
              </Alert>
              <Typography variant="caption" sx={{ wordBreak: "break-all" }}>
                {posting.url}
              </Typography>
              <Paper variant="outlined" sx={{ p: 1, maxHeight: 220, overflow: "auto" }}>
                <Typography
                  component="pre"
                  variant="caption"
                  sx={{ m: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {posting.body}
                </Typography>
              </Paper>
            </>
          )}
          {job?.ok && (
            <>
              <Divider />
              <Typography variant="subtitle2">{job.title}</Typography>
              <Typography variant="body2">{job.company}</Typography>
              <Typography variant="body2">{job.location}</Typography>
              <Typography variant="body2">{job.salary}</Typography>
              <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                {job.apply_url}
              </Typography>
              {(!job.apply_url || !job.description) && (
                <Alert severity="warning">
                  Missing {!job.apply_url ? "Full View URL" : ""}{!job.apply_url && !job.description ? " and " : ""}{!job.description ? "description" : ""}. Posted anyway.
                </Alert>
              )}
            </>
          )}
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
