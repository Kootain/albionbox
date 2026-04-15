import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { RestClient } from "@kookapp/js-sdk";
import { registry } from "./consumer.js";

export type Bindings = {
  FILTER_CONFIGS: KVNamespace;
  KOOK_BOT_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

function getKookClient(token: string) {
  // Using generic RestClient since that's exported by @kookapp/js-sdk
  return new RestClient({
    token,
  });
}

// ----------------- Task 4: KOOK API Integration -----------------

// Get bot's guilds
app.get("/api/kook/guilds", async (c) => {
  const token = c.env.KOOK_BOT_TOKEN;
  if (!token) return c.json({ error: "Missing KOOK_BOT_TOKEN" }, 500);
  const client = getKookClient(token);
  try {
    const res = await client.request("/api/v3/guild/list", "GET");
    return c.json(res.data);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get guild channels
app.get(
  "/api/kook/channels",
  zValidator("query", z.object({ guild_id: z.string() })),
  async (c) => {
    const token = c.env.KOOK_BOT_TOKEN;
    if (!token) return c.json({ error: "Missing KOOK_BOT_TOKEN" }, 500);
    const { guild_id } = c.req.valid("query");
    const client = getKookClient(token);
    try {
      const res = await client.request("/api/v3/channel/list", "GET", {
        guild_id,
      });
      return c.json(res.data);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  },
);

// Get channel users
app.get(
  "/api/kook/users",
  zValidator("query", z.object({ guild_id: z.string() })),
  async (c) => {
    const token = c.env.KOOK_BOT_TOKEN;
    if (!token) return c.json({ error: "Missing KOOK_BOT_TOKEN" }, 500);
    const { guild_id } = c.req.valid("query");
    const client = getKookClient(token);
    try {
      const res = await client.request("/api/v3/guild/user-list", "GET", {
        guild_id,
      });
      return c.json(res.data);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  },
);

// Get guild roles (permissions)
app.get(
  "/api/kook/roles",
  zValidator("query", z.object({ guild_id: z.string() })),
  async (c) => {
    const token = c.env.KOOK_BOT_TOKEN;
    if (!token) return c.json({ error: "Missing KOOK_BOT_TOKEN" }, 500);
    const { guild_id } = c.req.valid("query");
    const client = getKookClient(token);
    try {
      const res = await client.request("/api/v3/guild-role/list", "GET", {
        guild_id,
      });
      return c.json(res.data);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  },
);

// ----------------- Task 5: CRUD API for filter configs in KV -----------------

app.get("/api/consumers", (c) => {
  return c.json(registry.list());
});

const FilterRuleSchema = z.object({
  id: z.string().optional(),
  consumer_id: z.string(),
  guild_id: z.string().optional(),
  channel_id: z.string().optional(),
  msg_type: z.number().optional(),
  role_id: z.union([z.string(), z.number()]).optional(),
});

app.get("/api/filters", async (c) => {
  const raw = await c.env.FILTER_CONFIGS.get("filters");
  if (!raw) return c.json([]);
  try {
    return c.json(JSON.parse(raw));
  } catch (e) {
    return c.json([]);
  }
});

app.post("/api/filters", zValidator("json", FilterRuleSchema), async (c) => {
  const rule = c.req.valid("json");
  if (!rule.id) {
    rule.id = crypto.randomUUID();
  }
  const raw = await c.env.FILTER_CONFIGS.get("filters");
  let rules: any[] = [];
  if (raw) {
    try {
      rules = JSON.parse(raw);
    } catch (e) {}
  }
  rules.push(rule);
  await c.env.FILTER_CONFIGS.put("filters", JSON.stringify(rules));
  return c.json(rule);
});

app.delete("/api/filters/:id", async (c) => {
  const id = c.req.param("id");
  const raw = await c.env.FILTER_CONFIGS.get("filters");
  let rules: any[] = [];
  if (raw) {
    try {
      rules = JSON.parse(raw);
    } catch (e) {}
  }
  const initialLength = rules.length;
  rules = rules.filter((r) => r.id !== id);
  if (rules.length === initialLength) {
    return c.json({ error: "Not found" }, 404);
  }
  await c.env.FILTER_CONFIGS.put("filters", JSON.stringify(rules));
  return c.json({ success: true });
});

export { app as apiRouter };
