import { regearImageRecognitionConsumer } from "./consumers/regear_image_recognition.js";
import { messageDeletedConsumer } from "./consumers/message_deleted.js";
import { reactionChangedConsumer } from "./consumers/reaction_changed.js";

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
  handle(event: any, env: any, retry: boolean): Promise<void>;
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

registry.register(regearImageRecognitionConsumer);
registry.register(messageDeletedConsumer);
registry.register(reactionChangedConsumer);

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
        try {
          await consumer.handle(event, env, false);
        } catch (e: any) {
          console.error(
            JSON.stringify({
              msg: "consumer_handle_failed",
              consumer_id: consumer.consumer_id,
              rule_id: rule.id,
              msg_id: eventData?.msg_id,
              guild_id: eventData?.extra?.guild_id,
              target_id: eventData?.target_id,
              error: {
                name: e?.name,
                message: e?.message ?? String(e),
                stack: e?.stack,
              },
            }),
          );
        }
      } else {
        console.warn(
          `Consumer ${rule.consumer_id} not found for rule ${rule.id}`,
        );
      }
    }
  }
}
