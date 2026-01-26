// Restaurant Stress-Testing Copilot - Storage Module
// Simple in-memory store with versioning (can be replaced with SQLite/Prisma)

import type {
  ContextPack,
  AssumptionSet,
  ScenarioSet,
  MitigationSet,
  ComputationRun,
  RestaurantState,
} from "./types"

// =============================================================================
// IN-MEMORY STORE
// =============================================================================

interface Store {
  contextPacks: Map<string, ContextPack>
  assumptionSets: Map<string, AssumptionSet[]> // context_pack_id -> versions
  scenarioSets: Map<string, ScenarioSet[]> // context_pack_id -> versions
  mitigationSets: Map<string, MitigationSet[]> // context_pack_id -> versions
  computationRuns: Map<string, ComputationRun[]> // context_pack_id -> runs
}

const store: Store = {
  contextPacks: new Map(),
  assumptionSets: new Map(),
  scenarioSets: new Map(),
  mitigationSets: new Map(),
  computationRuns: new Map(),
}

// =============================================================================
// CONTEXT PACK OPERATIONS
// =============================================================================

export function saveContextPack(pack: ContextPack): void {
  store.contextPacks.set(pack.id, pack)
}

export function getContextPack(id: string): ContextPack | null {
  return store.contextPacks.get(id) || null
}

export function listContextPacks(): ContextPack[] {
  return Array.from(store.contextPacks.values())
}

export function deleteContextPack(id: string): boolean {
  // Clean up related data
  store.assumptionSets.delete(id)
  store.scenarioSets.delete(id)
  store.mitigationSets.delete(id)
  store.computationRuns.delete(id)
  return store.contextPacks.delete(id)
}

// =============================================================================
// ASSUMPTION SET OPERATIONS
// =============================================================================

export function saveAssumptionSet(set: AssumptionSet): void {
  const versions = store.assumptionSets.get(set.context_pack_id) || []
  
  // Check if this is an update to an existing version
  const existingIdx = versions.findIndex(v => v.version === set.version)
  if (existingIdx >= 0) {
    versions[existingIdx] = set
  } else {
    versions.push(set)
  }
  
  store.assumptionSets.set(set.context_pack_id, versions)
}

export function getLatestAssumptionSet(contextPackId: string): AssumptionSet | null {
  const versions = store.assumptionSets.get(contextPackId)
  if (!versions || versions.length === 0) return null
  return versions.reduce((latest, current) => 
    current.version > latest.version ? current : latest
  )
}

export function getApprovedAssumptionSet(contextPackId: string): AssumptionSet | null {
  const versions = store.assumptionSets.get(contextPackId)
  if (!versions) return null
  const approved = versions.filter(v => v.status === 'approved')
  if (approved.length === 0) return null
  return approved.reduce((latest, current) => 
    current.version > latest.version ? current : latest
  )
}

export function listAssumptionSets(contextPackId: string): AssumptionSet[] {
  return store.assumptionSets.get(contextPackId) || []
}

// =============================================================================
// SCENARIO SET OPERATIONS
// =============================================================================

export function saveScenarioSet(set: ScenarioSet): void {
  const versions = store.scenarioSets.get(set.context_pack_id) || []
  
  const existingIdx = versions.findIndex(v => v.version === set.version)
  if (existingIdx >= 0) {
    versions[existingIdx] = set
  } else {
    versions.push(set)
  }
  
  store.scenarioSets.set(set.context_pack_id, versions)
}

export function getLatestScenarioSet(contextPackId: string): ScenarioSet | null {
  const versions = store.scenarioSets.get(contextPackId)
  if (!versions || versions.length === 0) return null
  return versions.reduce((latest, current) => 
    current.version > latest.version ? current : latest
  )
}

export function getApprovedScenarioSet(contextPackId: string): ScenarioSet | null {
  const versions = store.scenarioSets.get(contextPackId)
  if (!versions) return null
  const approved = versions.filter(v => v.status === 'approved')
  if (approved.length === 0) return null
  return approved.reduce((latest, current) => 
    current.version > latest.version ? current : latest
  )
}

export function listScenarioSets(contextPackId: string): ScenarioSet[] {
  return store.scenarioSets.get(contextPackId) || []
}

// =============================================================================
// MITIGATION SET OPERATIONS
// =============================================================================

export function saveMitigationSet(set: MitigationSet): void {
  const versions = store.mitigationSets.get(set.context_pack_id) || []
  
  const existingIdx = versions.findIndex(v => v.version === set.version)
  if (existingIdx >= 0) {
    versions[existingIdx] = set
  } else {
    versions.push(set)
  }
  
  store.mitigationSets.set(set.context_pack_id, versions)
}

export function getLatestMitigationSet(contextPackId: string): MitigationSet | null {
  const versions = store.mitigationSets.get(contextPackId)
  if (!versions || versions.length === 0) return null
  return versions.reduce((latest, current) => 
    current.version > latest.version ? current : latest
  )
}

export function listMitigationSets(contextPackId: string): MitigationSet[] {
  return store.mitigationSets.get(contextPackId) || []
}

// =============================================================================
// COMPUTATION RUN OPERATIONS
// =============================================================================

export function saveComputationRun(run: ComputationRun): void {
  const runs = store.computationRuns.get(run.context_pack_id) || []
  runs.push(run)
  store.computationRuns.set(run.context_pack_id, runs)
}

export function getComputationRuns(
  contextPackId: string, 
  type?: ComputationRun['computation_type']
): ComputationRun[] {
  const runs = store.computationRuns.get(contextPackId) || []
  if (type) {
    return runs.filter(r => r.computation_type === type)
  }
  return runs
}

export function getLatestBaseline(contextPackId: string): ComputationRun | null {
  const runs = getComputationRuns(contextPackId, 'baseline')
  if (runs.length === 0) return null
  return runs.reduce((latest, current) => 
    new Date(current.computed_at) > new Date(latest.computed_at) ? current : latest
  )
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

export function getRestaurantState(contextPackId: string): RestaurantState | null {
  const contextPack = getContextPack(contextPackId)
  if (!contextPack) return null

  const assumptionSet = getLatestAssumptionSet(contextPackId)
  const scenarioSet = getLatestScenarioSet(contextPackId)
  const mitigationSet = getLatestMitigationSet(contextPackId)
  const baselineComputation = getLatestBaseline(contextPackId)
  const scenarioComputations = getComputationRuns(contextPackId, 'scenario')
  const mitigatedComputations = getComputationRuns(contextPackId, 'mitigated')

  // Determine current step
  let current_step: RestaurantState['current_step'] = 'upload'
  if (contextPack && baselineComputation) {
    current_step = 'baseline'
  }
  if (assumptionSet) {
    current_step = assumptionSet.status === 'approved' ? 'scenarios' : 'assumptions'
  }
  if (scenarioSet) {
    current_step = scenarioSet.status === 'approved' ? 'mitigations' : 'scenarios'
  }
  if (mitigationSet) {
    current_step = mitigationSet.status === 'approved' ? 'export' : 'mitigations'
  }

  return {
    dataset_id: contextPack.metadata.dataset_id,
    context_pack: contextPack,
    assumption_set: assumptionSet,
    scenario_set: scenarioSet,
    mitigation_set: mitigationSet,
    baseline_computation: baselineComputation,
    scenario_computations: scenarioComputations,
    mitigated_computations: mitigatedComputations,
    current_step,
  }
}

// =============================================================================
// SAMPLE DATA FOR DEMO
// =============================================================================

export function loadSampleData(): string {
  const sampleCSV = `date,total_revenue,cost_of_goods_sold,wage_costs,operating_expenses,non_operating_expenses
2024-01-01,85000,27200,23800,12750,2550
2024-02-01,78000,24960,21840,11700,2340
2024-03-01,92000,29440,25760,13800,2760
2024-04-01,95000,30400,26600,14250,2850
2024-05-01,102000,32640,28560,15300,3060
2024-06-01,115000,36800,32200,17250,3450
2024-07-01,125000,40000,35000,18750,3750
2024-08-01,130000,41600,36400,19500,3900
2024-09-01,118000,37760,33040,17700,3540
2024-10-01,105000,33600,29400,15750,3150
2024-11-01,98000,31360,27440,14700,2940
2024-12-01,135000,43200,37800,20250,4050`

  return sampleCSV
}
