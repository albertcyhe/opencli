import { describe, expect, it } from 'vitest';
import {
    classifyJobPosting,
    matchesCompanyName,
    scoreCompany,
    scoreProduct,
} from './ai-targeting-utils.js';

function company(overrides) {
    return {
        companyName: 'Example Health',
        aliases: '',
        region: 'US',
        country: 'US',
        city: 'Remote',
        categories: '',
        tier: 'B',
        website: 'https://example.health',
        primaryEvidenceUrl: 'https://example.health',
        evidenceCount: 3,
        strongEvidenceCount: 1,
        weakEvidenceCount: 0,
        validationStatus: 'validated_strong',
        missingFields: '',
        ...overrides,
    };
}

const strongCompanySite = {
    companyName: 'Example Health',
    sourceType: 'round2_company_site',
    evidenceStrength: 'strong_company_site',
    evidenceSummary: 'virtual care platform for providers and patients',
};

describe('mobile-health AI targeting scoring', () => {
    it.each([
        ['remote rehab', 'remote_patient_monitoring; rehabilitation; patient_engagement', 'virtual cardiac rehabilitation platform', 70],
        ['chronic care', 'chronic_disease_management; remote_patient_monitoring', 'personalized diabetes monitoring app', 60],
        ['internet healthcare', 'internet_healthcare; online_consultation; health_management_platform', 'online consultation and doctor workflow platform', 45],
        ['pharmacy ecommerce', 'pharmacy_ecommerce; internet_healthcare', 'digital pharmacy and medication service platform', 50],
        ['digital therapeutics', 'digital_therapeutics; mental_health; sleep_health', 'prescription digital therapeutic software', 55],
        ['pure device software', 'samd', 'medical device software product', 40],
        ['clinical workflow', 'clinical_workflow; patient_engagement', 'clinical documentation and patient workflow data platform', 55],
        ['mental health app', 'mental_health; patient_engagement', 'digital mental health coaching app', 55],
    ])('scores %s with stable category-driven ranges', (_name, categories, scope, minScore) => {
        const row = company({ categories, businessScope: scope });
        const score = scoreCompany(row, [
            { productName: 'Example Product', productType: 'digital_health_or_medical_device_software', indicationOrUse: scope, categories },
        ], [strongCompanySite]);
        expect(score.opportunityScore).toBeGreaterThanOrEqual(minScore);
        expect(score.opportunityScore).toBeLessThanOrEqual(100);
        expect(score.aiUseCases.length).toBeGreaterThan(0);
    });

    it('scores products with AI priority, complexity, and compliance risk', () => {
        const row = company({ categories: 'digital_therapeutics; clinical_workflow; chronic_disease_management' });
        const product = {
            productName: 'Clinical AI-ready DTx',
            productType: 'digital_therapeutics_or_dtx',
            indicationOrUse: 'software for chronic disease treatment and clinical workflow',
            categories: row.categories,
            evidenceStrength: 'strong_official_product',
            sourceType: 'openfda_device_510k',
        };
        const score = scoreProduct(product, row, [strongCompanySite]);
        expect(score.productAiFitScore).toBeGreaterThanOrEqual(18);
        expect(score.complianceRiskScore).toBeGreaterThanOrEqual(5);
        expect(score.priorityScore).toBeGreaterThan(20);
    });
});

describe('mobile-health AI job matching', () => {
    const row = company({
        companyName: 'RecoveryPlus.health',
        aliases: 'Recovery Plus USA Inc; Recovery Plus',
    });

    it('matches aliases without merging unrelated partners', () => {
        expect(matchesCompanyName(row, 'Recovery Plus USA Inc is hiring')).toBe(true);
        expect(matchesCompanyName(row, 'RecoveryPlus.health')).toBe(true);
        expect(matchesCompanyName(row, 'CF PharmTech is hiring')).toBe(false);
    });

    it('marks official active AI jobs as verified', () => {
        const cls = classifyJobPosting({
            title: 'Senior Machine Learning Engineer, Care Automation',
            company: 'RecoveryPlus.health',
            location: 'Remote - United States',
            description: 'Build LLM agents and ML models for virtual cardiac rehab.',
            sourceType: 'official_greenhouse',
            url: 'https://job-boards.greenhouse.io/recoveryplus/jobs/1',
        }, row);
        expect(cls.activeStatus).toBe('verified_active');
        expect(cls.seniorityFit).toBe('senior_preferred');
        expect(cls.hiringFitScore).toBeGreaterThan(85);
    });

    it('marks third-party AI jobs as probable until a second source confirms them', () => {
        const cls = classifyJobPosting({
            title: 'AI Product Manager',
            company: 'RecoveryPlus.health',
            location: 'New York',
            description: 'Own AI product workflows.',
            sourceType: 'linkedin_jobs',
        }, row);
        expect(cls.activeStatus).toBe('probable_active');
    });

    it('excludes generic software jobs without AI signal', () => {
        const cls = classifyJobPosting({
            title: 'Senior Backend Engineer',
            company: 'RecoveryPlus.health',
            location: 'Remote',
            description: 'Build APIs and services.',
            sourceType: 'official_greenhouse',
        }, row);
        expect(cls.activeStatus).toBe('excluded_not_ai_role');
    });

    it('marks closed postings as expired', () => {
        const cls = classifyJobPosting({
            title: 'Senior AI Engineer',
            company: 'RecoveryPlus.health',
            location: 'Remote',
            description: 'This position has been filled.',
            sourceType: 'official_greenhouse',
        }, row);
        expect(cls.activeStatus).toBe('expired_or_closed');
    });
});
