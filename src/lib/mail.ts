import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Mail = {
  to: string;
  subject: string;
  text: string;
  createdAt: string;
};

const outboxFile = path.join(process.cwd(), ".data", "mail-outbox.json");

export async function sendMail(mail: Omit<Mail, "createdAt">) {
  const message: Mail = { ...mail, createdAt: new Date().toISOString() };
  if (process.env.MAIL_WEBHOOK_URL) {
    await fetch(process.env.MAIL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message)
    });
    return;
  }
  await mkdir(path.dirname(outboxFile), { recursive: true });
  const existing = await readFile(outboxFile, "utf8").then((content) => JSON.parse(content) as Mail[]).catch(() => []);
  await writeFile(outboxFile, JSON.stringify([message, ...existing].slice(0, 500), null, 2));
  console.info(`Mail in lokale Outbox geschrieben: ${message.to} · ${message.subject}`);
}
