import "./env";
import { createServer } from "node:http";
import { createApp } from "./index";

const port = Number(process.env.PORT ?? 8787);
const app = await createApp();
createServer(app).listen(port, () => console.log(`harness server listening on http://localhost:${port}`));
