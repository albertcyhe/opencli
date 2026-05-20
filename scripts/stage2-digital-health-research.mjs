#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'results', 'stage2-digital-health');
const RAW_DIR = path.join(OUT_DIR, 'raw');
const TODAY = new Date().toISOString().slice(0, 10);

const OPENFDA_TERMS = [
  'software',
  'mobile medical app',
  'mobile app',
  'digital therapeutic',
  'digital therapeutics',
  'remote monitoring',
  'remote patient monitoring',
  'patient monitoring',
  'cardiac monitoring',
  'diabetes',
  'insomnia',
  'sleep',
  'ADHD',
  'depression',
  'anxiety',
  'CBT',
  'cognitive',
  'rehabilitation',
  'pain management',
  'telehealth',
  'virtual care',
  'patient engagement',
];

const NMPA_TERMS = [
  '软件',
  'APP',
  '移动',
  '互联网',
  '远程',
  '慢病',
  '康复',
  '认知',
  '心理',
  '睡眠',
  '糖尿病',
  '血压',
  '心电',
  '患者管理',
  '数字疗法',
  '健康管理',
  '医疗软件',
  'AI医疗',
];

const ROUND2_SEEDS = [
  {
    companyName: '成都尚医信息科技有限公司',
    aliases: '尚医科技; R Plus Health; 术康',
    region: 'China',
    country: 'CN',
    city: '成都',
    categoryHint: 'rehabilitation; digital_therapeutics; health_management_platform',
    seedReason: '用户点名；公开新闻显示其与 CF PharmTech 发布 R Plus Health 居家康复 App',
    seedSourceUrl: 'https://www.prnewswire.com/news-releases/cf-pharmtech-and-chengdu-shangyi-launch-the-home-based-recovery-program-for-discharged-covid-19-patients-and-announce-todays-global-release-of-the-r-plus-health-free-app-301219070.html',
    priority: 1,
    website: '',
    productName: 'R Plus Health; 术康',
    evidenceUrls: [
      'https://www.prnewswire.com/news-releases/cf-pharmtech-and-chengdu-shangyi-launch-the-home-based-recovery-program-for-discharged-covid-19-patients-and-announce-todays-global-release-of-the-r-plus-health-free-app-301219070.html',
      'https://m.newseed.cn/company/43464',
    ],
  },
  {
    companyName: 'RecoveryPlus.health',
    aliases: 'Recovery Plus USA Inc; Recovery Plus',
    region: 'US',
    country: 'US',
    city: 'New York',
    categoryHint: 'remote_patient_monitoring; rehabilitation; chronic_disease_management; virtual care',
    seedReason: '用户点名；虚拟慢病管理和心肺康复服务',
    seedSourceUrl: 'https://www.recoveryplus.health/about/',
    priority: 1,
    website: 'https://www.recoveryplus.health/',
    productName: 'RecoveryPlus.health',
    evidenceUrls: [
      'https://www.recoveryplus.health/',
      'https://www.recoveryplus.health/about/',
      'https://www.recoveryplus.health/faq/',
      'https://www.recoveryplus.health/for-providers/',
    ],
  },
  { companyName: 'Omada Health', aliases: '', region: 'US', country: 'US', city: 'San Francisco', categoryHint: 'chronic_disease_management; virtual care; remote_patient_monitoring', seedReason: '知名美国数字慢病管理公司', seedSourceUrl: 'https://www.omadahealth.com/', priority: 1, website: 'https://www.omadahealth.com/', productName: 'Omada Health', evidenceUrls: ['https://www.omadahealth.com/'] },
  { companyName: 'Livongo', aliases: 'Livongo Health; Teladoc Health chronic care', region: 'US', country: 'US', city: 'Mountain View', categoryHint: 'chronic_disease_management; remote_patient_monitoring', seedReason: '知名慢病管理/远程监测公司，后并入 Teladoc Health', seedSourceUrl: 'https://www.teladochealth.com/livongo', priority: 1, website: 'https://www.teladochealth.com/livongo', productName: 'Livongo chronic care', evidenceUrls: ['https://www.teladochealth.com/livongo', 'https://www.teladochealth.com/newsroom/press/teladoc-health-and-livongo-merge-to-create-new-standard-in-global-healthcare-delivery-access-and-experience'] },
  { companyName: 'Hinge Health', aliases: '', region: 'US', country: 'US', city: 'San Francisco', categoryHint: 'rehabilitation; digital_musculoskeletal_clinic; virtual care', seedReason: '知名数字肌骨康复公司', seedSourceUrl: 'https://www.hingehealth.com/', priority: 1, website: 'https://www.hingehealth.com/', productName: 'Hinge Health', evidenceUrls: ['https://www.hingehealth.com/'] },
  { companyName: 'Akili', aliases: 'Akili Interactive; Akili Interactive Labs; EndeavorRx', region: 'US', country: 'US', city: 'Boston', categoryHint: 'digital_therapeutics; cognitive; pediatric ADHD', seedReason: '知名数字疗法/认知治疗公司', seedSourceUrl: 'https://www.akiliinteractive.com/', priority: 1, website: 'https://www.akiliinteractive.com/', productName: 'EndeavorRx; EndeavorOTC', evidenceUrls: ['https://www.akiliinteractive.com/'] },
  { companyName: 'Click Therapeutics', aliases: '', region: 'US', country: 'US', city: 'New York', categoryHint: 'digital_therapeutics; mental_health', seedReason: '知名处方数字疗法公司', seedSourceUrl: 'https://clicktherapeutics.com/', priority: 1, website: 'https://clicktherapeutics.com/', productName: 'Click Therapeutics platform', evidenceUrls: ['https://clicktherapeutics.com/'] },
  { companyName: 'Big Health', aliases: 'Sleepio; Daylight', region: 'US', country: 'US', city: 'San Francisco', categoryHint: 'digital_therapeutics; sleep_health; mental_health', seedReason: '知名睡眠/心理数字疗法公司', seedSourceUrl: 'https://www.bighealth.com/', priority: 1, website: 'https://www.bighealth.com/', productName: 'Sleepio; Daylight', evidenceUrls: ['https://www.bighealth.com/'] },
  { companyName: 'Kaia Health', aliases: '', region: 'US', country: 'US', city: 'New York', categoryHint: 'rehabilitation; musculoskeletal; digital_therapeutics', seedReason: '数字肌骨/康复公司', seedSourceUrl: 'https://www.kaiahealth.com/', priority: 1, website: 'https://www.kaiahealth.com/', productName: 'Kaia Health', evidenceUrls: ['https://www.kaiahealth.com/'] },
  { companyName: 'Noom', aliases: 'Noom Health', region: 'US', country: 'US', city: 'New York', categoryHint: 'chronic_disease_management; weight management; behavior change', seedReason: '知名体重和慢病行为改变数字健康公司', seedSourceUrl: 'https://www.noom.com/', priority: 1, website: 'https://www.noom.com/', productName: 'Noom', evidenceUrls: ['https://www.noom.com/'] },
  { companyName: 'Headspace Health', aliases: 'Headspace; Ginger', region: 'US', country: 'US', city: 'Santa Monica', categoryHint: 'mental_health; virtual care', seedReason: '知名数字心理健康公司', seedSourceUrl: 'https://organizations.headspace.com/', priority: 1, website: 'https://organizations.headspace.com/', productName: 'Headspace mental health platform', evidenceUrls: ['https://organizations.headspace.com/', 'https://organizations.headspace.com/headspace-care'] },
  { companyName: 'Sidekick Health', aliases: '', region: 'Europe', country: 'IS', city: 'Reykjavik', categoryHint: 'digital_therapeutics; chronic_disease_management', seedReason: '欧洲数字疗法/慢病管理公司', seedSourceUrl: 'https://www.sidekickhealth.com/', priority: 1, website: 'https://www.sidekickhealth.com/', productName: 'Sidekick Health', evidenceUrls: ['https://www.sidekickhealth.com/'] },
  { companyName: 'Voluntis', aliases: 'Aptar Digital Health; Theraxium', region: 'Europe', country: 'FR', city: 'Paris', categoryHint: 'digital_therapeutics; samd', seedReason: '法国数字疗法公司，后并入 Aptar Digital Health', seedSourceUrl: 'https://www.aptardigitalhealth.com/', priority: 1, website: 'https://www.aptardigitalhealth.com/', productName: 'Theraxium', evidenceUrls: ['https://www.aptardigitalhealth.com/'] },
  { companyName: 'Orexo digital therapeutics', aliases: 'Orexo; MODIA; deprexis', region: 'Europe', country: 'SE', city: 'Uppsala', categoryHint: 'digital_therapeutics; mental_health; substance use', seedReason: '瑞典药企数字疗法业务', seedSourceUrl: 'https://www.orexo.com/therapeutic-focus/opioid-use-disorder-oud/', priority: 1, website: 'https://www.orexo.com/therapeutic-focus/opioid-use-disorder-oud/', productName: 'MODIA; deprexis', evidenceUrls: ['https://www.orexo.com/therapeutic-focus/opioid-use-disorder-oud/', 'https://orexo.com/who-we-are/our-history/'] },
  { companyName: 'MindMaze', aliases: '', region: 'Europe', country: 'CH', city: 'Lausanne', categoryHint: 'rehabilitation; neurorehabilitation; digital therapeutics', seedReason: '瑞士神经康复数字健康公司', seedSourceUrl: 'https://www.mindmaze.com/', priority: 1, website: 'https://www.mindmaze.com/', productName: 'MindMaze neurorehabilitation platform', evidenceUrls: ['https://www.mindmaze.com/'] },
  { companyName: 'Sword Health', aliases: '', region: 'Europe', country: 'PT', city: 'Porto', categoryHint: 'rehabilitation; musculoskeletal; virtual care', seedReason: '葡萄牙/美国数字肌骨康复公司', seedSourceUrl: 'https://swordhealth.com/', priority: 1, website: 'https://swordhealth.com/', productName: 'Sword Health', evidenceUrls: ['https://swordhealth.com/'] },
  { companyName: 'Ada Health', aliases: '', region: 'Europe', country: 'DE', city: 'Berlin', categoryHint: 'clinical_workflow; symptom assessment; patient engagement', seedReason: '德国 AI 问诊/症状评估公司', seedSourceUrl: 'https://ada.com/', priority: 1, website: 'https://ada.com/', productName: 'Ada', evidenceUrls: ['https://ada.com/'] },
  { companyName: 'Babylon Health', aliases: 'Babylon', region: 'Europe', country: 'GB', city: 'London', categoryHint: 'telehealth; online_consultation; virtual care', seedReason: '英国知名远程医疗平台，历史主体需标记存续状态', seedSourceUrl: 'https://www.babylonhealth.com/', priority: 1, website: 'https://www.babylonhealth.com/', productName: 'Babylon', evidenceUrls: ['https://www.babylonhealth.com/'] },
  { companyName: 'Kry/Livi', aliases: 'Kry; Livi', region: 'Europe', country: 'SE', city: 'Stockholm', categoryHint: 'online_consultation; telehealth; virtual care', seedReason: '欧洲在线问诊平台', seedSourceUrl: 'https://www.livi.co.uk/', priority: 1, website: 'https://www.livi.co.uk/', productName: 'Livi', evidenceUrls: ['https://www.livi.co.uk/'] },
  { companyName: 'Doctolib', aliases: '', region: 'Europe', country: 'FR', city: 'Paris', categoryHint: 'online_consultation; clinical_workflow; digital medical platform', seedReason: '欧洲医疗预约/远程问诊平台', seedSourceUrl: 'https://connect.doctolib.com/about-doctolib', priority: 1, website: 'https://www.doctolib.fr/', productName: 'Doctolib', evidenceUrls: ['https://connect.doctolib.com/about-doctolib', 'https://info.doctolib.fr/presentation/offre-teleconsultation-medecin/'] },
  { companyName: '微医', aliases: 'WeDoctor; 挂号网', region: 'China', country: 'CN', city: '杭州', categoryHint: 'internet_healthcare; online_consultation; health_management_platform', seedReason: '中国知名互联网医疗平台', seedSourceUrl: 'https://www.guahao.com/', priority: 1, website: 'https://www.guahao.com/', productName: '微医平台', evidenceUrls: ['https://www.guahao.com/'] },
  { companyName: '平安健康', aliases: '平安好医生; Ping An Good Doctor', region: 'China', country: 'CN', city: '上海', categoryHint: 'internet_healthcare; online_consultation; health_management_platform', seedReason: '中国知名互联网医疗平台', seedSourceUrl: 'https://www.pagd.net/', priority: 1, website: 'https://www.pagd.net/', productName: '平安健康', evidenceUrls: ['https://www.pagd.net/'] },
  { companyName: '京东健康', aliases: 'JD Health', region: 'China', country: 'CN', city: '北京', categoryHint: 'internet_healthcare; pharmacy_ecommerce; online_consultation', seedReason: '中国知名互联网医疗/医药电商平台', seedSourceUrl: 'https://www.jdh.com/', priority: 1, website: 'https://www.jdh.com/', productName: '京东健康', evidenceUrls: ['https://www.jdh.com/'] },
  { companyName: '阿里健康', aliases: 'Alibaba Health', region: 'China', country: 'CN', city: '杭州', categoryHint: 'internet_healthcare; pharmacy_ecommerce; health_management_platform', seedReason: '中国知名互联网医疗/医药电商平台', seedSourceUrl: 'https://www.alihealth.cn/', priority: 1, website: 'https://www.alihealth.cn/', productName: '阿里健康', evidenceUrls: ['https://www.alihealth.cn/'] },
  { companyName: '丁香园', aliases: 'DXY', region: 'China', country: 'CN', city: '杭州', categoryHint: 'digital medical platform; clinical_workflow; patient engagement', seedReason: '中国知名医生/医疗健康平台', seedSourceUrl: 'https://www.dxy.cn/', priority: 1, website: 'https://www.dxy.cn/', productName: '丁香园', evidenceUrls: ['https://www.dxy.cn/'] },
  { companyName: '医联', aliases: 'Medlinker', region: 'China', country: 'CN', city: '成都', categoryHint: 'internet_healthcare; online_consultation; chronic_disease_management', seedReason: '成都互联网医疗平台', seedSourceUrl: 'https://www.medlinker.com/', priority: 1, website: 'https://www.medlinker.com/', productName: '医联', evidenceUrls: ['https://www.medlinker.com/'] },
  { companyName: '妙手医生', aliases: '妙手; Miaoshou Doctor', region: 'China', country: 'CN', city: '北京', categoryHint: 'online_consultation; pharmacy_ecommerce; internet_healthcare', seedReason: '中国在线问诊/医药电商平台', seedSourceUrl: 'https://www.miaoshou.com/', priority: 1, website: 'https://www.miaoshou.com/', productName: '妙手医生', evidenceUrls: ['https://www.miaoshou.com/'] },
  { companyName: '健客', aliases: '健客网; Jianke', region: 'China', country: 'CN', city: '广州', categoryHint: 'pharmacy_ecommerce; internet_healthcare', seedReason: '中国医药电商/互联网医疗平台', seedSourceUrl: 'https://www.jianke.com/', priority: 1, website: 'https://www.jianke.com/', productName: '健客', evidenceUrls: ['https://www.jianke.com/'] },
  { companyName: '智云健康', aliases: 'ClouDr', region: 'China', country: 'CN', city: '杭州', categoryHint: 'chronic_disease_management; internet_healthcare; health_management_platform', seedReason: '中国慢病管理和数字医疗平台', seedSourceUrl: 'https://www.cloudr.cn/', priority: 1, website: 'https://www.cloudr.cn/', productName: '智云健康', evidenceUrls: ['https://www.cloudr.cn/'] },
  { companyName: '圆心科技', aliases: 'Yuanxin Technology; 圆心医疗', region: 'China', country: 'CN', city: '北京', categoryHint: 'pharmacy_ecommerce; internet_healthcare; patient engagement', seedReason: '中国院外患者服务/医药平台', seedSourceUrl: 'https://www.yuanxin.com/', priority: 1, website: 'https://www.yuanxin.com/', productName: '圆心科技', evidenceUrls: ['https://www.yuanxin.com/'] },
  { companyName: '方舟健客', aliases: '方舟云康; Jianke', region: 'China', country: 'CN', city: '广州', categoryHint: 'online_consultation; pharmacy_ecommerce; internet_healthcare', seedReason: '中国互联网医疗/慢病管理平台', seedSourceUrl: 'https://www.jianke.com/', priority: 1, website: 'https://www.jianke.com/', productName: '方舟健客', evidenceUrls: ['https://www.jianke.com/'] },
  { companyName: '思派健康', aliases: 'Medbanks; 思派网络', region: 'China', country: 'CN', city: '北京', categoryHint: 'patient engagement; oncology patient management; specialty pharmacy', seedReason: '中国特药和患者管理平台', seedSourceUrl: 'https://www.medbanks.cn/', priority: 1, website: 'https://www.medbanks.cn/', productName: '思派健康', evidenceUrls: ['https://www.medbanks.cn/'] },
  { companyName: 'Teladoc Health', aliases: '', region: 'US', country: 'US', city: 'Purchase', categoryHint: 'telehealth; virtual care; chronic_disease_management', seedReason: '美国远程医疗平台', seedSourceUrl: 'https://www.teladochealth.com/', priority: 2, website: 'https://www.teladochealth.com/', productName: 'Teladoc Health', evidenceUrls: ['https://www.teladochealth.com/'] },
  { companyName: 'Amwell', aliases: 'American Well', region: 'US', country: 'US', city: 'Boston', categoryHint: 'telehealth; virtual care', seedReason: '美国远程医疗平台', seedSourceUrl: 'https://business.amwell.com/', priority: 2, website: 'https://business.amwell.com/', productName: 'Amwell platform', evidenceUrls: ['https://business.amwell.com/'] },
  { companyName: 'Virta Health', aliases: '', region: 'US', country: 'US', city: 'Denver', categoryHint: 'chronic_disease_management; diabetes; virtual care', seedReason: '美国糖尿病/代谢慢病虚拟诊疗公司', seedSourceUrl: 'https://www.virtahealth.com/', priority: 2, website: 'https://www.virtahealth.com/', productName: 'Virta Health', evidenceUrls: ['https://www.virtahealth.com/'] },
  { companyName: 'Biofourmis', aliases: '', region: 'US', country: 'US', city: 'Boston', categoryHint: 'remote_patient_monitoring; virtual care; digital therapeutics', seedReason: '远程监测和数字医学公司', seedSourceUrl: 'https://www.biofourmis.com/', priority: 2, website: 'https://www.biofourmis.com/', productName: 'Biofourmis', evidenceUrls: ['https://www.biofourmis.com/'] },
  { companyName: 'Current Health', aliases: 'Best Buy Health Current Health', region: 'Europe', country: 'GB', city: 'Edinburgh', categoryHint: 'remote_patient_monitoring; hospital at home', seedReason: '英国远程患者监测公司', seedSourceUrl: 'https://currenthealth.com/', priority: 2, website: 'https://currenthealth.com/', productName: 'Current Health', evidenceUrls: ['https://currenthealth.com/'] },
  { companyName: 'WellDoc', aliases: 'Welldoc; BlueStar', region: 'US', country: 'US', city: 'Columbia', categoryHint: 'digital_therapeutics; chronic_disease_management; diabetes', seedReason: '美国糖尿病数字疗法公司', seedSourceUrl: 'https://www.welldoc.com/', priority: 2, website: 'https://www.welldoc.com/', productName: 'BlueStar', evidenceUrls: ['https://www.welldoc.com/'] },
  { companyName: 'AppliedVR', aliases: '', region: 'US', country: 'US', city: 'Los Angeles', categoryHint: 'digital_therapeutics; pain management', seedReason: 'VR 数字疗法/疼痛管理公司', seedSourceUrl: 'https://www.appliedvr.io/', priority: 2, website: 'https://www.appliedvr.io/', productName: 'RelieVRx', evidenceUrls: ['https://www.appliedvr.io/'] },
  { companyName: 'MedRhythms', aliases: '', region: 'US', country: 'US', city: 'Portland', categoryHint: 'digital_therapeutics; rehabilitation; neurorehabilitation', seedReason: '神经康复数字疗法公司', seedSourceUrl: 'https://www.medrhythms.com/', priority: 2, website: 'https://www.medrhythms.com/', productName: 'MR-001', evidenceUrls: ['https://www.medrhythms.com/'] },
  { companyName: 'Woebot Health', aliases: 'Woebot', region: 'US', country: 'US', city: 'San Francisco', categoryHint: 'mental_health; digital therapeutics', seedReason: '数字心理健康公司', seedSourceUrl: 'https://woebothealth.com/', priority: 2, website: 'https://woebothealth.com/', productName: 'Woebot', evidenceUrls: ['https://woebothealth.com/'] },
  { companyName: 'Lark Health', aliases: '', region: 'US', country: 'US', city: 'Mountain View', categoryHint: 'chronic_disease_management; diabetes; hypertension', seedReason: 'AI 慢病管理公司', seedSourceUrl: 'https://www.lark.com/', priority: 2, website: 'https://www.lark.com/', productName: 'Lark Health', evidenceUrls: ['https://www.lark.com/'] },
  { companyName: 'Glooko', aliases: '', region: 'US', country: 'US', city: 'Palo Alto', categoryHint: 'chronic_disease_management; diabetes; remote_patient_monitoring', seedReason: '糖尿病数据和远程监测平台', seedSourceUrl: 'https://glooko.com/', priority: 2, website: 'https://glooko.com/', productName: 'Glooko', evidenceUrls: ['https://glooko.com/'] },
  { companyName: 'mySugr', aliases: 'Roche mySugr', region: 'Europe', country: 'AT', city: 'Vienna', categoryHint: 'chronic_disease_management; diabetes; mobile health', seedReason: '欧洲糖尿病管理 App', seedSourceUrl: 'https://www.mysugr.com/', priority: 2, website: 'https://www.mysugr.com/', productName: 'mySugr', evidenceUrls: ['https://www.mysugr.com/'] },
  { companyName: 'Oviva', aliases: '', region: 'Europe', country: 'CH', city: 'Zurich', categoryHint: 'chronic_disease_management; digital nutrition therapy', seedReason: '欧洲数字营养/慢病管理公司', seedSourceUrl: 'https://oviva.com/', priority: 2, website: 'https://oviva.com/', productName: 'Oviva', evidenceUrls: ['https://oviva.com/'] },
  { companyName: 'Infermedica', aliases: '', region: 'Europe', country: 'PL', city: 'Wroclaw', categoryHint: 'clinical_workflow; symptom assessment', seedReason: '欧洲症状评估/分诊平台', seedSourceUrl: 'https://infermedica.com/', priority: 2, website: 'https://infermedica.com/', productName: 'Infermedica', evidenceUrls: ['https://infermedica.com/'] },
  { companyName: 'HelloBetter', aliases: 'GET.ON Institut', region: 'Europe', country: 'DE', city: 'Hamburg', categoryHint: 'digital_therapeutics; mental_health; DiGA', seedReason: '德国 DiGA/心理数字疗法公司', seedSourceUrl: 'https://hellobetter.de/', priority: 2, website: 'https://hellobetter.de/', productName: 'HelloBetter', evidenceUrls: ['https://hellobetter.de/'] },
  { companyName: 'Cara Care', aliases: 'HiDoc Technologies', region: 'Europe', country: 'DE', city: 'Berlin', categoryHint: 'digital_therapeutics; chronic_disease_management; gastrointestinal', seedReason: '德国消化疾病数字健康/DiGA 公司', seedSourceUrl: 'https://cara.care/', priority: 2, website: 'https://cara.care/', productName: 'Cara Care', evidenceUrls: ['https://cara.care/'] },
  { companyName: '好大夫在线', aliases: 'Haodf', region: 'China', country: 'CN', city: '北京', categoryHint: 'online_consultation; internet_healthcare', seedReason: '中国在线问诊平台', seedSourceUrl: 'https://www.haodf.com/', priority: 2, website: 'https://www.haodf.com/', productName: '好大夫在线', evidenceUrls: ['https://www.haodf.com/'] },
  { companyName: '春雨医生', aliases: 'Chunyu Doctor', region: 'China', country: 'CN', city: '北京', categoryHint: 'online_consultation; internet_healthcare', seedReason: '中国在线问诊平台', seedSourceUrl: 'https://www.chunyuyisheng.com/', priority: 2, website: 'https://www.chunyuyisheng.com/', productName: '春雨医生', evidenceUrls: ['https://www.chunyuyisheng.com/'] },
  { companyName: '叮当快药', aliases: '叮当健康', region: 'China', country: 'CN', city: '北京', categoryHint: 'pharmacy_ecommerce; internet_healthcare', seedReason: '中国医药电商/互联网医疗平台', seedSourceUrl: 'https://www.ddky.com/', priority: 2, website: 'https://www.ddky.com/', productName: '叮当快药', evidenceUrls: ['https://www.ddky.com/'] },
  { companyName: '微脉', aliases: 'Weimai', region: 'China', country: 'CN', city: '杭州', categoryHint: 'internet_healthcare; patient engagement; online_consultation', seedReason: '杭州互联网医疗/患者服务平台', seedSourceUrl: 'https://www.myweimai.com/', priority: 2, website: 'https://www.myweimai.com/', productName: '微脉', evidenceUrls: ['https://www.myweimai.com/'] },
  { companyName: '健康160', aliases: '就医160', region: 'China', country: 'CN', city: '深圳', categoryHint: 'internet_healthcare; online_consultation; appointment platform', seedReason: '深圳互联网医疗服务平台', seedSourceUrl: 'https://www.91160.com/', priority: 2, website: 'https://www.91160.com/', productName: '健康160', evidenceUrls: ['https://www.91160.com/'] },
];

const CHINA_TARGET_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都'];
const EU_EEA_UK_CH_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
  'SE', 'IS', 'LI', 'NO', 'GB', 'UK', 'CH',
]);

const REQUIRED_KEYS = [
  ['BFARM_DIGA_TOKEN', 'BfArM FHIR API'],
  ['OPENCORPORATES_API_TOKEN', 'OpenCorporates API'],
  ['COMPANIES_HOUSE_API_KEY', 'Companies House API'],
  ['QCC_API_KEY', 'Qichacha API key'],
  ['QCC_SECRET_KEY', 'Qichacha API secret'],
  ['CRUNCHBASE_API_KEY', 'Crunchbase API'],
  ['ITJUZI_API_BASE', 'IT桔子 licensed API base'],
  ['ITJUZI_API_KEY', 'IT桔子 licensed API key'],
];

const CATEGORY_RULES = [
  ['digital_therapeutics', /digital therapeutics?|DTx|PDTx|数字疗法|治疗软件|处方数字/i],
  ['samd', /software|medical app|mobile app|SaMD|软件|APP|应用/i],
  ['remote_patient_monitoring', /remote patient monitoring|remote monitoring|patient monitoring|monitoring|cardiac|ECG|blood pressure|心电|血压|远程|监测/i],
  ['chronic_disease_management', /chronic|diabetes|hypertension|asthma|COPD|慢病|糖尿病|高血压|哮喘/i],
  ['internet_healthcare', /internet healthcare|telehealth|virtual care|互联网医疗|互联网医院/i],
  ['online_consultation', /online consultation|问诊|在线问诊/i],
  ['pharmacy_ecommerce', /digital pharmacy|pharmacy|医药电商|药房|药品/i],
  ['health_management_platform', /health management|健康管理|患者管理|patient engagement|patient management/i],
  ['mental_health', /mental health|depression|anxiety|ADHD|CBT|cognitive|心理|抑郁|焦虑|认知/i],
  ['sleep_health', /sleep|insomnia|睡眠|失眠/i],
  ['rehabilitation', /rehab|rehabilitation|康复/i],
  ['clinical_workflow', /clinical workflow|doctor tool|clinician|医生|临床路径|辅助诊断|诊断/i],
  ['patient_engagement', /patient engagement|patient management|患者管理|随访/i],
];

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(x => x.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1) return process.argv[idx + 1] ?? fallback;
  return fallback;
}

const OPENFDA_LIMIT = Number(argValue('openfda-limit', 50));
const NMPA_LIMIT = Number(argValue('nmpa-limit', 50));
const NMPA_DETAIL_LIMIT = Number(argValue('nmpa-detail-limit', 180));
const REUSE_RAW = process.argv.includes('--reuse-raw');

async function ensureDirs() {
  await fs.mkdir(RAW_DIR, { recursive: true });
}

async function writeJson(rel, value) {
  const file = path.join(OUT_DIR, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return file;
}

async function readJson(rel) {
  const file = path.join(OUT_DIR, rel);
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeCsv(rel, rows, columns) {
  const file = path.join(OUT_DIR, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const text = [
    columns.join(','),
    ...rows.map(row => columns.map(col => csvCell(row[col])).join(',')),
  ].join('\n');
  await fs.writeFile(file, `${text}\n`, 'utf8');
  return file;
}

function csvCell(value) {
  if (value == null) return '';
  const s = Array.isArray(value) ? value.join('; ') : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function seedCsvRows() {
  return ROUND2_SEEDS.map(seed => ({
    companyName: seed.companyName,
    aliases: seed.aliases,
    region: seed.region,
    country: seed.country,
    city: seed.city,
    categoryHint: seed.categoryHint,
    seedReason: seed.seedReason,
    seedSourceUrl: seed.seedSourceUrl,
    priority: seed.priority,
  }));
}

function sourceTypeForUrl(url, seed) {
  if (/apps\.apple\.com|play\.google\.com/i.test(url)) return 'round2_app_store';
  if (/npiprofile\.com|opencorporates\.com|company-information\.service\.gov\.uk|sec\.gov|qcc\.com/i.test(url)) return 'round2_registry';
  if (seed.website && sameHost(url, seed.website)) return 'round2_company_site';
  if (/prnewswire\.com|newseed\.cn|cbinsights\.com|f6s\.com|healthcaretechoutlook\.com|wikipedia\.org/i.test(url)) return 'round2_news';
  return 'round2_company_site';
}

function evidenceStrengthForUrl(url, seed) {
  const type = sourceTypeForUrl(url, seed);
  if (type === 'round2_registry') return 'strong_registry';
  if (type === 'round2_company_site') return 'strong_company_site';
  if (type === 'round2_app_store') return 'medium_app_store';
  return 'medium_news';
}

function confidenceForStrength(strength) {
  if (strength === 'strong_registry') return 0.76;
  if (strength === 'strong_company_site') return 0.7;
  if (strength === 'strong_official_product') return 0.84;
  if (strength === 'medium_app_store') return 0.62;
  if (strength === 'medium_news') return 0.58;
  if (strength === 'weak_social') return 0.35;
  return 0.3;
}

function sameHost(a, b) {
  try {
    const ah = new URL(a).hostname.replace(/^www\./, '');
    const bh = new URL(b).hostname.replace(/^www\./, '');
    return ah === bh || ah.endsWith(`.${bh}`) || bh.endsWith(`.${ah}`);
  } catch {
    return false;
  }
}

function htmlTitleAndDescription(html) {
  const title = cleanHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const description = cleanHtml(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    '',
  );
  return { title, description };
}

async function fetchEvidencePage(url) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'opencli-stage2-round2/1.0',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const text = await resp.text();
  const { title, description } = htmlTitleAndDescription(text);
  if (/\/errors\/404\b/i.test(resp.url || '') || /^page not found$/i.test(title)) {
    throw new Error(`HTTP 404-like page ${resp.url || url}`);
  }
  return {
    finalUrl: resp.url || url,
    title,
    description,
    textSample: cleanHtml(text).slice(0, 500),
  };
}

function round2SearchQueries() {
  const zhTerms = ['数字医疗', '互联网医疗', '互联网医院', '在线问诊', '医药电商', '慢病管理', '远程监测', '患者管理', '康复', '心理健康', '睡眠管理', '认知训练', '医疗软件', 'AI医疗', '健康管理平台'];
  const enTerms = ['digital health', 'telehealth', 'virtual care', 'remote patient monitoring', 'chronic disease management', 'digital pharmacy', 'cardiac rehab', 'mental health app', 'rehabilitation software'];
  const china = CHINA_TARGET_CITIES.flatMap(city => zhTerms.map(term => `${city} ${term}`));
  const western = ['United States', 'United Kingdom', 'Germany', 'France', 'Switzerland', 'Sweden', 'Portugal', 'Netherlands', 'Spain'].flatMap(place => enTerms.map(term => `${place} ${term}`));
  return [...china, ...western];
}

async function fetchText(url, init = {}) {
  const resp = await fetch(url, {
    ...init,
    headers: {
      'User-Agent': 'opencli-stage2-digital-health/1.0',
      accept: 'text/html,application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${url}`);
  return resp.text();
}

async function fetchJson(url, init = {}) {
  const text = await fetchText(url, init);
  return JSON.parse(text);
}

function cleanHtml(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#40;/g, '(')
    .replace(/&#41;/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

function stableKey(...parts) {
  return parts.map(x => String(x ?? '').trim().toLowerCase()).filter(Boolean).join('|');
}

function addUnique(map, row, ...parts) {
  const key = stableKey(...parts);
  if (!key) return;
  if (!map.has(key)) map.set(key, row);
}

function categoriesFor(...parts) {
  const text = parts.filter(Boolean).join(' ');
  const out = [];
  for (const [tag, re] of CATEGORY_RULES) {
    if (re.test(text)) out.push(tag);
  }
  return [...new Set(out)];
}

function chinaTargetCity(...parts) {
  const text = parts.filter(Boolean).join(' ');
  return CHINA_TARGET_CITIES.find(city => text.includes(city)) ?? '';
}

function regionFor(row) {
  const country = String(row.country ?? row.jurisdiction ?? '').toUpperCase();
  if (country === 'US' || country === 'USA' || country === 'UNITED STATES') return 'US';
  if (country === 'CN' || country === 'CHINA' || row.cityCn) return 'China';
  if (EU_EEA_UK_CH_CODES.has(country)) return 'Europe';
  return row.region ?? '';
}

function confidenceFor(tier, evidenceCount, hasProduct) {
  const base = tier === 'A' ? 0.72 : tier === 'B' ? 0.58 : 0.35;
  return Math.min(0.96, base + Math.max(0, evidenceCount - 1) * 0.07 + (hasProduct ? 0.06 : 0));
}

async function collectOpenFda() {
  const rows = [];
  const errors = [];
  for (const term of OPENFDA_TERMS) {
    const url = `https://api.fda.gov/device/510k.json?search=${encodeURIComponent(term)}&limit=${OPENFDA_LIMIT}`;
    try {
      const body = await fetchJson(url, { headers: { accept: 'application/json' } });
      for (const r of body.results ?? []) {
        rows.push({
          sourceQuery: term,
          kNumber: r.k_number ?? '',
          applicant: r.applicant ?? '',
          deviceName: r.device_name ?? '',
          productCode: r.product_code ?? '',
          decisionDate: r.decision_date ?? '',
          decision: r.decision_description ?? r.decision_code ?? '',
          clearanceType: r.clearance_type ?? '',
          advisoryCommittee: r.advisory_committee_description ?? r.advisory_committee ?? '',
          city: r.city ?? '',
          state: r.state ?? '',
          country: r.country_code ?? r.country ?? '',
          sourceUrl: r.k_number ? `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?id=${encodeURIComponent(r.k_number)}` : url,
        });
      }
    } catch (err) {
      errors.push({ source: 'openfda/device-510k', term, error: err.message });
    }
  }
  return { rows: dedupe(rows, r => stableKey(r.kNumber, r.applicant, r.deviceName)), errors };
}

async function collectNmpaUdi() {
  const rows = [];
  const errors = [];
  for (const term of NMPA_TERMS) {
    let page = 1;
    while (rows.filter(r => r.sourceQuery === term).length < NMPA_LIMIT) {
      try {
        const body = new URLSearchParams({
          query: term,
          searchType: '1',
          page: String(page),
          rows: '15',
          sidx: '',
          sord: 'asc',
        });
        const json = await fetchJson('https://udi.nmpa.gov.cn/getDeviceList.html', {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-requested-with': 'XMLHttpRequest',
            referer: 'https://udi.nmpa.gov.cn/showListInterr.html',
          },
          body,
        });
        const batch = Array.isArray(json.rows) ? json.rows : [];
        if (!batch.length) break;
        for (const r of batch) {
          rows.push({
            sourceQuery: term,
            primaryDeviceId: r.primaryDeviceId ?? '',
            agencyName: r.agencyName ?? '',
            companyName: r.companyName ?? '',
            productName: r.productName ?? '',
            specification: r.specification ?? '',
            deviceEndDateStatus: r.deviceEndDateStatus ?? '',
            deviceRecordKey: r.deviceRecordKey ?? '',
            detailUrl: r.deviceRecordKey ? `https://udi.nmpa.gov.cn/showDetailCX.html?deviceRecordKey=${encodeURIComponent(r.deviceRecordKey)}` : '',
            sourceUrl: 'https://udi.nmpa.gov.cn/showListInterr.html',
          });
          if (rows.filter(x => x.sourceQuery === term).length >= NMPA_LIMIT) break;
        }
        if (page >= Number(json.total ?? page)) break;
        page += 1;
      } catch (err) {
        errors.push({ source: 'nmpa/udi-search', term, error: err.message });
        break;
      }
    }
  }
  return { rows: dedupe(rows, r => stableKey(r.primaryDeviceId, r.deviceRecordKey, r.companyName, r.productName)), errors };
}

async function collectNmpaDetails(udiRows) {
  const details = [];
  const errors = [];
  const rows = udiRows.filter(r => r.deviceRecordKey).slice(0, NMPA_DETAIL_LIMIT);
  for (const r of rows) {
    const sourceUrl = `https://udi.nmpa.gov.cn/showDetailCX.html?deviceRecordKey=${encodeURIComponent(r.deviceRecordKey)}`;
    try {
      const html = await fetchText(sourceUrl);
      const fields = [];
      const re = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
      let match;
      while ((match = re.exec(html))) {
        const field = cleanHtml(match[1]).replace(/[:：]\s*$/, '');
        const value = cleanHtml(match[2]);
        if (field || value) fields.push({ field, value });
      }
      details.push({ deviceRecordKey: r.deviceRecordKey, companyName: r.companyName, productName: r.productName, sourceUrl, fields });
    } catch (err) {
      errors.push({ source: 'nmpa/udi-detail', deviceRecordKey: r.deviceRecordKey, error: err.message });
    }
  }
  return { rows: details, errors };
}

async function collectNice() {
  const rows = [];
  const errors = [];
  const sourceUrl = 'https://www.nice.org.uk/guidance/health-and-social-care-delivery/digital-health/products?Status=Published';
  try {
    const html = await fetchText(sourceUrl);
    for (const m of html.matchAll(/<article class="card">([\s\S]*?)<\/article>/g)) {
      const block = m[1];
      const link = block.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const code = block.match(/<data value="([^"]+)"/)?.[1] ?? '';
      const times = [...block.matchAll(/<time[^>]+dateTime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/g)];
      const meta = cleanHtml(block.match(/<dl class="card__metadata">([\s\S]*?)<\/dl>/)?.[1] ?? '');
      const title = cleanHtml(link?.[2] ?? '');
      const url = link?.[1] ? `https://www.nice.org.uk${link[1]}` : sourceUrl;
      if (title) {
        rows.push({
          code,
          title,
          metadata: meta,
          publishedDate: times.at(-1)?.[1] ?? '',
          updatedDate: times.length > 1 ? times[0]?.[1] ?? '' : '',
          sourceUrl: url,
        });
      }
    }
  } catch (err) {
    errors.push({ source: 'nice/digital-health-list', error: err.message });
  }
  return { rows: dedupe(rows, r => stableKey(r.code, r.title)), errors };
}

async function collectDta() {
  const rows = [];
  const errors = [];
  const sourceUrl = 'https://dtxalliance.org/engage/dta-members/';
  try {
    const html = await fetchText(sourceUrl);
    const seen = new Set();
    for (const m of html.matchAll(/<a[^>]+href="(https:\/\/dtxalliance\.org\/members\/([^"/]+)\/)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const memberUrl = m[1];
      const slug = m[2];
      if (seen.has(memberUrl)) continue;
      seen.add(memberUrl);
      const logoUrl = m[3].match(/data-src="([^"]+)"/)?.[1] ?? m[3].match(/src="([^"]+)"/)?.[1] ?? '';
      const fromImg = String(logoUrl).split('/').pop()?.replace(/\.(png|jpe?g|webp|svg).*$/i, '') ?? '';
      const raw = fromImg || slug;
      const name = raw.replace(/[-_](\d+x\d+|\d+|logo|Logo|RGB|Blue|Color|Vector).*$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
      rows.push({ name, memberSlug: slug, memberUrl, logoUrl, sourceUrl });
    }
  } catch (err) {
    errors.push({ source: 'dta/members', error: err.message });
  }
  return { rows: dedupe(rows, r => stableKey(r.memberUrl)), errors };
}

async function collectSecMatches(candidateNames) {
  const rows = [];
  const errors = [];
  try {
    const body = await fetchJson('https://www.sec.gov/files/company_tickers.json', {
      headers: {
        accept: 'application/json',
        'User-Agent': process.env.SEC_USER_AGENT || 'opencli-stage2-digital-health contact@example.com',
      },
    });
    const publicCompanies = Object.values(body ?? {});
    for (const name of candidateNames) {
      const q = normalizeCompanyName(name);
      if (!q || q.length < 4) continue;
      const hit = publicCompanies.find(x => {
        const ticker = String(x.ticker ?? '').toLowerCase();
        return ticker === q || secCompanyNameMatches(q, x.title ?? '');
      });
      if (hit) {
        rows.push({
          queryName: name,
          cik: String(hit.cik_str).padStart(10, '0'),
          ticker: hit.ticker ?? '',
          title: hit.title ?? '',
          sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${hit.cik_str}`,
        });
      }
    }
  } catch (err) {
    errors.push({ source: 'sec/company_tickers', error: err.message });
  }
  return { rows: dedupe(rows, r => stableKey(r.cik, r.queryName)), errors };
}

async function collectRound2(existingCompanies) {
  await writeCsv('seeds/round2_seed_companies.csv', seedCsvRows(), [
    'companyName', 'aliases', 'region', 'country', 'city', 'categoryHint',
    'seedReason', 'seedSourceUrl', 'priority',
  ]);

  const existingKeys = new Set(existingCompanies.flatMap(row => [
    normalizeCompanyName(row.companyName),
    ...String(row.aliases ?? '').split(';').map(normalizeCompanyName),
  ].filter(Boolean)));
  const rows = [];
  const candidates = [];
  const errors = [];

  for (const seed of ROUND2_SEEDS) {
    const candidateStatus = existingKeys.has(normalizeCompanyName(seed.companyName))
      || String(seed.aliases ?? '').split(';').map(normalizeCompanyName).some(alias => existingKeys.has(alias))
      ? 'already_present'
      : 'new_candidate';
    const candidate = {
      companyName: seed.companyName,
      aliases: seed.aliases,
      region: seed.region,
      country: seed.country,
      city: seed.city,
      categoryHint: seed.categoryHint,
      seedReason: seed.seedReason,
      seedSourceUrl: seed.seedSourceUrl,
      priority: seed.priority,
      candidateStatus,
      fetchedEvidenceCount: 0,
      fetchErrorCount: 0,
      searchStatus: 'search_matrix_defined_but_browser_or_search_api_unavailable',
    };
    candidates.push(candidate);

    rows.push({
      ...seed,
      sourceType: 'round2_seed',
      sourceQuery: 'round2_seed_companies',
      sourceUrl: seed.seedSourceUrl,
      evidenceSummary: seed.seedReason,
      evidenceStrength: 'seed_only',
      tier: 'C',
      confidence: confidenceForStrength('seed_only'),
      privacyFlag: 'company_seed_public',
      discoveryRound: 'round2',
      seeded: true,
    });

    for (const url of seed.evidenceUrls ?? []) {
      try {
        const page = await fetchEvidencePage(url);
        const evidenceStrength = evidenceStrengthForUrl(page.finalUrl || url, seed);
        candidate.fetchedEvidenceCount += 1;
        rows.push({
          ...seed,
          sourceType: sourceTypeForUrl(page.finalUrl || url, seed),
          sourceQuery: seed.companyName,
          sourceUrl: page.finalUrl || url,
          evidenceSummary: [page.title, page.description].filter(Boolean).join('; ').slice(0, 700) || seed.seedReason,
          evidenceStrength,
          tier: evidenceStrength.startsWith('strong_') ? 'B' : 'C',
          confidence: confidenceForStrength(evidenceStrength),
          privacyFlag: 'company_public_web',
          discoveryRound: 'round2',
          seeded: true,
        });
      } catch (err) {
        candidate.fetchErrorCount += 1;
        errors.push({ source: 'round2_seed_url', companyName: seed.companyName, url, error: err.message });
      }
    }
  }

  const searchMatrixStatus = {
    capturedAt: new Date().toISOString(),
    status: 'not_executed',
    reason: 'No search API credentials and OpenCLI Browser Bridge is unavailable; queries are emitted for the next run.',
    queries: round2SearchQueries(),
  };
  await writeCsv('round2_search_queries.csv', searchMatrixStatus.queries.map((query, idx) => ({
    queryId: `round2_q${String(idx + 1).padStart(3, '0')}`,
    query,
    status: searchMatrixStatus.status,
    reason: searchMatrixStatus.reason,
  })), ['queryId', 'query', 'status', 'reason']);
  await writeJson('raw/round2_search_matrix_status.json', searchMatrixStatus);
  return { rows, candidates, errors, searchMatrixStatus };
}

function normalizeCompanyName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/\b(incorporated|inc|corp|corporation|company|co|limited|ltd|llc|plc|gmbh|ag|sa|sas|srl|bv|nv)\b\.?/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const GENERIC_SEC_NAME_TOKENS = new Set([
  'health', 'digital', 'therapeutics', 'therapeutic', 'medical', 'medicine',
  'technology', 'technologies', 'interactive', 'labs', 'holdings', 'group',
  'usa', 'global', 'platform',
]);

function companyNameTokens(name) {
  return normalizeCompanyName(name)
    .split(' ')
    .map(x => x.trim())
    .filter(x => x.length > 1 && x !== 'the' && x !== 'and');
}

function secCompanyNameMatches(queryNormalized, title) {
  const titleNormalized = normalizeCompanyName(title);
  if (!titleNormalized || titleNormalized.length < 4) return false;
  if (queryNormalized === titleNormalized) return true;

  const queryTokens = companyNameTokens(queryNormalized);
  const titleTokens = companyNameTokens(titleNormalized);
  if (!queryTokens.length || !titleTokens.length) return false;

  const querySet = new Set(queryTokens);
  const titleSet = new Set(titleTokens);
  const usefulQueryTokens = queryTokens.filter(token => !GENERIC_SEC_NAME_TOKENS.has(token));
  const usefulTitleTokens = titleTokens.filter(token => !GENERIC_SEC_NAME_TOKENS.has(token));
  if (!usefulQueryTokens.length || !usefulTitleTokens.length) return false;

  const titleIsContainedInQuery = titleTokens.every(token => querySet.has(token))
    && usefulTitleTokens.every(token => querySet.has(token));
  const queryIsContainedInTitle = queryTokens.every(token => titleSet.has(token))
    && usefulQueryTokens.every(token => titleSet.has(token));
  return titleIsContainedInQuery || queryIsContainedInTitle;
}

function dedupe(rows, keyFn) {
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function buildEvidence(raw) {
  const evidence = [];
  for (const r of raw.openfda.rows) {
    const tags = categoriesFor(r.deviceName, r.advisoryCommittee, r.decision);
    evidence.push({
      companyName: r.applicant,
      productName: r.deviceName,
      region: regionFor(r),
      country: r.country,
      city: r.city,
      sourceType: 'openfda_device_510k',
      sourceQuery: r.sourceQuery,
      sourceUrl: r.sourceUrl,
      evidenceSummary: `FDA 510(k) ${r.kNumber}; ${r.decisionDate}; product code ${r.productCode}`,
      tier: 'A',
      categories: tags,
      confidence: 0.86,
      privacyFlag: 'company_product_public',
      productCode: r.productCode,
      regulatoryId: r.kNumber,
      regulatoryDate: r.decisionDate,
      status: r.decision,
      evidenceStrength: 'strong_official_product',
      discoveryRound: 'round1',
      seeded: false,
    });
  }
  for (const r of raw.nmpa.rows) {
    const cityCn = chinaTargetCity(r.companyName);
    const tags = categoriesFor(r.productName, r.specification, r.companyName);
    evidence.push({
      companyName: r.companyName,
      productName: r.productName,
      region: 'China',
      country: 'CN',
      city: cityCn,
      sourceType: 'nmpa_udi',
      sourceQuery: r.sourceQuery,
      sourceUrl: r.detailUrl || r.sourceUrl,
      evidenceSummary: `NMPA UDI ${r.primaryDeviceId}; ${r.agencyName}; ${r.specification}`,
      tier: 'A',
      categories: tags,
      confidence: 0.84,
      privacyFlag: 'company_product_public',
      regulatoryId: r.primaryDeviceId,
      status: r.deviceEndDateStatus,
      evidenceStrength: 'strong_official_product',
      discoveryRound: 'round1',
      seeded: false,
    });
  }
  for (const d of raw.nmpaDetails.rows) {
    const productDescription = fieldValue(d.fields, '产品描述');
    const registrationNumber = fieldValue(d.fields, '注册证编号/备案凭证编号');
    const creditCode = fieldValue(d.fields, '统一社会信用代码');
    const registrant = fieldValue(d.fields, '医疗器械注册人/备案人名称') || d.companyName;
    if (registrant || d.productName) {
      evidence.push({
        companyName: registrant,
        productName: fieldValue(d.fields, '产品名称/通用名称') || d.productName,
        region: 'China',
        country: 'CN',
        city: chinaTargetCity(registrant),
        sourceType: 'nmpa_udi_detail',
        sourceQuery: d.deviceRecordKey,
        sourceUrl: d.sourceUrl,
        evidenceSummary: [registrationNumber, productDescription].filter(Boolean).join('; '),
        tier: 'A',
        categories: categoriesFor(d.productName, productDescription, registrant),
        confidence: 0.88,
        privacyFlag: 'company_product_public',
        legalEntity: registrant,
        creditCode,
        regulatoryId: registrationNumber,
        evidenceStrength: 'strong_official_product',
        discoveryRound: 'round1',
        seeded: false,
      });
    }
  }
  for (const r of raw.nice.rows) {
    evidence.push({
      companyName: '',
      productName: r.title,
      region: 'Europe',
      country: 'GB',
      city: '',
      sourceType: 'nice_digital_health',
      sourceQuery: r.code,
      sourceUrl: r.sourceUrl,
      evidenceSummary: `${r.metadata}; published ${r.publishedDate}`,
      tier: 'A',
      categories: categoriesFor(r.title, r.metadata),
      confidence: 0.72,
      privacyFlag: 'product_directory_public',
      regulatoryId: r.code,
      regulatoryDate: r.publishedDate,
      status: 'Published',
      evidenceStrength: 'strong_official_product',
      discoveryRound: 'round1',
      seeded: false,
    });
  }
  for (const r of raw.dta.rows) {
    evidence.push({
      companyName: r.name,
      productName: '',
      region: '',
      country: '',
      city: '',
      sourceType: 'dta_members',
      sourceQuery: 'Digital Therapeutics Alliance members',
      sourceUrl: r.memberUrl,
      evidenceSummary: `DTA member slug ${r.memberSlug}`,
      tier: 'B',
      categories: ['digital_therapeutics'],
      confidence: 0.62,
      privacyFlag: 'company_directory_public',
      evidenceStrength: 'medium_news',
      discoveryRound: 'round1',
      seeded: false,
    });
  }
  for (const r of raw.sec.rows) {
    evidence.push({
      companyName: r.title,
      productName: '',
      region: 'US',
      country: 'US',
      city: '',
      sourceType: 'sec_company',
      sourceQuery: r.queryName,
      sourceUrl: r.sourceUrl,
      evidenceSummary: `SEC ticker ${r.ticker}; CIK ${r.cik}`,
      tier: 'B',
      categories: [],
      confidence: 0.64,
      privacyFlag: 'company_registry_public',
      legalEntity: r.title,
      evidenceStrength: 'strong_registry',
      discoveryRound: 'round1',
      seeded: false,
    });
  }
  for (const r of raw.round2?.rows ?? []) {
    evidence.push({
      companyName: r.companyName,
      aliases: r.aliases,
      productName: r.productName,
      region: r.region,
      country: r.country,
      city: r.city,
      sourceType: r.sourceType,
      sourceQuery: r.sourceQuery,
      sourceUrl: r.sourceUrl,
      evidenceSummary: r.evidenceSummary,
      tier: r.tier,
      categories: categoriesFor(r.categoryHint, r.productName, r.evidenceSummary),
      confidence: r.confidence,
      privacyFlag: r.privacyFlag,
      evidenceStrength: r.evidenceStrength,
      discoveryRound: r.discoveryRound,
      seeded: r.seeded,
      website: r.website,
    });
  }
  return evidence.filter(r => r.companyName || r.productName);
}

function fieldValue(fields, name) {
  return fields.find(f => f.field === name)?.value ?? '';
}

function buildTables(evidence) {
  const productsMap = new Map();
  const financing = [];
  const companiesMap = new Map();

  for (const e of evidence) {
    if (e.companyName) {
      const key = normalizeCompanyName(e.companyName) || e.companyName.toLowerCase();
      const current = companiesMap.get(key) ?? {
        companyName: e.companyName,
        aliases: new Set(),
        region: e.region,
        country: e.country,
        city: e.city,
        legalEntity: e.legalEntity ?? '',
        registeredCapital: e.country === 'US' || e.region === 'Europe' ? 'not_applicable_or_not_disclosed' : '',
        businessScope: '',
        categories: new Set(),
        tier: e.tier,
        lifecycleStatus: 'active_or_unverified',
        website: '',
        financingSummary: 'not_checked_or_not_disclosed',
        confidence: 0,
        missingFields: new Set(),
        primaryEvidenceUrl: e.sourceUrl,
        evidenceCount: 0,
        discoveryRounds: new Set(),
        seeded: false,
        strongEvidenceCount: 0,
        mediumEvidenceCount: 0,
        weakEvidenceCount: 0,
      };
      if (current.companyName !== e.companyName) current.aliases.add(e.companyName);
      for (const alias of String(e.aliases ?? '').split(';').map(x => x.trim()).filter(Boolean)) current.aliases.add(alias);
      current.region ||= e.region;
      current.country ||= e.country;
      current.city ||= e.city;
      current.legalEntity ||= e.legalEntity ?? '';
      current.website ||= e.website ?? '';
      current.tier = tierMax(current.tier, e.tier);
      current.primaryEvidenceUrl ||= e.sourceUrl;
      current.evidenceCount += 1;
      current.seeded ||= Boolean(e.seeded);
      current.discoveryRounds.add(e.discoveryRound ?? 'round1');
      const strength = e.evidenceStrength ?? defaultEvidenceStrength(e);
      if (strength.startsWith('strong_')) current.strongEvidenceCount += 1;
      else if (strength.startsWith('medium_')) current.mediumEvidenceCount += 1;
      else current.weakEvidenceCount += 1;
      for (const tag of e.categories ?? []) current.categories.add(tag);
      if (e.evidenceSummary && !current.businessScope && e.sourceType.includes('nmpa_udi_detail')) current.businessScope = e.evidenceSummary.slice(0, 240);
      if (e.evidenceSummary && !current.businessScope && e.discoveryRound === 'round2' && e.evidenceStrength !== 'seed_only') current.businessScope = e.evidenceSummary.slice(0, 240);
      current.confidence = Math.max(current.confidence, e.confidence ?? 0.4);
      companiesMap.set(key, current);
    }
    if (e.productName) {
      addUnique(productsMap, {
        companyName: e.companyName,
        productName: e.productName,
        productType: productTypeFor(e),
        indicationOrUse: e.evidenceSummary,
        sourceType: e.sourceType,
        regulatoryOrDirectoryId: e.regulatoryId ?? '',
        approvalOrListingDate: e.regulatoryDate ?? '',
        status: e.status ?? '',
        sourceUrl: e.sourceUrl,
        categories: (e.categories ?? []).join('; '),
        evidenceStrength: e.evidenceStrength ?? defaultEvidenceStrength(e),
      }, e.companyName, e.productName, e.sourceType, e.regulatoryId);
    }
  }

  const companies = [...companiesMap.values()].map(row => {
    const hasProduct = evidence.some(e => normalizeCompanyName(e.companyName) === normalizeCompanyName(row.companyName) && e.productName);
    const scopeStatus = scopeStatusFor(row);
    if (row.tier === 'C' && row.strongEvidenceCount >= 1) row.tier = 'B';
    if (row.tier === 'C' && row.mediumEvidenceCount >= 2) row.tier = 'B';
    row.confidence = Math.max(row.confidence, confidenceFor(row.tier, row.evidenceCount, hasProduct));
    if (!row.city && row.region === 'China') row.missingFields.add('city');
    if (!row.legalEntity) row.missingFields.add('legalEntity');
    if (!row.businessScope) row.missingFields.add('businessScope');
    if (!row.website) row.missingFields.add('website');
    if (!row.financingSummary || row.financingSummary === 'not_checked_or_not_disclosed') row.missingFields.add('financing');
    if (!row.registeredCapital) row.missingFields.add('registeredCapital');
    return {
      companyName: row.companyName,
      aliases: [...row.aliases].join('; '),
      region: row.region,
      country: row.country,
      city: row.city,
      legalEntity: row.legalEntity,
      registeredCapital: row.registeredCapital || 'not_checked_or_not_disclosed',
      businessScope: row.businessScope,
      categories: [...row.categories].sort().join('; '),
      tier: row.tier,
      lifecycleStatus: row.lifecycleStatus,
      website: row.website,
      financingSummary: row.financingSummary,
      confidence: Number(row.confidence.toFixed(2)),
      scopeStatus,
      discoveryRound: [...row.discoveryRounds].sort().join('+'),
      seeded: row.seeded ? 'yes' : 'no',
      strongEvidenceCount: row.strongEvidenceCount,
      weakEvidenceCount: row.weakEvidenceCount,
      validationStatus: validationStatusFor(row, scopeStatus),
      missingFields: [...row.missingFields].sort().join('; '),
      primaryEvidenceUrl: row.primaryEvidenceUrl,
      evidenceCount: row.evidenceCount,
    };
  }).sort((a, b) => tierSort(a.tier) - tierSort(b.tier) || b.confidence - a.confidence || a.companyName.localeCompare(b.companyName));

  const sourceEvidence = evidence.map(e => ({
    companyName: e.companyName,
    productName: e.productName,
    region: e.region,
    country: e.country,
    city: e.city,
    tier: e.tier,
    categories: (e.categories ?? []).join('; '),
    sourceType: e.sourceType,
    sourceQuery: e.sourceQuery,
    sourceUrl: e.sourceUrl,
    capturedAt: TODAY,
    evidenceSummary: e.evidenceSummary,
    confidence: e.confidence,
    privacyFlag: e.privacyFlag,
    evidenceStrength: e.evidenceStrength ?? defaultEvidenceStrength(e),
    discoveryRound: e.discoveryRound ?? 'round1',
    seeded: e.seeded ? 'yes' : 'no',
  }));

  return {
    companies,
    companiesInScope: companies.filter(row => row.scopeStatus === 'in_scope' || row.scopeStatus === 'needs_city_verification'),
    products: [...productsMap.values()].sort((a, b) => (a.companyName || '').localeCompare(b.companyName || '') || a.productName.localeCompare(b.productName)),
    financing,
    sourceEvidence,
  };
}

function scopeStatusFor(row) {
  if (row.region === 'US' || row.region === 'Europe') return 'in_scope';
  if (row.region === 'China') {
    if (CHINA_TARGET_CITIES.includes(row.city)) return 'in_scope';
    return row.city ? 'out_of_scope_china_city' : 'needs_city_verification';
  }
  return row.region ? 'out_of_scope_region' : 'needs_region_verification';
}

function productTypeFor(e) {
  const tags = new Set(e.categories ?? []);
  if (tags.has('digital_therapeutics')) return 'digital_therapeutics_or_dtx';
  if (tags.has('samd')) return 'samd_or_medical_software';
  if (tags.has('remote_patient_monitoring')) return 'remote_patient_monitoring';
  if (e.sourceType === 'nice_digital_health') return 'digital_health_directory_item';
  return 'digital_health_or_medical_device_software';
}

function defaultEvidenceStrength(e) {
  if (e.sourceType === 'sec_company') return 'strong_registry';
  if (String(e.sourceType ?? '').includes('openfda') || String(e.sourceType ?? '').includes('nmpa') || String(e.sourceType ?? '').includes('nice')) return 'strong_official_product';
  if (String(e.sourceType ?? '').includes('dta')) return 'medium_news';
  return 'seed_only';
}

function validationStatusFor(row, scopeStatus) {
  if (scopeStatus === 'needs_city_verification') return 'needs_city_verification';
  if (scopeStatus === 'needs_region_verification') return 'needs_region_verification';
  if (scopeStatus.startsWith('out_of_scope')) return scopeStatus;
  if (row.tier === 'A') return 'validated_official_product';
  if (row.strongEvidenceCount >= 1) return 'validated_strong';
  if (row.mediumEvidenceCount >= 2) return 'validated_multi_source';
  return 'needs_more_evidence';
}

function buildRound2ValidationQueue(companies, candidates) {
  const companyIndex = new Map();
  for (const row of companies) {
    const keys = [
      row.companyName,
      ...String(row.aliases ?? '').split(';').map(x => x.trim()).filter(Boolean),
    ].map(normalizeCompanyName).filter(Boolean);
    for (const key of keys) {
      if (!companyIndex.has(key)) companyIndex.set(key, row);
    }
  }

  return candidates.map(candidate => {
    const keys = [
      candidate.companyName,
      ...String(candidate.aliases ?? '').split(';').map(x => x.trim()).filter(Boolean),
    ].map(normalizeCompanyName).filter(Boolean);
    const row = keys.map(key => companyIndex.get(key)).find(Boolean);
    const reasons = [];
    if (!row) {
      reasons.push('missing_from_master');
    } else {
      if (!String(row.validationStatus ?? '').startsWith('validated')) reasons.push(row.validationStatus || 'needs_validation');
      if (Number(row.strongEvidenceCount ?? 0) === 0 && row.validationStatus !== 'validated_official_product') reasons.push('no_strong_evidence');
      if (String(row.scopeStatus ?? '').startsWith('needs_') || String(row.scopeStatus ?? '').startsWith('out_of_scope')) reasons.push(row.scopeStatus);
      const missing = new Set(String(row.missingFields ?? '').split(';').map(x => x.trim()).filter(Boolean));
      for (const field of ['legalEntity', 'registeredCapital', 'businessScope', 'website', 'financing']) {
        if (missing.has(field)) reasons.push(`missing_${field}`);
      }
    }
    if (candidate.fetchErrorCount > 0) reasons.push('evidence_fetch_errors');
    if (candidate.searchStatus && candidate.searchStatus !== 'executed') reasons.push(candidate.searchStatus);

    return {
      companyName: candidate.companyName,
      aliases: candidate.aliases,
      region: candidate.region,
      country: candidate.country,
      city: candidate.city,
      categoryHint: candidate.categoryHint,
      priority: candidate.priority,
      candidateStatus: candidate.candidateStatus,
      masterStatus: row ? 'present' : 'missing',
      tier: row?.tier ?? '',
      scopeStatus: row?.scopeStatus ?? '',
      validationStatus: row?.validationStatus ?? 'missing_from_master',
      strongEvidenceCount: row?.strongEvidenceCount ?? 0,
      weakEvidenceCount: row?.weakEvidenceCount ?? 0,
      fetchedEvidenceCount: candidate.fetchedEvidenceCount,
      fetchErrorCount: candidate.fetchErrorCount,
      reasons: [...new Set(reasons)].join('; '),
      primaryEvidenceUrl: row?.primaryEvidenceUrl ?? candidate.seedSourceUrl,
    };
  }).sort((a, b) => Number(a.priority) - Number(b.priority) || a.companyName.localeCompare(b.companyName));
}

function tierSort(tier) {
  return tier === 'A' ? 0 : tier === 'B' ? 1 : 2;
}

function tierMax(a, b) {
  return tierSort(a) <= tierSort(b) ? a : b;
}

function sourceStatus(raw) {
  const envMap = Object.fromEntries(REQUIRED_KEYS.map(([name, label]) => [name, {
    label,
    available: Boolean(process.env[name]),
  }]));
  const browserStatus = {
    available: false,
    note: 'OpenCLI Browser Bridge was not used by this public-source runner. Use browser fallback adapters only after the extension is connected.',
  };
  return {
    capturedAt: new Date().toISOString(),
    publicSources: {
      openfda: { rows: raw.openfda.rows.length, errors: raw.openfda.errors.length },
      nmpaUdi: { rows: raw.nmpa.rows.length, detailRows: raw.nmpaDetails.rows.length, errors: raw.nmpa.errors.length + raw.nmpaDetails.errors.length },
      nice: { rows: raw.nice.rows.length, errors: raw.nice.errors.length },
      dta: { rows: raw.dta.rows.length, errors: raw.dta.errors.length },
      sec: { rows: raw.sec.rows.length, errors: raw.sec.errors.length },
      round2: { rows: raw.round2?.rows?.length ?? 0, candidates: raw.round2?.candidates?.length ?? 0, errors: raw.round2?.errors?.length ?? 0 },
    },
    credentials: envMap,
    browser: browserStatus,
    round2SearchMatrix: raw.round2?.searchMatrixStatus ?? null,
    errors: [...raw.openfda.errors, ...raw.nmpa.errors, ...raw.nmpaDetails.errors, ...raw.nice.errors, ...raw.dta.errors, ...raw.sec.errors, ...(raw.round2?.errors ?? [])],
  };
}

async function writeSummary(tables, status, round2Candidates = [], validationQueue = []) {
  const byRegion = countBy(tables.companies, x => x.region || 'unknown');
  const byTier = countBy(tables.companies, x => x.tier || 'unknown');
  const byScope = countBy(tables.companies, x => x.scopeStatus || 'unknown');
  const bySource = countBy(tables.sourceEvidence, x => x.sourceType || 'unknown');
  const byStrength = countBy(tables.sourceEvidence, x => x.evidenceStrength || 'unknown');
  const gated = Object.entries(status.credentials).filter(([, v]) => !v.available).map(([k, v]) => `${k} (${v.label})`);
  const newCandidates = round2Candidates.filter(x => x.candidateStatus === 'new_candidate').length;
  const alreadyPresentCandidates = round2Candidates.filter(x => x.candidateStatus === 'already_present').length;
  const lines = [
    '# Stage 2 Digital Health Research Summary',
    '',
    `Captured at: ${status.capturedAt}`,
    '',
    '## Counts',
    '',
    `- companies_master: ${tables.companies.length}`,
    `- companies_master_in_scope: ${tables.companiesInScope.length}`,
    `- products: ${tables.products.length}`,
    `- financing_events: ${tables.financing.length}`,
    `- source_evidence: ${tables.sourceEvidence.length}`,
    `- round2_candidates: ${round2Candidates.length} (${newCandidates} new; ${alreadyPresentCandidates} already present)`,
    `- round2_validation_queue: ${validationQueue.length}`,
    '',
    '## Companies By Region',
    '',
    ...Object.entries(byRegion).sort().map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Companies By Tier',
    '',
    ...Object.entries(byTier).sort().map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Companies By Scope Status',
    '',
    ...Object.entries(byScope).sort().map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Evidence By Source',
    '',
    ...Object.entries(bySource).sort().map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Evidence By Strength',
    '',
    ...Object.entries(byStrength).sort().map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Gaps',
    '',
    `- Missing credential-gated sources: ${gated.length ? gated.join('; ') : 'none'}`,
    `- Browser fallback status: ${status.browser.available ? 'available' : 'not available / not used'}`,
    `- Round 2 search matrix status: ${status.round2SearchMatrix?.status ?? 'not_available'}`,
    '- Social sources were not harvested by this runner to avoid retaining personal health narratives; use them only for company/product alias leads.',
    '- NICE rows often describe technology groups before naming vendors; they are retained in products/evidence and require detail-page vendor extraction for full company attribution.',
    '',
    '## Output Files',
    '',
    '- companies_master.csv/json',
    '- companies_master_in_scope.csv/json',
    '- products.csv/json',
    '- financing_events.csv/json',
    '- source_evidence.csv/json',
    '- seeds/round2_seed_companies.csv',
    '- round2_candidates.csv/json',
    '- round2_validation_queue.csv/json',
    '- round2_search_queries.csv',
    '- raw/round2_search_matrix_status.json',
    '- raw/source_status.json',
  ];
  await fs.writeFile(path.join(OUT_DIR, 'research_summary.md'), `${lines.join('\n')}\n`, 'utf8');
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

async function main() {
  await ensureDirs();
  const raw = {};
  if (REUSE_RAW) {
    console.log('Reusing raw source files...');
    raw.openfda = await readJson('raw/openfda_device_510k.json');
    raw.nmpa = await readJson('raw/nmpa_udi_search.json');
    raw.nmpaDetails = await readJson('raw/nmpa_udi_detail.json');
    raw.nice = await readJson('raw/nice_digital_health_list.json');
    raw.dta = await readJson('raw/dta_members.json');
  } else {
    console.log('Collecting openFDA 510(k)...');
    raw.openfda = await collectOpenFda();
    await writeJson('raw/openfda_device_510k.json', raw.openfda);

    console.log('Collecting NMPA UDI...');
    raw.nmpa = await collectNmpaUdi();
    await writeJson('raw/nmpa_udi_search.json', raw.nmpa);

    console.log('Collecting NMPA UDI details...');
    raw.nmpaDetails = await collectNmpaDetails(raw.nmpa.rows);
    await writeJson('raw/nmpa_udi_detail.json', raw.nmpaDetails);

    console.log('Collecting NICE digital health list...');
    raw.nice = await collectNice();
    await writeJson('raw/nice_digital_health_list.json', raw.nice);

    console.log('Collecting DTA members...');
    raw.dta = await collectDta();
    await writeJson('raw/dta_members.json', raw.dta);
  }

  const firstRoundSeedNames = [...new Set([
    ...raw.openfda.rows.map(r => r.applicant),
    ...raw.nmpa.rows.map(r => r.companyName),
    ...raw.dta.rows.map(r => r.name),
  ].filter(Boolean))];
  const secSeedNames = [...new Set([
    ...firstRoundSeedNames,
    ...ROUND2_SEEDS.flatMap(seed => [
      seed.companyName,
      ...String(seed.aliases ?? '').split(';').map(x => x.trim()).filter(Boolean),
    ]),
  ].filter(Boolean))];
  console.log('Matching SEC public company ticker index...');
  raw.sec = await collectSecMatches(secSeedNames);
  await writeJson('raw/sec_company_matches.json', raw.sec);

  const firstRoundNameSet = new Set(firstRoundSeedNames);
  const firstRoundRaw = {
    ...raw,
    sec: {
      rows: raw.sec.rows.filter(row => firstRoundNameSet.has(row.queryName)),
      errors: raw.sec.errors,
    },
    round2: { rows: [], candidates: [], errors: [], searchMatrixStatus: null },
  };
  const firstRoundTables = buildTables(buildEvidence(firstRoundRaw));

  console.log('Collecting Stage 2 Round 2 seed evidence...');
  raw.round2 = await collectRound2(firstRoundTables.companies);
  await writeJson('raw/round2_seed_evidence.json', raw.round2);

  const evidence = buildEvidence(raw);
  const tables = buildTables(evidence);
  const round2Candidates = raw.round2?.candidates ?? [];
  const round2ValidationQueue = buildRound2ValidationQueue(tables.companies, round2Candidates);
  const status = sourceStatus(raw);
  await writeJson('raw/source_status.json', status);
  await writeJson('companies_master.json', tables.companies);
  await writeJson('companies_master_in_scope.json', tables.companiesInScope);
  await writeJson('products.json', tables.products);
  await writeJson('financing_events.json', tables.financing);
  await writeJson('source_evidence.json', tables.sourceEvidence);
  await writeJson('round2_candidates.json', round2Candidates);
  await writeJson('round2_validation_queue.json', round2ValidationQueue);

  await writeCsv('companies_master.csv', tables.companies, [
    'companyName', 'aliases', 'region', 'country', 'city', 'legalEntity',
    'registeredCapital', 'businessScope', 'categories', 'tier', 'lifecycleStatus',
    'website', 'financingSummary', 'confidence', 'scopeStatus', 'discoveryRound',
    'seeded', 'strongEvidenceCount', 'weakEvidenceCount', 'validationStatus',
    'missingFields', 'primaryEvidenceUrl', 'evidenceCount',
  ]);
  await writeCsv('companies_master_in_scope.csv', tables.companiesInScope, [
    'companyName', 'aliases', 'region', 'country', 'city', 'legalEntity',
    'registeredCapital', 'businessScope', 'categories', 'tier', 'lifecycleStatus',
    'website', 'financingSummary', 'confidence', 'scopeStatus', 'discoveryRound',
    'seeded', 'strongEvidenceCount', 'weakEvidenceCount', 'validationStatus',
    'missingFields', 'primaryEvidenceUrl', 'evidenceCount',
  ]);
  await writeCsv('products.csv', tables.products, [
    'companyName', 'productName', 'productType', 'indicationOrUse', 'sourceType',
    'regulatoryOrDirectoryId', 'approvalOrListingDate', 'status', 'sourceUrl',
    'categories', 'evidenceStrength',
  ]);
  await writeCsv('financing_events.csv', tables.financing, [
    'companyName', 'date', 'round', 'amount', 'currency', 'investors', 'sourceType', 'sourceUrl',
  ]);
  await writeCsv('source_evidence.csv', tables.sourceEvidence, [
    'companyName', 'productName', 'region', 'country', 'city', 'tier', 'categories',
    'sourceType', 'sourceQuery', 'sourceUrl', 'capturedAt', 'evidenceSummary',
    'confidence', 'privacyFlag', 'evidenceStrength', 'discoveryRound', 'seeded',
  ]);
  await writeCsv('round2_candidates.csv', round2Candidates, [
    'companyName', 'aliases', 'region', 'country', 'city', 'categoryHint',
    'seedReason', 'seedSourceUrl', 'priority', 'candidateStatus',
    'fetchedEvidenceCount', 'fetchErrorCount', 'searchStatus',
  ]);
  await writeCsv('round2_validation_queue.csv', round2ValidationQueue, [
    'companyName', 'aliases', 'region', 'country', 'city', 'categoryHint',
    'priority', 'candidateStatus', 'masterStatus', 'tier', 'scopeStatus',
    'validationStatus', 'strongEvidenceCount', 'weakEvidenceCount',
    'fetchedEvidenceCount', 'fetchErrorCount', 'reasons', 'primaryEvidenceUrl',
  ]);
  await writeSummary(tables, status, round2Candidates, round2ValidationQueue);
  console.log(`Done. Results: ${OUT_DIR}`);
  console.log(`companies=${tables.companies.length} products=${tables.products.length} evidence=${tables.sourceEvidence.length}`);
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
