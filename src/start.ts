import { createStart, createCsrfMiddleware } from "@tanstack/react-start";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  // Keep the app client-rendered by default so browser-only Supabase
  // authentication/storage code does not break the initial Vercel request.
  defaultSsr: false,
  requestMiddleware: [csrfMiddleware],
}));
