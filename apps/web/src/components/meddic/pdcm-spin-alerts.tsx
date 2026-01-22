/**
 * PDCM+SPIN Alerts Component
 * 顯示 PDCM+SPIN 分析的警示訊息
 */

import { AlertTriangle, Ban, Search, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

interface AlertInfo {
  triggered: boolean;
  message: string;
}

export interface PdcmSpinAlertsData {
  no_metrics?: AlertInfo;
  shallow_discovery?: AlertInfo;
  no_urgency?: AlertInfo;
}

interface PdcmSpinAlertsProps {
  alerts: PdcmSpinAlertsData | null;
  className?: string;
}

// ============================================================
// Alert Configuration
// ============================================================

const alertConfig = {
  no_metrics: {
    icon: Ban,
    label: "Metrics 不足",
    severity: "high" as const,
    description: "業務只聊功能沒聊錢",
    color: {
      border: "border-red-500/30",
      bg: "bg-red-500/5",
      icon: "text-red-400",
      label: "text-red-300",
    },
  },
  shallow_discovery: {
    icon: Search,
    label: "SPIN 挖掘不足",
    severity: "medium" as const,
    description: "Implication 分數過低",
    color: {
      border: "border-orange-500/30",
      bg: "bg-orange-500/5",
      icon: "text-orange-400",
      label: "text-orange-300",
    },
  },
  no_urgency: {
    icon: Target,
    label: "痛點不夠痛",
    severity: "low" as const,
    description: "客戶沒有急迫感",
    color: {
      border: "border-yellow-500/30",
      bg: "bg-yellow-500/5",
      icon: "text-yellow-400",
      label: "text-yellow-300",
    },
  },
};

// ============================================================
// Component
// ============================================================

export function PdcmSpinAlerts({ alerts, className }: PdcmSpinAlertsProps) {
  if (!alerts) {
    return null;
  }

  // Filter triggered alerts
  type AlertKey = keyof typeof alertConfig;
  const validKeys = Object.keys(alertConfig) as AlertKey[];

  const triggeredAlerts = validKeys
    .filter((key) => alerts[key]?.triggered)
    .map((key) => ({
      key,
      message: alerts[key]?.message || "",
    }));

  if (triggeredAlerts.length === 0) {
    return null;
  }

  return (
    <Card
      className={cn(
        "border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900",
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-semibold text-lg text-slate-200">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          警示
          <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-amber-400 text-xs">
            {triggeredAlerts.length}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {triggeredAlerts.map(({ key, message }) => {
          const config = alertConfig[key];
          if (!config) {
            return null;
          }

          const IconComponent = config.icon;

          return (
            <div
              className={cn(
                "rounded-lg border p-3 transition-colors",
                config.color.border,
                config.color.bg
              )}
              key={key}
            >
              <div className="flex items-start gap-3">
                <IconComponent
                  className={cn("mt-0.5 h-5 w-5 shrink-0", config.color.icon)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-semibold text-sm",
                        config.color.label
                      )}
                    >
                      {config.label}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-xs",
                        config.severity === "high"
                          ? "bg-red-500/20 text-red-400"
                          : config.severity === "medium"
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-yellow-500/20 text-yellow-400"
                      )}
                    >
                      {config.severity === "high"
                        ? "HIGH"
                        : config.severity === "medium"
                          ? "MED"
                          : "LOW"}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-400 text-sm leading-relaxed">
                    {message || config.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
