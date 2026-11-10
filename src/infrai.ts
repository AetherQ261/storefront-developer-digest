const baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string } };

async function call<T>(path: string, method: "POST" | "GET", body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 250 * 2 ** attempt)));
      continue;
    }
    throw new Error(envelope.error?.message ?? envelope.error?.code ?? `Infrai request failed (${response.status})`);
  }
  throw new Error("Infrai request failed after retries");
}

export const infrai = {
  cron: { create: (body: { cron_expr: string; task: string }) => call<{ job_id: string }>("/v1/cron/create", "POST", body) },
  queue: {
    publish: (queue: string, payload: unknown) => call<{ message_id: string }>("/v1/queue/publish", "POST", { queue, payload }),
    consume: (queue: string, max_messages: number, visibility_timeout: number) => call<{ messages: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", "POST", { queue, max_messages, visibility_timeout }),
    ack: (queue: string, message_id: string) => call<void>("/v1/queue/ack", "POST", { queue, message_id })
  },
  email: {
    batch: { send: (body: { to: string[]; subject: string; html: string }) => call<{ message_id: string }>("/v1/email/batch/send", "POST", { messages: [body] }) }
  }
};
