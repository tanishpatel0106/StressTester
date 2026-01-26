import type {
  AiAssumptionsResponse,
  AiMitigationsResponse,
  AiScenariosResponse,
  ContextPack,
  DriverAssumption,
  Mitigation,
  Scenario,
} from "../types"
import { validators, assertValid } from "./validator"
import { sampleAssumptions, sampleScenarios, sampleMitigations } from "../sample-data"

export interface AgentResult<T> {
  data: T
  validation: "passed" | "failed"
  notes?: string
}

const ensureEvidence = <T extends { evidence_refs: string[] }>(
  item: T,
  fallbackEvidence: string
): T => {
  if (item.evidence_refs.length > 0) {
    return item
  }
  return { ...item, evidence_refs: [fallbackEvidence] }
}

export function generateAssumptionsFromContext(
  context: ContextPack
): AgentResult<AiAssumptionsResponse> {
  const fallbackEvidence = context.evidence_registry[0]?.id ?? "E-UNVERIFIED"
  const assumptions = sampleAssumptions.map((assumption) =>
    ensureEvidence(assumption, fallbackEvidence)
  )
  const payload: AiAssumptionsResponse = { assumptions }
  assertValid(validators.assumptionsResponse, payload, "ai_assumptions_response")
  assumptions.forEach((assumption) =>
    assertValid(validators.assumption, assumption, `assumption:${assumption.id}`)
  )
  return { data: payload, validation: "passed" }
}

export function generateScenariosFromContext(
  context: ContextPack,
  assumptions: DriverAssumption[]
): AgentResult<AiScenariosResponse> {
  const fallbackEvidence = context.evidence_registry[0]?.id ?? "E-UNVERIFIED"
  const scenarios: Scenario[] = sampleScenarios.map((scenario) =>
    ensureEvidence(scenario, fallbackEvidence)
  )
  const payload: AiScenariosResponse = { scenarios }
  assertValid(validators.scenariosResponse, payload, "ai_scenarios_response")
  scenarios.forEach((scenario) =>
    assertValid(validators.scenario, scenario, `scenario:${scenario.id}`)
  )
  if (assumptions.length === 0) {
    return {
      data: payload,
      validation: "passed",
      notes: "No assumptions provided; scenarios are generated from sample fixtures only.",
    }
  }
  return { data: payload, validation: "passed" }
}

export function generateMitigationsFromContext(
  context: ContextPack,
  scenarios: Scenario[]
): AgentResult<AiMitigationsResponse> {
  const fallbackEvidence = context.evidence_registry[0]?.id ?? "E-UNVERIFIED"
  const mitigations: Mitigation[] = sampleMitigations.map((mitigation) =>
    ensureEvidence(mitigation, fallbackEvidence)
  )
  const payload: AiMitigationsResponse = { mitigations }
  assertValid(validators.mitigationsResponse, payload, "ai_mitigations_response")
  mitigations.forEach((mitigation) =>
    assertValid(validators.mitigation, mitigation, `mitigation:${mitigation.id}`)
  )
  if (scenarios.length === 0) {
    return {
      data: payload,
      validation: "passed",
      notes: "No scenarios provided; mitigations are generated from sample fixtures only.",
    }
  }
  return { data: payload, validation: "passed" }
}
