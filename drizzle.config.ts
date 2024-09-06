import { env } from "./server/lib/configs/env";

export default {
  schema: "server/db/schema/index.ts",
  dialect: "sqlite",
  driver: "turso",
  out: "server/db/migrations",
  dbCredentials: {
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
  tablesFilter: ["my_app_*"],
};
