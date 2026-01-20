import type { AppRouterClient } from "@Sales_ai_automation_v3/api/routers/index";
import { env } from "@Sales_ai_automation_v3/env/web";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分鐘內資料視為新鮮,不重新查詢
      gcTime: 10 * 60 * 1000, // 10 分鐘後才清除快取
      refetchOnWindowFocus: false, // 不在視窗切換時自動重新查詢
      refetchOnReconnect: false, // 不在重新連線時自動查詢
      retry: 1, // 錯誤時只重試 1 次
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});

export const link = new RPCLink({
  url: `${env.VITE_SERVER_URL}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
