/**
 * Tactical Suggestions Component
 * 顯示 Agent 6 產生的戰術建議和話術
 */

import { Check, Copy, MessageSquareQuote, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

export interface TacticalSuggestion {
  trigger: string;
  suggestion: string;
  talk_track: string;
}

interface TacticalSuggestionsProps {
  suggestions: TacticalSuggestion[] | null;
  className?: string;
}

// ============================================================
// Component
// ============================================================

export function TacticalSuggestions({
  suggestions,
  className,
}: TacticalSuggestionsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("話術已複製到剪貼簿");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("複製失敗");
    }
  };

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card
        className={cn(
          "border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900",
          className
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-semibold text-lg text-slate-200">
            <Target className="h-5 w-5 text-purple-400" />
            戰術建議
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <MessageSquareQuote className="mx-auto h-12 w-12 text-slate-600" />
            <p className="mt-3 text-slate-400 text-sm">尚無戰術建議</p>
          </div>
        </CardContent>
      </Card>
    );
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
          <Target className="h-5 w-5 text-purple-400" />
          戰術建議
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {suggestions.map((suggestion, index) => (
          <div
            className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 transition-colors hover:border-purple-500/30"
            key={index}
          >
            {/* Trigger */}
            <div className="mb-3">
              <Badge
                className="mb-2 bg-slate-700/50 font-normal text-slate-300"
                variant="secondary"
              >
                觸發情境
              </Badge>
              <p className="text-slate-400 text-sm leading-relaxed">
                {suggestion.trigger}
              </p>
            </div>

            {/* Suggestion */}
            <div className="mb-3">
              <Badge
                className="mb-2 bg-purple-500/20 font-normal text-purple-300"
                variant="secondary"
              >
                建議動作
              </Badge>
              <p className="text-slate-300 text-sm leading-relaxed">
                {suggestion.suggestion}
              </p>
            </div>

            {/* Talk Track */}
            <div>
              <Badge
                className="mb-2 bg-emerald-500/20 font-normal text-emerald-300"
                variant="secondary"
              >
                建議話術
              </Badge>
              <div className="group relative">
                <button
                  className="w-full cursor-pointer rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-left transition-colors hover:border-emerald-500/40"
                  onClick={() => handleCopy(suggestion.talk_track, index)}
                  type="button"
                >
                  <div className="flex items-start gap-2">
                    <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <p className="flex-1 text-emerald-100 text-sm italic leading-relaxed">
                      「{suggestion.talk_track}」
                    </p>
                    <span className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-slate-700/50 group-hover:opacity-100">
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-400" />
                      )}
                    </span>
                  </div>
                </button>
                <p className="mt-1 text-center text-slate-500 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                  點擊複製話術
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
