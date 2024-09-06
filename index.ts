import app from "./server/app";
import colorLog from "./server/lib/util/color-log";
import { env } from "./server/lib/configs/env";

const PORT = env.PORT;

function runServer() {
  try {
    console.clear();
    colorLog.divider();
    Bun.serve({
      fetch: app.fetch,
      port: PORT,
    });
    colorLog.success(`Listening on http://localhost:${PORT}`);
  } catch (error) {
    colorLog.error(JSON.stringify(error));
  }
}

runServer();
