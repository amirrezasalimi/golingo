import { publicProcedure, router, userProcedure } from "@/app/api/trpc/trpc-router";
import { pb } from "../pb";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { pbTrpcBadRequest } from "@/shared/utils/pb-validation";
export const apiRouter = router({
  userExists: publicProcedure.input(
    z.object({
      email: z.string(),
    })
  ).mutation(async ({ input }): Promise<{
    has_password: boolean
  } | boolean> => {
    try {
      const user = await pb.collection("users").getFirstListItem(`email = "${input.email}"`);
      const authMethods = await pb.collection("users").listExternalAuths(user.id);
      return {
        has_password: authMethods.length == 0,
      };
    } catch (e) {
      return false;
    }
  }),
  registerUser: publicProcedure.input(
    z.object({
      email: z.string(),
      password: z.string(),
    })
  ).mutation(async ({ input }) => {
    try {
      const user = await pb.collection("users").getFirstListItem(`email = "${input.email}"`);

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "User already exists",
        // optional: pass the original error to retain stack trace
        cause: new Error('User already exists'),
      });
    } catch (e) {

    }

    try {
      const res = await pb.collection("users").create({
        name: "",
        email: input.email,
        password: input.password,
        passwordConfirm: input.password,
      });
      await pb.collection("users").requestVerification(input.email);
      return res;
    } catch (e) {
      return pbTrpcBadRequest(e);
    }
  }),
  getWordsCredit: userProcedure.query(async ({ ctx }) => {
    const wordsCredit = ctx.user.wordsCredit;
    return wordsCredit;
  }),
});