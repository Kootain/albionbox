/**
 * Options for Volcengine Image Recognition API
 */
export interface VolcengineImageRecognitionOptions {
  /** The model endpoint ID (e.g., ep-xxx) */
  modelId: string;
  /** Your Volcengine API Key */
  apiKey: string;
  /** The system prompt instructing the model on its role and task */
  systemPrompt?: string;
  /** The user prompt describing what to extract from the image */
  userPrompt: string;
  /** The image as a URL or base64 data URI (e.g., data:image/jpeg;base64,...) */
  image: string;
  /** The JSON Schema object defining the structure of the output */
  jsonSchema: any;
  /** A name for the JSON schema */
  schemaName: string;
  /** An optional description for the JSON schema */
  schemaDescription?: string;
  /** Whether to enable deep thinking mode (default: false) */
  thinking?: boolean;
}

/**
 * A generic method to call Volcengine's Chat API to recognize image content and return structured JSON.
 * It uses native `fetch` as requested.
 *
 * @param options The configuration options for the API call.
 * @returns A promise that resolves to the parsed JSON matching the provided schema.
 */
export async function recognizeImageContent<T>(
  options: VolcengineImageRecognitionOptions
): Promise<T> {
  const {
    modelId,
    apiKey,
    systemPrompt,
    userPrompt,
    image,
    jsonSchema,
    schemaName,
    schemaDescription,
    thinking = false,
  } = options;

  const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

  const messages: any[] = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: [
      {
        type: 'text',
        text: userPrompt,
      },
      {
        type: 'image_url',
        image_url: {
          url: image,
        },
      },
    ],
  });

  const payload = {
    model: modelId,
    messages,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: schemaName,
        description: schemaDescription || 'Structured output schema',
        schema: jsonSchema,
        strict: true,
      },
    },
    thinking: {
      type: thinking ? 'enabled' : 'disabled',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Volcengine API Error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data: any = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content returned from Volcengine API');
  }

  try {
    return JSON.parse(content) as T;
  } catch (err) {
    throw new Error(`Failed to parse structured output: ${content}`);
  }
}

// ============================================================================
// Example Usage based on KillEvent
// ============================================================================

export interface KillEventParsed {
  killerName: string;
  killerGuild: string;
  killerIP: number;
  victimName: string;
  victimGuild: string;
  victimIP: number;
  killFame: number;
  timestamp: string;
  mapName: string;
  assists: number;
}

export const killEventJsonSchema = {
  type: 'object',
  properties: {
    killerName: { type: 'string', description: 'Name of the killer. Must be a single token with only letters and digits (no spaces, no punctuation).' },
    killerGuild: { type: 'string', description: 'Guild of the killer. Must contain only letters and spaces (no punctuation).' },
    killerIP: { type: 'number', description: 'Item Power (IP) of the killer, e.g. 1519' },
    victimName: { type: 'string', description: 'Name of the victim. Must be a single token with only letters and digits (no spaces, no punctuation).' },
    victimGuild: { type: 'string', description: 'Guild of the victim. Must contain only letters and spaces (no punctuation).' },
    victimIP: { type: 'number', description: 'Item Power (IP) of the victim, e.g. 1650' },
    killFame: { type: 'number', description: 'Total kill fame as a number, e.g. 169816' },
    timestamp: { type: 'string', description: 'Time of the kill in YYYY-MM-DD HH:mm format without timezone, e.g. "2026-04-14 12:45"' },
    mapName: { type: 'string', description: 'The name of the map where the kill happened (the text after "于")' },
    assists: { type: 'number', description: 'Number of players who assisted in the kill, usually indicated by a number near an icon showing multiple people.' },
  },
  required: [
    'killerName',
    'killerGuild',
    'killerIP',
    'victimName',
    'victimGuild',
    'victimIP',
    'killFame',
    'timestamp',
    'mapName',
    'assists',
  ],
  additionalProperties: false,
};

/**
 * A specific wrapper method to recognize a KillEvent from an image.
 * Uses the generic `recognizeImageContent` method.
 *
 * @param image The image URL or base64 data
 * @param apiKey Volcengine API Key
 * @param modelId Volcengine Model ID (should be a vision-capable model endpoint)
 */
export async function parseKillEventFromImage(
  image: string,
  apiKey: string,
  modelId: string
): Promise<KillEventParsed> {
  const systemPrompt =
    'You are an expert at extracting data from game screenshots (Albion Online).';
  const userPrompt =
    `Please extract the Kill Event details from this screenshot, including killer and victim information, item power, kill fame, map name, timestamp, and assists.
    
    IMPORTANT FORMATTING RULES:
    0. DO NOT swap killer and victim. In the kill-event UI, the VICTIM is on the LEFT side and the KILLER is on the RIGHT side.
    1. For "timestamp", extract ONLY the date and time string (e.g. "2026-04-14 12:45"). DO NOT include the timezone or "(UTC)" suffix.
    2. "killFame", "killerIP", "victimIP", and "assists" MUST be numbers, without commas or text.
    3. The "mapName" is the location where the kill happened, usually indicated after the character "于" in the Chinese UI.
    4. The "assists" is the number of players who assisted in the kill, usually indicated by a number near a multiple-person icon or below the killer's info. If there are no assists shown, return 0.
    5. "killerName" and "victimName" MUST be a single line with ONLY English letters and digits. No punctuation, no commas, no spaces.
    6. "killerGuild" and "victimGuild" MUST contain ONLY English letters and spaces. No punctuation. Do NOT merge player name and guild name into one field (e.g. do not output "Sohai877, HuaDaBin").`;

  return recognizeImageContent<KillEventParsed>({
    modelId,
    apiKey,
    systemPrompt,
    userPrompt,
    image,
    jsonSchema: killEventJsonSchema,
    schemaName: 'kill_event_schema',
    schemaDescription: 'Schema for parsing Albion Online Kill Event screenshots',
    thinking: false, // Set to true if the model requires thinking for complex reasoning
  });
}
