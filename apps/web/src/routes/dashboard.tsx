import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

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

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-4 font-bold text-3xl">Dashboard</h1>
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="mb-2 font-semibold text-xl">歡迎, {session.data?.user.name}!</h2>
        <p className="text-muted-foreground">Email: {session.data?.user.email}</p>
        <div className="mt-4">
          <a
            className="text-blue-600 hover:underline"
            href="/conversations/cf75684f-4f5b-4667-8e09-0cd50262d9bc"
          >
            查看案件 202601-IC019 →
          </a>
        </div>
      </div>
    </div>
  );
}
