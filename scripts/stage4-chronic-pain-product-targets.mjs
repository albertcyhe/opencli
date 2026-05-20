#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeName } from '../clis/mobile-health/ai-targeting-utils.js';

const ROOT = process.cwd();
const STAGE2_DIR = path.join(ROOT, 'results', 'stage2-digital-health');
const AI_DIR = path.join(STAGE2_DIR, 'ai-targeting');
const OUT_DIR = path.join(AI_DIR, 'chronic-pain-product-targets');
const TODAY = new Date().toISOString().slice(0, 10);

const ALLOWED_REACHABILITY = new Set(['global_remote_confirmed', 'china_local_reachable']);
const GLOBAL_REMOTE_RE = /worldwide|global|anywhere|international|fully remote|remote-first|distributed/i;
const RESTRICTED_REMOTE_RE = /remote\s*-\s*(us|usa|u\.s\.|uk|united kingdom|germany|canada|europe)|within the united states|within the uk|authorized to work in the united states/i;

const CURATED_TARGETS = [
  {
    companyName: '成都尚医信息科技有限公司',
    aliases: '尚医科技; R Plus Health; 术康',
    country: 'CN',
    city: '成都',
    diseaseFocus: 'chronic_pain_msk',
    productLine: 'R Plus Health / 术康居家康复',
    productType: 'home_rehabilitation_app',
    targetUsers: '康复患者、出院后患者、慢性疼痛/运动功能障碍人群',
    businessModel: 'B2C app + 医疗健康 IT 服务合作',
    productEvidenceUrl: 'https://www.prnewswire.com/news-releases/cf-pharmtech-and-chengdu-shangyi-launch-the-home-based-recovery-program-for-discharged-covid-19-patients-and-announce-todays-global-release-of-the-r-plus-health-free-app-301219070.html',
    productEvidenceSummary: '公开新闻称成都尚医与合作方发布 R Plus Health 居家康复 App，为出院患者提供康复计划和居家恢复支持。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://m.newseed.cn/company/43464',
    reachabilityEvidenceSummary: '公开企业资料显示为成都公司，适合中文主动联系和本地生态切入。',
    contactRoute: '官网/工商线索/合作新闻相关联系人/成都医疗健康生态',
    contactTargets: '创始人、产品负责人、康复业务负责人、合作 BD',
    aiProductOpportunity: '把康复计划升级为 AI 康复教练：疼痛/活动记录、动作依从性反馈、阶段性康复计划生成、异常提醒和康复师 copilot。',
    outreachOpening: '我关注到 R Plus Health 的居家康复方向，想探讨如何用 LLM agent 把康复计划、疼痛日记和随访管理做成可规模化的 AI 康复教练。',
    personalFitReason: '医学背景能理解康复/疼痛路径，LLM agent 能快速做患者随访和康复计划原型。',
    sourceTier: 'curated',
    score: [30, 24, 20, 14, 7],
  },
  {
    companyName: 'RecoveryPlus.health',
    aliases: 'Recovery Plus USA Inc; Recovery Plus',
    country: 'US',
    city: 'New York',
    diseaseFocus: 'chronic_pain_msk; metabolic_cardiovascular',
    productLine: 'Virtual cardiac/pulmonary rehab and chronic care',
    productType: 'virtual_rehabilitation_chronic_care',
    targetUsers: '心肺康复、慢病管理、远程护理患者',
    businessModel: 'virtual care provider / reimbursable care programs',
    productEvidenceUrl: 'https://www.recoveryplus.health/about/',
    productEvidenceSummary: '公司介绍其虚拟慢病管理、心脏/肺康复和远程患者支持服务。',
    reachabilityStatus: 'remote_unknown',
    reachabilityEvidenceUrl: 'https://www.recoveryplus.health/about/',
    reachabilityEvidenceSummary: '未找到严格 worldwide/global remote 证据；只能进入 target pool 或 unknown watchlist。',
    contactRoute: '官网 contact / founder / clinical leadership',
    contactTargets: 'Founder、Chief Medical Officer、Head of Product、Rehab program lead',
    aiProductOpportunity: 'AI care manager 用于心肺康复依从性、症状问答、风险分层、个性化运动处方和护理团队 copilot。',
    outreachOpening: '我想围绕虚拟心肺康复设计一个 AI care manager 原型，降低人力随访成本并提升患者依从性。',
    personalFitReason: '慢病机制、临床路径和 agent 原型能力都能直接转化为产品讨论。',
    sourceTier: 'curated',
    score: [30, 24, 20, 6, 8],
  },
  {
    companyName: 'Hinge Health',
    aliases: 'Hinge Health, Inc.',
    country: 'US',
    city: 'San Francisco',
    diseaseFocus: 'chronic_pain_msk',
    productLine: 'Digital MSK clinic',
    productType: 'digital_msk_virtual_physical_therapy',
    targetUsers: '肌骨疼痛、关节疼痛、术前术后康复、雇主/医保会员',
    businessModel: 'B2B employer / health plan digital clinic',
    productEvidenceUrl: 'https://www.hingehealth.com/',
    productEvidenceSummary: '数字肌骨诊所，面向疼痛、运动功能和物理治疗管理。',
    reachabilityStatus: 'country_restricted_remote',
    reachabilityEvidenceUrl: 'https://jobs.ashbyhq.com/hinge-health',
    reachabilityEvidenceSummary: '公开岗位主要为美国地点或美国远程，不满足 global remote 严格口径。',
    contactRoute: 'Product/clinical leaders on LinkedIn; careers watch',
    contactTargets: 'AI product lead、clinical product、pain program lead',
    aiProductOpportunity: 'AI 痛疼教练、康复动作反馈、PT copilot、个性化疼痛教育和会员分层转化。',
    outreachOpening: '我想讨论如何把 MSK 数字诊所中的疼痛日记、动作反馈和 care team workflow 变成 AI product loop。',
    personalFitReason: '慢痛产品非常匹配，但可触达性受美国远程限制。',
    sourceTier: 'curated',
    score: [30, 25, 20, 5, 10],
  },
  {
    companyName: 'Sword Health',
    country: 'PT',
    city: 'Porto',
    diseaseFocus: 'chronic_pain_msk',
    productLine: 'AI digital physical therapy',
    productType: 'digital_msk_virtual_physical_therapy',
    targetUsers: 'MSK 疼痛、雇主/health plan 会员、女性骨盆健康等',
    businessModel: 'B2B digital health benefit',
    productEvidenceUrl: 'https://swordhealth.com/',
    productEvidenceSummary: '数字物理治疗和 MSK care 平台，强调 AI care 和临床团队。',
    reachabilityStatus: 'country_restricted_remote',
    reachabilityEvidenceUrl: 'https://swordhealth.com/careers',
    reachabilityEvidenceSummary: '公开岗位通常按 US / Portugal / UK 等地区招聘，未找到 worldwide remote 证据。',
    contactRoute: 'Product/AI/clinical leaders; careers watch',
    contactTargets: 'AI product、clinical operations、MSK program owner',
    aiProductOpportunity: '疼痛轨迹预测、AI PT 助手、家庭动作质量评估、care manager copilot。',
    outreachOpening: '我想从慢痛依从性和 AI care delivery 角度讨论数字 PT 的下一代产品闭环。',
    personalFitReason: '产品方向极匹配，但不进入全球远程严格 shortlist。',
    sourceTier: 'curated',
    score: [30, 25, 19, 5, 10],
  },
  {
    companyName: 'Kaia Health',
    country: 'US',
    city: 'New York',
    diseaseFocus: 'chronic_pain_msk',
    productLine: 'Digital MSK therapy',
    productType: 'digital_msk_app',
    targetUsers: 'MSK 疼痛和运动康复患者',
    businessModel: 'B2B digital MSK solution',
    productEvidenceUrl: 'https://kaiahealth.com/',
    productEvidenceSummary: '数字 MSK 平台，提供运动治疗、教育和行为支持。',
    reachabilityStatus: 'remote_unknown',
    reachabilityEvidenceUrl: 'https://kaiahealth.com/careers/',
    reachabilityEvidenceSummary: '未找到明确 worldwide/global remote 证据。',
    contactRoute: 'careers/contact + product leaders',
    contactTargets: 'Product、clinical operations、AI/ML lead',
    aiProductOpportunity: 'AI pain coach、动作处方个性化、疼痛教育和 CBT 模块衔接。',
    outreachOpening: '我希望围绕慢痛数字疗法，把医学机制、行为干预和 LLM agent 做成更强的用户自管理闭环。',
    personalFitReason: '慢痛/MSK 强匹配，可触达性需要人工二次确认。',
    sourceTier: 'curated',
    score: [29, 23, 20, 6, 8],
  },
  {
    companyName: 'Curable',
    country: 'US',
    city: '',
    diseaseFocus: 'chronic_pain_msk; mental_sleep_comorbidity',
    productLine: 'Curable chronic pain app',
    productType: 'pain_reprocessing_behavioral_app',
    targetUsers: '慢性疼痛患者，尤其神经可塑性/身心疼痛管理人群',
    businessModel: 'B2C subscription app',
    productEvidenceUrl: 'https://www.curable.com/',
    productEvidenceSummary: '慢性疼痛教育、练习和行为干预 App。',
    reachabilityStatus: 'remote_unknown',
    reachabilityEvidenceUrl: 'https://www.curable.com/',
    reachabilityEvidenceSummary: '未找到明确 worldwide/global remote 证据。',
    contactRoute: '官网 contact / founders / clinical advisor network',
    contactTargets: 'Product lead、clinical content lead、founder',
    aiProductOpportunity: 'AI pain reprocessing coach、疼痛信念评估、个性化练习路径、复发风险识别。',
    outreachOpening: '我想把慢痛机制教育和 LLM agent 结合，做一个能连续理解疼痛日记和情绪/睡眠共病的 AI pain coach。',
    personalFitReason: '慢痛和医学解释能力高度匹配，但远程政策不清。',
    sourceTier: 'curated',
    score: [30, 24, 20, 7, 7],
  },
  {
    companyName: 'Lin Health',
    country: 'US',
    city: '',
    diseaseFocus: 'chronic_pain_msk; mental_sleep_comorbidity',
    productLine: 'Pain recovery coaching',
    productType: 'chronic_pain_virtual_coaching',
    targetUsers: '慢性疼痛患者和 health plan/employer 人群',
    businessModel: 'virtual care / coaching program',
    productEvidenceUrl: 'https://www.lin.health/',
    productEvidenceSummary: '面向慢性疼痛的虚拟 care 和 coaching。',
    reachabilityStatus: 'country_restricted_remote',
    reachabilityEvidenceUrl: 'https://www.lin.health/careers',
    reachabilityEvidenceSummary: '公开岗位/团队入口未证明 worldwide remote，按 restricted/unknown 处理。',
    contactRoute: 'Founder/clinical/product leads',
    contactTargets: 'Product、clinical operations、pain neuroscience lead',
    aiProductOpportunity: 'AI coach 用于疼痛解释、恐惧回避行为识别、flare-up 处理和 care team copilot。',
    outreachOpening: '我想探讨慢痛 neuroplastic recovery 中 AI coach 如何个性化解释、练习和随访。',
    personalFitReason: '慢痛机制与 AI coach 非常匹配，可触达性需要后续确认。',
    sourceTier: 'curated',
    score: [30, 24, 20, 5, 7],
  },
  {
    companyName: 'MoreGoodDays',
    country: 'AU',
    city: 'Melbourne',
    diseaseFocus: 'chronic_pain_msk; mental_sleep_comorbidity',
    productLine: 'Digital pain management programs',
    productType: 'pain_behavioral_program',
    targetUsers: '慢性疼痛患者',
    businessModel: 'digital care program',
    productEvidenceUrl: 'https://www.moregooddays.com/',
    productEvidenceSummary: '慢性疼痛数字项目，结合疼痛教育、心理和行为干预。',
    reachabilityStatus: 'remote_unknown',
    reachabilityEvidenceUrl: 'https://www.moregooddays.com/',
    reachabilityEvidenceSummary: '未找到明确 global remote 工作政策。',
    contactRoute: '官网 contact / founder / clinical lead',
    contactTargets: 'Founder、clinical product lead、program lead',
    aiProductOpportunity: 'AI pain coach 追踪疼痛-睡眠-情绪循环，生成阶段化教育和行为练习。',
    outreachOpening: '我想围绕慢痛用户的疼痛、睡眠和情绪日记设计一个 AI 产品闭环，提高长期依从性。',
    personalFitReason: '慢痛+心理共病非常贴合，适合顾问/产品科学家式主动联系。',
    sourceTier: 'curated',
    score: [29, 23, 19, 6, 6],
  },
  {
    companyName: 'Fella Health',
    country: 'US',
    city: 'Remote',
    diseaseFocus: 'metabolic_cardiovascular; mental_sleep_comorbidity',
    productLine: 'Obesity and metabolic health program',
    productType: 'telehealth_weight_loss_chronic_care',
    targetUsers: '肥胖、代谢健康和男性健康人群',
    businessModel: 'DTC telehealth subscription',
    productEvidenceUrl: 'https://www.fellahealth.com/',
    productEvidenceSummary: '面向肥胖和代谢健康的远程医疗/健康管理产品。',
    reachabilityStatus: 'global_remote_confirmed',
    reachabilityEvidenceUrl: 'https://www.ycombinator.com/companies/fella-health/jobs',
    reachabilityEvidenceSummary: 'YC 招聘页显示 Fella 为 fully remote team，并在岗位中强调远程团队协作。',
    contactRoute: 'YC Work at a Startup / founder LinkedIn / careers',
    contactTargets: 'Founder、Head of Product、clinical program owner、growth/product lead',
    aiProductOpportunity: 'AI metabolic coach 用于体重/用药/饮食/副作用随访、风险分层、coach copilot 和留存提升。',
    outreachOpening: '我想把代谢病机制理解和 LLM agent 原型结合，探索 GLP-1/体重管理项目中的 AI coach 与 clinical ops copilot。',
    personalFitReason: 'Cell Metabolism 背景能支持代谢产品判断，agent 能直接做患者随访和 coach 原型。',
    sourceTier: 'curated',
    score: [28, 24, 20, 15, 8],
  },
  {
    companyName: 'GlucoSenseDigital',
    aliases: 'GlucoSense',
    country: '',
    city: 'Remote',
    diseaseFocus: 'metabolic_cardiovascular',
    productLine: 'AI diabetes management app',
    productType: 'diabetes_ai_app',
    targetUsers: '糖尿病患者和照护者',
    businessModel: 'digital diabetes app',
    productEvidenceUrl: 'https://glucosensedigital.com/',
    productEvidenceSummary: 'AI-powered diabetes management product positioning.',
    reachabilityStatus: 'global_remote_confirmed',
    reachabilityEvidenceUrl: 'https://glucosensedigital.com/careers/',
    reachabilityEvidenceSummary: '招聘页称 fully remote team，帮助 worldwide 用户管理糖尿病。',
    contactRoute: 'careers/contact',
    contactTargets: 'Founder、product owner、clinical advisor',
    aiProductOpportunity: 'AI 糖尿病教练：血糖日志解释、行为建议、风险提醒、医生报告和患者教育。',
    outreachOpening: '我想基于医学和 LLM agent 原型能力，帮助把糖尿病管理 app 做成更强的个性化 AI coach。',
    personalFitReason: '代谢病背景和 agent 原型能力直接相关。',
    sourceTier: 'curated',
    score: [28, 24, 19, 15, 5],
  },
  {
    companyName: 'Carepatron',
    country: 'NZ',
    city: 'Global',
    diseaseFocus: 'platform_chronic_care',
    productLine: 'Healthcare practice management and telehealth platform',
    productType: 'healthcare_platform',
    targetUsers: '医生、治疗师、康复师、心理健康提供者',
    businessModel: 'SaaS for healthcare practices',
    productEvidenceUrl: 'https://www.carepatron.com/',
    productEvidenceSummary: '医疗实践管理、远程医疗、患者管理和工作流平台。',
    reachabilityStatus: 'global_remote_confirmed',
    reachabilityEvidenceUrl: 'https://www.carepatron.com/careers',
    reachabilityEvidenceSummary: 'careers 页面强调 global team / remote work 文化。',
    contactRoute: 'careers / founder / product team',
    contactTargets: 'Product、clinical workflow owner、founder',
    aiProductOpportunity: '面向康复师/慢病管理提供者的 AI care-plan builder、患者随访 agent 和 clinical note copilot。',
    outreachOpening: '我想探索 Carepatron 如何支持慢病/慢痛 care providers 用 AI agent 自动生成 care plan、随访和患者教育。',
    personalFitReason: '不是单病种产品，但你的医学+agent 能切入 provider workflow 产品。',
    sourceTier: 'curated',
    score: [20, 22, 16, 15, 7],
  },
  {
    companyName: 'Newpage',
    country: 'US',
    city: 'Global',
    diseaseFocus: 'platform_chronic_care',
    productLine: 'Digital health product studio',
    productType: 'digital_health_product_development',
    targetUsers: '数字健康企业、医疗机构、慢病/患者管理产品团队',
    businessModel: 'digital health product services',
    productEvidenceUrl: 'https://newpage.io/',
    productEvidenceSummary: '数字健康产品开发与技术服务公司，服务医疗健康产品建设。',
    reachabilityStatus: 'global_remote_confirmed',
    reachabilityEvidenceUrl: 'https://newpage.io/careers/',
    reachabilityEvidenceSummary: 'careers 页面称 global team、100% remote。',
    contactRoute: 'careers / contact / founder',
    contactTargets: 'Founder、product strategy、healthcare product lead',
    aiProductOpportunity: '以 AI 慢病/慢痛产品顾问身份切入，为客户型项目设计 patient agent、clinical workflow 和验证框架。',
    outreachOpening: '我关注 Newpage 的数字健康产品建设，想讨论慢病/慢痛 AI agent 产品策略与医学验证如何成为新服务能力。',
    personalFitReason: '更适合作为顾问/产品科学家切入，不是单一慢病产品公司。',
    sourceTier: 'curated',
    score: [18, 22, 16, 15, 6],
  },
  {
    companyName: '智云健康',
    aliases: 'ClouDr',
    country: 'CN',
    city: '杭州',
    diseaseFocus: 'metabolic_cardiovascular; platform_chronic_care',
    productLine: '慢病管理和互联网医疗平台',
    productType: 'chronic_disease_management_platform',
    targetUsers: '慢病患者、医生、药房、医疗机构',
    businessModel: '互联网医疗 + 慢病管理 + 药品/服务平台',
    productEvidenceUrl: 'https://www.cloudr.cn/',
    productEvidenceSummary: '官网展示慢病管理、互联网医院和患者服务平台。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.cloudr.cn/',
    reachabilityEvidenceSummary: '杭州总部/中国业务明确，可本地中文主动联系。',
    contactRoute: '官网联系 / 投资者关系 / 产品负责人 / 慢病业务线',
    contactTargets: '慢病产品负责人、AI/数据负责人、医生端产品负责人',
    aiProductOpportunity: '慢病 AI coach、复诊/用药随访 agent、医生 copilot、患者分层运营和药事服务自动化。',
    outreachOpening: '我想围绕慢病患者长期随访和医生/药师工作流，设计一个能提升依从性和服务半径的 AI agent 产品。',
    personalFitReason: '代谢慢病背景和 agent 原型能力都能转化为产品价值。',
    sourceTier: 'curated',
    score: [28, 24, 19, 14, 9],
  },
  {
    companyName: '医联',
    aliases: 'Medlinker',
    country: 'CN',
    city: '成都',
    diseaseFocus: 'metabolic_cardiovascular; platform_chronic_care',
    productLine: '互联网医院和慢病管理服务',
    productType: 'internet_healthcare_chronic_care',
    targetUsers: '慢病患者、医生、互联网医院用户',
    businessModel: '互联网医疗平台',
    productEvidenceUrl: 'https://www.medlinker.com/',
    productEvidenceSummary: '互联网医疗平台，Stage 2 已标记为慢病管理、临床工作流和互联网医疗。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.medlinker.com/',
    reachabilityEvidenceSummary: '成都公司/中国业务明确。',
    contactRoute: '官网/成都医疗健康生态/产品与医生运营负责人',
    contactTargets: '慢病业务负责人、医生端产品负责人、AI产品负责人',
    aiProductOpportunity: '问诊分诊、慢病随访、病历摘要、患者教育和医生运营的 AI agent。',
    outreachOpening: '我想讨论慢病互联网医院中 AI agent 如何降低医生重复沟通成本，并提升患者长期管理质量。',
    personalFitReason: '成都本地可触达，医学+agent 对医生/患者工作流有直接价值。',
    sourceTier: 'curated',
    score: [26, 23, 18, 14, 8],
  },
  {
    companyName: '华佗大数据健康（杭州）有限公司',
    aliases: '云上华佗',
    country: 'CN',
    city: '杭州',
    diseaseFocus: 'platform_chronic_care; metabolic_cardiovascular',
    productLine: '医疗数据 + AI 全栈应用 / 云上华佗',
    productType: 'medical_data_ai_platform',
    targetUsers: '医疗机构、医生、健康管理场景',
    businessModel: '医疗数据+AI解决方案',
    productEvidenceUrl: 'https://jobs.niuqizp.com/job-vms55CzZC.html',
    productEvidenceSummary: '公开招聘公告称其为医疗数据+AI全栈应用解决方案提供方，旗下云上华佗是人工智能数字健康科技平台。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://jobs.niuqizp.com/job-vms55CzZC.html',
    reachabilityEvidenceSummary: '杭州公司且公开招聘 AI Agent 方向，适合主动联系。',
    contactRoute: '招聘页/官网/杭州AI医疗生态',
    contactTargets: 'Founder、AI Agent 产品负责人、医疗数据产品负责人',
    aiProductOpportunity: '慢病/慢痛管理 agent、医生知识库问答、患者随访和数据分析自动化。',
    outreachOpening: '我看到贵司在招 AI Agent 方向，想探讨把慢病/慢痛管理做成医疗数据驱动的 agent 产品。',
    personalFitReason: '医学背景和 agent 实作可直接用于 AI 医疗产品定义。',
    sourceTier: 'curated',
    score: [24, 25, 18, 14, 7],
  },
  {
    companyName: '深圳硅基智能科技有限公司',
    aliases: 'SIBIONICS',
    country: 'CN',
    city: '深圳',
    diseaseFocus: 'metabolic_cardiovascular',
    productLine: 'CGM and diabetes digital management',
    productType: 'diabetes_remote_monitoring',
    targetUsers: '糖尿病患者和医生',
    businessModel: 'CGM 硬件 + 数字管理服务',
    productEvidenceUrl: 'https://www.sibionics.com/',
    productEvidenceSummary: '糖尿病连续血糖监测和数字化管理相关产品。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.sibionics.com/',
    reachabilityEvidenceSummary: '深圳公司，中国业务明确。',
    contactRoute: '官网/产品/市场/临床合作',
    contactTargets: '产品负责人、糖尿病管理负责人、医学事务',
    aiProductOpportunity: 'CGM 数据解释 agent、个性化生活方式建议、低/高血糖风险预警、医生报告自动化。',
    outreachOpening: '我想探索 CGM 数据与 LLM agent 结合，做更易理解、更能促进行为改变的糖尿病 AI coach。',
    personalFitReason: '代谢病背景强相关，AI 可把硬件数据变成患者可用产品价值。',
    sourceTier: 'curated',
    score: [28, 24, 20, 12, 8],
  },
  {
    companyName: '上海鹰瞳医疗科技有限公司',
    aliases: 'Airdoc',
    country: 'CN',
    city: '上海',
    diseaseFocus: 'metabolic_cardiovascular',
    productLine: 'AI retinal screening for chronic disease risk',
    productType: 'ai_screening_chronic_disease',
    targetUsers: '糖尿病/慢病筛查人群、医疗机构、体检机构',
    businessModel: 'AI医疗器械 + 筛查服务',
    productEvidenceUrl: 'https://www.airdoc.com/',
    productEvidenceSummary: 'AI 视网膜影像筛查，覆盖糖尿病视网膜病变和慢病风险相关场景。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.airdoc.com/',
    reachabilityEvidenceSummary: '上海公司/中国市场明确。',
    contactRoute: '官网/医学事务/产品负责人',
    contactTargets: '产品、医学、筛查业务负责人',
    aiProductOpportunity: '筛查结果解释 agent、慢病风险教育、随访转化、医生/体检机构 copilot。',
    outreachOpening: '我想讨论 AI 筛查之后的患者教育和慢病管理闭环，如何用 agent 提升复诊和行为改变。',
    personalFitReason: '慢病机制理解和医学沟通能补足影像 AI 后链路产品。',
    sourceTier: 'curated',
    score: [24, 22, 18, 12, 8],
  },
  {
    companyName: '方舟健客',
    aliases: '方舟云康; Jianke',
    country: 'CN',
    city: '广州',
    diseaseFocus: 'metabolic_cardiovascular; platform_chronic_care',
    productLine: '慢病管理 + 医药电商 + 互联网医疗',
    productType: 'chronic_care_pharmacy_ecommerce',
    targetUsers: '慢病患者、复诊购药用户',
    businessModel: '互联网医疗 + 医药电商',
    productEvidenceUrl: 'https://www.jianke.com/',
    productEvidenceSummary: '互联网医疗和医药电商平台，Stage 2 已标记慢病管理与药房电商。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.jianke.com/',
    reachabilityEvidenceSummary: '广州公司/中国业务明确。',
    contactRoute: '官网/投资者关系/慢病产品和药事服务负责人',
    contactTargets: '慢病产品、药师服务、用户增长负责人',
    aiProductOpportunity: '用药随访 agent、复购预测、药事咨询、慢病患者运营和医生/药师 copilot。',
    outreachOpening: '我想围绕慢病药事服务做 AI agent，把复诊、用药教育、复购和异常提醒串成产品闭环。',
    personalFitReason: '适合产品经理/产品科学家切入，医学判断力能帮助安全边界设计。',
    sourceTier: 'curated',
    score: [25, 22, 17, 13, 8],
  },
  {
    companyName: '平安健康',
    aliases: '平安好医生; Ping An Good Doctor',
    country: 'CN',
    city: '上海',
    diseaseFocus: 'platform_chronic_care; metabolic_cardiovascular; mental_sleep_comorbidity',
    productLine: '互联网医疗和健康管理平台',
    productType: 'internet_healthcare_platform',
    targetUsers: '在线问诊、健康管理、慢病用户',
    businessModel: '互联网医疗 + 保险/企业健康生态',
    productEvidenceUrl: 'https://www.pagd.net/',
    productEvidenceSummary: '互联网医疗和健康服务平台。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.pagd.net/',
    reachabilityEvidenceSummary: '上海/中国业务明确。',
    contactRoute: '官网/投资者关系/产品线负责人/平安生态',
    contactTargets: '健康管理产品、AI产品、医生运营负责人',
    aiProductOpportunity: '慢病分层、在线问诊 agent、健康档案总结、企业/保险健康管理 copilot。',
    outreachOpening: '我想探讨大平台健康管理场景中，慢病 AI agent 如何降低医生和运营成本并提升长期留存。',
    personalFitReason: '平台大但切入路径较间接，适合作为 Tier C 主动联系。',
    sourceTier: 'curated',
    score: [22, 23, 16, 12, 9],
  },
  {
    companyName: '京东健康',
    aliases: 'JD Health',
    country: 'CN',
    city: '北京',
    diseaseFocus: 'platform_chronic_care; metabolic_cardiovascular',
    productLine: '互联网医疗 + 医药电商 + 慢病服务',
    productType: 'internet_healthcare_pharmacy_platform',
    targetUsers: '复诊购药、慢病长期用药用户',
    businessModel: '医药电商 + 在线医疗',
    productEvidenceUrl: 'https://www.jdh.com/',
    productEvidenceSummary: '京东健康提供在线医疗、医药健康商品和健康服务。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.jdh.com/',
    reachabilityEvidenceSummary: '北京/中国业务明确。',
    contactRoute: '官网/京东招聘/业务线负责人',
    contactTargets: '慢病/药事服务产品、AI产品、医生运营',
    aiProductOpportunity: '用药/复诊 agent、慢病会员运营、处方购药助手、医生药师 copilot。',
    outreachOpening: '我想从慢病复诊购药和患者长期管理出发，讨论京东健康里 AI agent 的产品闭环。',
    personalFitReason: '平台大，适合提产品型机会而不是申请普通 PM。',
    sourceTier: 'curated',
    score: [22, 22, 16, 12, 9],
  },
  {
    companyName: '阿里健康',
    aliases: 'Alibaba Health',
    country: 'CN',
    city: '杭州',
    diseaseFocus: 'platform_chronic_care; metabolic_cardiovascular',
    productLine: '互联网医疗 + 医药电商 + 医疗大模型',
    productType: 'internet_healthcare_pharmacy_ai_platform',
    targetUsers: '在线医疗、药品、健康管理用户',
    businessModel: '医药电商 + 医疗健康服务',
    productEvidenceUrl: 'https://www.alihealth.cn/',
    productEvidenceSummary: '阿里健康提供医药健康和互联网医疗服务，并有医疗大模型/智能问答岗位线索。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.alihealth.cn/',
    reachabilityEvidenceSummary: '杭州/中国业务明确。',
    contactRoute: '阿里招聘/产品负责人/医疗大模型团队',
    contactTargets: '医疗大模型产品、智能问答、慢病药事服务负责人',
    aiProductOpportunity: '医疗智能问答、慢病药事 agent、健康档案总结、患者教育和风险分层。',
    outreachOpening: '我想围绕医疗大模型智能问答与慢病药事服务，提出一个可验证的 AI 产品 MVP。',
    personalFitReason: '医学背景 + agent 原型和阿里健康医疗大模型方向有交集。',
    sourceTier: 'curated',
    score: [22, 24, 18, 13, 9],
  },
  {
    companyName: '微医',
    aliases: 'WeDoctor; 挂号网',
    country: 'CN',
    city: '杭州',
    diseaseFocus: 'platform_chronic_care',
    productLine: '互联网医院和健康管理平台',
    productType: 'internet_hospital_platform',
    targetUsers: '患者、医生、医疗机构',
    businessModel: '互联网医院平台',
    productEvidenceUrl: 'https://www.guahao.com/',
    productEvidenceSummary: '互联网医院和在线医疗服务平台。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.guahao.com/',
    reachabilityEvidenceSummary: '杭州/中国业务明确。',
    contactRoute: '官网/业务负责人/产品负责人',
    contactTargets: '互联网医院产品、慢病运营、AI产品',
    aiProductOpportunity: '智能分诊、复诊随访、医生端病历总结和患者教育 agent。',
    outreachOpening: '我想从互联网医院慢病复诊场景出发，讨论 AI agent 如何提高患者长期管理和医生效率。',
    personalFitReason: '平台型机会，适合产品科学家切入。',
    sourceTier: 'curated',
    score: [21, 22, 16, 12, 7],
  },
  {
    companyName: '丁香园',
    aliases: 'DXY',
    country: 'CN',
    city: '杭州',
    diseaseFocus: 'platform_chronic_care; mental_sleep_comorbidity',
    productLine: '医生社区、患者健康服务、医学内容与工具',
    productType: 'medical_community_patient_engagement',
    targetUsers: '医生、医学生、患者、健康用户',
    businessModel: '医学社区 + 内容/工具/健康服务',
    productEvidenceUrl: 'https://www.dxy.cn/',
    productEvidenceSummary: '医学专业社区和健康服务平台。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.dxy.cn/',
    reachabilityEvidenceSummary: '杭州/中国业务明确。',
    contactRoute: '官网/内容产品/医生工具产品负责人',
    contactTargets: '医生工具产品、患者内容产品、AI产品',
    aiProductOpportunity: '慢病知识 agent、医生/患者教育内容生成与评估、症状记录和行为干预工具。',
    outreachOpening: '我想探讨医学内容、医生工具和慢病患者教育如何用 LLM agent 做成更强的产品闭环。',
    personalFitReason: '医学写作和顶刊科研经历适合医学内容/AI产品转化。',
    sourceTier: 'curated',
    score: [19, 21, 17, 12, 7],
  },
  {
    companyName: '成都云卫康医疗科技有限公司',
    country: 'CN',
    city: '成都',
    diseaseFocus: 'mental_sleep_comorbidity; platform_chronic_care',
    productLine: '睡眠/远程监测医疗软件',
    productType: 'sleep_remote_monitoring',
    targetUsers: '睡眠相关慢病和康复随访人群',
    businessModel: '医疗软件/远程监测',
    productEvidenceUrl: 'https://udi.nmpa.gov.cn/',
    productEvidenceSummary: 'Stage 2 NMPA/UDI 证据显示其为睡眠/远程监测相关医疗软件候选。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://udi.nmpa.gov.cn/',
    reachabilityEvidenceSummary: '注册主体在成都，适合本地进一步核验和联系。',
    contactRoute: 'NMPA 主体线索/成都医疗器械生态/工商联系方式',
    contactTargets: '产品负责人、医学负责人、注册负责人',
    aiProductOpportunity: '睡眠-疼痛-情绪共病追踪 agent、风险提醒和医生报告自动化。',
    outreachOpening: '我想探讨睡眠监测与慢痛/慢病管理结合，如何用 AI agent 形成患者长期管理闭环。',
    personalFitReason: '补足慢痛共病方向，成都本地可触达。',
    sourceTier: 'curated',
    score: [22, 21, 17, 10, 5],
  },
  {
    companyName: '江西思维智光医疗科技有限公司',
    country: 'CN',
    city: '',
    diseaseFocus: 'mental_sleep_comorbidity',
    productLine: '心理/精神健康相关医疗软件',
    productType: 'mental_health_samd',
    targetUsers: '心理健康/认知训练/精神健康相关人群',
    businessModel: '医疗软件/数字疗法候选',
    productEvidenceUrl: 'https://udi.nmpa.gov.cn/',
    productEvidenceSummary: 'Stage 2 显示为 mental_health 相关 NMPA/UDI 候选。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://udi.nmpa.gov.cn/',
    reachabilityEvidenceSummary: '中国注册主体可触达，但城市需进一步核验。',
    contactRoute: 'NMPA 主体线索/官网或工商补查',
    contactTargets: '产品、医学、注册/临床负责人',
    aiProductOpportunity: '心理/睡眠共病 AI coach、症状量表解释、风险分层和医生 copilot。',
    outreachOpening: '我关注慢痛常见的心理和睡眠共病，想讨论医疗软件如何引入安全可评估的 AI coach。',
    personalFitReason: '作为心理/睡眠共病覆盖候选，适合后续验证。',
    sourceTier: 'curated',
    score: [20, 22, 16, 9, 5],
  },
  {
    companyName: '远心医疗',
    aliases: '上海远心医疗科技有限公司',
    country: 'CN',
    city: '上海',
    diseaseFocus: 'metabolic_cardiovascular; platform_chronic_care',
    productLine: '远程监测/患者管理医疗软件',
    productType: 'remote_patient_monitoring',
    targetUsers: '慢病随访、远程监测患者和医生',
    businessModel: '医疗软件/远程监测',
    productEvidenceUrl: 'https://udi.nmpa.gov.cn/',
    productEvidenceSummary: 'Stage 2 显示为 remote_patient_monitoring / samd 候选。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://udi.nmpa.gov.cn/',
    reachabilityEvidenceSummary: '上海注册主体可触达。',
    contactRoute: 'NMPA 主体线索/上海医疗软件生态',
    contactTargets: '产品、远程监测业务、医学负责人',
    aiProductOpportunity: '监测数据总结、风险分层、随访任务自动化和医生 copilot。',
    outreachOpening: '我想讨论远程监测产品如何用 AI agent 把数据转化为患者能执行、医生能信任的管理建议。',
    personalFitReason: '慢病监测与 AI agent 高匹配。',
    sourceTier: 'curated',
    score: [23, 22, 17, 10, 5],
  },
  {
    companyName: '医渡科技',
    aliases: 'Yidu Tech',
    country: 'CN',
    city: '北京',
    diseaseFocus: 'platform_chronic_care; metabolic_cardiovascular',
    productLine: '医疗数据智能和真实世界研究',
    productType: 'medical_data_ai_platform',
    targetUsers: '医院、药企、研究机构、慢病研究/管理团队',
    businessModel: '医疗数据智能 / RWE / AI平台',
    productEvidenceUrl: 'https://www.yidutechgroup.com/',
    productEvidenceSummary: '医疗数据智能和 AI 平台公司，服务临床研究和医疗健康场景。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.yidutechgroup.com/',
    reachabilityEvidenceSummary: '中国公司/公开上市主体可触达。',
    contactRoute: '官网/投资者关系/AI产品/临床数据产品负责人',
    contactTargets: 'AI产品、RWE产品、临床数据产品负责人',
    aiProductOpportunity: '慢病真实世界证据 agent、患者分层、研究问题生成、医生/研究者 copilot。',
    outreachOpening: '我想围绕慢病真实世界数据和 AI agent，讨论如何从研究问题、证据链到产品化工作流形成闭环。',
    personalFitReason: 'Cell Metabolism + agent 能支撑科研到产品的差异化切入。',
    sourceTier: 'curated',
    score: [22, 23, 20, 12, 8],
  },
  {
    companyName: '蚂蚁集团健康事业群 / 数字医疗',
    aliases: '支付宝健康; Ant Health',
    country: 'CN',
    city: '杭州',
    diseaseFocus: 'platform_chronic_care; metabolic_cardiovascular; mental_sleep_comorbidity',
    productLine: '数字医疗、医疗大模型和健康服务',
    productType: 'internet_healthcare_ai_platform',
    targetUsers: '支付宝健康用户、医疗机构、慢病患者',
    businessModel: '平台型数字医疗生态',
    productEvidenceUrl: 'https://www.mianshima.com/job/5/25030403589666',
    productEvidenceSummary: '公开岗位显示医疗大模型医学专家/医疗 Agent 方向，说明其有医疗 AI 产品线。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://talent.antgroup.com/',
    reachabilityEvidenceSummary: '蚂蚁集团杭州/中国团队可触达。',
    contactRoute: '蚂蚁招聘/医疗大模型团队/支付宝健康产品负责人',
    contactTargets: '医疗大模型产品、医学专家、健康服务产品负责人',
    aiProductOpportunity: '慢病/慢痛 AI 产品经理：医学问答、健康档案、患者管理 agent 和服务分诊。',
    outreachOpening: '我想围绕医疗大模型在慢病/慢痛管理中的产品化，提出一个可评估、安全边界清晰的 AI agent MVP。',
    personalFitReason: '医学背景、顶刊科研和 LLM agent 实作都能形成差异化。',
    sourceTier: 'curated',
    score: [24, 25, 20, 13, 9],
  },
  {
    companyName: '华大生命科学研究院 / BGI',
    aliases: '深圳华大生命科学研究院',
    country: 'CN',
    city: '深圳 / 杭州',
    diseaseFocus: 'metabolic_cardiovascular; platform_chronic_care',
    productLine: '个人多组学健康 Agent / AI产品',
    productType: 'omics_health_ai_agent',
    targetUsers: '个人健康、多组学分析、慢病风险管理用户',
    businessModel: '科研/产业化平台',
    productEvidenceUrl: 'https://www.lipind.com/position/detail/963421',
    productEvidenceSummary: '公开岗位要求把组学分析流程转成自然语言交互体验，技术栈含 LangChain / LlamaIndex。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.genomics.cn/',
    reachabilityEvidenceSummary: '深圳/杭州生态可触达。',
    contactRoute: '岗位线索/研究院/AI产品负责人',
    contactTargets: 'AI产品开发、组学健康产品、科研负责人',
    aiProductOpportunity: '代谢/慢病风险多组学 agent、报告解释、行为建议和医生/研究者 copilot。',
    outreachOpening: '我想把代谢机制、组学解释和 LLM agent 结合，做面向慢病风险管理的个人健康产品。',
    personalFitReason: 'Cell Metabolism 背景非常适合多组学和代谢慢病产品。',
    sourceTier: 'curated',
    score: [25, 24, 20, 12, 7],
  },
  {
    companyName: '北京康恒医疗科技有限公司',
    aliases: '康恒医疗',
    country: 'CN',
    city: '北京',
    diseaseFocus: 'platform_chronic_care; metabolic_cardiovascular',
    productLine: '慢病管理系统和医疗大模型相关线索',
    productType: 'chronic_care_ai_platform',
    targetUsers: '医疗机构、慢病管理团队、患者',
    businessModel: '医疗软件/慢病系统',
    productEvidenceUrl: 'https://www.kanghengmed.com/',
    productEvidenceSummary: '慢病管理和医疗软件相关业务线索，需后续核验具体产品成熟度。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.kanghengmed.com/',
    reachabilityEvidenceSummary: '北京公司/中国业务可触达。',
    contactRoute: '官网/产品负责人/创始团队',
    contactTargets: '产品、市场、医学负责人',
    aiProductOpportunity: '慢病管理系统中的 AI 随访、风险分层和医生 copilot。',
    outreachOpening: '我想讨论慢病管理系统如何引入可解释、可验证的 AI agent，提升患者依从性和医生效率。',
    personalFitReason: '适合作为中国主动联系的中小型产品机会。',
    sourceTier: 'curated',
    score: [23, 21, 17, 11, 5],
  },
  {
    companyName: '好大夫在线',
    country: 'CN',
    city: '北京',
    diseaseFocus: 'platform_chronic_care',
    productLine: '在线问诊和患者随访',
    productType: 'online_consultation_patient_followup',
    targetUsers: '医生和复诊/慢病患者',
    businessModel: '在线医疗平台',
    productEvidenceUrl: 'https://www.haodf.com/',
    productEvidenceSummary: '在线问诊和医生患者服务平台。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.haodf.com/',
    reachabilityEvidenceSummary: '北京/中国业务明确。',
    contactRoute: '官网/产品/医生运营负责人',
    contactTargets: '患者管理产品、医生工具、AI产品',
    aiProductOpportunity: '复诊随访 agent、病情摘要、问诊准备、患者教育和医生 copilot。',
    outreachOpening: '我想从复诊和慢病随访角度，讨论 AI agent 如何让患者更会描述病情、医生更快决策。',
    personalFitReason: '平台型，适合作为产品科学家/顾问式联系。',
    sourceTier: 'curated',
    score: [20, 21, 16, 12, 7],
  },
  {
    companyName: '春雨医生',
    country: 'CN',
    city: '北京',
    diseaseFocus: 'platform_chronic_care; mental_sleep_comorbidity',
    productLine: '在线问诊和健康咨询',
    productType: 'online_consultation',
    targetUsers: '在线问诊、慢病复诊、健康咨询用户',
    businessModel: '互联网医疗平台',
    productEvidenceUrl: 'https://www.chunyuyisheng.com/',
    productEvidenceSummary: '在线问诊和健康咨询平台。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.chunyuyisheng.com/',
    reachabilityEvidenceSummary: '北京/中国业务明确。',
    contactRoute: '官网/产品负责人/医生运营',
    contactTargets: '问诊产品、AI产品、医生运营负责人',
    aiProductOpportunity: '智能问诊前置、慢病复诊摘要、患者教育和心理/睡眠共病筛查。',
    outreachOpening: '我想探讨在线问诊前后链路中，AI agent 如何服务慢病患者长期管理。',
    personalFitReason: '平台型补充，适合主动提出 AI 慢病子产品。',
    sourceTier: 'curated',
    score: [19, 21, 15, 12, 6],
  },
  {
    companyName: '圆心科技',
    aliases: 'Yuanxin Technology; 圆心医疗',
    country: 'CN',
    city: '北京',
    diseaseFocus: 'platform_chronic_care; metabolic_cardiovascular',
    productLine: '药房/患者管理/健康服务',
    productType: 'pharmacy_patient_management',
    targetUsers: '慢病长期用药患者、药房和医疗服务用户',
    businessModel: '药房 + 患者管理 + 医疗服务',
    productEvidenceUrl: 'https://www.yuanxin.com/',
    productEvidenceSummary: '医疗健康服务与药房/患者服务平台。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.yuanxin.com/',
    reachabilityEvidenceSummary: '北京/中国业务明确。',
    contactRoute: '官网/投资者关系/药事服务负责人',
    contactTargets: '药事服务、患者管理、AI产品负责人',
    aiProductOpportunity: '慢病用药 agent、复购和随访、药师 copilot、患者风险提醒。',
    outreachOpening: '我想围绕长期用药患者管理，设计一个能服务药师和患者的慢病 AI agent。',
    personalFitReason: '适合药事+慢病产品切入。',
    sourceTier: 'curated',
    score: [20, 21, 15, 12, 7],
  },
  {
    companyName: '妙手医生',
    aliases: '妙手; Miaoshou Doctor',
    country: 'CN',
    city: '北京',
    diseaseFocus: 'platform_chronic_care; metabolic_cardiovascular',
    productLine: '在线问诊、药品服务和患者管理',
    productType: 'online_consultation_pharmacy_chronic_care',
    targetUsers: '复诊购药、慢病用药、在线问诊用户',
    businessModel: '互联网医疗 + 药房/医药服务',
    productEvidenceUrl: 'https://www.miaoshou.com/',
    productEvidenceSummary: '在线医疗和医药健康服务平台，Stage 2 标记为在线问诊和药房电商相关。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.miaoshou.com/',
    reachabilityEvidenceSummary: '北京/中国业务明确。',
    contactRoute: '官网/产品负责人/药事服务和患者管理负责人',
    contactTargets: '在线问诊产品、药事服务、患者管理、AI产品负责人',
    aiProductOpportunity: '复诊问诊 agent、慢病用药随访、药事咨询和患者教育自动化。',
    outreachOpening: '我想围绕复诊购药和慢病用药管理，讨论 AI agent 如何提升患者依从性并降低医生/药师重复沟通。',
    personalFitReason: '医学背景适合定义安全边界，agent 原型能力适合快速验证问诊和药事流程。',
    sourceTier: 'curated',
    score: [20, 21, 15, 12, 6],
  },
  {
    companyName: '叮当快药',
    aliases: '叮当健康',
    country: 'CN',
    city: '北京',
    diseaseFocus: 'platform_chronic_care; metabolic_cardiovascular',
    productLine: '医药即时零售和健康服务',
    productType: 'pharmacy_ecommerce_chronic_care',
    targetUsers: '长期用药、慢病复购、药事咨询用户',
    businessModel: '医药电商 + 到家服务 + 健康管理',
    productEvidenceUrl: 'https://www.ddky.com/',
    productEvidenceSummary: '医药健康到家服务平台，适合长期用药和慢病患者运营场景。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.ddky.com/',
    reachabilityEvidenceSummary: '北京/中国业务明确。',
    contactRoute: '官网/用户增长/药事服务/产品负责人',
    contactTargets: '药事服务、患者运营、产品增长、AI产品负责人',
    aiProductOpportunity: '慢病复购 agent、用药提醒和相互作用解释、药师 copilot、患者分层运营。',
    outreachOpening: '我想把长期用药用户的复购、提醒、咨询和异常风险做成 AI agent 驱动的慢病管理闭环。',
    personalFitReason: '适合从产品经理角度切入药事服务和慢病运营。',
    sourceTier: 'curated',
    score: [19, 20, 15, 12, 6],
  },
  {
    companyName: '健康160',
    aliases: '就医160',
    country: 'CN',
    city: '深圳',
    diseaseFocus: 'platform_chronic_care',
    productLine: '预约挂号、互联网医院和患者服务',
    productType: 'patient_access_internet_healthcare',
    targetUsers: '复诊患者、慢病患者、医生和医院服务用户',
    businessModel: '互联网医疗平台',
    productEvidenceUrl: 'https://www.91160.com/',
    productEvidenceSummary: '预约挂号和互联网医疗服务平台，具备患者入口和复诊服务场景。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.91160.com/',
    reachabilityEvidenceSummary: '深圳/中国业务明确。',
    contactRoute: '官网/医院合作/患者产品负责人',
    contactTargets: '互联网医院产品、患者管理、医院合作、AI产品负责人',
    aiProductOpportunity: '复诊路径 agent、慢病患者挂号/随访提醒、问诊准备和医生端摘要。',
    outreachOpening: '我想从复诊患者入口出发，讨论 AI agent 如何把预约、问诊准备、随访和慢病教育串起来。',
    personalFitReason: '患者入口强，适合提出慢病 AI 子产品。',
    sourceTier: 'curated',
    score: [18, 20, 14, 12, 6],
  },
  {
    companyName: '思派健康',
    aliases: 'Medbanks; 思派网络',
    country: 'CN',
    city: '北京',
    diseaseFocus: 'platform_chronic_care; metabolic_cardiovascular',
    productLine: '特药、患者管理和健康服务',
    productType: 'specialty_pharmacy_patient_management',
    targetUsers: '长期治疗、特药、慢病和肿瘤等患者管理人群',
    businessModel: '特药药房 + 患者管理 + 健康服务',
    productEvidenceUrl: 'https://www.medbanks.cn/',
    productEvidenceSummary: '患者服务和特药/健康管理相关平台，Stage 2 标记为患者互动和药房电商。',
    reachabilityStatus: 'china_local_reachable',
    reachabilityEvidenceUrl: 'https://www.medbanks.cn/',
    reachabilityEvidenceSummary: '北京/中国业务明确。',
    contactRoute: '官网/患者管理/药事服务/产品负责人',
    contactTargets: '患者管理、药事服务、临床运营、AI产品负责人',
    aiProductOpportunity: '长期治疗患者随访 agent、用药和不良反应记录、患者教育和护士/药师 copilot。',
    outreachOpening: '我想围绕长期治疗患者管理，讨论 AI agent 如何提升随访质量、风险识别和药事服务效率。',
    personalFitReason: '医学判断力和 agent 工作流可直接补强患者管理产品。',
    sourceTier: 'curated',
    score: [20, 21, 15, 12, 6],
  },
  {
    companyName: 'Big Health',
    country: 'US',
    city: 'San Francisco',
    diseaseFocus: 'mental_sleep_comorbidity',
    productLine: 'Digital therapeutics for sleep and mental health',
    productType: 'digital_therapeutics_sleep_mental_health',
    targetUsers: '失眠、焦虑、心理健康和慢病共病人群',
    businessModel: 'DTx / employer and payer channels',
    productEvidenceUrl: 'https://www.bighealth.com/',
    productEvidenceSummary: '数字疗法产品覆盖 sleep 和 mental health。',
    reachabilityStatus: 'country_restricted_remote',
    reachabilityEvidenceUrl: 'https://www.bighealth.com/careers/',
    reachabilityEvidenceSummary: '公开岗位通常受 US/UK 等地区限制，未找到 global remote 证据。',
    contactRoute: 'careers / product / clinical science leaders',
    contactTargets: 'Product、clinical science、DTx lead',
    aiProductOpportunity: '慢痛共病睡眠/心理 AI coach、数字疗法内容个性化和疗效评估。',
    outreachOpening: '我想把慢痛常见的睡眠和心理共病作为切入点，讨论 AI coach 如何增强数字疗法产品。',
    personalFitReason: '产品匹配但远程受限。',
    sourceTier: 'curated',
    score: [24, 23, 18, 5, 8],
  },
  {
    companyName: 'Headspace Health',
    country: 'US',
    city: 'Santa Monica',
    diseaseFocus: 'mental_sleep_comorbidity',
    productLine: 'Mental health and mindfulness platform',
    productType: 'behavioral_health_platform',
    targetUsers: '心理健康、睡眠、慢病共病人群',
    businessModel: 'B2C/B2B behavioral health',
    productEvidenceUrl: 'https://www.headspace.com/',
    productEvidenceSummary: '心理健康、冥想和睡眠平台。',
    reachabilityStatus: 'country_restricted_remote',
    reachabilityEvidenceUrl: 'https://job-boards.greenhouse.io/hs',
    reachabilityEvidenceSummary: '公开远程岗位多为 United States，不满足 global remote。',
    contactRoute: 'careers / product leads',
    contactTargets: 'AI product、clinical content、behavioral health product',
    aiProductOpportunity: '慢痛共病心理/睡眠 AI coach、行为干预个性化、风险升级流程。',
    outreachOpening: '我想围绕慢痛用户的睡眠和情绪共病，讨论 Headspace 类产品中更医学化的 AI coach。',
    personalFitReason: '适合共病方向，但可触达性受限。',
    sourceTier: 'curated',
    score: [22, 22, 17, 5, 9],
  },
  {
    companyName: 'Omada Health',
    aliases: 'Omada Health, Inc.',
    country: 'US',
    city: 'San Francisco',
    diseaseFocus: 'metabolic_cardiovascular',
    productLine: 'Virtual chronic care for diabetes, hypertension, obesity',
    productType: 'virtual_chronic_care',
    targetUsers: '糖尿病、高血压、肥胖、心血管风险人群',
    businessModel: 'B2B employer / payer chronic care',
    productEvidenceUrl: 'https://www.omadahealth.com/',
    productEvidenceSummary: '虚拟慢病管理平台，覆盖 diabetes、hypertension、musculoskeletal 等慢病项目。',
    reachabilityStatus: 'country_restricted_remote',
    reachabilityEvidenceUrl: 'https://job-boards.greenhouse.io/omadahealth',
    reachabilityEvidenceSummary: '公开职位远程地点为 Remote, USA 等，不满足 global remote。',
    contactRoute: 'Product/clinical leaders; careers watch',
    contactTargets: 'Product、clinical program、AI/data product lead',
    aiProductOpportunity: 'AI 慢病 coach、数据驱动风险分层、coach copilot、个性化干预和留存提升。',
    outreachOpening: '我想从代谢慢病行为改变出发，讨论 AI coach 如何降低人力交付成本并提升长期依从性。',
    personalFitReason: '代谢慢病非常匹配，但远程严格口径受限。',
    sourceTier: 'curated',
    score: [28, 24, 20, 5, 10],
  },
  {
    companyName: 'Virta Health',
    country: 'US',
    city: 'Denver',
    diseaseFocus: 'metabolic_cardiovascular',
    productLine: 'Diabetes and obesity reversal care',
    productType: 'virtual_metabolic_care',
    targetUsers: '2型糖尿病、肥胖和代谢健康人群',
    businessModel: 'B2B payer/employer chronic care',
    productEvidenceUrl: 'https://www.virtahealth.com/',
    productEvidenceSummary: '面向 2 型糖尿病和肥胖的虚拟代谢健康 care。',
    reachabilityStatus: 'country_restricted_remote',
    reachabilityEvidenceUrl: 'https://www.virtahealth.com/careers',
    reachabilityEvidenceSummary: '公开招聘以美国远程/美国岗位为主，不满足 global remote。',
    contactRoute: 'Product/clinical/science leaders',
    contactTargets: 'Product、medical、behavior change program lead',
    aiProductOpportunity: 'AI metabolic coach、营养/用药/实验室指标解释、coach copilot 和个体化路径。',
    outreachOpening: '我想围绕代谢病逆转项目，讨论如何用 AI agent 把医学机制、行为改变和随访变成产品闭环。',
    personalFitReason: 'Cell Metabolism 背景非常匹配，但可触达性受限。',
    sourceTier: 'curated',
    score: [29, 24, 20, 5, 9],
  },
  {
    companyName: 'Welldoc',
    country: 'US',
    city: 'Columbia',
    diseaseFocus: 'metabolic_cardiovascular',
    productLine: 'BlueStar diabetes digital therapeutic',
    productType: 'digital_therapeutics_diabetes',
    targetUsers: '糖尿病和心代谢慢病患者',
    businessModel: 'DTx / payer / provider',
    productEvidenceUrl: 'https://www.welldoc.com/',
    productEvidenceSummary: '糖尿病数字疗法和心代谢数字健康产品。',
    reachabilityStatus: 'remote_unknown',
    reachabilityEvidenceUrl: 'https://www.welldoc.com/careers/',
    reachabilityEvidenceSummary: '未找到明确 global remote 证据。',
    contactRoute: 'careers / product / clinical science leads',
    contactTargets: 'Product、clinical science、behavioral program lead',
    aiProductOpportunity: '糖尿病 DTx 的 AI coach、行为建议、数据解释和医生报告。',
    outreachOpening: '我想从糖尿病数字疗法的医学和行为机制出发，讨论可评估的 AI coach 产品增强。',
    personalFitReason: '代谢病和数字疗法强匹配。',
    sourceTier: 'curated',
    score: [28, 23, 20, 6, 8],
  },
  {
    companyName: 'Glooko',
    country: 'US',
    city: 'Palo Alto',
    diseaseFocus: 'metabolic_cardiovascular',
    productLine: 'Diabetes data management and remote monitoring',
    productType: 'diabetes_remote_monitoring_platform',
    targetUsers: '糖尿病患者、医生、健康系统',
    businessModel: 'B2B/B2C diabetes data platform',
    productEvidenceUrl: 'https://glooko.com/',
    productEvidenceSummary: '糖尿病数据管理、远程监测和患者/临床团队工具。',
    reachabilityStatus: 'remote_unknown',
    reachabilityEvidenceUrl: 'https://glooko.com/careers/',
    reachabilityEvidenceSummary: '未找到明确 worldwide/global remote 证据。',
    contactRoute: 'careers / product / clinical leads',
    contactTargets: 'Product、clinical workflow、data product lead',
    aiProductOpportunity: '血糖/设备数据解释 agent、医生 copilot、患者教育和风险分层。',
    outreachOpening: '我想讨论糖尿病数据平台如何用 AI agent 将多源数据转化为患者和医生都能用的建议。',
    personalFitReason: '代谢慢病和数据产品高度匹配。',
    sourceTier: 'curated',
    score: [27, 24, 20, 6, 8],
  },
  {
    companyName: 'Biofourmis',
    country: 'US',
    city: 'Boston',
    diseaseFocus: 'metabolic_cardiovascular; platform_chronic_care',
    productLine: 'AI remote patient monitoring',
    productType: 'remote_patient_monitoring_ai',
    targetUsers: '心衰、慢病、远程监测和居家护理患者',
    businessModel: 'B2B health system / pharma / home care',
    productEvidenceUrl: 'https://www.biofourmis.com/',
    productEvidenceSummary: 'AI驱动远程患者监测和虚拟护理平台。',
    reachabilityStatus: 'remote_unknown',
    reachabilityEvidenceUrl: 'https://www.biofourmis.com/careers/',
    reachabilityEvidenceSummary: '未找到明确 global remote 证据。',
    contactRoute: 'careers / product / clinical operations',
    contactTargets: 'Product、clinical ops、AI product lead',
    aiProductOpportunity: '远程监测风险分层、患者日记 agent、care team copilot 和异常升级。',
    outreachOpening: '我想围绕远程慢病监测，讨论 AI agent 如何让数据驱动护理更可解释、更可规模化。',
    personalFitReason: '慢病远程监测和医学解释能力强相关。',
    sourceTier: 'curated',
    score: [26, 24, 19, 6, 8],
  },
  {
    companyName: 'Noom',
    country: 'US',
    city: 'New York',
    diseaseFocus: 'metabolic_cardiovascular; mental_sleep_comorbidity',
    productLine: 'Behavior change for weight and metabolic health',
    productType: 'behavior_change_weight_management',
    targetUsers: '肥胖、代谢健康和行为改变用户',
    businessModel: 'B2C/B2B behavior change program',
    productEvidenceUrl: 'https://www.noom.com/',
    productEvidenceSummary: '体重管理和行为改变数字健康产品。',
    reachabilityStatus: 'country_restricted_remote',
    reachabilityEvidenceUrl: 'https://www.noom.com/careers/',
    reachabilityEvidenceSummary: '公开岗位多按国家/地区招聘，未确认 global remote。',
    contactRoute: 'careers / product / behavior science leaders',
    contactTargets: 'Product、behavior science、AI product',
    aiProductOpportunity: 'AI behavior coach、代谢/饮食/情绪日记解释、个性化 nudging 和留存。',
    outreachOpening: '我想从代谢和行为机制出发，讨论体重管理产品如何用 AI agent 提升个性化和长期留存。',
    personalFitReason: '代谢+行为改变强匹配，远程限制需注意。',
    sourceTier: 'curated',
    score: [26, 24, 19, 5, 9],
  },
  {
    companyName: 'Wysa',
    country: 'US / IN',
    city: '',
    diseaseFocus: 'mental_sleep_comorbidity',
    productLine: 'AI mental health support',
    productType: 'ai_mental_health_chatbot',
    targetUsers: '心理健康、焦虑、睡眠和慢病共病人群',
    businessModel: 'B2B/B2C mental health AI',
    productEvidenceUrl: 'https://www.wysa.com/',
    productEvidenceSummary: 'AI mental health support and coaching product.',
    reachabilityStatus: 'remote_unknown',
    reachabilityEvidenceUrl: 'https://www.wysa.com/careers',
    reachabilityEvidenceSummary: '未找到严格 global remote 证据。',
    contactRoute: 'careers / product / clinical safety',
    contactTargets: 'Clinical product、AI safety、product lead',
    aiProductOpportunity: '慢痛共病心理/睡眠 AI coach、安全升级、量表和干预路径个性化。',
    outreachOpening: '我想讨论慢痛患者常见心理/睡眠共病中，AI coach 如何兼顾可用性和医疗安全边界。',
    personalFitReason: '共病方向匹配，但远程政策未确认。',
    sourceTier: 'curated',
    score: [23, 24, 18, 6, 8],
  },
  {
    companyName: 'Lark Health',
    country: 'US',
    city: 'Mountain View',
    diseaseFocus: 'metabolic_cardiovascular',
    productLine: 'AI chronic disease coaching',
    productType: 'ai_chronic_care_coach',
    targetUsers: '糖尿病、高血压、体重管理和预防项目用户',
    businessModel: 'B2B chronic care coaching',
    productEvidenceUrl: 'https://www.lark.com/',
    productEvidenceSummary: 'AI-powered chronic disease prevention and management coaching.',
    reachabilityStatus: 'remote_unknown',
    reachabilityEvidenceUrl: 'https://www.lark.com/careers',
    reachabilityEvidenceSummary: '未找到明确 global remote 证据。',
    contactRoute: 'careers / product / clinical leadership',
    contactTargets: 'AI product、clinical program、behavior science',
    aiProductOpportunity: '把 AI coach 从脚本化互动升级为 agentic 慢病管理、个性化随访和风险升级。',
    outreachOpening: '我想讨论 AI 慢病 coach 的下一步：如何用 LLM agent 改善医学解释、依从性和安全升级。',
    personalFitReason: '你的定位与 AI 慢病 coach 产品高度重合。',
    sourceTier: 'curated',
    score: [28, 25, 20, 6, 8],
  },
];

async function readJson(rel) {
  return JSON.parse(await fs.readFile(path.join(STAGE2_DIR, rel), 'utf8'));
}

async function writeJson(rel, value) {
  const file = path.join(OUT_DIR, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeCsv(rel, rows, columns) {
  const file = path.join(OUT_DIR, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const lines = [columns.join(','), ...rows.map(row => columns.map(col => csvCell(row[col])).join(','))];
  await fs.writeFile(file, `${lines.join('\n')}\n`, 'utf8');
}

function csvCell(value) {
  if (value == null) return '';
  const text = Array.isArray(value) ? value.join('; ') : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function splitTags(value) {
  return String(value ?? '').split(';').map(x => x.trim()).filter(Boolean);
}

function diseaseAreasFromCategories(categories = '') {
  const text = String(categories).toLowerCase();
  const out = new Set();
  if (/rehabilitation|pain|msk|康复|疼痛/.test(text)) out.add('chronic_pain_msk');
  if (/chronic|remote_patient_monitoring|diabetes|cardio|metabolic|慢病|糖尿病|心/.test(text)) out.add('metabolic_cardiovascular');
  if (/mental|sleep|心理|睡眠/.test(text)) out.add('mental_sleep_comorbidity');
  if (/internet_healthcare|online_consultation|pharmacy|platform|patient_engagement|clinical_workflow/.test(text)) out.add('platform_chronic_care');
  return [...out].join('; ') || 'platform_chronic_care';
}

function isChina(row) {
  return row.region === 'China' || row.country === 'CN' || row.country === 'China' || /北京|上海|广州|深圳|杭州|成都/.test(row.city ?? '');
}

function scoreFromArray(score) {
  const [productProblemFit, aiProductLeverage, personalFit, outreachFeasibility, commercialSignal] = score;
  const totalScore = productProblemFit + aiProductLeverage + personalFit + outreachFeasibility + commercialSignal;
  return { productProblemFit, aiProductLeverage, personalFit, outreachFeasibility, commercialSignal, totalScore };
}

function inferTier(row) {
  if (!ALLOWED_REACHABILITY.has(row.reachabilityStatus)) return 'Excluded from shortlist';
  if (row.totalScore >= 86 && /chronic_pain_msk|metabolic_cardiovascular/.test(row.diseaseFocus)) return 'A';
  if (row.totalScore >= 78) return 'B';
  return 'C';
}

function targetRowFromCurated(target, stage2ByName) {
  const stage2 = stage2ByName.get(normalizeName(target.companyName));
  const score = scoreFromArray(target.score);
  const row = {
    companyName: target.companyName,
    aliases: target.aliases ?? stage2?.aliases ?? '',
    country: target.country || stage2?.country || '',
    city: target.city || stage2?.city || '',
    diseaseFocus: target.diseaseFocus,
    productLine: target.productLine,
    productType: target.productType,
    targetUsers: target.targetUsers,
    businessModel: target.businessModel,
    aiProductOpportunity: target.aiProductOpportunity,
    personalFitReason: target.personalFitReason,
    reachabilityStatus: target.reachabilityStatus,
    reachabilityEvidenceUrl: target.reachabilityEvidenceUrl,
    reachabilityEvidenceSummary: target.reachabilityEvidenceSummary,
    productEvidenceUrl: target.productEvidenceUrl,
    productEvidenceSummary: target.productEvidenceSummary,
    contactRoute: target.contactRoute,
    contactTargets: target.contactTargets,
    outreachOpening: target.outreachOpening,
    sourceTier: target.sourceTier,
    stage2OpportunityScore: stage2?.opportunityScore ?? '',
    stage2Categories: stage2?.categories ?? '',
    ...score,
  };
  row.tier = inferTier(row);
  row.shortlistEligible = ALLOWED_REACHABILITY.has(row.reachabilityStatus);
  row.restrictionReason = row.reachabilityStatus === 'country_restricted_remote'
    ? 'remote is limited to a country/region such as US/UK/EU; not global remote'
    : row.reachabilityStatus === 'remote_unknown'
      ? 'global remote not confirmed under strict policy'
      : '';
  return row;
}

function targetRowFromStage2(row) {
  const diseaseFocus = diseaseAreasFromCategories(row.categories);
  const hasCore = /chronic_disease_management|rehabilitation|remote_patient_monitoring|mental_health|sleep_health/.test(row.categories ?? '');
  const productProblemFit = hasCore ? 18 : 13;
  const aiProductLeverage = /remote_patient_monitoring|patient_engagement|clinical_workflow|internet_healthcare/.test(row.categories ?? '') ? 17 : 13;
  const personalFit = /chronic_disease_management|rehabilitation|mental_health|sleep_health/.test(row.categories ?? '') ? 14 : 11;
  const reachabilityStatus = isChina(row) ? 'china_local_reachable' : 'remote_unknown';
  const outreachFeasibility = reachabilityStatus === 'china_local_reachable' ? (row.website ? 10 : 7) : 3;
  const commercialSignal = Math.min(7, Math.max(3, Number(row.evidenceCount ?? 0) > 2 ? 5 : 3));
  const totalScore = productProblemFit + aiProductLeverage + personalFit + outreachFeasibility + commercialSignal;
  const out = {
    companyName: row.companyName,
    aliases: row.aliases ?? '',
    country: row.country ?? '',
    city: row.city ?? '',
    diseaseFocus,
    productLine: row.categories,
    productType: 'stage2_auto_candidate',
    targetUsers: '慢病/康复/远程监测/平台用户，需进一步核验',
    businessModel: 'stage2 inferred',
    aiProductOpportunity: defaultAiOpportunity(diseaseFocus),
    personalFitReason: 'Stage 2 自动召回候选，适合后续人工核验证据和主动联系入口。',
    reachabilityStatus,
    reachabilityEvidenceUrl: row.website || row.primaryEvidenceUrl || '',
    reachabilityEvidenceSummary: reachabilityStatus === 'china_local_reachable' ? 'Stage 2 显示中国主体或中国城市。' : '未确认全球远程。',
    productEvidenceUrl: row.primaryEvidenceUrl || row.website || '',
    productEvidenceSummary: `Stage 2 categories: ${row.categories}`,
    contactRoute: row.website ? '官网/产品页/公开联系方式' : '工商/监管主体线索，需补官网',
    contactTargets: '产品负责人、医学负责人、业务负责人',
    outreachOpening: defaultOpening(diseaseFocus),
    sourceTier: 'stage2_auto',
    stage2OpportunityScore: row.opportunityScore,
    stage2Categories: row.categories,
    productProblemFit,
    aiProductLeverage,
    personalFit,
    outreachFeasibility,
    commercialSignal,
    totalScore,
    tier: totalScore >= 72 ? 'C' : 'D',
    shortlistEligible: reachabilityStatus === 'china_local_reachable' && totalScore >= 64 && Boolean(row.website),
    restrictionReason: reachabilityStatus === 'remote_unknown' ? 'global remote not confirmed under strict policy' : '',
  };
  return out;
}

function defaultAiOpportunity(diseaseFocus) {
  if (diseaseFocus.includes('chronic_pain_msk')) return 'AI pain/rehab coach, activity and pain diary, care team copilot.';
  if (diseaseFocus.includes('metabolic_cardiovascular')) return 'AI chronic disease coach, risk stratification, medication and lifestyle follow-up.';
  if (diseaseFocus.includes('mental_sleep_comorbidity')) return 'AI coach for sleep/mental comorbidity, symptom tracking and safe escalation.';
  return 'AI patient engagement, clinical workflow and follow-up automation.';
}

function defaultOpening(diseaseFocus) {
  if (diseaseFocus.includes('chronic_pain_msk')) return '我想围绕慢痛/康复长期管理，探讨 AI agent 如何提高依从性和服务规模。';
  if (diseaseFocus.includes('metabolic_cardiovascular')) return '我想围绕代谢/心血管慢病管理，探讨 AI coach 和医生 copilot 的产品机会。';
  if (diseaseFocus.includes('mental_sleep_comorbidity')) return '我想围绕睡眠/心理共病，探讨安全可评估的 AI coach 产品。';
  return '我想探讨慢病患者管理和医疗工作流中的 AI agent 产品机会。';
}

function dedupeRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = normalizeName(row.companyName);
    const current = map.get(key);
    if (!current || row.totalScore > current.totalScore || (row.sourceTier === 'curated' && current.sourceTier !== 'curated')) {
      map.set(key, row);
    }
  }
  return [...map.values()].sort((a, b) => b.totalScore - a.totalScore || a.companyName.localeCompare(b.companyName));
}

function buildOutreachBrief(row) {
  const roleAngle = row.diseaseFocus.includes('chronic_pain_msk')
    ? 'AI慢痛/康复产品经理或产品科学家'
    : row.diseaseFocus.includes('metabolic_cardiovascular')
      ? 'AI慢病管理产品经理或代谢健康产品科学家'
      : row.diseaseFocus.includes('mental_sleep_comorbidity')
        ? '心理/睡眠共病 AI 产品科学家'
        : 'AI医疗产品经理/产品科学家';
  return {
    companyName: row.companyName,
    tier: row.tier,
    reachabilityStatus: row.reachabilityStatus,
    roleAngle,
    contactTargets: row.contactTargets,
    contactRoute: row.contactRoute,
    outreachOpening: row.outreachOpening,
    valueProposition: `医学背景 + Cell Metabolism 科研经历 + LLM agent 实作，可帮助定义 ${row.aiProductOpportunity}`,
    demoToAttach: demoFor(row.diseaseFocus),
    evidenceUrls: [row.productEvidenceUrl, row.reachabilityEvidenceUrl].filter(Boolean).join('; '),
  };
}

function demoFor(diseaseFocus) {
  if (diseaseFocus.includes('chronic_pain_msk')) return '慢痛/康复 AI coach demo：疼痛日记 -> flare-up 解释 -> 阶段性康复计划 -> 随访任务。';
  if (diseaseFocus.includes('metabolic_cardiovascular')) return '代谢慢病 AI coach demo：血糖/体重/用药记录 -> 风险解释 -> 个性化随访和医生报告。';
  if (diseaseFocus.includes('mental_sleep_comorbidity')) return '睡眠/心理共病 demo：量表和日记 -> 风险分层 -> 安全边界内的行为练习推荐。';
  return '医疗工作流 agent demo：患者信息 -> 摘要 -> follow-up plan -> 医生/运营 copilot。';
}

function buildSourceEvidence(row) {
  return [
    {
      companyName: row.companyName,
      sourceType: 'product_evidence',
      sourceUrl: row.productEvidenceUrl,
      capturedAt: TODAY,
      evidenceSummary: row.productEvidenceSummary,
      evidenceStrength: row.sourceTier === 'curated' ? 'strong_product_or_company_site' : 'medium_stage2_evidence',
    },
    {
      companyName: row.companyName,
      sourceType: 'reachability_evidence',
      sourceUrl: row.reachabilityEvidenceUrl,
      capturedAt: TODAY,
      evidenceSummary: row.reachabilityEvidenceSummary,
      evidenceStrength: ALLOWED_REACHABILITY.has(row.reachabilityStatus) ? 'strong_reachability' : 'limited_or_unknown_reachability',
    },
  ].filter(x => x.sourceUrl || x.evidenceSummary);
}

function qa(shortlist, restricted, targetPool) {
  const failures = [];
  const warnings = [];
  const restrictedNames = new Set(restricted.map(row => normalizeName(row.companyName)));
  for (const row of shortlist) {
    if (!ALLOWED_REACHABILITY.has(row.reachabilityStatus)) failures.push(`${row.companyName} has invalid shortlist reachability ${row.reachabilityStatus}`);
    if (restrictedNames.has(normalizeName(row.companyName))) failures.push(`${row.companyName} appears in restricted watchlist and shortlist`);
    if (['A', 'B'].includes(row.tier) && (!row.productEvidenceUrl || !row.reachabilityEvidenceUrl)) failures.push(`${row.companyName} Tier ${row.tier} lacks product or reachability evidence URL`);
    if (row.reachabilityStatus === 'global_remote_confirmed' && !GLOBAL_REMOTE_RE.test(row.reachabilityEvidenceSummary)) failures.push(`${row.companyName} global remote evidence is not explicit enough`);
  }
  for (const row of targetPool) {
    if (row.reachabilityStatus === 'country_restricted_remote' && !RESTRICTED_REMOTE_RE.test(`${row.reachabilityEvidenceSummary} ${row.reachabilityEvidenceUrl}`)) {
      warnings.push(`${row.companyName} marked restricted without a strong text pattern; keep in watchlist unless manually confirmed.`);
    }
  }
  const top20 = shortlist.slice(0, 20);
  const coverage = {
    chronic_pain_msk: top20.some(row => row.diseaseFocus.includes('chronic_pain_msk')),
    metabolic_cardiovascular: top20.some(row => row.diseaseFocus.includes('metabolic_cardiovascular')),
    mental_sleep_comorbidity: top20.some(row => row.diseaseFocus.includes('mental_sleep_comorbidity')),
  };
  for (const [k, ok] of Object.entries(coverage)) {
    if (!ok) failures.push(`Top 20 does not cover ${k}`);
  }
  if (failures.length) {
    const err = new Error(`QA failed:\n${failures.join('\n')}`);
    err.failures = failures;
    err.warnings = warnings;
    throw err;
  }
  return { passed: true, failures, warnings, coverage };
}

async function writeMarkdown(shortlist, restricted, qaSummary) {
  const lines = [
    '# Chronic Pain / Chronic Disease AI Product Outreach Targets',
    '',
    `Captured at: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Final shortlist: ${shortlist.length}`,
    `- Restricted remote watchlist: ${restricted.length}`,
    `- QA passed: ${qaSummary.passed}`,
    '- Strict reachability rule: final shortlist only includes China-local reachable or explicitly global/fully-remote companies.',
    '',
    '## Top Shortlist',
    '',
    '| Rank | Company | Tier | Score | Reachability | Disease Focus | AI Product Opportunity | Contact Targets |',
    '|---:|---|---|---:|---|---|---|---|',
    ...shortlist.slice(0, 30).map((row, idx) => `| ${idx + 1} | ${row.companyName} | ${row.tier} | ${row.totalScore} | ${row.reachabilityStatus} | ${row.diseaseFocus} | ${row.aiProductOpportunity.replace(/\|/g, '/')} | ${row.contactTargets.replace(/\|/g, '/')} |`),
    '',
    '## Restricted / Unknown Examples',
    '',
    ...restricted.slice(0, 20).map(row => `- ${row.companyName}: ${row.reachabilityStatus}; ${row.restrictionReason || row.reachabilityEvidenceSummary}`),
  ];
  await fs.writeFile(path.join(OUT_DIR, 'global_remote_or_china_shortlist.md'), `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const stage2Scores = JSON.parse(await fs.readFile(path.join(AI_DIR, 'ai_company_scores.json'), 'utf8'));
  const stage2ByName = new Map(stage2Scores.map(row => [normalizeName(row.companyName), row]));

  const curatedRows = CURATED_TARGETS.map(target => targetRowFromCurated(target, stage2ByName));
  const curatedNames = new Set(curatedRows.map(row => normalizeName(row.companyName)));
  const stage2Rows = stage2Scores
    .filter(row => !curatedNames.has(normalizeName(row.companyName)))
    .filter(row => /chronic_disease_management|rehabilitation|remote_patient_monitoring|patient_engagement|mental_health|sleep_health|internet_healthcare|online_consultation|pharmacy_ecommerce/.test(row.categories ?? ''))
    .map(targetRowFromStage2);

  const targetPool = dedupeRows([...curatedRows, ...stage2Rows]);
  const shortlist = targetPool
    .filter(row => row.shortlistEligible)
    .filter(row => ALLOWED_REACHABILITY.has(row.reachabilityStatus))
    .filter(row => row.sourceTier === 'curated' || row.totalScore >= 64)
    .sort((a, b) => {
      const tierOrder = { A: 4, B: 3, C: 2, D: 1 };
      return (tierOrder[b.tier] ?? 0) - (tierOrder[a.tier] ?? 0) || b.totalScore - a.totalScore || a.companyName.localeCompare(b.companyName);
    })
    .slice(0, 30);
  const restricted = targetPool
    .filter(row => row.totalScore >= 70)
    .filter(row => !ALLOWED_REACHABILITY.has(row.reachabilityStatus) || row.reachabilityStatus === 'country_restricted_remote')
    .sort((a, b) => b.totalScore - a.totalScore || a.companyName.localeCompare(b.companyName));
  const outreachBriefs = shortlist.map(buildOutreachBrief);
  const sourceEvidence = targetPool.flatMap(buildSourceEvidence);
  const qaSummary = qa(shortlist, restricted, targetPool);

  const companyColumns = [
    'companyName', 'aliases', 'country', 'city', 'diseaseFocus', 'productLine', 'productType',
    'targetUsers', 'businessModel', 'reachabilityStatus', 'tier', 'totalScore',
    'productProblemFit', 'aiProductLeverage', 'personalFit', 'outreachFeasibility',
    'commercialSignal', 'aiProductOpportunity', 'personalFitReason', 'contactTargets',
    'contactRoute', 'outreachOpening', 'productEvidenceUrl', 'reachabilityEvidenceUrl',
    'restrictionReason', 'sourceTier', 'stage2OpportunityScore', 'stage2Categories',
  ];
  await writeJson('companies_target_pool.json', targetPool);
  await writeJson('global_remote_or_china_shortlist.json', shortlist);
  await writeJson('restricted_remote_watchlist.json', restricted);
  await writeJson('outreach_briefs.json', outreachBriefs);
  await writeJson('source_evidence.json', sourceEvidence);
  await writeJson('qa_summary.json', qaSummary);
  await writeCsv('companies_target_pool.csv', targetPool, companyColumns);
  await writeCsv('global_remote_or_china_shortlist.csv', shortlist, companyColumns);
  await writeCsv('restricted_remote_watchlist.csv', restricted, companyColumns);
  await writeCsv('outreach_briefs.csv', outreachBriefs, [
    'companyName', 'tier', 'reachabilityStatus', 'roleAngle', 'contactTargets',
    'contactRoute', 'outreachOpening', 'valueProposition', 'demoToAttach', 'evidenceUrls',
  ]);
  await writeCsv('source_evidence.csv', sourceEvidence, [
    'companyName', 'sourceType', 'sourceUrl', 'capturedAt', 'evidenceSummary', 'evidenceStrength',
  ]);
  await writeMarkdown(shortlist, restricted, qaSummary);

  console.log(`Stage 4 chronic pain product targets written to ${OUT_DIR}`);
  console.log(`target_pool=${targetPool.length} shortlist=${shortlist.length} restricted=${restricted.length}`);
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  if (err.failures) {
    console.error(JSON.stringify({ failures: err.failures, warnings: err.warnings }, null, 2));
  }
  process.exitCode = 1;
});
