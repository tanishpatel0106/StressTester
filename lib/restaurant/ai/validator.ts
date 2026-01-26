import Ajv from "ajv"
import addFormats from "ajv-formats"
import assumptionSchema from "@/schemas/assumption.schema.json"
import scenarioSchema from "@/schemas/scenario.schema.json"
import mitigationSchema from "@/schemas/mitigation.schema.json"
import assumptionsResponseSchema from "@/schemas/ai_assumptions_response.schema.json"
import scenariosResponseSchema from "@/schemas/ai_scenarios_response.schema.json"
import mitigationsResponseSchema from "@/schemas/ai_mitigations_response.schema.json"
import evidenceSchema from "@/schemas/evidence.schema.json"
import contextPackSchema from "@/schemas/context_pack.schema.json"
import driverSchema from "@/schemas/driver.schema.json"
import kpiSchema from "@/schemas/kpi.schema.json"

const ajv = new Ajv({ allErrors: true, strict: true })
addFormats(ajv)

ajv.addSchema(kpiSchema, "kpi.schema.json")
ajv.addSchema(driverSchema, "driver.schema.json")
ajv.addSchema(evidenceSchema, "evidence.schema.json")
ajv.addSchema(contextPackSchema, "context_pack.schema.json")
ajv.addSchema(assumptionSchema, "assumption.schema.json")
ajv.addSchema(scenarioSchema, "scenario.schema.json")
ajv.addSchema(mitigationSchema, "mitigation.schema.json")
ajv.addSchema(assumptionsResponseSchema, "ai_assumptions_response.schema.json")
ajv.addSchema(scenariosResponseSchema, "ai_scenarios_response.schema.json")
ajv.addSchema(mitigationsResponseSchema, "ai_mitigations_response.schema.json")

export const validators = {
  assumption: ajv.getSchema("assumption.schema.json"),
  scenario: ajv.getSchema("scenario.schema.json"),
  mitigation: ajv.getSchema("mitigation.schema.json"),
  assumptionsResponse: ajv.getSchema("ai_assumptions_response.schema.json"),
  scenariosResponse: ajv.getSchema("ai_scenarios_response.schema.json"),
  mitigationsResponse: ajv.getSchema("ai_mitigations_response.schema.json"),
  contextPack: ajv.getSchema("context_pack.schema.json"),
}

export function assertValid<T>(
  validator: typeof validators[keyof typeof validators],
  payload: T,
  label: string
): T {
  if (!validator) {
    throw new Error(`Missing schema validator for ${label}`)
  }
  const valid = validator(payload)
  if (!valid) {
    throw new Error(`Schema validation failed for ${label}: ${ajv.errorsText(validator.errors)}`)
  }
  return payload
}
