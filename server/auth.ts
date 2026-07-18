import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { z } from "zod";
import { db } from "../harness/db";
import * as schema from "../harness/auth-schema";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:8787";
const appOrigin = process.env.APP_ORIGIN ?? "http://localhost:5173";

const requiredAuthEnvironment = [
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

export function assertAuthConfiguration(): void {
  const missing = requiredAuthEnvironment.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing authentication configuration: ${missing.join(", ")}. Add the values to .dev.vars before starting the server.`,
    );
  }
}

const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    }
  : undefined;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [appOrigin],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: true,
        validator: {
          input: z.enum(["user", "company"]),
          output: z.enum(["user", "company"]),
        },
      },
    },
  },
  socialProviders: google,
});
