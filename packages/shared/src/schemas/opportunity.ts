/**
 * Opportunity Zod Schemas
 * 統一的商機相關驗證邏輯
 */

import { z } from "zod";

// ============================================================
// Opportunity Stage
// ============================================================

export const opportunityStageSchema = z.enum([
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
]);

export type OpportunityStage = z.infer<typeof opportunityStageSchema>;

// ============================================================
// Create Opportunity Request
// ============================================================

export const createOpportunitySchema = z.object({
  customerNumber: z.string(),
  companyName: z.string(),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  stage: opportunityStageSchema.default("lead"),
  value: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateOpportunityRequest = z.infer<typeof createOpportunitySchema>;

// ============================================================
// Update Opportunity Request
// ============================================================

export const updateOpportunitySchema = z.object({
  id: z.string(),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  stage: opportunityStageSchema.optional(),
  value: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdateOpportunityRequest = z.infer<typeof updateOpportunitySchema>;

// ============================================================
// List Opportunities Request
// ============================================================

export const listOpportunitiesSchema = z.object({
  stage: opportunityStageSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type ListOpportunitiesRequest = z.infer<typeof listOpportunitiesSchema>;

// ============================================================
// Get Opportunity Request
// ============================================================

export const getOpportunitySchema = z.object({
  id: z.string(),
});

export type GetOpportunityRequest = z.infer<typeof getOpportunitySchema>;
