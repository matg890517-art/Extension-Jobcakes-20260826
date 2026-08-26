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
  logo?: string;
  companyLink?: string;
  location?: string;
  salary?: string;
  employmentType?: string;
  workplaceType?: string;
  postedAgo?: string;
  tags?: string[];
  skills?: string[];
  companyTags?: string[];
  applicantsCount?: number;
  applicantsText?: string;
  apply_url?: string;
  description?: string;
  id?: string;
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

  const absUrl = (raw: string): string => {
    if (!raw) return '';
    try {
      return new URL(raw, window.location.origin).href;
    } catch {
      return raw;
    }
  };

  const hrefOf = (el: Element | null | undefined, allowParent = false): string => {
    if (!el) return '';
    const a =
      el instanceof HTMLAnchorElement
        ? el
        : (el.querySelector('a[href]') ?? (allowParent ? el.closest('a') : null));
    const href = a?.getAttribute('href')?.trim() ?? '';
    if (!href || href === '#' || /^(javascript:|mailto:)/i.test(href)) return '';
    if (/jobId=/i.test(href)) return '';
    return absUrl(href);
  };

  const title = drawer.querySelector('.jobs-drawer-company-copy h2')?.textContent?.trim() ?? '';
  const companyNameEl = drawer.querySelector('span.job-detail-company-name, .job-detail-company-name');
  const company = (companyNameEl?.textContent ?? '').replace(/^@\s*/, '').trim();

  const logoEl = drawer.querySelector('.job-detail-company-logo');
  const logoImg =
    logoEl instanceof HTMLImageElement ? logoEl : logoEl?.querySelector('img') ?? null;
  let logo = '';
  if (logoImg instanceof HTMLImageElement) {
    const srcsetFirst = (logoImg.getAttribute('srcset') || logoImg.srcset || '')
      .split(',')[0]
      ?.trim()
      .split(/\s+/)[0] ?? '';
    const src = logoImg.getAttribute('src') || logoImg.src || '';
    const raw = logoImg.currentSrc || src || srcsetFirst;
    logo = absUrl(raw);
    if (!logo || logo === window.location.href) logo = absUrl(srcsetFirst);
  }

  let companyLink = hrefOf(companyNameEl, false) || hrefOf(logoEl, true);
  if (!companyLink) {
    const header = drawer.querySelector('.jobs-drawer-company-copy');
    if (header) {
      for (const a of header.querySelectorAll('a[href]')) {
        const label = `${a.textContent ?? ''} ${a.getAttribute('aria-label') ?? ''} ${a.getAttribute('title') ?? ''}`;
        const href = a.getAttribute('href') ?? '';
        if (
          /website|homepage|company site/i.test(label) ||
          (/^https?:\/\//i.test(href) && !/jobcakes\.com/i.test(href))
        ) {
          companyLink = hrefOf(a);
          if (companyLink) break;
        }
      }
    }
  }

  let metaEls = [...drawer.querySelectorAll('.jobs-drawer-company-meta > span')];
  if (!metaEls.length) {
    metaEls = [...drawer.querySelectorAll('.jobs-drawer-company-meta span')];
  }
  const metaSpans = metaEls
    .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const location = metaSpans[0] ?? '';
  const workplaceType = drawer.querySelector('.jobs-drawer-remote')?.textContent?.trim() ?? '';
  const salary = metaSpans.find((t) => /\$/.test(t)) ?? '';
  const employeeMatches = metaSpans.filter((t) => /employee/i.test(t));
  const employeeSize = employeeMatches[employeeMatches.length - 1] ?? '';

  const postedRaw =
    drawer.querySelector('.jobs-drawer-published-note span')?.textContent?.trim() ??
    drawer.querySelector('.jobs-drawer-published-note')?.textContent?.trim() ??
    '';
  const postedAgo = postedRaw.replace(/^(published|posted)\s*/i, '').trim();

  const boardNames: string[] = [];
  for (const el of drawer.querySelectorAll('.jobs-job-board-pill')) {
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    const titleAttr = (el.getAttribute('title') ?? '').trim();
    if (text && !boardNames.includes(text)) boardNames.push(text);
    if (titleAttr && !boardNames.includes(titleAttr)) boardNames.push(titleAttr);
  }

  const companyTags = [employeeSize, ...boardNames].filter(
    (t, i, arr) => Boolean(t) && arr.indexOf(t) === i,
  );

  const skills = [...(drawer.querySelector('.jobs-drawer-skill-chips')?.children ?? [])]
    .map((el) => el.textContent?.trim() ?? '')
    .filter(Boolean);

  let applicantsCount: number | undefined;
  let applicantsText: string | undefined;
  for (const el of drawer.querySelectorAll('span, div, p, small, a, li')) {
    const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (t.length > 40) continue;
    const m = t.match(/^(\d+)\s+applicants?$/i);
    if (m) {
      applicantsCount = Number(m[1]);
      applicantsText = t;
      break;
    }
  }

  const prep = drawer.querySelector('a[href*="jobId="]')?.getAttribute('href') ?? '';
  let id = '';
  let apply_url = '';
  if (prep) {
    try {
      const jobId = new URL(prep, window.location.origin).searchParams.get('jobId');
      if (jobId) {
        id = jobId;
        apply_url = 'https://app.jobcakes.com/jobs#' + jobId;
      }
    } catch {
      /* ignore */
    }
  }

  const sectionParts: string[] = [];
  for (const section of drawer.querySelectorAll('.job-detail-section')) {
    const heading = (section.querySelector('h3.job-detail-section-title')?.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!heading) continue;
    if (/scores?|skill\s*match/i.test(heading)) continue;
    if (!/^(summary|responsibilities|qualifications|about|description|requirements)\b/i.test(heading)) {
      continue;
    }
    const bodyBits: string[] = [];
    for (const node of section.querySelectorAll('p.job-detail-text, ul.job-detail-list')) {
      if (node.matches('p.job-detail-text')) {
        const t = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (t) bodyBits.push(t);
      } else {
        for (const li of node.querySelectorAll('li')) {
          const t = (li.textContent ?? '').replace(/\s+/g, ' ').trim();
          if (t) bodyBits.push(t);
        }
      }
    }
    const body = bodyBits.join('\n');
    if (!body) continue;
    sectionParts.push(`${heading}\n${body}\n`);
  }
  let description = sectionParts.join('\n').trim();
  if (!description) {
    description = drawer.querySelector('.modal-body')?.textContent?.trim() ?? '';
  }

  const EMP_RE = /full[-\s]?time|part[-\s]?time|contract|\bintern(?:ship)?s?\b|temporary/i;
  const normalizeEmployment = (raw: string): string => {
    if (/full[-\s]?time/i.test(raw)) return 'Full-time';
    if (/part[-\s]?time/i.test(raw)) return 'Part-time';
    if (/\bintern(?:ship)?s?\b/i.test(raw)) return 'Internship';
    if (/contract/i.test(raw)) return 'Contract';
    if (/temporary/i.test(raw)) return 'Temporary';
    return raw.trim();
  };
  let employmentRaw = metaSpans.find((t) => EMP_RE.test(t)) ?? '';
  if (!employmentRaw) {
    const m = description.match(EMP_RE);
    if (m) employmentRaw = m[0];
  }
  const employmentType = employmentRaw ? normalizeEmployment(employmentRaw) : '';

  const tags: string[] = [];
  const pushTag = (t: string) => {
    if (t && !tags.includes(t)) tags.push(t);
  };
  pushTag(workplaceType);
  pushTag(employmentType);
  for (const t of metaSpans) {
    if (t === location) continue;
    if (/\$/.test(t)) continue;
    if (/employee/i.test(t)) continue;
    if (t.length > 48) continue;
    pushTag(t);
  }

  return {
    ok: true,
    title,
    company,
    logo,
    companyLink,
    location,
    salary,
    employmentType,
    workplaceType,
    postedAgo,
    tags,
    companyTags,
    skills,
    applicantsCount,
    applicantsText,
    apply_url,
    description,
    id,
  };
}

function clickJobDescriptionTab() {
  let drawer = document.querySelector('.modal-content--job-drawer') || document.querySelector(
    'div[role="dialog"][aria-modal="true"].chakra-modal__content',
  );
  if (!drawer) return false;
  const descTab = [...drawer.querySelectorAll('button')].find((b) => {
    const t = (b.textContent ?? '').trim();
    return /job description/i.test(t) && !/\bapply\b/i.test(t);
  });
  descTab?.click();
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
          company: {
            name: extracted.company,
            logo: extracted.logo,
            tags: extracted.companyTags ?? [],
          },
          description: extracted.description,
          applyLink: extracted.apply_url,
          companyLink: extracted.companyLink ?? '',
          postedAgo: extracted.postedAgo,
          tags: extracted.tags ?? [],
          skills: extracted.skills ?? [],
          details: {
            location: extracted.location,
            employmentType: extracted.employmentType ?? '',
            workplaceType: extracted.workplaceType,
            salary: extracted.salary,
          },
          applicants: {
            count: extracted.applicantsCount,
            text: extracted.applicantsText,
          },
          id: extracted.id,
          scrapeFrom: 'jobcakes',
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
              {job.logo ? (
                <Box
                  component="img"
                  src={job.logo}
                  alt={job.company || ''}
                  sx={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 1 }}
                />
              ) : null}
              <Typography variant="subtitle2">{job.title}</Typography>
              <Typography variant="body2">{job.company}</Typography>
              <Typography variant="body2">{job.location}</Typography>
              <Typography variant="body2">{job.salary}</Typography>
              <Typography variant="body2">{job.employmentType}</Typography>
              <Typography variant="body2">{job.workplaceType}</Typography>
              <Typography variant="body2">{job.postedAgo}</Typography>
              <Typography variant="body2">{(job.tags ?? []).join(', ')}</Typography>
              <Typography variant="body2">{(job.companyTags ?? []).join(', ')}</Typography>
              <Typography variant="body2">{(job.skills ?? []).join(', ')}</Typography>
              <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                {job.apply_url}
              </Typography>
              {(!job.apply_url || !job.description) && (
                <Alert severity="warning">
                  Missing {!job.apply_url ? "applyLink" : ""}{!job.apply_url && !job.description ? " and " : ""}{!job.description ? "description" : ""}. Posted anyway.
                </Alert>
              )}
            </>
          )}
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
