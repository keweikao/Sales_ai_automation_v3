/**
 * MEDDIC Analysis types
 * Types for MEDDIC sales qualification framework
 */

export interface MeddicScores {
  metrics: number; // 1-100
  economicBuyer: number; // 1-100
  decisionCriteria: number; // 1-100
  decisionProcess: number; // 1-100
  identifyPain: number; // 1-100
  champion: number; // 1-100
}

export interface DimensionAnalysis {
  name: string;
  score: number; // 1-100
  evidence: string[];
  gaps: string[];
  recommendations: string[];
}

export interface MeddicDimensions {
  metrics: DimensionAnalysis;
  economicBuyer: DimensionAnalysis;
  decisionCriteria: DimensionAnalysis;
  decisionProcess: DimensionAnalysis;
  identifyPain: DimensionAnalysis;
  champion: DimensionAnalysis;
}

export type QualificationStatus =
  | "qualified"
  | "partially-qualified"
  | "unqualified"
  | "needs-nurturing"
  | "Strong"
  | "Medium"
  | "Weak"
  | "At Risk";

export interface MeddicAnalysisData {
  overallScore: number;
  status: string;
  qualificationStatus: QualificationStatus;
  dimensions: Record<string, unknown> | MeddicDimensions;
  keyFindings?: string[];
}

export interface DecisionMaker {
  name: string;
  role: string;
  present: boolean;
}

export interface Constraints {
  budget?: string;
  timeline?: string;
  technicalRequirements?: string[];
}

export interface StoreInfo {
  name: string;
  type: string;
  size?: string;
}

export interface TrustAssessment {
  level: "High" | "Medium" | "Low";
  indicators: string[];
}

export interface NextStep {
  action: string;
  owner?: string;
  deadline?: string;
  priority?: "High" | "Medium" | "Low";
  rationale?: string;
}

export interface Alert {
  type:
    | "Close Now"
    | "Missing Decision Maker"
    | "Excellent Performance"
    | "Risk";
  severity: "Critical" | "High" | "Medium" | "Low";
  message: string;
}

export interface Risk {
  risk: string;
  severity: string;
  mitigation?: string;
}
