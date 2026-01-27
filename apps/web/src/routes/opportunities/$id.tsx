/**
 * Opportunity 詳情頁面
 * 顯示機會詳細資訊、嵌入對話內容、PDCM+SPIN 分析
 * Precision Analytics Industrial Design
 */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  Edit,
  FileText,
  HandMetal,
  Lightbulb,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Target,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";
import { useState } from "react";

import { LeadStatusBadge } from "@/components/lead/lead-status-badge";
import { PdcmScoreCard } from "@/components/meddic/pdcm-score-card";
import {
  PdcmSpinAlerts,
  type PdcmSpinAlertsData,
} from "@/components/meddic/pdcm-spin-alerts";
import { SpinProgressCard } from "@/components/meddic/spin-progress-card";
import {
  type TacticalSuggestion,
  TacticalSuggestions,
} from "@/components/meddic/tactical-suggestions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { client } from "@/utils/orpc";

// Import Playfair Display and JetBrains Mono
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";

export const Route = createFileRoute("/opportunities/$id")({
  component: OpportunityDetailPage,
});

function getConversationTypeLabel(type: string): string {
  const types: Record<string, string> = {
    discovery_call: "需求訪談",
    demo: "產品展示",
    follow_up: "跟進電話",
    negotiation: "議價討論",
    closing: "成交會議",
    support: "客服支援",
  };
  return types[type] || type;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  pending: {
    label: "待處理",
    color: "bg-slate-500",
    bgColor: "bg-slate-500/10",
    textColor: "text-slate-400",
  },
  transcribing: {
    label: "轉錄中",
    color: "bg-purple-500",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-400",
  },
  transcribed: {
    label: "已轉錄",
    color: "bg-amber-500",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-400",
  },
  analyzing: {
    label: "分析中",
    color: "bg-purple-500",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-400",
  },
  completed: {
    label: "已完成",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-400",
  },
  failed: {
    label: "失敗",
    color: "bg-red-500",
    bgColor: "bg-red-500/10",
    textColor: "text-red-400",
  },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) {
    return "-";
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Timeline event types
type TimelineEventType =
  | "todo_created"
  | "todo_completed"
  | "todo_postponed"
  | "todo_won"
  | "todo_lost"
  | "conversation_uploaded"
  | "conversation_analyzed"
  | "opportunity_created"
  | "opportunity_updated";

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: Date;
  actionVia?: string;
  metadata?: Record<string, unknown>;
}

function buildTimeline(opportunity: {
  createdAt: Date;
  updatedAt: Date;
  conversations?: Array<{
    id: string;
    title: string | null;
    type: string;
    status: string;
    conversationDate: Date | null;
    createdAt: Date;
    latestAnalysis?: { createdAt: Date } | null;
  }>;
  salesTodos?: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    completionRecord?: { completedAt: string; result: string } | null;
    wonRecord?: { wonAt: string; note?: string } | null;
    lostRecord?: { lostAt: string; reason: string } | null;
  }>;
  todoLogs?: Array<{
    id: string;
    todoId: string;
    action: string;
    actionVia: string;
    changes: Record<string, unknown>;
    note?: string | null;
    createdAt: Date;
  }>;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Add opportunity creation event
  events.push({
    id: "opp-created",
    type: "opportunity_created",
    title: "商機建立",
    timestamp: new Date(opportunity.createdAt),
  });

  // Add conversation events
  for (const conv of opportunity.conversations ?? []) {
    events.push({
      id: `conv-${conv.id}`,
      type: "conversation_uploaded",
      title: conv.title || "對話記錄",
      description: `類型: ${conv.type}`,
      timestamp: new Date(conv.conversationDate ?? conv.createdAt),
    });

    if (conv.latestAnalysis && conv.status === "completed") {
      events.push({
        id: `analysis-${conv.id}`,
        type: "conversation_analyzed",
        title: "分析完成",
        description: conv.title || "對話記錄",
        timestamp: new Date(conv.latestAnalysis.createdAt),
      });
    }
  }

  // Add todo log events
  for (const log of opportunity.todoLogs ?? []) {
    const todo = opportunity.salesTodos?.find((t) => t.id === log.todoId);
    const todoTitle = todo?.title || "待辦事項";

    switch (log.action) {
      case "create":
        events.push({
          id: `log-${log.id}`,
          type: "todo_created",
          title: `建立待辦: ${todoTitle}`,
          timestamp: new Date(log.createdAt),
          actionVia: log.actionVia,
        });
        break;
      case "complete":
        events.push({
          id: `log-${log.id}`,
          type: "todo_completed",
          title: `完成待辦: ${todoTitle}`,
          description: log.note || undefined,
          timestamp: new Date(log.createdAt),
          actionVia: log.actionVia,
        });
        break;
      case "postpone":
        events.push({
          id: `log-${log.id}`,
          type: "todo_postponed",
          title: `改期待辦: ${todoTitle}`,
          description: log.note || undefined,
          timestamp: new Date(log.createdAt),
          actionVia: log.actionVia,
          metadata: log.changes,
        });
        break;
      case "won":
        events.push({
          id: `log-${log.id}`,
          type: "todo_won",
          title: `成交: ${todoTitle}`,
          description: log.note || undefined,
          timestamp: new Date(log.createdAt),
          actionVia: log.actionVia,
        });
        break;
      case "lost":
        events.push({
          id: `log-${log.id}`,
          type: "todo_lost",
          title: `拒絕: ${todoTitle}`,
          description: log.note || undefined,
          timestamp: new Date(log.createdAt),
          actionVia: log.actionVia,
        });
        break;
    }
  }

  // Sort by timestamp descending (most recent first)
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return events;
}

function getTimelineEventIcon(type: TimelineEventType) {
  switch (type) {
    case "todo_created":
      return <FileText style={{ width: "1rem", height: "1rem" }} />;
    case "todo_completed":
      return <Check style={{ width: "1rem", height: "1rem" }} />;
    case "todo_postponed":
      return <CalendarClock style={{ width: "1rem", height: "1rem" }} />;
    case "todo_won":
      return <Trophy style={{ width: "1rem", height: "1rem" }} />;
    case "todo_lost":
      return <HandMetal style={{ width: "1rem", height: "1rem" }} />;
    case "conversation_uploaded":
      return <MessageSquare style={{ width: "1rem", height: "1rem" }} />;
    case "conversation_analyzed":
      return <TrendingUp style={{ width: "1rem", height: "1rem" }} />;
    case "opportunity_created":
    case "opportunity_updated":
      return <Calendar style={{ width: "1rem", height: "1rem" }} />;
    default:
      return <Calendar style={{ width: "1rem", height: "1rem" }} />;
  }
}

function getTimelineEventColor(type: TimelineEventType): string {
  switch (type) {
    case "todo_created":
      return "rgb(99 94 246)"; // purple
    case "todo_completed":
      return "rgb(16 185 129)"; // green
    case "todo_postponed":
      return "rgb(251 191 36)"; // yellow
    case "todo_won":
      return "rgb(234 179 8)"; // gold
    case "todo_lost":
      return "rgb(107 114 128)"; // gray
    case "conversation_uploaded":
      return "rgb(59 130 246)"; // blue
    case "conversation_analyzed":
      return "rgb(139 92 246)"; // violet
    case "opportunity_created":
    case "opportunity_updated":
      return "rgb(148 163 184)"; // slate
    default:
      return "rgb(148 163 184)";
  }
}

function OpportunityDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const opportunityQuery = useQuery({
    queryKey: ["opportunities", "get", { opportunityId: id }],
    queryFn: async () => {
      const result = await client.opportunities.get({ opportunityId: id });
      return result;
    },
  });

  const opportunity = opportunityQuery.data;
  const isLoading = opportunityQuery.isLoading;

  // 取得第一個對話的 ID（每個客戶只會有一個音檔/對話）
  const firstConversationId = opportunity?.conversations?.[0]?.id;

  // 獲取對話詳情（包含 agentOutputs）
  const conversationQuery = useQuery({
    queryKey: ["conversations", "detail", firstConversationId],
    queryFn: () =>
      client.conversations.get({ conversationId: firstConversationId! }),
    enabled: !!firstConversationId,
  });

  const conversation = conversationQuery.data;

  if (isLoading) {
    return (
      <main className="container mx-auto space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </main>
    );
  }

  if (!opportunity) {
    return (
      <main className="container mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">找不到此機會</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/opportunities">返回機會列表</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // 對話狀態資訊
  const conversationStatus = conversation?.status || "pending";
  const statusInfo = statusConfig[conversationStatus] || statusConfig.pending;

  return (
    <main className="opportunity-detail-container">
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 200%; }
          }

          @keyframes pulse-ring {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(99, 94, 246, 0.4);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(99, 94, 246, 0);
            }
          }

          .opportunity-detail-container {
            min-height: 100vh;
            background: linear-gradient(135deg, rgb(2 6 23) 0%, rgb(15 23 42) 50%, rgb(30 41 59) 100%);
            position: relative;
            padding: 2rem;
          }

          .opportunity-detail-container::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(to right, rgb(71 85 105 / 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(71 85 105 / 0.1) 1px, transparent 1px);
            background-size: 40px 40px;
            pointer-events: none;
          }

          .detail-content {
            max-width: 1400px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
          }

          .page-header {
            margin-bottom: 2.5rem;
            animation: fadeInUp 0.6s ease-out backwards;
          }

          .back-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 0.5rem;
            background: linear-gradient(135deg, rgb(30 41 59) 0%, rgb(15 23 42) 100%);
            border: 1px solid rgb(71 85 105);
            color: rgb(148 163 184);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .back-button:hover {
            background: linear-gradient(135deg, rgb(51 65 85) 0%, rgb(30 41 59) 100%);
            border-color: rgb(99 94 246);
            color: rgb(99 94 246);
            transform: translateX(-4px);
            box-shadow: 0 0 20px rgba(99, 94, 246, 0.3);
          }

          .company-header {
            font-family: 'Playfair Display', serif;
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, rgb(226 232 240) 0%, rgb(148 163 184) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.02em;
            line-height: 1.2;
          }

          .customer-number {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            font-weight: 500;
            color: rgb(148 163 184);
            letter-spacing: 0.05em;
            margin-top: 0.5rem;
          }

          .action-buttons {
            display: flex;
            gap: 0.75rem;
          }

          .action-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1.25rem;
            border-radius: 0.5rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-decoration: none;
          }

          .action-button-outline {
            background: linear-gradient(135deg, rgb(30 41 59) 0%, rgb(15 23 42) 100%);
            border: 1px solid rgb(71 85 105);
            color: rgb(226 232 240);
          }

          .action-button-outline:hover {
            background: linear-gradient(135deg, rgb(51 65 85) 0%, rgb(30 41 59) 100%);
            border-color: rgb(99 94 246);
            color: rgb(99 94 246);
            box-shadow: 0 0 20px rgba(99, 94, 246, 0.2);
          }

          .action-button-primary {
            background: linear-gradient(135deg, rgb(99 94 246) 0%, rgb(139 92 246) 100%);
            border: 1px solid rgb(99 94 246);
            color: rgb(2 6 23);
          }

          .action-button-primary:hover {
            background: linear-gradient(135deg, rgb(124 58 237) 0%, rgb(109 40 217) 100%);
            box-shadow: 0 0 30px rgba(99, 94, 246, 0.5);
            transform: translateY(-2px);
          }

          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 2rem;
            animation: fadeInUp 0.6s ease-out backwards;
            animation-delay: 0.1s;
          }

          @media (max-width: 1024px) {
            .detail-grid {
              grid-template-columns: 1fr;
            }
          }

          .main-column {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .sidebar-column {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .detail-card {
            border-radius: 0.75rem;
            background: linear-gradient(135deg, rgb(15 23 42) 0%, rgb(30 41 59) 100%);
            border: 1px solid rgb(51 65 85);
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .detail-card:hover {
            border-color: rgb(71 85 105);
            box-shadow: 0 0 30px rgba(99, 94, 246, 0.1);
          }

          .card-header {
            padding: 1.5rem;
            border-bottom: 1px solid rgb(51 65 85);
          }

          .card-title {
            font-family: 'Playfair Display', serif;
            font-size: 1.5rem;
            font-weight: 700;
            color: rgb(226 232 240);
            letter-spacing: -0.01em;
          }

          .card-description {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            color: rgb(148 163 184);
            margin-top: 0.25rem;
          }

          .card-content {
            padding: 1.5rem;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }

          @media (max-width: 640px) {
            .info-grid {
              grid-template-columns: 1fr;
            }
          }

          .info-item {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 1rem;
            border-radius: 0.5rem;
            background: rgb(2 6 23 / 0.5);
            border: 1px solid rgb(30 41 59);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .info-item:hover {
            background: rgb(30 41 59 / 0.5);
            border-color: rgb(51 65 85);
            transform: translateX(4px);
          }

          .info-icon {
            flex-shrink: 0;
            margin-top: 0.125rem;
            color: rgb(99 94 246);
          }

          .info-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgb(148 163 184);
            margin-bottom: 0.25rem;
          }

          .info-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9375rem;
            font-weight: 500;
            color: rgb(226 232 240);
          }

          .notes-display {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            color: rgb(203 213 225);
            white-space: pre-wrap;
            line-height: 1.6;
          }

          .timeline-item {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem;
            border-radius: 0.5rem;
            background: rgb(2 6 23 / 0.5);
            border: 1px solid rgb(30 41 59);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .timeline-item:hover {
            background: rgb(30 41 59 / 0.5);
            border-color: rgb(51 65 85);
            transform: translateX(4px);
          }

          .timeline-icon {
            flex-shrink: 0;
            color: rgb(99 94 246);
          }

          .timeline-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgb(148 163 184);
            margin-bottom: 0.25rem;
          }

          .timeline-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            font-weight: 500;
            color: rgb(226 232 240);
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 1.5rem;
            text-align: center;
            color: rgb(148 163 184);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9375rem;
          }

          .status-badge {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            letter-spacing: 0.05em;
            padding: 0.375rem 0.875rem;
            border-radius: 0.375rem;
            font-size: 0.75rem;
          }

          .custom-tabs {
            border-bottom: 1px solid rgb(30 41 59);
          }

          .custom-tab {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            font-size: 0.875rem;
            letter-spacing: 0.025em;
            text-transform: uppercase;
            padding: 0.75rem 1.5rem;
            color: rgb(148 163 184);
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
          }

          .custom-tab:hover {
            color: rgb(99 94 246);
          }

          .custom-tab[data-state="active"] {
            color: rgb(99 94 246);
            border-bottom-color: rgb(99 94 246);
            background: linear-gradient(180deg, transparent 0%, rgb(6 182 212 / 0.05) 100%);
          }

          .transcript-segment {
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid rgb(30 41 59);
            background: rgb(15 23 42);
            transition: all 0.3s;
          }

          .transcript-segment:hover {
            border-color: rgb(6 182 212 / 0.3);
            background: rgb(30 41 59);
          }

          .speaker-badge {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.25rem 0.625rem;
            background: rgb(30 41 59);
            border: 1px solid rgb(51 65 85);
            color: rgb(148 163 184);
          }

          .timestamp {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            color: rgb(100 116 139);
          }

          .audio-player {
            width: 100%;
            border-radius: 0.5rem;
            filter: saturate(0.8) hue-rotate(-10deg);
          }

          .collapsible-trigger {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.5rem;
            cursor: pointer;
            transition: all 0.3s;
          }

          .collapsible-trigger:hover {
            background: rgb(30 41 59 / 0.5);
          }

          .collapsible-trigger .chevron {
            transition: transform 0.3s;
          }

          .collapsible-trigger[data-state="open"] .chevron {
            transform: rotate(180deg);
          }

          .action-card {
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid rgb(30 41 59);
            background: linear-gradient(135deg, rgb(15 23 42) 0%, rgb(30 41 59) 100%);
            transition: all 0.3s;
          }

          .action-card:hover {
            border-color: rgb(59 130 246 / 0.4);
            transform: translateX(4px);
          }

          .risk-card {
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid rgb(127 29 29);
            background: linear-gradient(135deg, rgb(127 29 29 / 0.1) 0%, rgb(127 29 29 / 0.05) 100%);
            transition: all 0.3s;
          }

          .risk-card:hover {
            border-color: rgb(239 68 68 / 0.5);
          }

          .finding-item {
            padding-left: 1.5rem;
            position: relative;
            color: rgb(203 213 225);
            line-height: 1.75;
          }

          .finding-item::before {
            content: '▸';
            position: absolute;
            left: 0;
            color: rgb(99 94 246);
            font-weight: 700;
          }

          .priority-badge-high {
            background: linear-gradient(135deg, rgb(239 68 68) 0%, rgb(220 38 38) 100%);
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 0.7rem;
            padding: 0.25rem 0.625rem;
          }

          .priority-badge-medium {
            background: linear-gradient(135deg, rgb(139 92 246) 0%, rgb(109 40 217) 100%);
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            font-size: 0.7rem;
            padding: 0.25rem 0.625rem;
          }

          .priority-badge-low {
            background: linear-gradient(135deg, rgb(100 116 139) 0%, rgb(71 85 105) 100%);
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            font-size: 0.7rem;
            padding: 0.25rem 0.625rem;
          }
        `}
      </style>

      <div className="detail-content">
        {/* Page Header */}
        <div className="page-header">
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
                flex: 1,
              }}
            >
              <button
                className="back-button"
                onClick={() => navigate({ to: "/opportunities" })}
                type="button"
              >
                <ArrowLeft style={{ width: "1.25rem", height: "1.25rem" }} />
              </button>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <h1 className="company-header">{opportunity.companyName}</h1>
                  <LeadStatusBadge status={opportunity.status} />
                </div>
                <p className="customer-number">{opportunity.customerNumber}</p>
              </div>
            </div>
            <div className="action-buttons">
              <Link
                className="action-button action-button-outline"
                params={{ id: opportunity.id }}
                to="/opportunities/$id/edit"
              >
                <Edit style={{ width: "1rem", height: "1rem" }} />
                編輯
              </Link>
              <Link
                className="action-button action-button-primary"
                search={{ opportunityId: opportunity.id }}
                to="/conversations/new"
              >
                <Plus style={{ width: "1rem", height: "1rem" }} />
                新增對話
              </Link>
            </div>
          </div>
        </div>

        <div className="detail-grid">
          {/* Main Content */}
          <div className="main-column">
            {/* Basic Info Card - 公司名稱 + 結構化備註欄位 */}
            <div className="detail-card" style={{ animationDelay: "0.15s" }}>
              <div className="card-header">
                <h2 className="card-title">基本資訊</h2>
              </div>
              <div className="card-content">
                {(() => {
                  // 解析備註內容為結構化資料
                  const parseNotes = (notes: string | null | undefined) => {
                    if (!notes) {
                      return {};
                    }
                    const result: Record<string, string> = {};
                    const lines = notes.split("\n");
                    for (const line of lines) {
                      const match = line.match(/^(.+?):\s*(.+)$/);
                      if (match) {
                        result[match[1].trim()] = match[2].trim();
                      }
                    }
                    return result;
                  };
                  const parsedNotes = parseNotes(opportunity.notes);
                  const hasStructuredNotes =
                    Object.keys(parsedNotes).length > 0;

                  return (
                    <div className="info-grid">
                      <div className="info-item">
                        <Building2
                          className="info-icon"
                          style={{ width: "1.25rem", height: "1.25rem" }}
                        />
                        <div>
                          <p className="info-label">公司名稱</p>
                          <p className="info-value">
                            {opportunity.companyName}
                          </p>
                        </div>
                      </div>
                      {opportunity.contactName && (
                        <div className="info-item">
                          <User
                            className="info-icon"
                            style={{ width: "1.25rem", height: "1.25rem" }}
                          />
                          <div>
                            <p className="info-label">聯絡人</p>
                            <p className="info-value">
                              {opportunity.contactName}
                            </p>
                          </div>
                        </div>
                      )}
                      {opportunity.contactPhone && (
                        <div className="info-item">
                          <Phone
                            className="info-icon"
                            style={{ width: "1.25rem", height: "1.25rem" }}
                          />
                          <div>
                            <p className="info-label">聯絡電話</p>
                            <p className="info-value">
                              {opportunity.contactPhone}
                            </p>
                          </div>
                        </div>
                      )}
                      {opportunity.contactEmail && (
                        <div className="info-item">
                          <Mail
                            className="info-icon"
                            style={{ width: "1.25rem", height: "1.25rem" }}
                          />
                          <div>
                            <p className="info-label">聯絡信箱</p>
                            <p className="info-value">
                              {opportunity.contactEmail}
                            </p>
                          </div>
                        </div>
                      )}
                      {hasStructuredNotes ? (
                        <>
                          {parsedNotes.店型 && (
                            <div className="info-item">
                              <Target
                                className="info-icon"
                                style={{ width: "1.25rem", height: "1.25rem" }}
                              />
                              <div>
                                <p className="info-label">店型</p>
                                <p className="info-value">{parsedNotes.店型}</p>
                              </div>
                            </div>
                          )}
                          {parsedNotes.營運型態 && (
                            <div className="info-item">
                              <BarChart3
                                className="info-icon"
                                style={{ width: "1.25rem", height: "1.25rem" }}
                              />
                              <div>
                                <p className="info-label">營運型態</p>
                                <p className="info-value">
                                  {parsedNotes.營運型態}
                                </p>
                              </div>
                            </div>
                          )}
                          {parsedNotes["現有 POS"] && (
                            <div className="info-item">
                              <MessageSquare
                                className="info-icon"
                                style={{ width: "1.25rem", height: "1.25rem" }}
                              />
                              <div>
                                <p className="info-label">現有 POS</p>
                                <p className="info-value">
                                  {parsedNotes["現有 POS"]}
                                </p>
                              </div>
                            </div>
                          )}
                          {parsedNotes.決策者在場 && (
                            <div className="info-item">
                              <User
                                className="info-icon"
                                style={{ width: "1.25rem", height: "1.25rem" }}
                              />
                              <div>
                                <p className="info-label">決策者在場</p>
                                <p className="info-value">
                                  {parsedNotes.決策者在場}
                                </p>
                              </div>
                            </div>
                          )}
                          {parsedNotes.來源 && (
                            <div className="info-item">
                              <FileText
                                className="info-icon"
                                style={{ width: "1.25rem", height: "1.25rem" }}
                              />
                              <div>
                                <p className="info-label">來源</p>
                                <p className="info-value">{parsedNotes.來源}</p>
                              </div>
                            </div>
                          )}
                        </>
                      ) : opportunity.notes ? (
                        <div
                          className="info-item"
                          style={{ gridColumn: "1 / -1" }}
                        >
                          <FileText
                            className="info-icon"
                            style={{ width: "1.25rem", height: "1.25rem" }}
                          />
                          <div>
                            <p className="info-label">備註</p>
                            <p className="info-value">{opportunity.notes}</p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Conversation Content - 嵌入對話內容 */}
            {opportunity.conversations &&
            opportunity.conversations.length > 0 ? (
              <>
                {/* 銷售分析 / 轉錄文字 Tabs - 極簡顯示 */}
                <Tabs
                  className="detail-card"
                  defaultValue="analysis"
                  style={{ animationDelay: "0.2s" }}
                >
                  <TabsList className="custom-tabs w-full justify-start">
                    <TabsTrigger
                      className="custom-tab"
                      disabled={!conversation?.analysis}
                      value="analysis"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      銷售分析
                    </TabsTrigger>
                    <TabsTrigger className="custom-tab" value="transcript">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      轉錄文字
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent className="mt-6 px-6 pb-6" value="transcript">
                    {conversation?.transcript?.segments &&
                    conversation.transcript.segments.length > 0 ? (
                      <div className="space-y-4">
                        {conversation.transcript.segments.map(
                          (segment, idx) => (
                            <div
                              className="transcript-segment flex gap-4"
                              key={idx}
                            >
                              <div className="shrink-0">
                                <Badge
                                  className="speaker-badge"
                                  variant="outline"
                                >
                                  <User className="mr-1.5 h-3 w-3" />
                                  {segment.speaker || "說話者"}
                                </Badge>
                                <p className="timestamp mt-2">
                                  {formatTime(segment.start)}
                                </p>
                              </div>
                              <p className="flex-1 text-slate-300 leading-relaxed">
                                {segment.text}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    ) : conversation?.transcript?.fullText ? (
                      <p className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                        {conversation.transcript.fullText}
                      </p>
                    ) : (
                      <div className="empty-state">
                        <MessageSquare
                          style={{
                            width: "3rem",
                            height: "3rem",
                            marginBottom: "1rem",
                            color: "rgb(71 85 105)",
                          }}
                        />
                        <p>尚無轉錄文字</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent className="mt-6 px-6 pb-6" value="analysis">
                    {conversation?.analysis ? (
                      <div className="space-y-6">
                        {/* PDCM+SPIN Analysis Section */}
                        {conversation.analysis.agentOutputs && (
                          <>
                            {/* Two Column Layout for PDCM and SPIN details */}
                            <div className="grid gap-6 md:grid-cols-2">
                              {/* PDCM Detailed Analysis */}
                              {conversation.analysis.agentOutputs.agent2
                                ?.pdcm_scores && (
                                <Card className="detail-card border-purple-600/20">
                                  <CardContent className="space-y-4 p-4">
                                    <h3 className="flex items-center gap-2 font-semibold text-lg text-slate-200">
                                      <BarChart3 className="h-5 w-5 text-purple-400" />
                                      PDCM 詳細分析
                                    </h3>
                                    {(() => {
                                      const pdcmScores = conversation.analysis
                                        ?.agentOutputs?.agent2?.pdcm_scores as
                                        | Record<string, unknown>
                                        | undefined;
                                      if (!pdcmScores) {
                                        return null;
                                      }

                                      const dimensions = [
                                        {
                                          key: "pain",
                                          label: "P (痛點)",
                                          color: "purple",
                                        },
                                        {
                                          key: "decision",
                                          label: "D (決策)",
                                          color: "blue",
                                        },
                                        {
                                          key: "champion",
                                          label: "C (支持)",
                                          color: "emerald",
                                        },
                                        {
                                          key: "metrics",
                                          label: "M (量化)",
                                          color: "amber",
                                        },
                                      ];

                                      return dimensions.map(
                                        ({ key, label }) => {
                                          const data = pdcmScores[key] as
                                            | {
                                                score?: number;
                                                evidence?: string[];
                                              }
                                            | undefined;
                                          if (!data) {
                                            return null;
                                          }
                                          const score = data.score ?? 0;
                                          const evidence = data.evidence?.[0];

                                          return (
                                            <div
                                              className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3"
                                              key={key}
                                            >
                                              <div className="mb-1 flex items-center justify-between">
                                                <span className="font-semibold text-slate-300 text-sm">
                                                  {label}
                                                </span>
                                                <span
                                                  className={`font-bold ${score >= 60 ? "text-green-400" : score >= 30 ? "text-yellow-400" : "text-red-400"}`}
                                                >
                                                  {score}分
                                                </span>
                                              </div>
                                              {evidence && (
                                                <p className="text-slate-400 text-xs leading-relaxed">
                                                  {evidence}
                                                </p>
                                              )}
                                            </div>
                                          );
                                        }
                                      );
                                    })()}
                                  </CardContent>
                                </Card>
                              )}

                              {/* SPIN Detailed Analysis */}
                              {conversation.analysis.agentOutputs.agent3
                                ?.spin_analysis && (
                                <Card className="detail-card border-cyan-600/20">
                                  <CardContent className="space-y-3 p-4">
                                    <h3 className="flex items-center gap-2 font-semibold text-lg text-slate-200">
                                      <TrendingUp className="h-5 w-5 text-cyan-400" />
                                      SPIN 銷售技巧
                                    </h3>
                                    {(() => {
                                      const spinAnalysis = conversation.analysis
                                        ?.agentOutputs?.agent3?.spin_analysis as
                                        | Record<string, unknown>
                                        | undefined;
                                      if (!spinAnalysis) {
                                        return null;
                                      }

                                      const stages = [
                                        { key: "situation", label: "S 情境" },
                                        { key: "problem", label: "P 問題" },
                                        { key: "implication", label: "I 影響" },
                                        { key: "need_payoff", label: "N 需求" },
                                      ];

                                      return (
                                        <>
                                          {stages.map(({ key, label }) => {
                                            const data = spinAnalysis[key] as
                                              | {
                                                  score?: number;
                                                  achieved?: boolean;
                                                }
                                              | undefined;
                                            if (!data) {
                                              return null;
                                            }
                                            const score = data.score ?? 0;
                                            const achieved =
                                              data.achieved ?? false;

                                            return (
                                              <div
                                                className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5"
                                                key={key}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span
                                                    className={`${achieved && score >= 60 ? "text-green-400" : score >= 30 ? "text-yellow-400" : "text-red-400"}`}
                                                  >
                                                    {achieved && score >= 60
                                                      ? "✅"
                                                      : score >= 30
                                                        ? "⚠️"
                                                        : "❌"}
                                                  </span>
                                                  <span className="text-slate-300 text-sm">
                                                    {label}
                                                  </span>
                                                </div>
                                                <span
                                                  className={`font-bold text-sm ${score >= 60 ? "text-green-400" : score >= 30 ? "text-yellow-400" : "text-red-400"}`}
                                                >
                                                  {score}分
                                                </span>
                                              </div>
                                            );
                                          })}
                                          {spinAnalysis.spin_completion_rate !==
                                            undefined && (
                                            <div className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 text-center">
                                              <p className="text-slate-400 text-xs">
                                                達成率
                                              </p>
                                              <p className="font-bold text-2xl text-cyan-400">
                                                {Math.round(
                                                  (spinAnalysis.spin_completion_rate as number) *
                                                    100
                                                )}
                                                %
                                              </p>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </CardContent>
                                </Card>
                              )}
                            </div>

                            {/* Tactical Suggestions */}
                            <TacticalSuggestions
                              suggestions={
                                conversation.analysis.agentOutputs.agent6
                                  ?.tactical_suggestions as
                                  | TacticalSuggestion[]
                                  | null
                                  | undefined
                              }
                            />

                            {/* PDCM+SPIN Alerts */}
                            <PdcmSpinAlerts
                              alerts={
                                conversation.analysis.agentOutputs.agent6
                                  ?.pdcm_spin_alerts as
                                  | PdcmSpinAlertsData
                                  | null
                                  | undefined
                              }
                            />
                          </>
                        )}

                        {/* Key Findings */}
                        {conversation.analysis.keyFindings &&
                          conversation.analysis.keyFindings.length > 0 && (
                            <Card className="detail-card border-purple-600/20">
                              <CardContent className="p-4">
                                <h3 className="mb-3 flex items-center gap-2 font-semibold text-lg text-slate-200">
                                  <Lightbulb className="h-5 w-5 text-purple-400" />
                                  關鍵發現
                                </h3>
                                <ul className="space-y-2.5">
                                  {conversation.analysis.keyFindings.map(
                                    (finding, idx) => (
                                      <li className="finding-item" key={idx}>
                                        {finding}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </CardContent>
                            </Card>
                          )}

                        {/* Next Steps */}
                        {conversation.analysis.nextSteps &&
                          conversation.analysis.nextSteps.length > 0 && (
                            <Card className="detail-card border-purple-500/20">
                              <CardContent className="p-4">
                                <h3 className="mb-3 flex items-center gap-2 font-semibold text-lg text-slate-200">
                                  <TrendingUp className="h-5 w-5 text-purple-400" />
                                  下一步行動
                                </h3>
                                <div className="space-y-3">
                                  {conversation.analysis.nextSteps.map(
                                    (step, idx) => (
                                      <div className="action-card" key={idx}>
                                        <div className="flex items-start gap-3">
                                          <Badge
                                            className={
                                              step.priority === "high"
                                                ? "priority-badge-high"
                                                : step.priority === "medium"
                                                  ? "priority-badge-medium"
                                                  : "priority-badge-low"
                                            }
                                          >
                                            {step.priority === "high"
                                              ? "HIGH"
                                              : step.priority === "medium"
                                                ? "MED"
                                                : "LOW"}
                                          </Badge>
                                          <div className="flex-1">
                                            <p className="text-slate-200 leading-relaxed">
                                              {step.action}
                                            </p>
                                            {step.owner && (
                                              <p className="mt-1.5 text-slate-400 text-sm">
                                                負責人: {step.owner}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                        {/* Risks */}
                        {conversation.analysis.risks &&
                          conversation.analysis.risks.length > 0 && (
                            <Card className="detail-card border-red-500/20">
                              <CardContent className="p-4">
                                <h3 className="mb-3 flex items-center gap-2 font-semibold text-lg text-slate-200">
                                  <AlertTriangle className="h-5 w-5 text-red-400" />
                                  風險警示
                                </h3>
                                <div className="space-y-3">
                                  {conversation.analysis.risks.map(
                                    (risk, idx) => (
                                      <div className="risk-card" key={idx}>
                                        <div className="flex items-center gap-2.5">
                                          <Badge
                                            className={
                                              risk.severity === "high"
                                                ? "priority-badge-high"
                                                : "priority-badge-medium"
                                            }
                                          >
                                            {risk.severity === "high"
                                              ? "高風險"
                                              : risk.severity === "medium"
                                                ? "中風險"
                                                : "低風險"}
                                          </Badge>
                                          <p className="font-semibold text-red-300">
                                            {risk.risk}
                                          </p>
                                        </div>
                                        {risk.mitigation && (
                                          <p className="mt-2.5 text-slate-400 text-sm leading-relaxed">
                                            建議: {risk.mitigation}
                                          </p>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <BarChart3
                          style={{
                            width: "3rem",
                            height: "3rem",
                            marginBottom: "1rem",
                            color: "rgb(71 85 105)",
                          }}
                        />
                        <p>尚無分析結果</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* 會議摘要 - 放在頁面最下面，預設收合 */}
                {conversation?.summary && (
                  <Collapsible
                    className="detail-card"
                    onOpenChange={setIsSummaryOpen}
                    open={isSummaryOpen}
                    style={{ animationDelay: "0.3s" }}
                  >
                    <CollapsibleTrigger className="collapsible-trigger">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <FileText
                          style={{
                            width: "1.25rem",
                            height: "1.25rem",
                            color: "rgb(99 94 246)",
                          }}
                        />
                        <h2
                          className="card-title"
                          style={{ fontSize: "1.25rem" }}
                        >
                          會議摘要
                        </h2>
                      </div>
                      <ChevronDown
                        className="chevron"
                        style={{
                          width: "1.25rem",
                          height: "1.25rem",
                          color: "rgb(148 163 184)",
                        }}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="card-content" style={{ paddingTop: 0 }}>
                        <p className="notes-display">{conversation.summary}</p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            ) : (
              /* 無對話情況 */
              <div className="detail-card" style={{ animationDelay: "0.2s" }}>
                <div className="card-header">
                  <h2 className="card-title">對話記錄</h2>
                </div>
                <div className="card-content">
                  <div className="empty-state">
                    <MessageSquare
                      style={{
                        width: "3rem",
                        height: "3rem",
                        marginBottom: "1rem",
                        color: "rgb(71 85 105)",
                      }}
                    />
                    <p style={{ marginBottom: "1rem" }}>尚未上傳對話</p>
                    <Link
                      className="action-button action-button-primary"
                      search={{ opportunityId: opportunity.id }}
                      style={{ fontSize: "0.875rem" }}
                      to="/conversations/new"
                    >
                      <Plus style={{ width: "1rem", height: "1rem" }} />
                      上傳錄音
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="sidebar-column">
            {/* PDCM Score */}
            <div style={{ animationDelay: "0.25s" }}>
              <PdcmScoreCard
                pdcmScores={
                  conversation?.analysis?.agentOutputs?.agent2?.pdcm_scores as
                    | {
                        pain: {
                          score: number;
                          level?: string;
                          urgency?: string;
                          evidence?: string[];
                        };
                        decision: {
                          score: number;
                          level?: string;
                          evidence?: string[];
                        };
                        champion: {
                          score: number;
                          level?: string;
                          evidence?: string[];
                        };
                        metrics: {
                          score: number;
                          level?: string;
                          evidence?: string[];
                        };
                        total_score?: number;
                      }
                    | null
                    | undefined
                }
              />
            </div>

            {/* SPIN Progress */}
            <div style={{ animationDelay: "0.3s" }}>
              <SpinProgressCard
                spinAnalysis={
                  conversation?.analysis?.agentOutputs?.agent3?.spin_analysis as
                    | {
                        situation: { score: number; achieved: boolean };
                        problem: { score: number; achieved: boolean };
                        implication: {
                          score: number;
                          achieved: boolean;
                          gap?: string;
                        };
                        need_payoff: { score: number; achieved: boolean };
                        overall_spin_score?: number;
                        spin_completion_rate?: number;
                        key_gap?: string;
                        improvement_suggestion?: string;
                      }
                    | null
                    | undefined
                }
              />
            </div>

            {/* Audio Player */}
            {conversation?.audioUrl && (
              <div className="detail-card" style={{ animationDelay: "0.35s" }}>
                <div className="card-header">
                  <h2 className="card-title" style={{ fontSize: "1.25rem" }}>
                    音檔
                  </h2>
                </div>
                <div className="card-content">
                  <audio
                    className="audio-player"
                    controls
                    src={conversation.audioUrl}
                  >
                    <track kind="captions" />
                    您的瀏覽器不支援音檔播放
                  </audio>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="detail-card" style={{ animationDelay: "0.4s" }}>
              <div className="card-header">
                <h2 className="card-title" style={{ fontSize: "1.25rem" }}>
                  客戶歷程
                </h2>
                <p className="card-description">Sales Pipeline 時間軸</p>
              </div>
              <div className="card-content">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    maxHeight: "500px",
                    overflowY: "auto",
                  }}
                >
                  {(() => {
                    const timelineEvents = buildTimeline(
                      opportunity as Parameters<typeof buildTimeline>[0]
                    );
                    if (timelineEvents.length === 0) {
                      return <div className="empty-state">尚無歷程記錄</div>;
                    }
                    return timelineEvents.map((event) => (
                      <div
                        className="timeline-item"
                        key={event.id}
                        style={{
                          borderLeft: `3px solid ${getTimelineEventColor(event.type)}`,
                          paddingLeft: "1rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            color: getTimelineEventColor(event.type),
                          }}
                        >
                          {getTimelineEventIcon(event.type)}
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {event.type === "todo_created" && "建立待辦"}
                            {event.type === "todo_completed" && "完成待辦"}
                            {event.type === "todo_postponed" && "改期"}
                            {event.type === "todo_won" && "成交"}
                            {event.type === "todo_lost" && "拒絕"}
                            {event.type === "conversation_uploaded" && "對話"}
                            {event.type === "conversation_analyzed" && "分析"}
                            {event.type === "opportunity_created" && "建立"}
                            {event.type === "opportunity_updated" && "更新"}
                          </span>
                          {event.actionVia && (
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "0.625rem",
                                padding: "0.125rem 0.375rem",
                                borderRadius: "0.25rem",
                                background: "rgb(30 41 59)",
                                color: "rgb(148 163 184)",
                              }}
                            >
                              via {event.actionVia}
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            color: "rgb(226 232 240)",
                            marginTop: "0.25rem",
                          }}
                        >
                          {event.title}
                        </p>
                        {event.description && (
                          <p
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "0.75rem",
                              color: "rgb(148 163 184)",
                              marginTop: "0.125rem",
                            }}
                          >
                            {event.description}
                          </p>
                        )}
                        <p
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "0.6875rem",
                            color: "rgb(100 116 139)",
                            marginTop: "0.25rem",
                          }}
                        >
                          {new Date(event.timestamp).toLocaleString("zh-TW", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="detail-card" style={{ animationDelay: "0.45s" }}>
              <div className="card-header">
                <h2 className="card-title" style={{ fontSize: "1.25rem" }}>
                  基本時間
                </h2>
              </div>
              <div className="card-content">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div className="timeline-item">
                    <Calendar
                      className="timeline-icon"
                      style={{ width: "1.25rem", height: "1.25rem" }}
                    />
                    <div>
                      <p className="timeline-label">建立時間</p>
                      <p className="timeline-value">
                        {new Date(opportunity.createdAt).toLocaleDateString(
                          "zh-TW",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <Calendar
                      className="timeline-icon"
                      style={{ width: "1.25rem", height: "1.25rem" }}
                    />
                    <div>
                      <p className="timeline-label">最後更新</p>
                      <p className="timeline-value">
                        {new Date(opportunity.updatedAt).toLocaleDateString(
                          "zh-TW",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                  {opportunity.lastContactedAt && (
                    <div className="timeline-item">
                      <Target
                        className="timeline-icon"
                        style={{ width: "1.25rem", height: "1.25rem" }}
                      />
                      <div>
                        <p className="timeline-label">上次聯繫</p>
                        <p className="timeline-value">
                          {new Date(
                            opportunity.lastContactedAt
                          ).toLocaleDateString("zh-TW", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
