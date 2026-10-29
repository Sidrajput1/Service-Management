import type {
  TechnicianJob,
  TechnicianWorkflowCapabilities,
} from "./technician-job-types";
export const technicianJobStatuses: string[];
export function technicianStatusLabel(status?: string): string;
export function technicianProofCount(job?: Partial<TechnicianJob>): number;
export function technicianInvoiceId(
  job?: Partial<TechnicianJob>,
): string | null;
export interface TechnicianWorkflowAction {
  key: "accept" | "arrive" | "start" | "proof" | "complete" | "invoice";
  label: string;
  busyLabel: string;
  description: string;
}
export function technicianWorkflow(
  job: TechnicianJob,
  permissions?: TechnicianWorkflowCapabilities,
): {
  action: TechnicianWorkflowAction | null;
  blockedReason: string;
  stages: Array<{
    key: string;
    label: string;
    detail: string;
    state: "completed" | "current" | "upcoming" | "blocked" | "exceptional";
  }>;
  proofCount: number;
  proofMissing: boolean;
  active: boolean;
  canUploadProof: boolean;
  canManageParts: boolean;
  statusLabel: string;
};
export function createTechnicianActionGate(): {
  isBusy(): boolean;
  run<T>(
    work: () => Promise<T>,
  ): Promise<{ ran: false } | { ran: true; value: T }>;
};
export function technicianMutationMessage(
  error: unknown,
  fallback?: string,
): string;
export function technicianRequestStatus(error: unknown): number | null;
