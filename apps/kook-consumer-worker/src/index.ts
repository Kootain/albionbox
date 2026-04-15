import { Hono } from "hono";
import { html } from "hono/html";
import { apiRouter } from "./router.js";
import { dispatchEvent } from "./consumer.js";
import { htmlTemplate } from "./frontend.js";

type Bindings = {
  FILTER_CONFIGS: KVNamespace;
  KOOK_BOT_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.html(htmlTemplate));

app.route("/", apiRouter);

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<any>, env: Bindings): Promise<void> {
    for (const message of batch.messages) {
      console.log(`Received message: ${JSON.stringify(message.body)}`);
      await dispatchEvent(message.body, env);
    }
  },
};
