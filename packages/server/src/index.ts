import { createServer } from "node:http";
import { requestHandler } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

const server = createServer(requestHandler);

server.listen(config.port, () => {
  process.stdout.write(`Server listening on http://localhost:${config.port}\n`);
});
