import { mergeRouters } from "@/app/api/trpc/trpc-router";
import { apiRouter } from "./api";
import { panelRouter } from "./panel";

export const appRouter = mergeRouters(apiRouter,panelRouter)
export type AppRouter = typeof appRouter;
