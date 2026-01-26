/**
 * MTD 上傳列表頁面
 * 顯示當月所有音檔上傳記錄（業務、客戶編號、案件編號、店名）
 * 僅限 manager 和 admin 存取
 */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileAudio,
  Loader2,
  Search,
  User,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/reports/mtd-uploads")({
  component: MtdUploadsPage,
});

const statusConfig = {
  pending: {
    label: "等待中",
    color: "text-slate-500",
    bgColor: "bg-slate-100",
    icon: Clock,
  },
  transcribing: {
    label: "轉錄中",
    color: "text-purple-500",
    bgColor: "bg-purple-100",
    icon: Loader2,
  },
  completed: {
    label: "已完成",
    color: "text-emerald-500",
    bgColor: "bg-emerald-100",
    icon: CheckCircle2,
  },
  failed: {
    label: "失敗",
    color: "text-red-500",
    bgColor: "bg-red-100",
    icon: AlertCircle,
  },
} as const;

function getStatusInfo(status: string) {
  return (
    statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: "text-gray-500",
      bgColor: "bg-gray-100",
      icon: Clock,
    }
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MtdUploadsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState("");

  const uploadsQuery = useQuery({
    queryKey: ["mtd-uploads", year, month],
    queryFn: async () => {
      const result = await client.analytics.mtdUploads({ year, month });
      return result;
    },
  });

  const uploads = uploadsQuery.data?.uploads ?? [];
  const totalCount = uploadsQuery.data?.totalCount ?? 0;
  const isLoading = uploadsQuery.isLoading;
  const isError = uploadsQuery.isError;

  // 搜尋過濾
  const filteredUploads = search
    ? uploads.filter(
        (u) =>
          u.salesRep?.toLowerCase().includes(search.toLowerCase()) ||
          u.storeName?.toLowerCase().includes(search.toLowerCase()) ||
          u.caseNumber?.toLowerCase().includes(search.toLowerCase()) ||
          u.customerNumber?.toLowerCase().includes(search.toLowerCase())
      )
    : uploads;

  // 月份選項
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1} 月`,
  }));

  // 年份選項（今年和去年）
  const yearOptions = [
    { value: now.getFullYear(), label: `${now.getFullYear()}` },
    { value: now.getFullYear() - 1, label: `${now.getFullYear() - 1}` },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link to="/reports">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-bold text-2xl tracking-tight">MTD 上傳列表</h1>
          <p className="text-muted-foreground">
            {year} 年 {month} 月音檔上傳記錄
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* 年份選擇 */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select
                onValueChange={(v) => setYear(Number(v))}
                value={year.toString()}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y.value} value={y.value.toString()}>
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 月份選擇 */}
            <Select
              onValueChange={(v) => setMonth(Number(v))}
              value={month.toString()}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 搜尋 */}
            <div className="min-w-[200px] flex-1">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜尋業務、店名、編號..."
                  value={search}
                />
              </div>
            </div>

            {/* 統計 */}
            <div className="text-muted-foreground text-sm">
              共{" "}
              <span className="font-semibold text-foreground">
                {totalCount}
              </span>{" "}
              筆
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            上傳記錄
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton className="h-12 w-full" key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-red-500">
              <AlertCircle className="mx-auto mb-2 h-8 w-8" />
              <p>無法載入資料，請確認您有權限存取此頁面</p>
            </div>
          ) : filteredUploads.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileAudio className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>本月尚無上傳記錄</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">業務</TableHead>
                    <TableHead className="w-[140px]">客戶編號</TableHead>
                    <TableHead className="w-[140px]">案件編號</TableHead>
                    <TableHead>店名</TableHead>
                    <TableHead className="w-[120px]">上傳時間</TableHead>
                    <TableHead className="w-[100px]">狀態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUploads.map((upload) => {
                    const statusInfo = getStatusInfo(upload.status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow key={upload.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {upload.salesRep}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {upload.customerNumber}
                        </TableCell>
                        <TableCell>
                          <Link
                            className="font-mono text-blue-600 text-sm hover:underline"
                            to={`/conversations/${upload.id}`}
                          >
                            {upload.caseNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{upload.storeName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(upload.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium text-xs ${statusInfo.bgColor} ${statusInfo.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
