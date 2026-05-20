#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  classifyJobPosting,
  normalizeName,
} from '../clis/mobile-health/ai-targeting-utils.js';

const ROOT = process.cwd();
const AI_DIR = path.join(ROOT, 'results', 'stage2-digital-health', 'ai-targeting');
const OUT_DIR = path.join(AI_DIR, 'china-job-verification');
const TODAY = new Date().toISOString().slice(0, 10);

const ACTIVE_JOB_EVIDENCE = [
  {
    companyName: '上海联影智能科技股份有限公司',
    jobCompany: '上海联影医疗科技股份有限公司',
    stage2Fit: 'related_group',
    title: '软件算法工程师（AI/图形图像）',
    location: '上海',
    sourceType: 'nowcoder_jobs_public_active',
    sourceUrl: 'https://www.nowcoder.com/jobs/detail/412527',
    applyUrl: 'https://www.nowcoder.com/jobs/detail/412527',
    listed: '投递时间：2025-08-27 至 2026-07-01',
    activeStatus: 'probable_active',
    evidenceSummary: '牛客职位页显示“立即申请”，投递时间至 2026-07-01；岗位参与联影产品 AI 算法开发，覆盖医学影像、计算机视觉、深度学习、机器学习、NLP 等。',
    entityNote: '岗位主体为联影医疗，页面明确提到联影智能方向；与 Stage 2 的联影智能按集团/产品线关联处理。',
  },
  {
    companyName: '上海联影智能科技股份有限公司',
    jobCompany: '上海联影医疗科技股份有限公司',
    stage2Fit: 'related_group',
    title: 'AI算法工程师',
    location: '上海',
    sourceType: 'linkedin_jobs_public',
    sourceUrl: 'https://cn.linkedin.com/jobs/view/ai%E7%AE%97%E6%B3%95%E5%B7%A5%E7%A8%8B%E5%B8%88-at-%E4%B8%8A%E6%B5%B7%E8%81%94%E5%BD%B1%E5%8C%BB%E7%96%97%E7%A7%91%E6%8A%80%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8-4392853080',
    applyUrl: 'https://cn.linkedin.com/jobs/view/ai%E7%AE%97%E6%B3%95%E5%B7%A5%E7%A8%8B%E5%B8%88-at-%E4%B8%8A%E6%B5%B7%E8%81%94%E5%BD%B1%E5%8C%BB%E7%96%97%E7%A7%91%E6%8A%80%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8-4392853080',
    listed: '搜索索引显示近 6 天抓取',
    activeStatus: 'probable_active',
    evidenceSummary: 'LinkedIn 职位页显示医疗 AI、Qwen/Llama 微调、医疗垂直模型研发、临床信息系统/医疗知识图谱等要求。',
    entityNote: '第三方招聘页，未从官方 careers 二次确认。',
  },
  {
    companyName: '阿里健康',
    jobCompany: '阿里健康',
    stage2Fit: 'exact_stage2',
    title: '阿里健康-大模型算法工程师-智能问答-杭州',
    location: '杭州',
    sourceType: 'linkedin_jobs_public',
    sourceUrl: 'https://cn.linkedin.com/jobs/view/%E9%98%BF%E9%87%8C%E5%81%A5%E5%BA%B7-%E5%A4%A7%E6%A8%A1%E5%9E%8B%E7%AE%97%E6%B3%95%E5%B7%A5%E7%A8%8B%E5%B8%88%E2%80%94%E6%99%BA%E8%83%BD%E9%97%AE%E7%AD%94-%E6%9D%AD%E5%B7%9E-at-%E9%98%BF%E9%87%8C%E5%81%A5%E5%BA%B7-4387574337',
    applyUrl: 'https://cn.linkedin.com/jobs/view/%E9%98%BF%E9%87%8C%E5%81%A5%E5%BA%B7-%E5%A4%A7%E6%A8%A1%E5%9E%8B%E7%AE%97%E6%B3%95%E5%B7%A5%E7%A8%8B%E5%B8%88%E2%80%94%E6%99%BA%E8%83%BD%E9%97%AE%E7%AD%94-%E6%9D%AD%E5%B7%9E-at-%E9%98%BF%E9%87%8C%E5%81%A5%E5%BA%B7-4387574337',
    listed: 'LinkedIn 显示约 1 个月前；BeBee 同岗显示截至 2026-05-24',
    activeStatus: 'probable_active',
    evidenceSummary: '岗位负责阿里健康智能问答业务场景的算法建模和优化，包括医学大模型基座、agent、强化学习；要求 NLP、大模型训练调优、RFT/RLVR/RM/PPO/GRPO 等经验。',
    entityNote: '职位来源标注为猎聘，LinkedIn/BeBee 均可访问；未从阿里官方 careers 二次确认。',
  },
  {
    companyName: '阿里健康',
    jobCompany: '阿里健康',
    stage2Fit: 'exact_stage2',
    title: '阿里健康校招-医疗大模型 算法工程师',
    location: '杭州',
    sourceType: 'linkedin_jobs_list_public',
    sourceUrl: 'https://cn.linkedin.com/jobs/algorithm-engineer-%E8%81%8C%E4%BD%8D-hangzhou',
    applyUrl: 'https://cn.linkedin.com/jobs/algorithm-engineer-%E8%81%8C%E4%BD%8D-hangzhou',
    listed: 'LinkedIn 列表显示约 3 个月前',
    activeStatus: 'probable_active',
    evidenceSummary: 'LinkedIn 杭州 Algorithm Engineer 列表显示阿里健康多个算法岗位，包括医疗大模型算法工程师、自然语言处理算法工程师、推荐算法工程师等。',
    entityNote: '列表页证据，仅作同公司招聘强度补充。',
  },
  {
    companyName: '平安健康',
    jobCompany: '平安健康保险股份有限公司',
    stage2Fit: 'related_name_entity_mismatch',
    title: '098125-大模型算法工程师（专场）',
    location: '上海',
    sourceType: 'linkedin_jobs_public',
    sourceUrl: 'https://cn.linkedin.com/jobs/view/098125-%E5%A4%A7%E6%A8%A1%E5%9E%8B%E7%AE%97%E6%B3%95%E5%B7%A5%E7%A8%8B%E5%B8%88%EF%BC%88%E4%B8%93%E5%9C%BA%EF%BC%89-at-%E5%B9%B3%E5%AE%89%E5%81%A5%E5%BA%B7%E4%BF%9D%E9%99%A9%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8-4406434485',
    applyUrl: 'https://cn.linkedin.com/jobs/view/098125-%E5%A4%A7%E6%A8%A1%E5%9E%8B%E7%AE%97%E6%B3%95%E5%B7%A5%E7%A8%8B%E5%B8%88%EF%BC%88%E4%B8%93%E5%9C%BA%EF%BC%89-at-%E5%B9%B3%E5%AE%89%E5%81%A5%E5%BA%B7%E4%BF%9D%E9%99%A9%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8-4406434485',
    listed: 'LinkedIn 显示 4 天前',
    activeStatus: 'probable_active',
    evidenceSummary: '岗位理解保险业务和医疗健康行业的大模型应用需求，负责预训练模型选择、数据处理、模型微调、评测、RLHF 等工作。',
    entityNote: '主体是平安健康保险股份有限公司，不是平安健康医疗科技/平安好医生；列入相关机会，不算 Stage 2 精确命中。',
  },
  {
    companyName: '平安健康',
    jobCompany: '平安健康保险股份有限公司',
    stage2Fit: 'related_name_entity_mismatch',
    title: '算法工程师-大模型',
    location: '深圳',
    sourceType: 'bebee_jobs_public',
    sourceUrl: 'https://bebee.com/cn/jobs/shenzhen-guangdong--theirstack-659292784',
    applyUrl: 'https://bebee.com/cn/jobs/shenzhen-guangdong--theirstack-659292784',
    listed: 'BeBee 显示截至 2026-06-08',
    activeStatus: 'probable_active',
    evidenceSummary: '岗位面向保险营销、智能客服、风控、业务数据分析等场景，做大语言模型和多模态大模型算法设计、SFT、Prompt、蒸馏、RLHF、量化压缩与上线落地。',
    entityNote: '主体是平安健康保险股份有限公司；与平安健康平台有品牌/集团相关性但不误合并。',
  },
  {
    companyName: '讯飞医疗科技股份有限公司',
    jobCompany: '讯飞医疗科技股份有限公司',
    stage2Fit: 'new_digital_health_candidate',
    title: '讯飞医疗-高级AI算法工程师-北京',
    location: '北京',
    sourceType: 'bebee_jobs_public',
    sourceUrl: 'https://bebee.com/cn/jobs/ai--ss-cn-1h0ri7c',
    applyUrl: 'https://bebee.com/cn/jobs/ai--ss-cn-1h0ri7c',
    listed: 'BeBee 显示 2 天前，截止 2026-07-10',
    activeStatus: 'probable_active',
    evidenceSummary: '岗位牵头研究大模型训练核心算法，探索大语言模型训练范式，熟悉训练/推理框架，管理算法团队；主体为讯飞医疗。',
    entityNote: 'Stage 2 主清单未命中，但属于明确医疗 AI / 数字医疗候选，应加入扩展目标。',
  },
  {
    companyName: '百度健康',
    jobCompany: '百度',
    stage2Fit: 'new_digital_health_candidate',
    title: '健康事业部-多模态大模型算法工程师-2026AIDU',
    location: '北京',
    sourceType: 'mianshima_jobs_public',
    sourceUrl: 'https://www.mianshima.com/job/11/31da93c6-1616-449a-b0ff-f1f56c5d4df6',
    applyUrl: 'https://www.mianshima.com/job/11/31da93c6-1616-449a-b0ff-f1f56c5d4df6',
    listed: '页面显示 2025-05-26，状态：招聘',
    activeStatus: 'probable_active',
    evidenceSummary: '岗位建设医疗健康领域多模态大模型数据管线、模型结构设计与效果优化，提升健康内容/服务场景理解和生成能力。',
    entityNote: '第三方校园职位页显示状态招聘；需要官方百度招聘页二次确认。',
  },
  {
    companyName: '华佗大数据健康（杭州）有限公司',
    jobCompany: '华佗大数据健康（杭州）有限公司',
    stage2Fit: 'new_digital_health_candidate',
    title: 'Python后端开发工程师（AI Agent方向）',
    location: '杭州',
    sourceType: 'niuqizp_public_recruitment_notice',
    sourceUrl: 'https://jobs.niuqizp.com/job-vms55CzZC.html',
    applyUrl: 'https://jobs.niuqizp.com/job-vms55CzZC.html',
    listed: '发布日期：2026-04-15',
    activeStatus: 'probable_active',
    evidenceSummary: '公开招聘公告称公司是医疗数据+AI全栈应用解决方案提供方，旗下云上华佗是人工智能数字健康科技平台；招聘 Python 后端开发工程师（AI Agent 方向）。',
    entityNote: 'Stage 2 主清单未命中，但岗位和公司业务均为数字健康/医疗 AI，应加入扩展目标。',
  },
  {
    companyName: '北京医者信息科技有限责任公司',
    jobCompany: '北京医者信息科技有限责任公司',
    stage2Fit: 'new_digital_health_candidate',
    title: '2026招聘大模型算法工程师',
    location: '北京',
    sourceType: 'niuqizp_campus_public',
    sourceUrl: 'https://campus.niuqizp.com/job-vrY5z5LM5.html',
    applyUrl: 'https://campus.niuqizp.com/job-vrY5z5LM5.html',
    listed: '发布日期：2026-05-11；招聘 10 人',
    activeStatus: 'probable_active',
    evidenceSummary: '页面显示招聘大模型算法工程师 10 人，要求 Transformers、PyTorch、大模型预训练/微调/评估、DeepSpeed、vLLM 等经验。',
    entityNote: 'Stage 2 主清单未命中；公司名显示医疗信息科技属性，需第三轮补业务范围和融资资料。',
  },
  {
    companyName: '腾讯医疗健康（深圳）有限公司',
    jobCompany: '腾讯',
    stage2Fit: 'parent_company_indirect',
    title: '混元大语言模型后训练算法工程师（深圳/北京/上海）',
    location: '深圳 / 北京 / 上海',
    sourceType: 'official_tencent_careers_via_niuqizp',
    sourceUrl: 'https://jobs.niuqizp.com/job-vmU55NnaZ.html',
    applyUrl: 'https://careers.tencent.com/jobdesc.html?postId=2009467972866957312',
    listed: '发布日期：2026-05-12；来源：腾讯官网',
    activeStatus: 'verified_active',
    evidenceSummary: '岗位负责混元大语言模型后训练、Reward Modeling、RLHF、个性化大模型、Memory/RAG、数据飞轮和评测；页面提供腾讯官网投递链接。',
    entityNote: '这是腾讯集团/混元岗位，不是腾讯医疗健康主体岗位；列为“集团 AI 能力强相关、医疗健康产品间接受益”。',
  },
  {
    companyName: '腾讯医疗健康（深圳）有限公司',
    jobCompany: '腾讯科技',
    stage2Fit: 'parent_company_indirect',
    title: '大模型算法工程师（具身对话方向）',
    location: '深圳',
    sourceType: 'nowcoder_jobs_public_active',
    sourceUrl: 'https://www.nowcoder.com/jobs/detail/437480?urlSource=sitemap',
    applyUrl: 'https://www.nowcoder.com/jobs/detail/437480?urlSource=sitemap',
    listed: '牛客职位页显示“立即申请”，HR 昨日在线',
    activeStatus: 'probable_active',
    evidenceSummary: '岗位负责 LLM + Agent + Robotics 技术融合，面向真实养老、情感陪伴场景落地；要求 LLM 微调、RAG、RLHF、Agent 框架、推理部署等。',
    entityNote: '腾讯科技岗位，场景含养老/陪伴，但不是腾讯医疗健康主体岗位。',
  },
  {
    companyName: '京东健康',
    jobCompany: '京东',
    stage2Fit: 'parent_company_indirect',
    title: '大模型算法工程师',
    location: '北京',
    sourceType: 'media_recruitment_notice',
    sourceUrl: 'https://finance.sina.com.cn/wm/2026-03-12/doc-inhqtkar4770814.shtml',
    applyUrl: 'https://finance.sina.com.cn/wm/2026-03-12/doc-inhqtkar4770814.shtml',
    listed: '发布于 2026-03-12',
    activeStatus: 'probable_active',
    evidenceSummary: 'DataFunTalk/Sina 招聘稿显示京东招聘大模型算法工程师，要求 LLM/多模态训练、后训练、强化学习、MOE/注意力等；给出投递邮箱。',
    entityNote: '岗位为京东集团泛 AI，不是京东健康；另一个牛客京东 LLM 岗页面显示已结束，因此只能列为集团间接机会。',
  },
];

const NEGATIVE_OR_GATED_CHECKS = [
  ['医联', '成都', 'BOSS 可返回医联成都职位，但本轮未核验到 AI/大模型/算法岗位；51job 被 WAF 滑块拦截。'],
  ['智云健康', '杭州', '公开搜索未核验到 active AI/大模型/算法岗位；BOSS/51job 未完成可审计核验。'],
  ['微医', '杭州', '公开搜索未核验到 active AI/LLM/算法岗位。'],
  ['方舟健客', '广州', '公开搜索未核验到 active AI/LLM/算法岗位。'],
  ['妙手医生', '北京', '公开搜索未核验到 active AI/LLM/算法岗位。'],
  ['春雨医生', '北京', '公开搜索未核验到 active AI/LLM/算法岗位。'],
  ['健康160', '深圳', '公开搜索未核验到 active AI/LLM/算法岗位。'],
  ['思派健康', '北京', '公开搜索未核验到 active AI/LLM/算法岗位。'],
  ['圆心科技', '北京', '公开搜索未核验到 active AI/LLM/算法岗位。'],
  ['成都尚医信息科技有限公司', '成都', '公开搜索未核验到 active AI/LLM/算法岗位。'],
];

const INFERRED_OPPORTUNITY = new Map([
  ['讯飞医疗科技股份有限公司', 76],
  ['百度健康', 74],
  ['华佗大数据健康（杭州）有限公司', 72],
  ['北京医者信息科技有限责任公司', 66],
]);

function csvCell(value) {
  if (value == null) return '';
  const text = Array.isArray(value) ? value.join('; ') : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function readJson(rel) {
  return JSON.parse(await fs.readFile(path.join(AI_DIR, rel), 'utf8'));
}

async function writeJson(rel, value) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, rel), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeCsv(rel, rows, columns) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const lines = [columns.join(','), ...rows.map(row => columns.map(col => csvCell(row[col])).join(','))];
  await fs.writeFile(path.join(OUT_DIR, rel), `${lines.join('\n')}\n`, 'utf8');
}

function isChinaStage2Company(row) {
  return row.region === 'China'
    || row.country === 'China'
    || /北京|上海|广州|深圳|杭州|成都/.test(row.city ?? '')
    || /[\u4e00-\u9fff]/.test(row.companyName ?? '');
}

function stage2ScoreFor(row, scoreByName) {
  const keys = [
    row.companyName,
    row.jobCompany,
    row.companyName.replace(/科技股份有限公司|股份有限公司|有限责任公司|有限公司/g, ''),
  ].map(normalizeName);
  for (const key of keys) {
    if (scoreByName.has(key)) return scoreByName.get(key);
  }
  return null;
}

function remoteHybrid(location) {
  const text = String(location ?? '');
  if (/远程|Remote|remote|居家/.test(text)) return 'remote';
  if (/混合|Hybrid|hybrid/.test(text)) return 'hybrid';
  return 'onsite_or_unspecified';
}

function rankJob(row) {
  let score = Number(row.hiringFitScore ?? 0);
  if (row.activeStatus === 'verified_active') score += 12;
  if (row.stage2Fit === 'exact_stage2') score += 10;
  if (row.stage2Fit === 'related_group') score += 6;
  if (/大模型|LLM|Agent|智能问答|医疗|健康|医学|AI/i.test(row.title + row.evidenceSummary)) score += 10;
  if (/杭州|成都|北京|上海|深圳|广州/.test(row.location)) score += 8;
  if (/parent_company_indirect|entity_mismatch/.test(row.stage2Fit)) score -= 8;
  return Math.round(score);
}

function targetScore(opportunityScore, hiringFitScore, row) {
  let score = Math.round(Number(opportunityScore ?? 0) * 0.65 + Number(hiringFitScore ?? 0) * 0.35);
  if (row.stage2Fit === 'new_digital_health_candidate') score -= 2;
  if (/parent_company_indirect|entity_mismatch/.test(row.stage2Fit)) score -= 6;
  return Math.max(0, score);
}

function bestJobsByCompany(rows) {
  const out = new Map();
  for (const row of rows.filter(x => ['verified_active', 'probable_active'].includes(x.activeStatus))) {
    const key = row.companyName;
    const current = out.get(key);
    if (!current || rankJob(row) > rankJob(current)) out.set(key, row);
  }
  return [...out.values()];
}

async function writeMarkdown(shortlist, watchlist, jobRows) {
  const lines = [
    '# Stage 3.1 China AI Job Verification',
    '',
    `Captured at: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Public active/probable AI job postings: ${jobRows.filter(x => ['verified_active', 'probable_active'].includes(x.activeStatus)).length}`,
    `- China shortlist companies: ${shortlist.length}`,
    `- China watchlist without verified AI jobs: ${watchlist.length}`,
    '- BOSS was readable in an initial smoke but later returned login/network errors; 51job returned Aliyun WAF slider. Those sources are marked gated rather than treated as negative evidence.',
    '- No China digital-health target showed a clearly China/global remote AI role in this pass; verified locations are Beijing, Shanghai, Shenzhen, Hangzhou, or unspecified onsite.',
    '',
    '## Shortlist',
    '',
    '| Rank | Company | Score | Job | Location | Status | Fit | Source |',
    '|---:|---|---:|---|---|---|---|---|',
    ...shortlist.map((row, idx) => `| ${idx + 1} | ${row.companyName} | ${row.jobTargetScore} | ${row.bestJobTitle} | ${row.bestJobLocation} | ${row.bestJobStatus} | ${row.stage2Fit} | ${row.applyUrl ? `[link](${row.applyUrl})` : ''} |`),
    '',
    '## Watchlist',
    '',
    ...watchlist.slice(0, 40).map(row => `- ${row.companyName} (${row.city || ''}): ${row.watchReason}`),
  ];
  await fs.writeFile(path.join(OUT_DIR, 'china_target_shortlist.md'), `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const companyScores = await readJson('ai_company_scores.json');
  const scoreByName = new Map(companyScores.map(row => [normalizeName(row.companyName), row]));

  const jobRows = ACTIVE_JOB_EVIDENCE.map(raw => {
    const scoreRow = stage2ScoreFor(raw, scoreByName);
    const opportunityScore = scoreRow?.opportunityScore ?? INFERRED_OPPORTUNITY.get(raw.companyName) ?? 58;
    const cls = classifyJobPosting({
      title: raw.title,
      company: raw.jobCompany,
      location: raw.location,
      description: raw.evidenceSummary,
      sourceType: raw.sourceType.startsWith('official') ? 'official_careers_page' : raw.sourceType,
      url: raw.applyUrl,
      sourceUrl: raw.sourceUrl,
    }, { companyName: raw.jobCompany, aliases: raw.companyName });
    const hiringFitScore = raw.activeStatus === 'verified_active'
      ? Math.max(cls.hiringFitScore, 88)
      : Math.max(cls.hiringFitScore, 76);
    return {
      companyName: raw.companyName,
      jobCompany: raw.jobCompany,
      stage2Fit: raw.stage2Fit,
      title: raw.title,
      location: raw.location,
      remoteHybrid: remoteHybrid(raw.location),
      seniorityFit: cls.seniorityFit,
      jobFamily: cls.jobFamily,
      listed: raw.listed,
      activeStatus: raw.activeStatus,
      sourceType: raw.sourceType,
      applyUrl: raw.applyUrl,
      sourceUrl: raw.sourceUrl,
      matchedKeywords: cls.matchedKeywords,
      evidenceSummary: raw.evidenceSummary,
      entityNote: raw.entityNote,
      opportunityScore,
      scoreSource: scoreRow ? 'stage2_ai_company_scores' : 'inferred_from_public_job_and_company_scope',
      hiringFitScore,
      jobTargetScore: targetScore(opportunityScore, hiringFitScore, raw),
      capturedAt: TODAY,
    };
  }).sort((a, b) => b.jobTargetScore - a.jobTargetScore || a.companyName.localeCompare(b.companyName));

  const bestRows = bestJobsByCompany(jobRows);
  const shortlist = bestRows.map(row => ({
    companyName: row.companyName,
    jobCompany: row.jobCompany,
    stage2Fit: row.stage2Fit,
    opportunityScore: row.opportunityScore,
    hiringFitScore: row.hiringFitScore,
    jobTargetScore: row.jobTargetScore,
    bestJobTitle: row.title,
    bestJobLocation: row.location,
    bestJobStatus: row.activeStatus,
    remoteHybrid: row.remoteHybrid,
    jobFamily: row.jobFamily,
    applyUrl: row.applyUrl,
    sourceType: row.sourceType,
    evidenceSummary: row.evidenceSummary,
    entityNote: row.entityNote,
    capturedAt: row.capturedAt,
  })).sort((a, b) => b.jobTargetScore - a.jobTargetScore || a.companyName.localeCompare(b.companyName));

  const activeCompanies = new Set(jobRows.map(row => row.companyName));
  const chinaRows = companyScores.filter(isChinaStage2Company);
  const highWatch = chinaRows
    .filter(row => row.opportunityScore >= 34 && !activeCompanies.has(row.companyName))
    .map(row => ({
      companyName: row.companyName,
      aliases: row.aliases,
      city: row.city,
      categories: row.categories,
      opportunityScore: row.opportunityScore,
      website: row.website,
      watchReason: 'no_active_ai_job_verified_in_public_china_pass',
    }));
  const negativeRows = NEGATIVE_OR_GATED_CHECKS.map(([companyName, city, watchReason]) => ({
    companyName,
    aliases: companyScores.find(row => row.companyName === companyName)?.aliases ?? '',
    city,
    categories: companyScores.find(row => row.companyName === companyName)?.categories ?? '',
    opportunityScore: companyScores.find(row => row.companyName === companyName)?.opportunityScore ?? '',
    website: companyScores.find(row => row.companyName === companyName)?.website ?? '',
    watchReason,
  }));
  const seenWatch = new Set();
  const watchlist = [...negativeRows, ...highWatch]
    .filter(row => {
      const key = normalizeName(row.companyName);
      if (activeCompanies.has(row.companyName) || seenWatch.has(key)) return false;
      seenWatch.add(key);
      return true;
    })
    .sort((a, b) => Number(b.opportunityScore || 0) - Number(a.opportunityScore || 0) || a.companyName.localeCompare(b.companyName));

  const evidenceRows = [
    ...jobRows.map(row => ({
      companyName: row.companyName,
      jobTitle: row.title,
      sourceType: row.sourceType,
      sourceUrl: row.sourceUrl,
      capturedAt: TODAY,
      evidenceSummary: `${row.activeStatus}; ${row.location}; ${row.evidenceSummary}`,
      evidenceStrength: row.activeStatus === 'verified_active' ? 'strong_official_job' : 'medium_public_job',
      permissionFlag: 'public_job_posting',
      entityNote: row.entityNote,
    })),
    {
      companyName: '51job',
      jobTitle: '',
      sourceType: '51job_search',
      sourceUrl: 'https://we.51job.com/',
      capturedAt: TODAY,
      evidenceSummary: '51job adapter smoke returned Aliyun WAF slider; not treated as negative evidence.',
      evidenceStrength: 'gated_job_source',
      permissionFlag: 'browser_waf_challenge',
      entityNote: '',
    },
    {
      companyName: 'BOSS直聘',
      jobTitle: '',
      sourceType: 'boss_search',
      sourceUrl: 'https://www.zhipin.com/',
      capturedAt: TODAY,
      evidenceSummary: 'BOSS adapter initial smoke returned readable jobs, but subsequent searches returned login/network errors; not treated as negative evidence.',
      evidenceStrength: 'gated_job_source',
      permissionFlag: 'browser_or_login_required',
      entityNote: '',
    },
  ];

  await writeJson('china_job_postings_verified.json', jobRows);
  await writeJson('china_target_shortlist.json', shortlist);
  await writeJson('china_watchlist_no_job.json', watchlist);
  await writeJson('source_evidence_china_jobs.json', evidenceRows);
  await writeCsv('china_job_postings_verified.csv', jobRows, [
    'companyName', 'jobCompany', 'stage2Fit', 'title', 'location', 'remoteHybrid',
    'seniorityFit', 'jobFamily', 'listed', 'activeStatus', 'sourceType', 'applyUrl',
    'sourceUrl', 'matchedKeywords', 'evidenceSummary', 'entityNote', 'opportunityScore',
    'scoreSource', 'hiringFitScore', 'jobTargetScore', 'capturedAt',
  ]);
  await writeCsv('china_target_shortlist.csv', shortlist, [
    'companyName', 'jobCompany', 'stage2Fit', 'opportunityScore', 'hiringFitScore',
    'jobTargetScore', 'bestJobTitle', 'bestJobLocation', 'bestJobStatus',
    'remoteHybrid', 'jobFamily', 'applyUrl', 'sourceType', 'evidenceSummary',
    'entityNote', 'capturedAt',
  ]);
  await writeCsv('china_watchlist_no_job.csv', watchlist, [
    'companyName', 'aliases', 'city', 'categories', 'opportunityScore', 'website', 'watchReason',
  ]);
  await writeCsv('source_evidence_china_jobs.csv', evidenceRows, [
    'companyName', 'jobTitle', 'sourceType', 'sourceUrl', 'capturedAt',
    'evidenceSummary', 'evidenceStrength', 'permissionFlag', 'entityNote',
  ]);
  await writeMarkdown(shortlist, watchlist, jobRows);

  console.log(`China job verification written to ${OUT_DIR}`);
  console.log(`job_postings=${jobRows.length} shortlist=${shortlist.length} watchlist=${watchlist.length}`);
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
