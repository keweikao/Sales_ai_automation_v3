/**
 * Opportunity API Router
 * CRUD operations for sales opportunities
 */

import { db } from "@Sales_ai_automation_v3/db";
import {
  conversations,
  meddicAnalyses,
  opportunities,
  salesTodos,
  todoLogs,
  user,
  userProfiles,
} from "@Sales_ai_automation_v3/db/schema";
import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

// ============================================================
// Schemas
// ============================================================

const createOpportunitySchema = z.object({
  customerNumber: z.string().min(1), // Required: Salesforce UUID
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  source: z
    .enum(["manual", "import", "api", "referral", "slack"])
    .default("manual"),
  status: z
    .enum([
      "new",
      "contacted",
      "qualified",
      "proposal",
      "negotiation",
      "won",
      "lost",
    ])
    .default("new"),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  notes: z.string().optional(),
  // 產品線（可選，預設為 'ichef'）
  productLine: z.enum(["ichef", "beauty"]).optional(),

  // Product-Specific Business Context
  storeType: z.string().optional(),
  serviceType: z.string().optional(),
  staffCount: z.string().optional(),
  currentSystem: z.string().optional(),
  decisionMakerPresent: z.enum(["yes", "no", "unknown"]).optional(),
});

const updateOpportunitySchema = z.object({
  opportunityId: z.string(),
  customerNumber: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  source: z.enum(["manual", "import", "api", "referral", "slack"]).optional(),
  status: z
    .enum([
      "new",
      "contacted",
      "qualified",
      "proposal",
      "negotiation",
      "won",
      "lost",
    ])
    .optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  notes: z.string().optional(),
  productLine: z.enum(["ichef", "beauty"]).optional(),

  // Product-Specific Business Context
  storeType: z.string().optional(),
  serviceType: z.string().optional(),
  staffCount: z.string().optional(),
  currentSystem: z.string().optional(),
  decisionMakerPresent: z.enum(["yes", "no", "unknown"]).optional(),
});

const deleteOpportunitySchema = z.object({
  opportunityId: z.string(),
});

const listOpportunitiesSchema = z.object({
  status: z
    .enum([
      "new",
      "contacted",
      "qualified",
      "proposal",
      "negotiation",
      "won",
      "lost",
    ])
    .optional(),
  source: z.enum(["manual", "import", "api", "referral"]).optional(),
  search: z.string().optional(),
  productLine: z.enum(["ichef", "beauty"]).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const getOpportunitySchema = z.object({
  opportunityId: z.string(),
});

const getOpportunityByCustomerNumberSchema = z.object({
  customerNumber: z.string(),
});

const rejectOpportunitySchema = z.object({
  opportunityId: z.string(),
  rejectionReason: z.string().min(1),
  competitor: z.string().optional(),
  note: z.string().optional(),
});

const winOpportunitySchema = z.object({
  opportunityId: z.string(),
});

// ============================================================
// Create Opportunity
// ============================================================

export const createOpportunity = protectedProcedure
  .input(createOpportunitySchema)
  .handler(async ({ input, context }) => {
    const userId = context.session?.user.id;

    if (!userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const result = await db
      .insert(opportunities)
      .values({
        id: randomUUID(),
        userId,
        customerNumber: input.customerNumber,
        companyName: input.companyName,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        source: input.source,
        status: input.status,
        industry: input.industry,
        companySize: input.companySize,
        notes: input.notes,
        productLine: input.productLine || "ichef",

        // Product-Specific Business Context
        storeType: input.storeType,
        serviceType: input.serviceType,
        staffCount: input.staffCount,
        currentSystem: input.currentSystem,
        decisionMakerPresent: input.decisionMakerPresent,
      })
      .returning();

    const opportunity = result[0];
    if (!opportunity) {
      throw new ORPCError("INTERNAL_SERVER_ERROR");
    }

    // 失效 opportunities 快取
    try {
      const { createKVCacheService, invalidateOpportunitiesCache } =
        await import("@Sales_ai_automation_v3/services");
      const cacheService = createKVCacheService(
        context.honoContext.env.CACHE_KV
      );
      await invalidateOpportunitiesCache(cacheService, userId);
    } catch (error) {
      console.warn("[Cache] Failed to invalidate cache:", error);
    }

    return {
      id: opportunity.id,
      customerNumber: opportunity.customerNumber,
      companyName: opportunity.companyName,
      contactName: opportunity.contactName,
      contactEmail: opportunity.contactEmail,
      contactPhone: opportunity.contactPhone,
      source: opportunity.source,
      status: opportunity.status,
      industry: opportunity.industry,
      companySize: opportunity.companySize,
      notes: opportunity.notes,
      productLine: opportunity.productLine,

      // Product-Specific Business Context
      storeType: opportunity.storeType,
      serviceType: opportunity.serviceType,
      staffCount: opportunity.staffCount,
      currentSystem: opportunity.currentSystem,
      decisionMakerPresent: opportunity.decisionMakerPresent,

      createdAt: opportunity.createdAt,
      updatedAt: opportunity.updatedAt,
    };
  });

// ============================================================
// Update Opportunity
// ============================================================

export const updateOpportunity = protectedProcedure
  .input(updateOpportunitySchema)
  .handler(async ({ input, context }) => {
    const { opportunityId, ...updates } = input;
    const userId = context.session?.user.id;

    if (!userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const existingOpportunity = await db.query.opportunities.findFirst({
      where: and(
        eq(opportunities.id, opportunityId),
        eq(opportunities.userId, userId)
      ),
    });

    if (!existingOpportunity) {
      throw new ORPCError("NOT_FOUND");
    }

    const updateResult = await db
      .update(opportunities)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(opportunities.id, opportunityId))
      .returning();

    const updatedOpportunity = updateResult[0];
    if (!updatedOpportunity) {
      throw new ORPCError("INTERNAL_SERVER_ERROR");
    }

    // 失效 opportunities 快取（包含詳情）
    try {
      const { createKVCacheService, invalidateOpportunitiesCache } =
        await import("@Sales_ai_automation_v3/services");
      const cacheService = createKVCacheService(
        context.honoContext.env.CACHE_KV
      );
      await invalidateOpportunitiesCache(cacheService, userId, opportunityId);
    } catch (error) {
      console.warn("[Cache] Failed to invalidate cache:", error);
    }

    return {
      id: updatedOpportunity.id,
      customerNumber: updatedOpportunity.customerNumber,
      companyName: updatedOpportunity.companyName,
      contactName: updatedOpportunity.contactName,
      contactEmail: updatedOpportunity.contactEmail,
      contactPhone: updatedOpportunity.contactPhone,
      source: updatedOpportunity.source,
      status: updatedOpportunity.status,
      industry: updatedOpportunity.industry,
      companySize: updatedOpportunity.companySize,
      notes: updatedOpportunity.notes,
      productLine: updatedOpportunity.productLine,

      // Product-Specific Business Context
      storeType: updatedOpportunity.storeType,
      serviceType: updatedOpportunity.serviceType,
      staffCount: updatedOpportunity.staffCount,
      currentSystem: updatedOpportunity.currentSystem,
      decisionMakerPresent: updatedOpportunity.decisionMakerPresent,

      createdAt: updatedOpportunity.createdAt,
      updatedAt: updatedOpportunity.updatedAt,
    };
  });

// ============================================================
// Delete Opportunity
// ============================================================

export const deleteOpportunity = protectedProcedure
  .input(deleteOpportunitySchema)
  .handler(async ({ input, context }) => {
    const { opportunityId } = input;
    const userId = context.session?.user.id;

    if (!userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const existingOpportunity = await db.query.opportunities.findFirst({
      where: and(
        eq(opportunities.id, opportunityId),
        eq(opportunities.userId, userId)
      ),
    });

    if (!existingOpportunity) {
      throw new ORPCError("NOT_FOUND");
    }

    await db.delete(opportunities).where(eq(opportunities.id, opportunityId));

    return {
      success: true,
      message: "Opportunity deleted successfully",
    };
  });

// ============================================================
// List Opportunities
// ============================================================

// 機會列表的快取資料類型
export interface CachedOpportunity {
  id: string;
  customerNumber: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  source: string;
  status: string;
  industry: string | null;
  companySize: string | null;
  notes: string | null;
  opportunityScore: number | null;
  meddicScore: { overall: number } | null;
  createdAt: Date;
  updatedAt: Date;
  wonAt: Date | null;
  lostAt: Date | null;
  spinScore: number | null;
  salesRepName: string | null;
  latestCaseNumber: string | null;
}

export const listOpportunities = protectedProcedure
  .input(listOpportunitiesSchema)
  .handler(async ({ input, context }) => {
    const { status, source, search, productLine, limit, offset } = input;
    const userId = context.session?.user.id;

    if (!userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // Check user role and permissions
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });
    const isAdmin =
      userProfile?.role === "admin" && userProfile?.department === "all";
    const isManager = userProfile?.role === "manager";
    const managerProductLine = userProfile?.department; // ichef, beauty, or null

    // Determine access level:
    // - Service account or admin: see all opportunities
    // - Manager: see opportunities for their product line only
    // - Sales rep: see only their own opportunities
    const isServiceAccount = context.isServiceAccount === true;
    const canViewAll = isServiceAccount || isAdmin;

    // ============================================================
    // KV Cache 邏輯
    // ============================================================
    const { createKVCacheService } = await import(
      "@Sales_ai_automation_v3/services"
    );
    const cacheService = createKVCacheService(context.honoContext.env.CACHE_KV);

    // 只有無搜尋、無 source 篩選、無 productLine 篩選時才使用快取
    const canUseCache = !(search || source || productLine);
    const statusKey = status || "active";
    const cacheKey = canViewAll
      ? `admin:opportunities:list:${statusKey}`
      : isManager && managerProductLine
        ? `manager:${managerProductLine}:opportunities:list:${statusKey}`
        : `user:${userId}:opportunities:list:${statusKey}`;

    // 嘗試從快取讀取
    if (canUseCache) {
      try {
        const cached = await cacheService.get<CachedOpportunity[]>(cacheKey);
        if (cached && cached.length > 0) {
          console.log(`[Cache Hit] ${cacheKey}`);
          return {
            opportunities: cached.slice(offset, offset + limit),
            total: cached.length,
            limit,
            offset,
          };
        }
      } catch (error) {
        console.warn("[Cache] Failed to read, falling back to DB:", error);
      }
    }

    const conditions: ReturnType<typeof eq>[] = [];

    if (!canViewAll) {
      if (isManager && managerProductLine) {
        // Manager can only see their product line
        conditions.push(eq(opportunities.productLine, managerProductLine));
      } else {
        // Regular user can only see their own opportunities
        conditions.push(eq(opportunities.userId, userId));
      }
    }

    // Status 篩選：如果沒指定 status，預設排除 won 和 lost（顯示進行中）
    if (status) {
      conditions.push(eq(opportunities.status, status));
    } else {
      conditions.push(sql`${opportunities.status} NOT IN ('won', 'lost')`);
    }

    if (source) {
      conditions.push(eq(opportunities.source, source));
    }

    if (productLine) {
      conditions.push(eq(opportunities.productLine, productLine));
    }

    // 處理搜尋：如果有搜尋詞，先找出符合 case_number 或 store_name 的 opportunity IDs
    let searchMatchingOppIds: string[] = [];
    if (search) {
      const searchPattern = `%${search}%`;

      const matchingConvs = await db
        .selectDistinct({ opportunityId: conversations.opportunityId })
        .from(conversations)
        .where(
          or(
            ilike(conversations.caseNumber, searchPattern),
            ilike(conversations.storeName, searchPattern)
          )!
        );

      searchMatchingOppIds = matchingConvs
        .map((c) => c.opportunityId)
        .filter((id): id is string => id !== null);
    }

    if (search) {
      const searchPattern = `%${search}%`;

      const searchConditions = [
        ilike(opportunities.companyName, searchPattern),
        ilike(opportunities.contactName, searchPattern),
        ilike(opportunities.contactEmail, searchPattern),
        ilike(opportunities.customerNumber, searchPattern),
      ];

      // 如果從 conversations 找到匹配的 opportunity IDs，加入條件
      if (searchMatchingOppIds.length > 0) {
        searchConditions.push(
          sql`${opportunities.id} IN (${sql.raw(
            searchMatchingOppIds.map((id) => `'${id}'`).join(", ")
          )})`
        );
      }

      conditions.push(or(...searchConditions)!);
    }

    // 先查詢總數（不分頁）
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const totalCount = Number(countResult[0]?.count ?? 0);

    const results = await db
      .select()
      .from(opportunities)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(opportunities.updatedAt))
      .limit(limit)
      .offset(offset);

    // ============================================================
    // 批次查詢優化：從 N+1 (63次查詢) 優化為 4 次批次查詢
    // ============================================================

    const opportunityIds = results.map((r) => r.id);

    // 批次查詢 1: 取得所有機會的最新 conversation
    // 使用子查詢取得每個 opportunity 的最新 conversation
    const allConversations =
      opportunityIds.length > 0
        ? await db
            .select({
              opportunityId: conversations.opportunityId,
              id: conversations.id,
              caseNumber: conversations.caseNumber,
              slackUsername: conversations.slackUsername,
              createdAt: conversations.createdAt,
            })
            .from(conversations)
            .where(inArray(conversations.opportunityId, opportunityIds))
            .orderBy(desc(conversations.createdAt))
        : [];

    // 建立每個 opportunity 的最新 conversation 映射
    const latestConversationMap = new Map<
      string,
      { id: string; caseNumber: string | null; slackUsername: string | null }
    >();
    for (const conv of allConversations) {
      if (
        conv.opportunityId &&
        !latestConversationMap.has(conv.opportunityId)
      ) {
        latestConversationMap.set(conv.opportunityId, {
          id: conv.id,
          caseNumber: conv.caseNumber,
          slackUsername: conv.slackUsername,
        });
      }
    }

    // 批次查詢 2: 取得所有相關 conversation 的 MEDDIC 分析
    const conversationIds = [...latestConversationMap.values()].map(
      (c) => c.id
    );
    const allAnalyses =
      conversationIds.length > 0
        ? await db
            .select({
              conversationId: meddicAnalyses.conversationId,
              agentOutputs: meddicAnalyses.agentOutputs,
              createdAt: meddicAnalyses.createdAt,
            })
            .from(meddicAnalyses)
            .where(inArray(meddicAnalyses.conversationId, conversationIds))
            .orderBy(desc(meddicAnalyses.createdAt))
        : [];

    // 建立每個 conversation 的最新分析映射
    const latestAnalysisMap = new Map<string, Record<string, unknown> | null>();
    for (const analysis of allAnalyses) {
      if (
        analysis.conversationId &&
        !latestAnalysisMap.has(analysis.conversationId)
      ) {
        latestAnalysisMap.set(
          analysis.conversationId,
          analysis.agentOutputs as Record<string, unknown> | null
        );
      }
    }

    // 批次查詢 3: 取得所有相關 user 的名稱
    const userIds = [
      ...new Set(
        results
          .map((r) => r.userId)
          .filter((id): id is string => !!id && id !== "service-account")
      ),
    ];
    const allUsers =
      userIds.length > 0
        ? await db.query.user.findMany({
            where: inArray(user.id, userIds),
            columns: { id: true, name: true },
          })
        : [];
    const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

    // 組合結果（純記憶體操作，無 DB 查詢）
    const opportunitiesWithExtras = results.map((opportunity) => {
      const latestConversation = latestConversationMap.get(opportunity.id);

      // 從分析中提取 SPIN 分數
      let spinScore: number | null = null;
      if (latestConversation?.id) {
        const agentOutputs = latestAnalysisMap.get(latestConversation.id);
        if (agentOutputs) {
          const agent3 = agentOutputs.agent3 as
            | Record<string, unknown>
            | undefined;
          const spinAnalysis = agent3?.spin_analysis as
            | Record<string, unknown>
            | undefined;
          const completionRate = spinAnalysis?.spin_completion_rate;
          if (typeof completionRate === "number") {
            spinScore = Math.round(completionRate * 100);
          }
        }
      }

      // 取得業務名稱
      let ownerName: string | null = null;
      if (opportunity.userId && opportunity.userId !== "service-account") {
        ownerName = userMap.get(opportunity.userId) || null;
      }
      if (!ownerName && latestConversation?.slackUsername) {
        ownerName = latestConversation.slackUsername;
      }

      return {
        id: opportunity.id,
        customerNumber: opportunity.customerNumber,
        companyName: opportunity.companyName,
        contactName: opportunity.contactName,
        contactEmail: opportunity.contactEmail,
        contactPhone: opportunity.contactPhone,
        source: opportunity.source,
        status: opportunity.status,
        industry: opportunity.industry,
        companySize: opportunity.companySize,
        notes: opportunity.notes,
        opportunityScore: opportunity.opportunityScore,
        meddicScore: opportunity.meddicScore,
        createdAt: opportunity.createdAt,
        updatedAt: opportunity.updatedAt,
        wonAt: opportunity.wonAt,
        lostAt: opportunity.lostAt,
        spinScore,
        salesRepName: ownerName,
        latestCaseNumber: latestConversation?.caseNumber || null,
      };
    });

    // ============================================================
    // 寫入 KV Cache（只有可快取的查詢才寫入）
    // ============================================================
    if (canUseCache && opportunitiesWithExtras.length > 0) {
      try {
        // 查詢完整列表（不分頁）用於快取
        // 這樣分頁可以從快取中 slice
        const fullResults = await db
          .select()
          .from(opportunities)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(opportunities.updatedAt))
          .limit(100); // 最多快取 100 筆

        // 快取資料需要包含所有欄位
        const fullOpportunitiesIds = fullResults.map((r) => r.id);

        // 批次查詢完整列表的 conversations
        const fullConversations =
          fullOpportunitiesIds.length > 0
            ? await db
                .select({
                  opportunityId: conversations.opportunityId,
                  id: conversations.id,
                  caseNumber: conversations.caseNumber,
                  slackUsername: conversations.slackUsername,
                  createdAt: conversations.createdAt,
                })
                .from(conversations)
                .where(
                  inArray(conversations.opportunityId, fullOpportunitiesIds)
                )
                .orderBy(desc(conversations.createdAt))
            : [];

        const fullConvMap = new Map<
          string,
          {
            id: string;
            caseNumber: string | null;
            slackUsername: string | null;
          }
        >();
        for (const conv of fullConversations) {
          if (conv.opportunityId && !fullConvMap.has(conv.opportunityId)) {
            fullConvMap.set(conv.opportunityId, {
              id: conv.id,
              caseNumber: conv.caseNumber,
              slackUsername: conv.slackUsername,
            });
          }
        }

        // 批次查詢完整列表的 meddicAnalyses
        const fullConvIds = [...fullConvMap.values()].map((c) => c.id);
        const fullAnalyses =
          fullConvIds.length > 0
            ? await db
                .select({
                  conversationId: meddicAnalyses.conversationId,
                  agentOutputs: meddicAnalyses.agentOutputs,
                  createdAt: meddicAnalyses.createdAt,
                })
                .from(meddicAnalyses)
                .where(inArray(meddicAnalyses.conversationId, fullConvIds))
                .orderBy(desc(meddicAnalyses.createdAt))
            : [];

        const fullAnalysisMap = new Map<
          string,
          Record<string, unknown> | null
        >();
        for (const analysis of fullAnalyses) {
          if (
            analysis.conversationId &&
            !fullAnalysisMap.has(analysis.conversationId)
          ) {
            fullAnalysisMap.set(
              analysis.conversationId,
              analysis.agentOutputs as Record<string, unknown> | null
            );
          }
        }

        // 批次查詢完整列表的 users
        const fullUserIds = [
          ...new Set(
            fullResults
              .map((r) => r.userId)
              .filter((id): id is string => !!id && id !== "service-account")
          ),
        ];
        const fullUsers =
          fullUserIds.length > 0
            ? await db.query.user.findMany({
                where: inArray(user.id, fullUserIds),
                columns: { id: true, name: true },
              })
            : [];
        const fullUserMap = new Map(fullUsers.map((u) => [u.id, u.name]));

        // 組合完整快取資料
        const cacheData: CachedOpportunity[] = fullResults.map((opp) => {
          const conv = fullConvMap.get(opp.id);
          let spinScore: number | null = null;
          if (conv?.id) {
            const outputs = fullAnalysisMap.get(conv.id);
            if (outputs) {
              const agent3 = outputs.agent3 as
                | Record<string, unknown>
                | undefined;
              const spinAnalysis = agent3?.spin_analysis as
                | Record<string, unknown>
                | undefined;
              const completionRate = spinAnalysis?.spin_completion_rate;
              if (typeof completionRate === "number") {
                spinScore = Math.round(completionRate * 100);
              }
            }
          }

          let ownerName: string | null = null;
          if (opp.userId && opp.userId !== "service-account") {
            ownerName = fullUserMap.get(opp.userId) || null;
          }
          if (!ownerName && conv?.slackUsername) {
            ownerName = conv.slackUsername;
          }

          return {
            id: opp.id,
            customerNumber: opp.customerNumber,
            companyName: opp.companyName,
            contactName: opp.contactName,
            contactEmail: opp.contactEmail,
            contactPhone: opp.contactPhone,
            source: opp.source,
            status: opp.status,
            industry: opp.industry,
            companySize: opp.companySize,
            notes: opp.notes,
            opportunityScore: opp.opportunityScore,
            meddicScore: opp.meddicScore,
            createdAt: opp.createdAt,
            updatedAt: opp.updatedAt,
            wonAt: opp.wonAt,
            lostAt: opp.lostAt,
            spinScore,
            salesRepName: ownerName,
            latestCaseNumber: conv?.caseNumber || null,
          };
        });

        await cacheService.set(cacheKey, cacheData, 600); // 10 分鐘 TTL
        console.log(`[Cache Set] ${cacheKey} (${cacheData.length} items)`);
      } catch (error) {
        console.warn("[Cache] Failed to write cache:", error);
        // 寫入失敗不影響主流程
      }
    }

    return {
      opportunities: opportunitiesWithExtras,
      total: totalCount,
      limit,
      offset,
    };
  });

// ============================================================
// 權限控制 - 三級權限：管理者、主管、一般業務
// ============================================================

function getUserRole(
  userEmail: string | null | undefined,
  env?: { ADMIN_EMAILS?: string; MANAGER_EMAILS?: string }
): "admin" | "manager" | "sales" {
  if (!userEmail) {
    return "sales";
  }

  // 從 Cloudflare Workers env 或 process.env 讀取
  const adminEmails = (env?.ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const managerEmails = (
    env?.MANAGER_EMAILS ||
    process.env.MANAGER_EMAILS ||
    ""
  )
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (adminEmails.includes(userEmail)) {
    return "admin";
  }
  if (managerEmails.includes(userEmail)) {
    return "manager";
  }
  return "sales";
}

// ============================================================
// Get Opportunity Details
// ============================================================

export const getOpportunity = protectedProcedure
  .input(getOpportunitySchema)
  .handler(async ({ input, context }) => {
    const { opportunityId } = input;
    const userId = context.session?.user.id;

    if (!userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // 先查詢 opportunity（不限制 userId）
    const opportunity = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, opportunityId),
      with: {
        conversations: {
          orderBy: (conversations, { desc }) => [
            desc(conversations.conversationDate),
          ],
          limit: 10,
          with: {
            meddicAnalyses: {
              orderBy: (meddicAnalyses, { desc }) => [
                desc(meddicAnalyses.createdAt),
              ],
              limit: 1,
            },
          },
        },
      },
    });

    if (!opportunity) {
      throw new ORPCError("NOT_FOUND");
    }

    // 檢查權限：所有者、管理員/主管、或 Slack 建立的商機
    const userEmail = context.session?.user.email;
    const userRole = getUserRole(userEmail, context.honoContext.env);
    const isOwner = opportunity.userId === userId;
    const isSlackGenerated =
      !opportunity.userId || opportunity.userId === "service-account";
    const hasAdminAccess = userRole === "admin" || userRole === "manager";

    if (!(isOwner || isSlackGenerated || hasAdminAccess)) {
      throw new ORPCError("FORBIDDEN");
    }

    // Fetch related salesTodos
    const todos = await db.query.salesTodos.findMany({
      where: eq(salesTodos.opportunityId, opportunityId),
      orderBy: [desc(salesTodos.createdAt)],
    });

    // Fetch related todoLogs
    const logs = await db.query.todoLogs.findMany({
      where: eq(todoLogs.opportunityId, opportunityId),
      orderBy: [desc(todoLogs.createdAt)],
    });

    return {
      id: opportunity.id,
      customerNumber: opportunity.customerNumber,
      companyName: opportunity.companyName,
      contactName: opportunity.contactName,
      contactEmail: opportunity.contactEmail,
      contactPhone: opportunity.contactPhone,
      source: opportunity.source,
      status: opportunity.status,
      industry: opportunity.industry,
      companySize: opportunity.companySize,
      notes: opportunity.notes,
      opportunityScore: opportunity.opportunityScore,
      meddicScore: opportunity.meddicScore,
      createdAt: opportunity.createdAt,
      updatedAt: opportunity.updatedAt,
      lastContactedAt: opportunity.lastContactedAt,
      wonAt: opportunity.wonAt,
      lostAt: opportunity.lostAt,
      conversations: opportunity.conversations.map((conv) => ({
        id: conv.id,
        caseNumber: conv.caseNumber,
        title: conv.title,
        type: conv.type,
        status: conv.status,
        audioUrl: conv.audioUrl,
        duration: conv.duration,
        conversationDate: conv.conversationDate,
        createdAt: conv.createdAt,
        latestAnalysis: conv.meddicAnalyses[0] || null,
      })),
      // 新增 Sales Pipeline 資料
      salesTodos: todos.map((todo) => ({
        id: todo.id,
        title: todo.title,
        description: todo.description,
        dueDate: todo.dueDate,
        originalDueDate: todo.originalDueDate,
        status: todo.status,
        source: todo.source,
        postponeHistory: todo.postponeHistory,
        completionRecord: todo.completionRecord,
        wonRecord: todo.wonRecord,
        lostRecord: todo.lostRecord,
        nextTodoId: todo.nextTodoId,
        prevTodoId: todo.prevTodoId,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      })),
      todoLogs: logs.map((log) => ({
        id: log.id,
        todoId: log.todoId,
        action: log.action,
        actionVia: log.actionVia,
        changes: log.changes,
        note: log.note,
        createdAt: log.createdAt,
      })),
    };
  });

// ============================================================
// Get Opportunity by Customer Number
// ============================================================

export const getOpportunityByCustomerNumber = protectedProcedure
  .input(getOpportunityByCustomerNumberSchema)
  .handler(async ({ input, context }) => {
    const { customerNumber } = input;
    const userId = context.session?.user.id;

    if (!userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const opportunity = await db.query.opportunities.findFirst({
      where: and(
        eq(opportunities.customerNumber, customerNumber),
        eq(opportunities.userId, userId)
      ),
      with: {
        conversations: {
          orderBy: (conversations, { desc }) => [
            desc(conversations.conversationDate),
          ],
          limit: 10,
        },
      },
    });

    if (!opportunity) {
      throw new ORPCError("NOT_FOUND");
    }

    return {
      id: opportunity.id,
      customerNumber: opportunity.customerNumber,
      companyName: opportunity.companyName,
      contactName: opportunity.contactName,
      status: opportunity.status,
      opportunityScore: opportunity.opportunityScore,
      meddicScore: opportunity.meddicScore,
      conversationCount: opportunity.conversations.length,
      createdAt: opportunity.createdAt,
      updatedAt: opportunity.updatedAt,
    };
  });

// ============================================================
// Reject Opportunity
// ============================================================

export const rejectOpportunity = protectedProcedure
  .input(rejectOpportunitySchema)
  .handler(async ({ input, context }) => {
    const { opportunityId, rejectionReason, competitor, note } = input;
    const userId = context.session?.user.id;

    if (!userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // 1. 權限檢查（複用 getOpportunity 的邏輯）
    const opportunity = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, opportunityId),
    });

    if (!opportunity) {
      throw new ORPCError("NOT_FOUND");
    }

    const userEmail = context.session?.user.email;
    const userRole = getUserRole(userEmail, context.honoContext.env);
    const isOwner = opportunity.userId === userId;
    const isSlackGenerated =
      !opportunity.userId || opportunity.userId === "service-account";
    const hasAdminAccess = userRole === "admin" || userRole === "manager";

    if (!(isOwner || isSlackGenerated || hasAdminAccess)) {
      throw new ORPCError("FORBIDDEN");
    }

    // 2. Transaction 確保資料一致性
    return await db.transaction(async (tx) => {
      // 2a. 建立「客戶拒絕」Todo
      const todoId = randomUUID();
      const dueDate = new Date();

      const todoResult = await tx
        .insert(salesTodos)
        .values({
          id: todoId,
          userId: opportunity.userId,
          opportunityId: opportunity.id,
          customerNumber: opportunity.customerNumber,
          title: `客戶拒絕 - ${opportunity.companyName}`,
          description: `拒絕原因: ${rejectionReason}${competitor ? `\n競品: ${competitor}` : ""}${note ? `\n備註: ${note}` : ""}`,
          dueDate,
          originalDueDate: dueDate,
          source: "web",
          status: "lost",
          postponeHistory: [],
          lostRecord: {
            reason: rejectionReason,
            competitor,
            note,
            lostAt: new Date().toISOString(),
            lostVia: "web",
          },
        })
        .returning();

      const todo = todoResult[0];
      if (!todo) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      // 2b. 建立 Todo Log（審計追蹤）
      await tx.insert(todoLogs).values({
        id: randomUUID(),
        todoId: todo.id,
        opportunityId: opportunity.id,
        userId,
        action: "lost",
        actionVia: "web",
        changes: {
          before: { status: "pending" },
          after: { status: "lost" },
          lostRecord: todo.lostRecord,
        },
        note: rejectionReason,
      });

      // 2c. 更新 Opportunity 狀態（同時設定 lostAt）
      const updateResult = await tx
        .update(opportunities)
        .set({
          rejectionReason,
          selectedCompetitor: competitor,
          status: "lost",
          lostAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(opportunities.id, opportunityId))
        .returning();

      const updatedOpportunity = updateResult[0];
      if (!updatedOpportunity) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      // 失效 opportunities 快取
      try {
        const { createKVCacheService, invalidateOpportunitiesCache } =
          await import("@Sales_ai_automation_v3/services");
        const cacheService = createKVCacheService(
          context.honoContext.env.CACHE_KV
        );
        await invalidateOpportunitiesCache(cacheService, userId, opportunityId);
      } catch (error) {
        console.warn("[Cache] Failed to invalidate cache:", error);
      }

      return {
        success: true,
        message: "機會已標記為拒絕",
        todo: {
          id: todo.id,
          status: todo.status,
          lostRecord: todo.lostRecord,
        },
        opportunity: {
          id: updatedOpportunity.id,
          status: updatedOpportunity.status,
          rejectionReason: updatedOpportunity.rejectionReason,
        },
      };
    });
  });

// ============================================================
// Win Opportunity
// ============================================================

export const winOpportunity = protectedProcedure
  .input(winOpportunitySchema)
  .handler(async ({ input, context }) => {
    const { opportunityId } = input;
    const userId = context.session?.user.id;

    if (!userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // 1. 權限檢查（複用 getOpportunity 的邏輯）
    const opportunity = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, opportunityId),
    });

    if (!opportunity) {
      throw new ORPCError("NOT_FOUND");
    }

    const userEmail = context.session?.user.email;
    const userRole = getUserRole(userEmail, context.honoContext.env);
    const isOwner = opportunity.userId === userId;
    const isSlackGenerated =
      !opportunity.userId || opportunity.userId === "service-account";
    const hasAdminAccess = userRole === "admin" || userRole === "manager";

    if (!(isOwner || isSlackGenerated || hasAdminAccess)) {
      throw new ORPCError("FORBIDDEN");
    }

    // 2. 更新 Opportunity 狀態（不建立 Todo）
    const updateResult = await db
      .update(opportunities)
      .set({
        status: "won",
        wonAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(opportunities.id, opportunityId))
      .returning();

    const updatedOpportunity = updateResult[0];
    if (!updatedOpportunity) {
      throw new ORPCError("INTERNAL_SERVER_ERROR");
    }

    // 失效 opportunities 快取
    try {
      const { createKVCacheService, invalidateOpportunitiesCache } =
        await import("@Sales_ai_automation_v3/services");
      const cacheService = createKVCacheService(
        context.honoContext.env.CACHE_KV
      );
      await invalidateOpportunitiesCache(cacheService, userId, opportunityId);
    } catch (error) {
      console.warn("[Cache] Failed to invalidate cache:", error);
    }

    return {
      success: true,
      message: "機會已標記為成交",
      opportunity: {
        id: updatedOpportunity.id,
        status: updatedOpportunity.status,
        wonAt: updatedOpportunity.wonAt,
      },
    };
  });

// ============================================================
// Router Export
// ============================================================

export const opportunityRouter = {
  create: createOpportunity,
  update: updateOpportunity,
  delete: deleteOpportunity,
  list: listOpportunities,
  get: getOpportunity,
  getByCustomerNumber: getOpportunityByCustomerNumber,
  reject: rejectOpportunity,
  win: winOpportunity,
};
