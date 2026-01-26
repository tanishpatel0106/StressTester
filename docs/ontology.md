# Restaurant Stress-Testing Copilot — Internal Ontology (Formal)

## 1. KPI Spine (Fixed, Non-Negotiable)
Top-level KPIs **must** be the following and **no additional top-level KPIs may be created**:

- TOTAL_REVENUE
- COST_OF_GOODS_SOLD
- GROSS_PROFIT
- WAGE_COSTS
- OPERATING_EXPENSES
- NON_OPERATING_EXPENSES
- NET_PROFIT

**Definitions**
- GROSS_PROFIT = TOTAL_REVENUE - COST_OF_GOODS_SOLD
- NET_PROFIT = GROSS_PROFIT - WAGE_COSTS - OPERATING_EXPENSES - NON_OPERATING_EXPENSES

## 2. Derived KPIs (Computed Only)
Derived KPIs are computed deterministically from the KPI spine. They are optional if inputs are missing.

- gross_margin_pct = GROSS_PROFIT / TOTAL_REVENUE
- cogs_pct = COST_OF_GOODS_SOLD / TOTAL_REVENUE
- wage_pct = WAGE_COSTS / TOTAL_REVENUE
- prime_cost = COST_OF_GOODS_SOLD + WAGE_COSTS
- prime_cost_pct = prime_cost / TOTAL_REVENUE
- net_margin = NET_PROFIT / TOTAL_REVENUE
- breakeven_revenue = (WAGE_COSTS + OPERATING_EXPENSES + NON_OPERATING_EXPENSES) / gross_margin_pct

## 3. Driver Ontology (Allowed Drivers Only)
**Revenue Drivers**
- COVERS
- AVERAGE_CHECK
- DISCOUNT_RATE
- CHANNEL_MIX

**COGS Drivers**
- FOOD_COST_PROTEIN
- FOOD_COST_PRODUCE
- WASTE_PCT
- MENU_MIX

**Labor Drivers**
- LABOR_HOURS
- WAGE_RATE
- OVERTIME_PCT

**OPEX Drivers**
- RENT
- UTILITIES
- MARKETING
- DELIVERY_COMMISSION

**Non-Operating Drivers**
- INTEREST_EXPENSE
- ONE_TIME_COSTS

## 4. Driver → KPI Mapping
- TOTAL_REVENUE is computed from COVERS, AVERAGE_CHECK, DISCOUNT_RATE.
- COST_OF_GOODS_SOLD is computed from FOOD_COST_PROTEIN, FOOD_COST_PRODUCE, WASTE_PCT, MENU_MIX, and COVERS.
- WAGE_COSTS is computed from LABOR_HOURS, WAGE_RATE, OVERTIME_PCT.
- OPERATING_EXPENSES is computed from RENT, UTILITIES, MARKETING, and DELIVERY_COMMISSION (scaled by CHANNEL_MIX and TOTAL_REVENUE).
- NON_OPERATING_EXPENSES is computed from INTEREST_EXPENSE and ONE_TIME_COSTS.
- GROSS_PROFIT and NET_PROFIT are computed strictly from the KPI spine definitions.

## 5. Allowed Dependency Directions
- Drivers → KPI Spine → Derived KPIs.
- Scenarios and mitigations may only modify **drivers**, never the KPI spine directly.
- ContextPack may summarize KPI spine and derived KPIs but may not modify them.

## 6. AI Capabilities and Restrictions
**AI Allowed:**
- Generate structured JSON objects that conform to the provided schemas.
- Reference evidence IDs from the ContextPack when making assumptions, scenarios, and mitigations.
- Mark outputs as low confidence if evidence is insufficient.

**AI Forbidden:**
- Computing revenue, profit, margin, or any numeric KPI.
- Inventing KPIs outside of the fixed KPI spine.
- Writing unstructured text responses in place of JSON objects.
- Producing outputs without evidence references unless explicitly marked low confidence.

## 7. Deterministic Engine Ownership
All financial calculations, KPI rollups, and scenario/mitigation application are deterministic and owned by the computation engine. AI outputs are treated as inputs only when they comply with schema and evidence constraints.
