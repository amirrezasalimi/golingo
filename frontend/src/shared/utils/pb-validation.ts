import { TRPCError } from "@trpc/server";

export function pbTrpcBadRequest(err: any) {
    const res=err.response.data;
    Object.keys(res).forEach((key) => {
     throw new TRPCError({
            code: 'BAD_REQUEST',
            message: res[key].message,
            cause: err,
        });
    })
}