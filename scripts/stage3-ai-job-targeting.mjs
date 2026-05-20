#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildJobSearchQueries,
  classifyJobPosting,
  cleanHtml,
  detectAtsLinks,
  extractCareerLinks,
  matchesCompanyName,
  normalizeName,
  parseGenericJobLinks,
  scoreCompany,
  scoreProduct,
} from '../clis/mobile-health/ai-targeting-utils.js';

const ROOT = process.cwd();
const STAGE2_DIR = path.join(ROOT, 'results', 'stage2-digital-health');
const OUT_DIR = path.join(STAGE2_DIR, 'ai-targeting');
const TODAY = new Date().toISOString().slice(0, 10);
const FETCH_TIMEOUT_MS = Number(argValue('fetch-timeout-ms', 10000));
const COMPANY_TIMEOUT_MS = Number(argValue('company-timeout-ms', 30000));
const VERIFY_LIMIT = Number(argValue('verify-limit', 150));
const MIN_VERIFY = Number(argValue('min-verify', 80));
const CONCURRENCY = Number(argValue('concurrency', 6));

const CAREER_PATHS = [
  '/careers',
  '/careers/',
  '/jobs',
  '/jobs/',
  '/join-us',
  '/career',
];

const KNOWN_CAREER_URLS = new Map([
  ['hinge health', ['https://jobs.ashbyhq.com/hinge-health']],
  ['hinge health inc', ['https://jobs.ashbyhq.com/hinge-health']],
  ['omada health', ['https://job-boards.greenhouse.io/omadahealth']],
  ['omada health inc', ['https://job-boards.greenhouse.io/omadahealth']],
  ['headspace health', ['https://job-boards.greenhouse.io/hs']],
  ['headspace', ['https://job-boards.greenhouse.io/hs']],
  ['ada health', ['https://job-boards.greenhouse.io/adahealth']],
  ['virta health', ['https://jobs.ashbyhq.com/virtahealth']],
]);

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(x => x.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1) return process.argv[idx + 1] ?? fallback;
  return fallback;
}

async function ensureDirs() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(path.join(OUT_DIR, 'raw'), { recursive: true });
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(STAGE2_DIR, file), 'utf8'));
}

async function writeJson(rel, value) {
  const file = path.join(OUT_DIR, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeCsv(rel, rows, columns) {
  const file = path.join(OUT_DIR, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const lines = [
    columns.join(','),
    ...rows.map(row => columns.map(col => csvCell(row[col])).join(',')),
  ];
  await fs.writeFile(file, `${lines.join('\n')}\n`, 'utf8');
}

function csvCell(value) {
  if (value == null) return '';
  const text = Array.isArray(value) ? value.join('; ') : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function indexByCompany(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = normalizeName(row.companyName);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function rowsForCompany(index, company) {
  const keys = [
    company.companyName,
    ...String(company.aliases ?? '').split(';').map(x => x.trim()).filter(Boolean),
  ].map(normalizeName).filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const key of keys) {
    for (const row of index.get(key) ?? []) {
      const id = `${row.companyName}|${row.productName ?? ''}|${row.sourceUrl ?? ''}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
  }
  return out;
}

function buildScores(companies, products, evidence) {
  const productsByCompany = indexByCompany(products);
  const evidenceByCompany = indexByCompany(evidence);
  const companyScores = [];
  const productScores = [];

  for (const company of companies) {
    const companyProducts = rowsForCompany(productsByCompany, company);
    const companyEvidence = rowsForCompany(evidenceByCompany, company);
    const score = scoreCompany(company, companyProducts, companyEvidence);
    companyScores.push({
      companyName: company.companyName,
      aliases: company.aliases,
      region: company.region,
      country: company.country,
      city: company.city,
      categories: company.categories,
      tier: company.tier,
      website: company.website,
      primaryEvidenceUrl: company.primaryEvidenceUrl,
      productCount: companyProducts.length,
      evidenceCount: company.evidenceCount,
      aiUseCases: score.aiUseCases,
      aiFitScore: score.aiFitScore,
      marketExpansionScore: score.marketExpansionScore,
      financingLiftScore: score.financingLiftScore,
      commercializationScore: score.commercializationScore,
      dataReadinessScore: score.dataReadinessScore,
      evidenceQualityScore: score.evidenceQualityScore,
      opportunityScore: score.opportunityScore,
      scoreReasons: score.scoreReasons,
      gaps: score.gaps,
    });

    for (const product of companyProducts) {
      const pScore = scoreProduct(product, company, companyEvidence);
      productScores.push({
        companyName: company.companyName,
        productName: product.productName,
        productType: product.productType,
        sourceType: product.sourceType,
        sourceUrl: product.sourceUrl,
        categories: product.categories || company.categories,
        productAiFitScore: pScore.productAiFitScore,
        expectedMarketLiftScore: pScore.expectedMarketLiftScore,
        implementationComplexityScore: pScore.implementationComplexityScore,
        complianceRiskScore: pScore.complianceRiskScore,
        priorityScore: pScore.priorityScore,
        aiOpportunity: pScore.aiOpportunity,
      });
    }
  }

  companyScores.sort((a, b) => b.opportunityScore - a.opportunityScore || a.companyName.localeCompare(b.companyName));
  productScores.sort((a, b) => b.priorityScore - a.priorityScore || a.companyName.localeCompare(b.companyName));
  return { companyScores, productScores };
}

function selectVerificationQueue(companyScores) {
  const eligible = companyScores.filter(row => row.opportunityScore >= 70);
  const count = Math.min(VERIFY_LIMIT, Math.max(MIN_VERIFY, eligible.length));
  return companyScores.slice(0, count);
}

async function fetchHtml(url) {
  const resp = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'opencli-stage3-ai-job-targeting/1.0',
      accept: 'text/html,application/json,application/xhtml+xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const contentType = resp.headers.get('content-type') ?? '';
  const text = await resp.text();
  return { url: resp.url || url, text, contentType };
}

function baseCareerUrls(company) {
  const urls = new Set();
  for (const key of [
    company.companyName,
    ...String(company.aliases ?? '').split(';').map(x => x.trim()).filter(Boolean),
  ].map(normalizeName)) {
    for (const url of KNOWN_CAREER_URLS.get(key) ?? []) urls.add(url);
  }
  if (urls.size) return [...urls];
  if (!company.website) return [];
  try {
    const u = new URL(company.website);
    if (!/^https?:$/.test(u.protocol)) return [];
    const origin = u.origin;
    urls.add(origin);
    for (const p of CAREER_PATHS) urls.add(`${origin}${p}`);
  } catch {
    return [];
  }
  return [...urls].slice(0, 8);
}

async function discoverCareerAndAtsUrls(company) {
  const queue = baseCareerUrls(company);
  const careerUrls = new Set();
  const atsUrls = new Set();
  const errors = [];
  const rawPages = [];

  for (const url of queue) {
    if (/greenhouse|lever|ashbyhq|workable|smartrecruiters|workday/i.test(url)) {
      atsUrls.add(url);
      continue;
    }
    try {
      const page = await fetchHtml(url);
      rawPages.push({ url: page.url, text: page.text.slice(0, 4000) });
      if (/career|jobs|join|work-with|work with|招聘|加入/i.test(`${page.url} ${page.text}`)) careerUrls.add(page.url);
      for (const link of extractCareerLinks(page.text, page.url)) careerUrls.add(link.url);
      for (const link of detectAtsLinks(page.text, page.url)) atsUrls.add(link);
    } catch (err) {
      errors.push({ companyName: company.companyName, url, error: err.message });
    }
  }

  return {
    careerUrls: [...careerUrls].slice(0, 12),
    atsUrls: [...atsUrls].slice(0, 20),
    errors,
    rawPages,
  };
}

function greenhouseToken(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!host.includes('greenhouse.io')) return '';
    const parts = u.pathname.split('/').filter(Boolean);
    if (host === 'boards-api.greenhouse.io') return parts[2] ?? '';
    return parts[0] ?? '';
  } catch {
    return '';
  }
}

function leverToken(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.toLowerCase().includes('jobs.lever.co')) return '';
    return u.pathname.split('/').filter(Boolean)[0] ?? '';
  } catch {
    return '';
  }
}

function ashbyToken(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.toLowerCase().includes('jobs.ashbyhq.com')) return '';
    return u.pathname.split('/').filter(Boolean)[0] ?? '';
  } catch {
    return '';
  }
}

function smartRecruitersCompany(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.toLowerCase().includes('smartrecruiters.com')) return '';
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex(p => p === 'companies');
    if (idx !== -1) return parts[idx + 1] ?? '';
    return parts[0] ?? '';
  } catch {
    return '';
  }
}

async function fetchJsonUrl(url) {
  const resp = await fetch(url, {
    headers: {
      'user-agent': 'opencli-stage3-ai-job-targeting/1.0',
      accept: 'application/json,text/plain,*/*',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function jobsFromAtsUrl(url, company) {
  const out = [];
  const errors = [];
  const greenhouse = greenhouseToken(url);
  const lever = leverToken(url);
  const ashby = ashbyToken(url);
  const smart = smartRecruitersCompany(url);

  try {
    if (greenhouse) {
      const data = await fetchJsonUrl(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(greenhouse)}/jobs?content=true`);
      for (const job of data.jobs ?? []) {
        out.push({
          title: job.title ?? '',
          company: company.companyName,
          location: job.location?.name ?? '',
          description: cleanHtml(job.content ?? ''),
          sourceType: 'official_greenhouse',
          url: job.absolute_url ?? url,
          sourceUrl: url,
          listed: job.updated_at ?? '',
        });
      }
    } else if (lever) {
      const data = await fetchJsonUrl(`https://api.lever.co/v0/postings/${encodeURIComponent(lever)}?mode=json`);
      for (const job of data ?? []) {
        out.push({
          title: job.text ?? '',
          company: company.companyName,
          location: job.categories?.location ?? '',
          description: cleanHtml(job.descriptionPlain || job.description || ''),
          sourceType: 'official_lever',
          url: job.hostedUrl ?? job.applyUrl ?? url,
          sourceUrl: url,
          listed: job.createdAt ? new Date(job.createdAt).toISOString().slice(0, 10) : '',
        });
      }
    } else if (ashby) {
      const data = await fetchJsonUrl(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(ashby)}`);
      for (const job of data.jobs ?? []) {
        out.push({
          title: job.title ?? '',
          company: company.companyName,
          location: job.locationName ?? '',
          description: cleanHtml(job.descriptionHtml ?? ''),
          sourceType: 'official_ashby',
          url: job.jobUrl ?? url,
          sourceUrl: url,
          listed: '',
        });
      }
    } else if (smart) {
      const data = await fetchJsonUrl(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(smart)}/postings?limit=100`);
      for (const job of data.content ?? []) {
        out.push({
          title: job.name ?? '',
          company: company.companyName,
          location: [job.location?.city, job.location?.region, job.location?.country].filter(Boolean).join(', '),
          description: cleanHtml(job.jobAd?.sections?.jobDescription?.text ?? ''),
          sourceType: 'official_smartrecruiters',
          url: job.ref ?? job.applyUrl ?? url,
          sourceUrl: url,
          listed: job.releasedDate ?? '',
        });
      }
    }
  } catch (err) {
    errors.push({ companyName: company.companyName, url, error: err.message });
  }

  return { jobs: out, errors };
}

async function verifyCompanyJobs(scoreRow) {
  const company = scoreRow;
  const jobRows = [];
  const evidenceRows = [];
  const errors = [];
  const discovery = await discoverCareerAndAtsUrls(company);
  errors.push(...discovery.errors);
  const atsUrls = new Set(discovery.atsUrls);

  for (const page of discovery.rawPages) {
    for (const link of detectAtsLinks(page.text, page.url)) atsUrls.add(link);
    for (const job of parseGenericJobLinks(page.text, page.url, company)) jobRows.push(job);
  }

  for (const careerUrl of discovery.careerUrls.slice(0, 8)) {
    try {
      const page = await fetchHtml(careerUrl);
      for (const link of detectAtsLinks(page.text, page.url)) atsUrls.add(link);
      for (const job of parseGenericJobLinks(page.text, page.url, company)) jobRows.push(job);
    } catch (err) {
      errors.push({ companyName: company.companyName, url: careerUrl, error: err.message });
    }
  }

  for (const atsUrl of [...atsUrls]) {
    const got = await jobsFromAtsUrl(atsUrl, company);
    jobRows.push(...got.jobs);
    errors.push(...got.errors);
  }

  const classified = [];
  const seen = new Set();
  for (const rawJob of jobRows) {
    const cls = classifyJobPosting(rawJob, company);
    const id = `${rawJob.title}|${rawJob.location}|${rawJob.url}`;
    if (seen.has(id)) continue;
    seen.add(id);
    if (cls.activeStatus === 'excluded_not_ai_role') continue;
    classified.push({
      companyName: company.companyName,
      title: rawJob.title,
      location: rawJob.location,
      remoteHybrid: inferRemoteHybrid(rawJob.location, rawJob.description),
      seniorityFit: cls.seniorityFit,
      jobFamily: cls.jobFamily,
      listed: rawJob.listed ?? '',
      activeStatus: cls.activeStatus,
      sourceType: rawJob.sourceType,
      applyUrl: rawJob.url,
      sourceUrl: rawJob.sourceUrl,
      matchedKeywords: cls.matchedKeywords,
      evidenceSummary: cleanHtml(rawJob.description ?? '').slice(0, 420),
      locationPriority: cls.locationPriority,
      hiringFitScore: cls.hiringFitScore,
      capturedAt: TODAY,
    });
    evidenceRows.push({
      companyName: company.companyName,
      sourceType: rawJob.sourceType,
      sourceUrl: rawJob.url,
      capturedAt: TODAY,
      evidenceSummary: `${rawJob.title}; ${rawJob.location}; ${cls.activeStatus}`,
      evidenceStrength: cls.activeStatus === 'verified_active' ? 'strong_official_job' : 'medium_job_board',
      permissionFlag: 'public_job_posting',
    });
  }

  for (const sourceType of ['linkedin_jobs', 'indeed_jobs', 'boss_jobs', '51job_jobs']) {
    evidenceRows.push({
      companyName: company.companyName,
      sourceType,
      sourceUrl: '',
      capturedAt: TODAY,
      evidenceSummary: 'browser_required_not_executed; query emitted in job_search_queries.csv',
      evidenceStrength: 'gated_job_source',
      permissionFlag: 'browser_or_login_required',
    });
  }

  return { companyName: company.companyName, jobs: classified, evidenceRows, errors, discoveredCareerUrls: discovery.careerUrls, discoveredAtsUrls: [...atsUrls] };
}

async function verifyCompanyJobsWithTimeout(scoreRow) {
  let timer;
  try {
    return await Promise.race([
      verifyCompanyJobs(scoreRow),
      new Promise(resolve => {
        timer = setTimeout(() => resolve({
          companyName: scoreRow.companyName,
          jobs: [],
          evidenceRows: [{
            companyName: scoreRow.companyName,
            sourceType: 'official_careers_timeout',
            sourceUrl: scoreRow.website || '',
            capturedAt: TODAY,
            evidenceSummary: `company verification timed out after ${COMPANY_TIMEOUT_MS}ms`,
            evidenceStrength: 'gated_or_unavailable_job_source',
            permissionFlag: 'timeout',
          }],
          errors: [{ companyName: scoreRow.companyName, url: scoreRow.website || '', error: `company_timeout_${COMPANY_TIMEOUT_MS}ms` }],
          discoveredCareerUrls: [],
          discoveredAtsUrls: [],
        }), COMPANY_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function inferRemoteHybrid(location, description) {
  const text = `${location ?? ''} ${description ?? ''}`.toLowerCase();
  if (/remote|anywhere|worldwide|远程|居家/.test(text)) return 'remote';
  if (/hybrid|混合/.test(text)) return 'hybrid';
  if (/on-site|onsite|现场|办公室/.test(text)) return 'onsite';
  return '';
}

async function mapConcurrent(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function buildTargetRows(companyScores, jobRows) {
  const bestJobByCompany = new Map();
  for (const job of jobRows.filter(j => j.activeStatus === 'verified_active' || j.activeStatus === 'probable_active')) {
    const existing = bestJobByCompany.get(job.companyName);
    if (!existing || jobRankScore(job) > jobRankScore(existing)) bestJobByCompany.set(job.companyName, job);
  }

  const shortlist = [];
  const watchlist = [];
  const scoreByCompany = new Map(companyScores.map(row => [row.companyName, row]));
  for (const score of companyScores) {
    const job = bestJobByCompany.get(score.companyName);
    if (!job) {
      if (score.opportunityScore >= 70) watchlist.push({ ...score, watchReason: 'high_ai_opportunity_no_active_ai_job_verified' });
      continue;
    }
    const jobTargetScore = Math.round(score.opportunityScore * 0.65 + Number(job.hiringFitScore) * 0.35);
    shortlist.push({
      companyName: score.companyName,
      region: score.region,
      city: score.city,
      categories: score.categories,
      opportunityScore: score.opportunityScore,
      hiringFitScore: job.hiringFitScore,
      jobTargetScore,
      aiUseCases: score.aiUseCases,
      bestJobTitle: job.title,
      bestJobLocation: job.location,
      bestJobStatus: job.activeStatus,
      jobFamily: job.jobFamily,
      applyUrl: job.applyUrl,
      evidenceSummary: job.evidenceSummary,
      gaps: score.gaps,
    });
  }
  for (const [companyName, job] of bestJobByCompany) {
    if (!scoreByCompany.has(companyName)) continue;
  }

  shortlist.sort((a, b) => b.jobTargetScore - a.jobTargetScore || b.hiringFitScore - a.hiringFitScore || a.companyName.localeCompare(b.companyName));
  watchlist.sort((a, b) => b.opportunityScore - a.opportunityScore || a.companyName.localeCompare(b.companyName));
  return { shortlist, watchlist };
}

function jobRankScore(job) {
  const title = String(job.title ?? '').toLowerCase();
  const keywords = String(job.matchedKeywords ?? '').split(';').map(x => x.trim()).filter(Boolean);
  let score = Number(job.hiringFitScore ?? 0);
  if (/\b(ai|ml|llm)\b|machine learning|artificial intelligence|generative ai|agentic|conversational ai|大模型|人工智能|机器学习/i.test(title)) score += 35;
  if (/data scientist|data science|machine learning engineer|ai engineer|staff software|senior software|lead product manager/i.test(title)) score += 20;
  if (/product manager|software engineer|data analyst|data engineer|engineering manager/i.test(title)) score += 10;
  score += Math.min(15, keywords.length * 2);
  score += Number(job.locationPriority ?? 0) / 10;
  return score;
}

async function writeShortlistMarkdown(shortlist, watchlist, verificationQueue, status) {
  const lines = [
    '# Stage 3 AI Job Targeting Shortlist',
    '',
    `Captured at: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Scored companies: ${status.scoredCompanies}`,
    `- Scored products: ${status.scoredProducts}`,
    `- Job verification queue: ${verificationQueue.length}`,
    `- Verified/probable AI job postings: ${status.jobPostings}`,
    `- Final shortlist: ${shortlist.length}`,
    `- High-opportunity watchlist without verified AI jobs: ${watchlist.length}`,
    '',
    '## Top Targets',
    '',
    '| Rank | Company | Score | Job | Location | Status | Apply |',
    '|---:|---|---:|---|---|---|---|',
    ...shortlist.slice(0, 50).map((row, idx) => `| ${idx + 1} | ${row.companyName} | ${row.jobTargetScore} | ${row.bestJobTitle} | ${row.bestJobLocation || ''} | ${row.bestJobStatus} | ${row.applyUrl ? `[link](${row.applyUrl})` : ''} |`),
    '',
    '## Gaps',
    '',
    '- LinkedIn, BOSS, 51job and Indeed browser-backed searches were not executed by this runner; query rows were emitted for browser/session runs.',
    '- Official careers/ATS pages that returned 403/404/timeouts are recorded in `raw/job_verification_results.json`.',
  ];
  await fs.writeFile(path.join(OUT_DIR, 'target_shortlist.md'), `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  await ensureDirs();
  const companies = await readJson('companies_master_in_scope.json');
  const products = await readJson('products.json');
  const evidence = await readJson('source_evidence.json');

  const { companyScores, productScores } = buildScores(companies, products, evidence);
  await writeJson('ai_company_scores.json', companyScores);
  await writeJson('ai_product_scores.json', productScores);
  await writeCsv('ai_company_scores.csv', companyScores, [
    'companyName', 'aliases', 'region', 'country', 'city', 'categories', 'tier', 'website',
    'primaryEvidenceUrl', 'productCount', 'evidenceCount', 'aiUseCases', 'aiFitScore',
    'marketExpansionScore', 'financingLiftScore', 'commercializationScore',
    'dataReadinessScore', 'evidenceQualityScore', 'opportunityScore', 'scoreReasons', 'gaps',
  ]);
  await writeCsv('ai_product_scores.csv', productScores, [
    'companyName', 'productName', 'productType', 'sourceType', 'sourceUrl', 'categories',
    'productAiFitScore', 'expectedMarketLiftScore', 'implementationComplexityScore',
    'complianceRiskScore', 'priorityScore', 'aiOpportunity',
  ]);

  const verificationQueue = selectVerificationQueue(companyScores);
  const jobSearchQueries = verificationQueue.flatMap(row => buildJobSearchQueries(row).flatMap(q => [
    { ...q, sourceType: 'linkedin_jobs', status: 'browser_required_not_executed' },
    { ...q, sourceType: 'indeed_jobs', status: 'browser_required_not_executed' },
    { ...q, sourceType: row.region === 'China' ? 'boss_jobs' : 'not_applicable', status: row.region === 'China' ? 'browser_required_not_executed' : 'not_applicable' },
    { ...q, sourceType: row.region === 'China' ? '51job_jobs' : 'not_applicable', status: row.region === 'China' ? 'browser_required_not_executed' : 'not_applicable' },
  ])).filter(row => row.sourceType !== 'not_applicable');
  await writeCsv('job_search_queries.csv', jobSearchQueries, ['companyName', 'sourceType', 'query', 'location', 'status']);

  console.log(`Scored ${companyScores.length} companies and ${productScores.length} products.`);
  console.log(`Verifying public careers/ATS for top ${verificationQueue.length} companies...`);
  const verificationResults = await mapConcurrent(verificationQueue, CONCURRENCY, verifyCompanyJobsWithTimeout);
  const jobRows = verificationResults.flatMap(r => r.jobs);
  const jobEvidence = verificationResults.flatMap(r => r.evidenceRows);
  const jobErrors = verificationResults.flatMap(r => r.errors);

  const scoringEvidence = companyScores.map(row => ({
    companyName: row.companyName,
    sourceType: 'ai_opportunity_scoring',
    sourceUrl: row.primaryEvidenceUrl,
    capturedAt: TODAY,
    evidenceSummary: `opportunityScore=${row.opportunityScore}; ${row.aiUseCases}`,
    evidenceStrength: row.opportunityScore >= 70 ? 'strong_ai_opportunity' : 'medium_ai_opportunity',
    permissionFlag: 'derived_from_stage2_public_evidence',
  }));
  const sourceEvidence = [...scoringEvidence, ...jobEvidence];
  const { shortlist, watchlist } = buildTargetRows(companyScores, jobRows);

  await writeJson('raw/job_verification_results.json', verificationResults);
  await writeJson('raw/job_verification_errors.json', jobErrors);
  await writeJson('job_postings_verified.json', jobRows);
  await writeJson('source_evidence_ai_jobs.json', sourceEvidence);
  await writeJson('target_shortlist.json', shortlist);
  await writeJson('watchlist_no_job.json', watchlist);
  await writeCsv('job_postings_verified.csv', jobRows, [
    'companyName', 'title', 'location', 'remoteHybrid', 'seniorityFit', 'jobFamily',
    'listed', 'activeStatus', 'sourceType', 'applyUrl', 'sourceUrl', 'matchedKeywords',
    'evidenceSummary', 'locationPriority', 'hiringFitScore', 'capturedAt',
  ]);
  await writeCsv('source_evidence_ai_jobs.csv', sourceEvidence, [
    'companyName', 'sourceType', 'sourceUrl', 'capturedAt', 'evidenceSummary',
    'evidenceStrength', 'permissionFlag',
  ]);
  await writeCsv('target_shortlist.csv', shortlist, [
    'companyName', 'region', 'city', 'categories', 'opportunityScore', 'hiringFitScore',
    'jobTargetScore', 'aiUseCases', 'bestJobTitle', 'bestJobLocation', 'bestJobStatus',
    'jobFamily', 'applyUrl', 'evidenceSummary', 'gaps',
  ]);
  await writeCsv('watchlist_no_job.csv', watchlist, [
    'companyName', 'aliases', 'region', 'country', 'city', 'categories', 'tier', 'website',
    'opportunityScore', 'aiUseCases', 'scoreReasons', 'gaps', 'watchReason',
  ]);
  await writeShortlistMarkdown(shortlist, watchlist, verificationQueue, {
    scoredCompanies: companyScores.length,
    scoredProducts: productScores.length,
    jobPostings: jobRows.filter(row => row.activeStatus === 'verified_active' || row.activeStatus === 'probable_active').length,
  });

  console.log(`Done. Results: ${OUT_DIR}`);
  console.log(`shortlist=${shortlist.length} watchlist=${watchlist.length} job_postings=${jobRows.length} errors=${jobErrors.length}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
