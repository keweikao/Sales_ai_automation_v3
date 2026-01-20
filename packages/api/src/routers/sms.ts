import { ORPCError } from "@orpc/server";
import { db } from "@sales_ai_automation_v3/db";
import { conversations } from "@sales_ai_automation_v3/db/schema";
import {
  generateCustomerSMSContent,
  sendSMS,
} from "@sales_ai_automation_v3/services";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";

/**
 * 發送客戶 SMS
 */
const sendCustomerSMS = protectedProcedure
  .input(
    z.object({
      conversationId: z.string(),
    })
  )
  .handler(async ({ input, context }) => {
    const { conversationId } = input;
    const userId = context.session?.user.id;

    // 查詢 conversation 和相關資料
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: {
        opportunity: true,
        meddicAnalysis: true,
      },
    });

    if (!conversation) {
      throw new ORPCError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    // 檢查是否有客戶電話
    const phoneNumber = conversation.opportunity?.contactPhone;
    if (!phoneNumber) {
      throw new ORPCError({
        code: "BAD_REQUEST",
        message: "客戶電話號碼不存在",
      });
    }

    // 生成 share token（透過 share router）
    // 這裡我們需要直接調用 share.create 的邏輯
    const shareRouter = await import("./share");
    let shareToken: string;

    try {
      const tokenResult = await shareRouter.shareRouter.create.handler({
        input: { conversationId },
        context,
      });
      shareToken = tokenResult.token;
    } catch (error) {
      throw new ORPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "無法生成分享連結",
      });
    }

    const shareUrl = `${context.env.WEB_APP_URL}/share/${shareToken}`;

    // 生成 SMS 內容
    const smsContent = generateCustomerSMSContent({
      companyName: conversation.opportunity.companyName,
      caseNumber: conversation.caseNumber,
      meddicScore: conversation.meddicAnalysis?.overallScore || 0,
      shareUrl,
    });

    // 發送 SMS
    const smsResult = await sendSMS(
      {
        phoneNumber,
        message: smsContent,
        subject: "iCHEF",
      },
      {
        apiUrl: context.env.EVERY8D_API_URL,
        username: context.env.EVERY8D_USERNAME,
        password: context.env.EVERY8D_PASSWORD,
      }
    );

    // 更新 conversation 的 SMS 發送狀態
    if (smsResult.success) {
      await db
        .update(conversations)
        .set({
          smsSent: true,
          smsSentAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
    }

    return {
      success: smsResult.success,
      message: smsResult.statusMessage,
      phoneNumber,
    };
  });

export const smsRouter = {
  sendCustomer: sendCustomerSMS,
};
