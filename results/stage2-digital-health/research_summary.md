# Stage 2 Digital Health Research Summary

Captured at: 2026-05-14T14:16:02.545Z

## Counts

- companies_master: 759
- companies_master_in_scope: 618
- products: 1411
- financing_events: 0
- source_evidence: 1649
- round2_candidates: 53 (47 new; 6 already present)
- round2_validation_queue: 53

## Companies By Region

- China: 130
- Europe: 56
- US: 450
- unknown: 123

## Companies By Tier

- A: 624
- B: 131
- C: 4

## Companies By Scope Status

- in_scope: 564
- needs_city_verification: 54
- needs_region_verification: 123
- out_of_scope_china_city: 18

## Evidence By Source

- dta_members: 65
- nice_digital_health: 75
- nmpa_udi: 496
- nmpa_udi_detail: 180
- openfda_device_510k: 656
- round2_company_site: 55
- round2_news: 2
- round2_seed: 53
- sec_company: 67

## Evidence By Strength

- medium_news: 67
- seed_only: 53
- strong_company_site: 55
- strong_official_product: 1407
- strong_registry: 67

## Gaps

- Missing credential-gated sources: BFARM_DIGA_TOKEN (BfArM FHIR API); OPENCORPORATES_API_TOKEN (OpenCorporates API); COMPANIES_HOUSE_API_KEY (Companies House API); QCC_API_KEY (Qichacha API key); QCC_SECRET_KEY (Qichacha API secret); CRUNCHBASE_API_KEY (Crunchbase API); ITJUZI_API_BASE (IT桔子 licensed API base); ITJUZI_API_KEY (IT桔子 licensed API key)
- Browser fallback status: not available / not used
- Round 2 search matrix status: not_executed
- Social sources were not harvested by this runner to avoid retaining personal health narratives; use them only for company/product alias leads.
- NICE rows often describe technology groups before naming vendors; they are retained in products/evidence and require detail-page vendor extraction for full company attribution.

## Output Files

- companies_master.csv/json
- companies_master_in_scope.csv/json
- products.csv/json
- financing_events.csv/json
- source_evidence.csv/json
- seeds/round2_seed_companies.csv
- round2_candidates.csv/json
- round2_validation_queue.csv/json
- round2_search_queries.csv
- raw/round2_search_matrix_status.json
- raw/source_status.json
