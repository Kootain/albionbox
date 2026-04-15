export interface FilterRule {
  id: string;
  consumer_id: string;
  guild_id?: string;
  channel_id?: string;
  msg_type?: number;
  role_id?: number | string;
}

export interface Consumer {
  consumer_id: string;
  handle(event: any, env: any): Promise<void>;
}

export class ConsumerRegistry {
  private consumers: Map<string, Consumer> = new Map();

  register(consumer: Consumer) {
    this.consumers.set(consumer.consumer_id, consumer);
  }

  get(consumer_id: string): Consumer | undefined {
    return this.consumers.get(consumer_id);
  }

  list(): string[] {
    return Array.from(this.consumers.keys());
  }
}

export const registry = new ConsumerRegistry();

registry.register({
  consumer_id: "regear-image-recognition",
  async handle(event, env) {
    const eventData = event?.d || event;
    const msgId = eventData?.msg_id;
    const guildId = eventData?.extra?.guild_id;
    const targetId = eventData?.target_id;
    const imageUrls = extractImageUrlsFromKookMessageEvent(eventData);
    for (const imageUrl of imageUrls) {
      console.log(
        `[regear-image-recognition] msg_id=${msgId} guild_id=${guildId} target_id=${targetId} imageUrl=${imageUrl}`,
      );
    }
  },
});

function extractImageUrlsFromKookMessageEvent(eventData: any): string[] {
  const type = eventData?.type;
  const content = eventData?.content;

  if (type === 2) {
    if (typeof content === "string" && content) return [content];
    return [];
  }

  if (type !== 10) return [];
  if (typeof content !== "string" || !content) return [];

  let cards: any;
  try {
    cards = JSON.parse(content);
  } catch {
    return [];
  }

  const cardList: any[] = Array.isArray(cards) ? cards : [cards];
  const urls: string[] = [];

  for (const card of cardList) {
    const modules: any[] = Array.isArray(card?.modules) ? card.modules : [];
    for (const module of modules) {
      if (module?.type !== "container") continue;
      const elements: any[] = Array.isArray(module?.elements)
        ? module.elements
        : [];
      for (const element of elements) {
        const src = element?.src;
        if (typeof src === "string" && src) urls.push(src);
      }
    }
  }

  return urls;
}

export async function dispatchEvent(event: any, env: any) {
  // 1. Fetch filter configs from KV
  const rawConfigs = await env.FILTER_CONFIGS.get("filters");
  let rules: FilterRule[] = [];
  if (rawConfigs) {
    try {
      rules = JSON.parse(rawConfigs);
    } catch (e) {
      console.error("Failed to parse filter configs", e);
    }
  }

  if (rules.length === 0) {
    return;
  }

  // 2. Evaluate rules against event
  const eventData = event.d || event;

  for (const rule of rules) {
    let matches = true;

    if (rule.guild_id && eventData.extra?.guild_id !== rule.guild_id) {
      matches = false;
    }
    if (rule.channel_id && eventData.target_id !== rule.channel_id) {
      matches = false;
    }
    if (rule.msg_type && eventData.type !== rule.msg_type) {
      matches = false;
    }
    if (rule.role_id) {
      const userRoles: number[] = eventData.extra?.author?.roles || [];
      const roleStr = String(rule.role_id);
      if (!userRoles.map(String).includes(roleStr)) {
        matches = false;
      }
    }

    if (matches) {
      const consumer = registry.get(rule.consumer_id);
      if (consumer) {
        await consumer.handle(event, env);
      } else {
        console.warn(
          `Consumer ${rule.consumer_id} not found for rule ${rule.id}`,
        );
      }
    }
  }
}
