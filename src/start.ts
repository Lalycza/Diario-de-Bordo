import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => ({
  // The application uses browser-side Supabase authentication.
  // Keep the initial app client-rendered so the Vercel server does not
  // execute browser-only authentication/storage code during the first request.
  defaultSsr: false,
}));
