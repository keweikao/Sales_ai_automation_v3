import { Info } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getTerm, type TermDefinition } from "@/lib/glossary";
import { cn } from "@/lib/utils";

interface TermTooltipProps {
  /** 術語 key（對應 glossary 中的 key） */
  termKey?: string;
  /** 直接傳入定義（優先於 termKey） */
  definition?: TermDefinition;
  /** 要顯示的文字 */
  children: ReactNode;
  /** 額外的 className */
  className?: string;
  /** 圖示大小 */
  iconSize?: number;
}

/**
 * 術語提示元件
 * 在名詞右上角顯示一個 hover icon，滑鼠移上去會顯示定義和計算方式
 */
export function TermTooltip({
  termKey,
  definition: propDefinition,
  children,
  className,
  iconSize = 12,
}: TermTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const definition = propDefinition ?? (termKey ? getTerm(termKey) : undefined);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY - 8,
        left: rect.left + rect.width / 2 + window.scrollX,
      });
    }
  }, [isOpen]);

  if (!definition) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={cn("relative inline-flex items-baseline", className)}>
      <span>{children}</span>
      <span
        className="relative ml-0.5 inline-flex cursor-help"
        onBlur={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        ref={triggerRef}
      >
        <Info
          className="text-muted-foreground/60 transition-colors hover:text-primary"
          size={iconSize}
          style={{ verticalAlign: "super", marginTop: "-0.25em" }}
        />

        {/* Tooltip 內容 - 使用 Portal 渲染到 body */}
        {isOpen &&
          createPortal(
            <div
              className={cn(
                "fixed z-[9999] w-72 -translate-x-1/2 -translate-y-full",
                "rounded-lg border border-border bg-popover p-3 shadow-xl",
                "fade-in-0 zoom-in-95 animate-in"
              )}
              style={{ top: position.top, left: position.left }}
            >
              {/* 箭頭 */}
              <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-border border-r border-b bg-popover" />

              {/* 標題 */}
              <div className="mb-1.5 font-semibold text-foreground text-sm">
                {definition.term}
              </div>

              {/* 定義 */}
              <p className="text-muted-foreground text-xs leading-relaxed">
                {definition.definition}
              </p>

              {/* 計算方式 */}
              {definition.calculation && (
                <div className="mt-2 border-border border-t pt-2">
                  <div className="mb-0.5 font-medium text-muted-foreground text-xs">
                    計算方式
                  </div>
                  <p className="text-muted-foreground/80 text-xs leading-relaxed">
                    {definition.calculation}
                  </p>
                </div>
              )}
            </div>,
            document.body
          )}
      </span>
    </span>
  );
}

/**
 * 簡化版：只需傳入 termKey 即可
 */
export function Term({
  k,
  children,
  className,
}: {
  k: string;
  children?: ReactNode;
  className?: string;
}) {
  const definition = getTerm(k);
  return (
    <TermTooltip className={className} termKey={k}>
      {children ?? definition?.term ?? k}
    </TermTooltip>
  );
}
