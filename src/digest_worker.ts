import { z } from "zod";
import { infrai } from "./infrai.js";

const queue = process.env.DIGEST_QUEUE ?? "storefront-devtools-digest";

export const buildEvent = z.object({
  storefront: z.string().min(1),
  event: z.enum(["build", "release", "diagnostic"]),
  summary: z.string().min(1),
  occurredAt: z.string().datetime()
});
export type BuildEvent = z.infer<typeof buildEvent>;

export async function publishBuildEvent(input: unknown) {
  const event = buildEvent.parse(input);
  return infrai.queue.publish(queue, event);
}

export async function registerDigestSchedule(taskUrl: string) {
  return infrai.cron.create({ cron_expr: "0 9 * * 1-5", task: taskUrl });
}

export async function runDigestWorker(subscribers: string[]) {
  const result = await infrai.queue.consume(queue, 50, 300);
  const events = result.messages.map((message) => buildEvent.parse(message.payload));
  if (events.length === 0) return { delivered: false, events: 0 };
  const rows = events.map((event) => `<li><strong>${event.storefront}</strong> ${event.event}: ${event.summary}</li>`).join("");
  const emailBody = { to: subscribers, subject: "Storefront developer digest", html: `<h1>Build desk</h1><ul>${rows}</ul>` };
  const mail = await infrai.email.batch.send(emailBody);
  for (const message of result.messages) await infrai.queue.ack(queue, message.message_id);
  return { delivered: true, events: events.length, message_id: mail.message_id };
}

if (process.argv[1]?.endsWith("digest_worker.ts")) {
  const subscribers = (process.env.DIGEST_SUBSCRIBERS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (subscribers.length === 0) throw new Error("DIGEST_SUBSCRIBERS is required");
  console.log(await runDigestWorker(subscribers));
}
