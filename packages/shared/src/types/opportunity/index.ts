/**
 * Opportunity types
 * Types for sales opportunity data
 */

export type OpportunityStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export interface OpportunityData {
  dealValue?: number;
  expectedCloseDate?: string;
  probability?: number;
  stage: OpportunityStage | string;
}

export interface LeadData {
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  companySize?: string;
}
