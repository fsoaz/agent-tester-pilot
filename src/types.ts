export type ProviderName = 'mock' | 'openrouter';
export type State = 'generating' | 'awaiting_approval' | 'running' | 'healing' | 'completed' | 'cancelled' | 'operational_error';
export type Outcome = 'passed' | 'failed' | 'recovered' | 'cancelled' | 'error';
export interface ProviderInput { operation: 'generate' | 'heal'; requirement: string; url: string; dom: string; code?: string; error?: string }
export interface ProviderOutput { code: string; provider: ProviderName; model?: string; usage?: Record<string, number> }
export interface Provider { name: ProviderName; request(input: ProviderInput): Promise<ProviderOutput> }
export interface Approval { kind: 'generation' | 'healing'; proposal?: number; approved: boolean; automatic: boolean; at: string }
export interface Attempt {
  number: number; code: string; status: 'running' | 'passed' | 'failed'; startedAt: string;
  durationMs?: number; error?: string; failureKind?: 'locator' | 'assertion' | 'application' | 'configuration';
  logs: string; evidence: Record<string, string>;
}
export interface Proposal { number: number; status: 'requesting' | 'invalid' | 'rejected' | 'approved' | 'error'; code?: string; diff?: string; error?: string; metadata?: Omit<ProviderOutput, 'code'> }
export interface RunRecord {
  version: 1; id: string; scenarioId: string; command: 'generate' | 'run'; requirement: string; url: string;
  provider: ProviderName; originProvider?: ProviderName; model?: string; usage?: Record<string, number>;
  state: State; outcome?: Outcome; createdAt: string; updatedAt: string; heartbeatAt: string; ownerPid: number;
  approvedFile?: string; code?: string; error?: string; approvals: Approval[]; attempts: Attempt[]; proposals: Proposal[];
}
export interface ApprovedMetadata { scenarioId: string; requirement: string; provider: ProviderName; model?: string; hash: string; approvedAt: string }
export const activeStates: State[] = ['generating', 'awaiting_approval', 'running', 'healing'];
