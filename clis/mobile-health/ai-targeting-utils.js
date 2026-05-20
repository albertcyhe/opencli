export const AI_JOB_KEYWORDS = [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'large language model',
    'genai', 'generative ai', 'agent', 'copilot', 'data scientist', 'data science',
    'nlp', 'computer vision', 'deep learning', '算法', '人工智能', '机器学习', '大模型',
    '生成式', '数据科学', '自然语言', '智能体',
];

export const AI_ROLE_KEYWORDS = [
    'engineer', 'engineering', 'scientist', 'developer', 'architect', 'product manager',
    'data analyst', 'data engineer', 'analytics', 'data governance', 'software',
    'solutions architect', 'solution architect', 'integration', 'automation',
    '算法工程师', '工程师', '科学家', '架构师', '产品经理', '解决方案', '算法',
];

const TITLE_TECH_ROLE_KEYWORDS = [
    ...AI_JOB_KEYWORDS,
    ...AI_ROLE_KEYWORDS,
    'machine learning engineer', 'ml engineer', 'ai engineer', 'ai product',
    'data platform', 'data enablement', 'growth engineer', 'backend engineer',
    'full stack engineer', 'staff software', 'senior software',
];

const SENIORITY_KEYWORDS = [
    'senior', 'staff', 'principal', 'lead', 'manager', 'director', 'head', 'architect',
    'iii', 'iv', '资深', '高级', '专家', '负责人', '经理', '总监', '架构师',
];

const CLOSED_JOB_RE = /closed|expired|no longer accepting|position has been filled|职位已关闭|已下线|停止招聘/i;

export function normalizeName(name) {
    return String(name ?? '')
        .toLowerCase()
        .replace(/\b(incorporated|inc|corp|corporation|company|co|limited|ltd|llc|plc|gmbh|ag|sa|sas|srl|bv|nv)\b\.?/g, '')
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function companyAliases(company) {
    return [
        company.companyName,
        ...String(company.aliases ?? '').split(';').map(x => x.trim()).filter(Boolean),
        company.legalEntity,
    ].filter(Boolean);
}

export function matchesCompanyName(company, text) {
    const haystack = normalizeName(text);
    if (!haystack) return false;
    return companyAliases(company).some(alias => {
        const n = normalizeName(alias);
        return n.length >= 3 && (haystack === n || haystack.includes(n) || n.includes(haystack));
    });
}

export function splitTags(value) {
    return String(value ?? '').split(';').map(x => x.trim()).filter(Boolean);
}

export function boundedScore(value, max) {
    return Math.max(0, Math.min(max, Math.round(value)));
}

export function textHasAny(text, terms) {
    return terms.some(term => textHasTerm(text, term));
}

export function textHasTerm(text, term) {
    const haystack = String(text ?? '').toLowerCase();
    const needle = String(term ?? '').toLowerCase().trim();
    if (!needle) return false;
    if (/[\u4e00-\u9fff]/.test(needle)) return haystack.includes(needle);
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

function companyEvidenceText(company, products = [], evidence = []) {
    return [
        company.companyName,
        company.aliases,
        company.businessScope,
        company.categories,
        company.website,
        ...products.map(p => `${p.productName} ${p.productType} ${p.indicationOrUse} ${p.categories}`),
        ...evidence.map(e => `${e.sourceType} ${e.evidenceSummary} ${e.categories}`),
    ].filter(Boolean).join(' ');
}

export function inferAiUseCases(company, products = [], evidence = []) {
    const text = companyEvidenceText(company, products, evidence).toLowerCase();
    const tags = new Set(splitTags(company.categories));
    const out = [];
    if (tags.has('remote_patient_monitoring') || /monitor|wearable|dashboard|心电|血压|远程监测/.test(text)) out.push('远程监测风险分层与异常预警');
    if (tags.has('chronic_disease_management')) out.push('慢病管理 AI 教练与个性化随访');
    if (tags.has('rehabilitation')) out.push('康复计划生成、动作/依从性反馈与 care manager copilot');
    if (tags.has('mental_health') || tags.has('sleep_health')) out.push('心理/睡眠分层干预与对话式支持');
    if (tags.has('clinical_workflow') || /doctor|clinical|医生|临床|诊断|问诊/.test(text)) out.push('医生工作流、病历摘要和临床文档自动化');
    if (tags.has('internet_healthcare') || tags.has('online_consultation')) out.push('在线问诊分诊、问答和医患服务自动化');
    if (tags.has('pharmacy_ecommerce')) out.push('用药咨询、处方/复购推荐和药事服务自动化');
    if (tags.has('patient_engagement')) out.push('患者互动、留存和健康行为 nudging');
    if (!out.length && (tags.has('samd') || tags.has('digital_therapeutics'))) out.push('医疗软件智能化和疗效反馈闭环');
    return [...new Set(out)].slice(0, 5);
}

export function scoreCompany(company, products = [], evidence = []) {
    const tags = new Set(splitTags(company.categories));
    const text = companyEvidenceText(company, products, evidence);
    const lower = text.toLowerCase();
    const evidenceCount = Number(company.evidenceCount ?? evidence.length ?? 0);
    const productCount = products.length;

    let aiFit = 0;
    if (tags.has('remote_patient_monitoring')) aiFit += 8;
    if (tags.has('clinical_workflow')) aiFit += 8;
    if (tags.has('chronic_disease_management')) aiFit += 6;
    if (tags.has('patient_engagement')) aiFit += 6;
    if (tags.has('rehabilitation')) aiFit += 5;
    if (tags.has('mental_health') || tags.has('sleep_health')) aiFit += 5;
    if (tags.has('internet_healthcare') || tags.has('online_consultation')) aiFit += 5;
    if (tags.has('digital_therapeutics') || tags.has('samd')) aiFit += 5;
    if (tags.has('pharmacy_ecommerce')) aiFit += 3;
    if (/ai|artificial intelligence|算法|人工智能|智能|data|dashboard|personalized|个性化|平台|app|software|软件/i.test(text)) aiFit += 5;
    aiFit += Math.min(4, productCount);
    aiFit = boundedScore(aiFit, 30);

    let marketExpansion = 0;
    if (/(remote|virtual|telehealth|online|互联网|远程|在线)/i.test(text)) marketExpansion += 6;
    if (tags.has('chronic_disease_management') || tags.has('rehabilitation') || tags.has('mental_health')) marketExpansion += 5;
    if (tags.has('internet_healthcare') || tags.has('health_management_platform')) marketExpansion += 4;
    if (/(provider|payer|employer|enterprise|hospital|clinic|医生|医院|企业|B2B)/i.test(text)) marketExpansion += 3;
    if (tags.has('pharmacy_ecommerce') || /复购|电商|药房|pharmacy/i.test(text)) marketExpansion += 2;
    marketExpansion += Math.min(3, Math.floor(evidenceCount / 4));
    marketExpansion = boundedScore(marketExpansion, 20);

    let financingLift = 0;
    if (tags.has('digital_therapeutics') || tags.has('samd')) financingLift += 4;
    if (tags.has('remote_patient_monitoring') || tags.has('clinical_workflow')) financingLift += 4;
    if (tags.has('chronic_disease_management') || tags.has('mental_health') || tags.has('rehabilitation')) financingLift += 3;
    if (/ai|data|platform|automation|智能|数据|平台|自动化/i.test(text)) financingLift += 3;
    if (company.tier === 'A') financingLift += 1;
    financingLift = boundedScore(financingLift, 15);

    let commercialization = 0;
    if (company.website) commercialization += 4;
    if (evidence.some(e => e.evidenceStrength === 'strong_company_site')) commercialization += 4;
    if (evidence.some(e => e.sourceType === 'sec_company')) commercialization += 2;
    if (evidence.some(e => /news|prnewswire|dta|round2_news/i.test(e.sourceType))) commercialization += 2;
    commercialization += Math.min(3, Math.floor(evidenceCount / 3));
    commercialization = boundedScore(commercialization, 15);

    let dataReadiness = 0;
    if (tags.has('remote_patient_monitoring')) dataReadiness += 3;
    if (tags.has('clinical_workflow')) dataReadiness += 2;
    if (tags.has('patient_engagement')) dataReadiness += 2;
    if (tags.has('internet_healthcare') || tags.has('online_consultation')) dataReadiness += 2;
    if (/data|monitor|dashboard|app|platform|software|patient|clinical|数据|监测|平台|软件|患者|临床/i.test(lower)) dataReadiness += 3;
    dataReadiness = boundedScore(dataReadiness, 10);

    let evidenceQuality = 0;
    if (company.tier === 'A') evidenceQuality += 4;
    if (company.tier === 'B') evidenceQuality += 3;
    evidenceQuality += Math.min(4, Number(company.strongEvidenceCount ?? 0));
    if (Number(company.weakEvidenceCount ?? 0) <= 1) evidenceQuality += 1;
    if (company.validationStatus && String(company.validationStatus).startsWith('validated')) evidenceQuality += 1;
    evidenceQuality = boundedScore(evidenceQuality, 10);

    const opportunityScore = aiFit + marketExpansion + financingLift + commercialization + dataReadiness + evidenceQuality;
    const gaps = [];
    if (!company.website) gaps.push('website');
    if (String(company.missingFields ?? '').includes('financing')) gaps.push('financing');
    if (!products.length) gaps.push('products');
    if (!evidence.some(e => e.evidenceStrength === 'strong_company_site')) gaps.push('company_site_evidence');

    return {
        aiFitScore: aiFit,
        marketExpansionScore: marketExpansion,
        financingLiftScore: financingLift,
        commercializationScore: commercialization,
        dataReadinessScore: dataReadiness,
        evidenceQualityScore: evidenceQuality,
        opportunityScore,
        aiUseCases: inferAiUseCases(company, products, evidence).join('; '),
        scoreReasons: [
            tags.has('remote_patient_monitoring') ? '远程监测适合风险分层和异常预警' : '',
            tags.has('chronic_disease_management') ? '慢病管理具备个性化随访和 AI 教练空间' : '',
            tags.has('rehabilitation') ? '康复产品可用 AI 降低人力交付成本' : '',
            tags.has('clinical_workflow') ? '临床工作流可通过文档/决策辅助提效' : '',
            tags.has('internet_healthcare') ? '互联网医疗平台有问诊分诊和服务自动化空间' : '',
            company.website ? '已有官网/产品页信号' : '',
            company.tier === 'A' ? '有监管/官方目录证据' : '',
        ].filter(Boolean).join('; '),
        gaps: [...new Set(gaps)].join('; '),
    };
}

export function scoreProduct(product, company = {}, evidence = []) {
    const text = `${product.productName} ${product.productType} ${product.indicationOrUse} ${product.categories} ${company.categories}`;
    const tags = new Set(splitTags(product.categories || company.categories));
    let aiFit = 0;
    if (tags.has('remote_patient_monitoring')) aiFit += 8;
    if (tags.has('clinical_workflow')) aiFit += 8;
    if (tags.has('chronic_disease_management')) aiFit += 6;
    if (tags.has('rehabilitation')) aiFit += 5;
    if (tags.has('mental_health') || tags.has('sleep_health')) aiFit += 5;
    if (tags.has('patient_engagement')) aiFit += 5;
    if (/software|app|platform|monitor|data|patient|clinical|软件|平台|监测|患者|临床/i.test(text)) aiFit += 5;
    aiFit = boundedScore(aiFit, 30);

    const expectedMarketLift = boundedScore(
        (/(remote|virtual|online|互联网|远程|在线)/i.test(text) ? 7 : 0)
        + (/(chronic|rehab|mental|sleep|慢病|康复|心理|睡眠)/i.test(text) ? 6 : 0)
        + (/(platform|workflow|patient|provider|平台|流程|患者|医生)/i.test(text) ? 5 : 0)
        + (product.evidenceStrength?.startsWith('strong_') ? 2 : 0),
        20,
    );
    const implementationComplexity = boundedScore(
        (tags.has('clinical_workflow') ? 4 : 0)
        + (tags.has('samd') || tags.has('digital_therapeutics') ? 4 : 0)
        + (/(diagnosis|诊断|治疗|therapeutic)/i.test(text) ? 2 : 0),
        10,
    );
    const complianceRisk = boundedScore(
        (tags.has('samd') || tags.has('digital_therapeutics') ? 5 : 0)
        + (/(diagnosis|treatment|治疗|诊断|处方)/i.test(text) ? 3 : 0)
        + (product.sourceType?.includes('openfda') || product.sourceType?.includes('nmpa') ? 2 : 0),
        10,
    );
    const priorityScore = boundedScore(aiFit + expectedMarketLift - Math.round(implementationComplexity / 2) - Math.round(complianceRisk / 3), 50);
    return {
        productAiFitScore: aiFit,
        expectedMarketLiftScore: expectedMarketLift,
        implementationComplexityScore: implementationComplexity,
        complianceRiskScore: complianceRisk,
        priorityScore,
        aiOpportunity: inferAiUseCases(company, [product], evidence).join('; ') || '医疗软件 AI 增强',
    };
}

export function classifyJobPosting(job, company = {}) {
    const titleText = String(job.title ?? '');
    const text = `${titleText} ${job.description ?? ''} ${job.location ?? ''} ${job.company ?? ''}`;
    const hasAi = textHasAny(text, AI_JOB_KEYWORDS);
    const titleHasAi = textHasAny(titleText, AI_JOB_KEYWORDS);
    const titleHasTechRole = textHasAny(titleText, TITLE_TECH_ROLE_KEYWORDS);
    const hasRole = titleHasAi || titleHasTechRole;
    const closed = CLOSED_JOB_RE.test(text);
    const companyMatch = !company.companyName || matchesCompanyName(company, `${job.company ?? ''} ${job.url ?? ''} ${job.sourceUrl ?? ''}`);
    const official = /official|career|greenhouse|lever|ashby|workable|smartrecruiters|workday/i.test(job.sourceType ?? '');
    const activeStatus = closed
        ? 'expired_or_closed'
        : hasAi && hasRole && companyMatch && official
            ? 'verified_active'
            : hasAi && hasRole && companyMatch
                ? 'probable_active'
                : 'excluded_not_ai_role';
    const seniorityFit = textHasAny(text, SENIORITY_KEYWORDS) ? 'senior_preferred' : 'middle_or_unspecified';
    return {
        activeStatus,
        jobFamily: inferJobFamily(text),
        seniorityFit,
        matchedKeywords: [...AI_JOB_KEYWORDS, ...AI_ROLE_KEYWORDS].filter(k => textHasTerm(text, k)).slice(0, 12).join('; '),
        locationPriority: locationPriority(job.location),
        hiringFitScore: hiringFitScore({ activeStatus, seniorityFit, location: job.location, sourceType: job.sourceType }),
    };
}

export function inferJobFamily(text) {
    const lower = String(text ?? '').toLowerCase();
    if (/product manager|产品经理/.test(lower)) return 'ai_product';
    if (/solution architect|solutions architect|integration|architect|解决方案|架构/.test(lower)) return 'ai_integration_or_solution';
    if (/data scientist|data science|数据科学/.test(lower)) return 'data_science';
    if (/nlp|language|llm|大模型|自然语言/.test(lower)) return 'llm_nlp';
    if (/computer vision|vision|图像|影像/.test(lower)) return 'computer_vision';
    if (/machine learning|ml|ai|算法|人工智能|机器学习/.test(lower)) return 'ai_ml_engineering';
    return 'ai_related';
}

export function locationPriority(location) {
    const loc = String(location ?? '').toLowerCase();
    if (/remote|anywhere|global|worldwide|远程|居家/.test(loc)) return 100;
    if (/成都|chengdu/.test(loc)) return 95;
    if (/北京|beijing|上海|shanghai|广州|guangzhou|深圳|shenzhen|杭州|hangzhou/.test(loc)) return 90;
    if (/united states|usa|u\.s\.|new york|san francisco|boston|europe|london|berlin|paris|switzerland|germany|france|uk|united kingdom/.test(loc)) return 75;
    return 45;
}

export function hiringFitScore({ activeStatus, seniorityFit, location, sourceType }) {
    if (activeStatus === 'expired_or_closed' || activeStatus === 'excluded_not_ai_role') return 0;
    let score = activeStatus === 'verified_active' ? 62 : 45;
    score += Math.round(locationPriority(location) * 0.25);
    if (seniorityFit === 'senior_preferred') score += 8;
    if (/official|greenhouse|lever|ashby|workable|smartrecruiters|workday/i.test(sourceType ?? '')) score += 5;
    return boundedScore(score, 100);
}

export function absoluteUrl(href, baseUrl) {
    try {
        return new URL(href, baseUrl).toString();
    } catch {
        return '';
    }
}

export function extractLinks(html, baseUrl) {
    const links = [];
    for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
        const url = absoluteUrl(match[1], baseUrl);
        const text = cleanHtml(match[2]);
        if (url) links.push({ url, text });
    }
    return links;
}

export function extractCareerLinks(html, baseUrl) {
    return extractLinks(html, baseUrl)
        .filter(link => /career|jobs|join|work-with|workwith|招聘|加入/i.test(`${link.url} ${link.text}`))
        .slice(0, 12);
}

export function detectAtsLinks(html, baseUrl) {
    const text = `${html ?? ''} ${baseUrl}`;
    const urls = new Set(extractLinks(html, baseUrl).map(x => x.url));
    const directUrls = [...text.matchAll(/https?:\/\/[^\s"'<>)]*(greenhouse|lever|ashbyhq|workable|smartrecruiters|workday)[^\s"'<>)]*/gi)].map(m => m[0]);
    for (const url of directUrls) urls.add(url);
    return [...urls].filter(url => /greenhouse|lever|ashbyhq|workable|smartrecruiters|workday/i.test(url)).slice(0, 20);
}

export function parseGenericJobLinks(html, baseUrl, company) {
    return extractLinks(html, baseUrl)
        .filter(link => textHasAny(`${link.text} ${link.url}`, AI_JOB_KEYWORDS) && textHasAny(`${link.text} ${link.url}`, AI_ROLE_KEYWORDS))
        .map(link => ({
            title: link.text.slice(0, 180),
            company: company.companyName,
            location: '',
            description: link.text,
            sourceType: 'official_careers_page',
            url: link.url,
            sourceUrl: baseUrl,
        }));
}

export function cleanHtml(html) {
    return String(html ?? '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

export function buildJobSearchQueries(company) {
    const aliases = companyAliases(company).slice(0, 3);
    const base = aliases[0] || company.companyName;
    const locations = ['Remote', 'Chengdu', '北京 OR 上海 OR 深圳 OR 杭州 OR 广州 OR 成都'];
    const keywords = ['AI engineer OR machine learning OR LLM', 'data scientist OR AI product', '人工智能 OR 大模型 OR 算法'];
    const rows = [];
    for (const location of locations) {
        for (const keyword of keywords) {
            rows.push({
                companyName: company.companyName,
                query: `${base} ${keyword}`,
                location,
            });
        }
    }
    return rows;
}
