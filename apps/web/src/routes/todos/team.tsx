/**
 * 團隊待辦頁面（主管視角）
 * 顯示團隊成員的待辦統計和詳細列表
 */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  addDays,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle,
  Clock,
  ListTodo,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { authClient } from "@/lib/auth-client";
import { getDisplayNameByEmail } from "@/lib/consultant-names";
import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/todos/team")({
  component: TeamTodosPage,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/login",
      });
    }
  },
});

// ============================================================
// Types
// ============================================================

interface TeamMemberStats {
  userId: string;
  userName: string;
  userEmail: string;
  todayCount: number;
  overdueCount: number;
  completedCount: number;
  completionRate: number;
}

// ============================================================
// Date Range Options
// ============================================================

type DateRangeOption =
  | "today"
  | "this_week"
  | "this_month"
  | "last_7_days"
  | "last_30_days";

const dateRangeOptions: { value: DateRangeOption; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "this_week", label: "本週" },
  { value: "this_month", label: "本月" },
  { value: "last_7_days", label: "最近 7 天" },
  { value: "last_30_days", label: "最近 30 天" },
];

function getDateRange(option: DateRangeOption): { from: string; to: string } {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  switch (option) {
    case "today":
      return { from: todayStr, to: todayStr };
    case "this_week": {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      return {
        from: format(weekStart, "yyyy-MM-dd"),
        to: format(weekEnd, "yyyy-MM-dd"),
      };
    }
    case "this_month": {
      const monthStart = startOfMonth(today);
      return {
        from: format(monthStart, "yyyy-MM-dd"),
        to: todayStr,
      };
    }
    case "last_7_days":
      return {
        from: format(subDays(today, 6), "yyyy-MM-dd"),
        to: todayStr,
      };
    case "last_30_days":
      return {
        from: format(subDays(today, 29), "yyyy-MM-dd"),
        to: todayStr,
      };
  }
}

// ============================================================
// Stat Card Component
// ============================================================

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
  isLoading,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  variant?: "default" | "success" | "warning" | "danger";
  isLoading?: boolean;
}) {
  const variantStyles = {
    default: "",
    success:
      "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
    warning:
      "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
    danger: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400",
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconStyles[variant])} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="font-bold text-2xl">{value}</div>
        )}
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Completion Rate Bar
// ============================================================

function CompletionRateBar({ rate }: { rate: number }) {
  const getColor = () => {
    if (rate >= 80) {
      return "bg-green-500";
    }
    if (rate >= 60) {
      return "bg-yellow-500";
    }
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn("h-full rounded-full transition-all", getColor())}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="font-medium text-sm">{rate}%</span>
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================

type StatusFilter = "all" | "pending" | "completed" | "cancelled";

function TeamTodosPage() {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRangeOption>("this_week");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { from: dateFrom, to: dateTo } = getDateRange(dateRange);
  const yesterday = format(addDays(new Date(), -1), "yyyy-MM-dd'T'23:59:59");

  // 取得可查看的團隊成員
  const viewableUsersQuery = useQuery({
    queryKey: ["team", "viewableUsers"],
    queryFn: () => client.team.getViewableUsers(),
  });

  const canSelectUser = viewableUsersQuery.data?.canSelectUser ?? false;
  const viewableUsers = viewableUsersQuery.data?.users ?? [];

  // 取得所有團隊成員的待辦（pending）
  const pendingTodosQuery = useQuery({
    queryKey: [
      "salesTodo",
      "list",
      {
        status: "pending",
        dateFrom,
        dateTo,
        userId: selectedUserId !== "all" ? selectedUserId : undefined,
      },
    ],
    queryFn: async () => {
      const result = await client.salesTodo.list({
        status: "pending",
        dateFrom,
        dateTo,
        userId: selectedUserId !== "all" ? selectedUserId : undefined,
        limit: 100,
        offset: 0,
      });
      return result;
    },
    enabled: canSelectUser,
  });

  // 取得已完成的待辦
  const completedTodosQuery = useQuery({
    queryKey: [
      "salesTodo",
      "list",
      {
        status: "completed",
        dateFrom,
        dateTo,
        userId: selectedUserId !== "all" ? selectedUserId : undefined,
      },
    ],
    queryFn: async () => {
      const result = await client.salesTodo.list({
        status: "completed",
        dateFrom,
        dateTo,
        userId: selectedUserId !== "all" ? selectedUserId : undefined,
        limit: 100,
        offset: 0,
      });
      return result;
    },
    enabled: canSelectUser,
  });

  // 取得逾期待辦
  const overdueTodosQuery = useQuery({
    queryKey: [
      "salesTodo",
      "list",
      {
        status: "pending",
        dateTo: yesterday,
        userId: selectedUserId !== "all" ? selectedUserId : undefined,
      },
    ],
    queryFn: async () => {
      const result = await client.salesTodo.list({
        status: "pending",
        dateTo: yesterday,
        userId: selectedUserId !== "all" ? selectedUserId : undefined,
        limit: 100,
        offset: 0,
      });
      return result;
    },
    enabled: canSelectUser,
  });

  // 取得已取消的待辦
  const cancelledTodosQuery = useQuery({
    queryKey: [
      "salesTodo",
      "list",
      {
        status: "cancelled",
        dateFrom,
        dateTo,
        userId: selectedUserId !== "all" ? selectedUserId : undefined,
      },
    ],
    queryFn: async () => {
      const result = await client.salesTodo.list({
        status: "cancelled",
        dateFrom,
        dateTo,
        userId: selectedUserId !== "all" ? selectedUserId : undefined,
        limit: 100,
        offset: 0,
      });
      return result;
    },
    enabled: canSelectUser,
  });

  // 根據 statusFilter 取得要顯示的待辦
  const filteredTodosQuery = useQuery({
    queryKey: [
      "salesTodo",
      "list",
      "filtered",
      {
        status: statusFilter === "all" ? undefined : statusFilter,
        dateFrom,
        dateTo,
        userId: selectedUserId !== "all" ? selectedUserId : undefined,
      },
    ],
    queryFn: async () => {
      const result = await client.salesTodo.list({
        status: statusFilter === "all" ? undefined : statusFilter,
        dateFrom,
        dateTo: `${dateTo}T23:59:59`,
        userId: selectedUserId !== "all" ? selectedUserId : undefined,
        limit: 100,
        offset: 0,
      });
      return result;
    },
    enabled: canSelectUser,
  });

  // 計算統計資料
  const pendingTodos = pendingTodosQuery.data?.todos ?? [];
  const completedTodos = completedTodosQuery.data?.todos ?? [];
  const overdueTodos = overdueTodosQuery.data?.todos ?? [];
  const cancelledTodos = cancelledTodosQuery.data?.todos ?? [];
  const filteredTodos = filteredTodosQuery.data?.todos ?? [];

  const totalTodos =
    pendingTodos.length + completedTodos.length + cancelledTodos.length;
  const completionRate =
    totalTodos > 0 ? Math.round((completedTodos.length / totalTodos) * 100) : 0;

  // 計算每個成員的統計（如果是看全部）
  const memberStats: TeamMemberStats[] = [];

  if (selectedUserId === "all" && viewableUsers.length > 0) {
    // 從待辦資料中提取用戶資訊
    const allTodos = [...pendingTodos, ...completedTodos];
    const userMap = new Map<string, { name: string; email: string }>();

    // 先從 viewableUsers 建立 map
    for (const user of viewableUsers) {
      userMap.set(user.id, {
        name: user.name || user.email,
        email: user.email,
      });
    }

    // 統計每個用戶
    for (const user of viewableUsers) {
      const userPending = pendingTodos.filter(
        // Note: API 沒有返回 userId，這裡需要假設待辦已經按用戶過濾
        // 實際上需要 API 支援返回 userId 或按用戶分組
        () => false // 暫時禁用，因為 API 沒有返回 userId
      ).length;

      const userCompleted = completedTodos.filter(() => false).length;
      const userOverdue = overdueTodos.filter(() => false).length;
      const userTotal = userPending + userCompleted;

      memberStats.push({
        userId: user.id,
        userName: getDisplayNameByEmail(user.email, user.name),
        userEmail: user.email,
        todayCount: userPending,
        overdueCount: userOverdue,
        completedCount: userCompleted,
        completionRate:
          userTotal > 0 ? Math.round((userCompleted / userTotal) * 100) : 0,
      });
    }
  }

  const isLoading =
    viewableUsersQuery.isLoading ||
    pendingTodosQuery.isLoading ||
    completedTodosQuery.isLoading ||
    overdueTodosQuery.isLoading ||
    cancelledTodosQuery.isLoading ||
    filteredTodosQuery.isLoading;

  // 如果不是管理者或 Admin，顯示無權限提示
  if (!(viewableUsersQuery.isLoading || canSelectUser)) {
    return (
      <main className="container mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">團隊待辦</h1>
            <p className="text-muted-foreground">查看團隊成員的待辦執行情況</p>
          </div>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">您沒有查看團隊待辦的權限</p>
            <p className="mt-1 text-muted-foreground text-sm">
              此功能僅限經理及管理員使用
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">團隊待辦</h1>
          <p className="text-muted-foreground">查看團隊成員的待辦執行情況</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">篩選:</span>
          <Select
            onValueChange={(value) => setSelectedUserId(value)}
            value={selectedUserId}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="選擇業務" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有業務</SelectItem>
              {viewableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {getDisplayNameByEmail(user.email, user.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Select
            onValueChange={(value) => setDateRange(value as DateRangeOption)}
            value={dateRange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="選擇日期範圍" />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-muted-foreground text-sm">
          {format(new Date(dateFrom), "M/d", { locale: zhTW })} -{" "}
          {format(new Date(dateTo), "M/d", { locale: zhTW })}
        </div>
      </div>

      {/* 狀態篩選 */}
      <div className="flex gap-1">
        <Button
          onClick={() => setStatusFilter("all")}
          size="sm"
          variant={statusFilter === "all" ? "default" : "outline"}
        >
          <ListTodo className="mr-1 h-4 w-4" />
          全部 ({totalTodos})
        </Button>
        <Button
          onClick={() => setStatusFilter("pending")}
          size="sm"
          variant={statusFilter === "pending" ? "default" : "outline"}
        >
          <Clock className="mr-1 h-4 w-4" />
          待辦中 ({pendingTodos.length})
        </Button>
        <Button
          onClick={() => setStatusFilter("completed")}
          size="sm"
          variant={statusFilter === "completed" ? "default" : "outline"}
        >
          <CheckCircle className="mr-1 h-4 w-4" />
          已完成 ({completedTodos.length})
        </Button>
        <Button
          onClick={() => setStatusFilter("cancelled")}
          size="sm"
          variant={statusFilter === "cancelled" ? "default" : "outline"}
        >
          <Ban className="mr-1 h-4 w-4" />
          已取消 ({cancelledTodos.length})
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          description="待處理"
          icon={Calendar}
          isLoading={isLoading}
          title="待辦事項"
          value={pendingTodos.length}
        />
        <StatCard
          description="需立即處理"
          icon={AlertCircle}
          isLoading={isLoading}
          title="逾期待辦"
          value={overdueTodos.length}
          variant={overdueTodos.length > 0 ? "danger" : "default"}
        />
        <StatCard
          description="已完成數量"
          icon={CheckCircle}
          isLoading={isLoading}
          title="已完成"
          value={completedTodos.length}
          variant="success"
        />
        <StatCard
          description="完成/總數"
          icon={Clock}
          isLoading={isLoading}
          title="完成率"
          value={`${completionRate}%`}
          variant={
            completionRate >= 80
              ? "success"
              : completionRate >= 60
                ? "warning"
                : "danger"
          }
        />
      </div>

      {/* Team Members Table */}
      {selectedUserId === "all" && viewableUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              團隊成員統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>業務</TableHead>
                  <TableHead className="text-center">待辦</TableHead>
                  <TableHead className="text-center">逾期</TableHead>
                  <TableHead className="text-center">已完成</TableHead>
                  <TableHead>完成率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="mx-auto h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="mx-auto h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="mx-auto h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : viewableUsers.length > 0 ? (
                  viewableUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {getDisplayNameByEmail(user.email, user.name)}
                      </TableCell>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">-</Badge>
                      </TableCell>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell>
                        <CompletionRateBar rate={0} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="h-24 text-center" colSpan={5}>
                      沒有團隊成員資料
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <p className="mt-4 text-muted-foreground text-xs">
              注意：目前 API 尚未支援按用戶分組統計，此表格僅顯示團隊成員列表。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Todo List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            待辦列表
            <Badge variant="secondary">{filteredTodos.length} 項</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>標題</TableHead>
                <TableHead>公司</TableHead>
                <TableHead>到期日</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>改期次數</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredTodos.length > 0 ? (
                filteredTodos.map((todo) => {
                  const isOverdue =
                    todo.status === "pending" &&
                    new Date(todo.dueDate) <
                      new Date(new Date().setHours(0, 0, 0, 0));
                  const postponeCount =
                    (todo.postponeHistory as unknown[])?.length || 0;
                  const isCompleted = todo.status === "completed";
                  const isCancelled = todo.status === "cancelled";

                  return (
                    <TableRow
                      className={cn(
                        isOverdue && "bg-destructive/5",
                        isCompleted && "bg-green-50 dark:bg-green-950",
                        isCancelled && "bg-gray-50 opacity-60 dark:bg-gray-900"
                      )}
                      key={todo.id}
                    >
                      <TableCell
                        className={cn(
                          "font-medium",
                          isCancelled && "line-through"
                        )}
                      >
                        {todo.title}
                      </TableCell>
                      <TableCell>
                        {todo.opportunity ? (
                          <Link
                            className="text-primary hover:underline"
                            params={{ id: todo.opportunity.id }}
                            to="/opportunities/$id"
                          >
                            {todo.opportunity.companyName}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(todo.dueDate), "M/d", {
                          locale: zhTW,
                        })}
                      </TableCell>
                      <TableCell>
                        {isCompleted ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            已完成
                          </Badge>
                        ) : isCancelled ? (
                          <Badge variant="secondary">
                            <Ban className="mr-1 h-3 w-3" />
                            已取消
                          </Badge>
                        ) : isOverdue ? (
                          <Badge variant="destructive">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            逾期
                          </Badge>
                        ) : (
                          <Badge variant="secondary">待處理</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {postponeCount > 0 ? (
                          <span className="text-muted-foreground">
                            {postponeCount} 次
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell className="h-24 text-center" colSpan={5}>
                    沒有待辦事項
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
