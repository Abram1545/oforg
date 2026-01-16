import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getUserConversations,
  getConversationWithMessages,
  createConversation,
  deleteConversation,
  addMessage,
} from "./db";
import { invokeLLM } from "./_core/llm";
import type { Message as DBMessage } from "../drizzle/schema";
import type { Message } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  chat: router({
    getConversations: protectedProcedure.query(async ({ ctx }) => {
      return await getUserConversations(ctx.user.id);
    }),

    getConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getConversationWithMessages(input.conversationId, ctx.user.id);
      }),

    createConversation: protectedProcedure
      .input(z.object({ title: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return await createConversation(ctx.user.id, input.title);
      }),

    deleteConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteConversation(input.conversationId, ctx.user.id);
        return { success: true };
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const conv = await getConversationWithMessages(input.conversationId, ctx.user.id);
        if (!conv) throw new Error("Conversation not found");

        await addMessage(input.conversationId, "user", input.message);

        const messages: Message[] = conv.messages.map((m: DBMessage) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        messages.push({ role: "user", content: input.message });

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a helpful AI assistant. Respond in the same language as the user." },
            ...messages,
          ],
        });

        const assistantMessage = response.choices[0]?.message?.content;
        const assistantText = typeof assistantMessage === "string" ? assistantMessage : "";
        
        await addMessage(input.conversationId, "assistant", assistantText);

        return { message: assistantText };
      }),
  }),
});

export type AppRouter = typeof appRouter;
