import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/share/$token")({
  component: PublicSharePage,
});

function PublicSharePage() {
  const { token } = Route.useParams();

  const conversationQuery = useQuery({
    queryKey: ["share", "conversation", token],
    queryFn: async () => {
      return await client.share.getByToken({ token });
    },
    retry: false, // Token 無效就不重試
  });

  const conversation = conversationQuery.data;
  const isLoading = conversationQuery.isLoading;
  const isError = conversationQuery.isError;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl space-y-6 p-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto max-w-4xl p-8">
        <Card className="border-red-200">
          <CardContent className="p-8 text-center">
            <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h2 className="mb-2 font-bold text-2xl">連結無效或已過期</h2>
            <p className="text-muted-foreground">
              {conversationQuery.error?.message ||
                "此分享連結不存在或已失效，請聯繫您的業務專員。"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  const meddicScore = conversation.meddicAnalysis?.overallScore || 0;
  const meddicStatus = conversation.meddicAnalysis?.status || "未知";

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="mb-2 font-bold text-3xl">
          {conversation.companyName} - 銷售對話分析
        </h1>
        <p className="text-muted-foreground">
          案件編號: {conversation.caseNumber}
        </p>
      </div>

      {/* MEDDIC Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            MEDDIC 資格評估
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">綜合評分</p>
              <p className="font-bold text-4xl">{meddicScore}/100</p>
            </div>
            <Badge
              className="text-lg"
              variant={
                meddicScore >= 70
                  ? "default"
                  : meddicScore >= 40
                    ? "secondary"
                    : "destructive"
              }
            >
              {meddicStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Agent 4 會議摘要 */}
      {conversation.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              會議摘要
            </CardTitle>
            <CardDescription>iCHEF 業務為您整理的重點摘要</CardDescription>
          </CardHeader>
          <CardContent>
            {/* 案件資訊 */}
            <div className="mb-4 rounded-lg bg-muted p-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">
                    客戶編號
                  </dt>
                  <dd className="mt-1">
                    {conversation.opportunity?.customerId || "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    案件編號
                  </dt>
                  <dd className="mt-1">{conversation.caseNumber}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">店名</dt>
                  <dd className="mt-1">{conversation.companyName}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    專屬業務
                  </dt>
                  <dd className="mt-1">
                    {conversation.slackUser?.slackUsername || "iCHEF 業務"}
                    {conversation.slackUser?.slackEmail && (
                      <div className="text-muted-foreground text-xs">
                        {conversation.slackUser.slackEmail}
                      </div>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Summary 內容 */}
            <div className="prose prose-sm max-w-none">
              {conversation.summary.split("\n").map((line, i) => (
                <p className="text-muted-foreground" key={i}>
                  {line}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MEDDIC Dimensions */}
      {conversation.meddicAnalysis?.dimensions && (
        <Card>
          <CardHeader>
            <CardTitle>MEDDIC 六維度分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(conversation.meddicAnalysis.dimensions).map(
                ([key, dim]: [string, any]) => (
                  <div className="space-y-1" key={key}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{key}</span>
                      <span className="text-muted-foreground text-sm">
                        {dim.score}/5
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${
                          dim.score >= 4
                            ? "bg-green-500"
                            : dim.score >= 3
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${(dim.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {conversation.meddicAnalysis?.nextSteps && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              下一步行動
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {conversation.meddicAnalysis.nextSteps.map(
                (step: any, i: number) => (
                  <li className="flex items-start gap-2" key={i}>
                    <span className="text-muted-foreground">•</span>
                    <span>{step.action || step}</span>
                  </li>
                )
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Risks */}
      {conversation.meddicAnalysis?.risks &&
        conversation.meddicAnalysis.risks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-5 w-5" />
                風險提醒
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {conversation.meddicAnalysis.risks.map(
                  (risk: any, i: number) => (
                    <li className="flex items-start gap-2" key={i}>
                      <span className="text-orange-600">⚠️</span>
                      <span>{risk.risk || risk}</span>
                    </li>
                  )
                )}
              </ul>
            </CardContent>
          </Card>
        )}

      {/* Footer */}
      <div className="text-center text-muted-foreground text-sm">
        <p>此報告由 iCHEF Sales AI 系統自動生成</p>
        <p>如有疑問，請聯繫您的業務專員</p>
      </div>
    </div>
  );
}
