import { UsersRecord, UsersResponse } from "@/shared/models/entities/pocketbase-types";
import { pbInstance } from "@/shared/utils/pb";
import {
    FetchCreateContextFnOptions,
} from "@trpc/server/adapters/fetch";
const createContext = async function (
    opts: FetchCreateContextFnOptions
): Promise<{
    user: UsersResponse<unknown>,
    req: FetchCreateContextFnOptions["req"],
}> {
    try {
        const xPb = opts.req.headers.get("x-pb");
        if (xPb) {
            const pb = pbInstance();
            pb.authStore.save(xPb);
            const res = await pb.collection("users").authRefresh();
            if (res?.record?.id) {
                return {
                    user: res.record,
                    req: opts.req,
                };
            }
        }
    } catch (e) {
    }
    // todo: find better approach
    return {
        req: opts.req,
    } as {
        user: UsersResponse<unknown>,
        req: FetchCreateContextFnOptions["req"],
    }

}
export default createContext;
export type Context = Awaited<ReturnType<typeof createContext>>;