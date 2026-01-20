import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/login",
        throw: true,
      });
    }
    return { session };
  },
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  // 查詢用戶的 conversations
  const conversationsQuery = useQuery(
    orpc.conversations.list.queryOptions({ limit: 10, offset: 0 })
  );

  const conversations = conversationsQuery.data?.items || [];
  const isLoading = conversationsQuery.isLoading;

  return (
    <div className="container mx-auto space-y-6 p-8">
      <h1 className="mb-4 font-bold text-3xl">Dashboard</h1>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>用戶資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="font-medium">姓名: </span>
            <span className="text-muted-foreground">
              {session.data?.user.name || "未設定"}
            </span>
          </div>
          <div>
            <span className="font-medium">Email: </span>
            <span className="text-muted-foreground">
              {session.data?.user.email}
            </span>
          </div>
          <div>
            <span className="font-medium">User ID: </span>
            <span className="font-mono text-muted-foreground text-xs">
              {session.data?.user.id}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle>我的對話記錄</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : conversationsQuery.isError ? (
            <div className="text-center text-red-600">
              <p className="mb-2 font-semibold">載入失敗</p>
              <p className="text-muted-foreground text-sm">
                {conversationsQuery.error?.message || "無法載入對話列表"}
              </p>
              <Button
                className="mt-4"
                onClick={() => conversationsQuery.refetch()}
                size="sm"
                variant="outline"
              >
                重試
              </Button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-muted-foreground">尚無對話記錄</p>
              <Button asChild>
                <Link to="/conversations/new">上傳音檔</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <Link
                  className="block rounded-lg border p-4 transition-colors hover:bg-muted"
                  key={conv.id}
                  to={`/conversations/${conv.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {conv.title || "未命名對話"}
                        </h3>
                        <Badge
                          variant={
                            conv.status === "completed"
                              ? "default"
                              : conv.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {conv.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {conv.caseNumber} • {conv.opportunityCompanyName}
                      </p>
                      {conv.meddicScore !== null && (
                        <p className="mt-1 text-sm">
                          MEDDIC 分數: {conv.meddicScore}/100
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
