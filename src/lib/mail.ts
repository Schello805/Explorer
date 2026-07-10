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
  if (process.env.MAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [message.to], subject: message.subject, text: message.text })
    });
    return;
  }
  if (process.env.MAIL_PROVIDER === "brevo" && process.env.BREVO_API_KEY && process.env.MAIL_FROM) {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME ?? "Platzguide" },
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text
      })
    });
    return;
  }
  if (process.env.MAIL_PROVIDER === "mailgun" && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN && process.env.MAIL_FROM) {
    const body = new URLSearchParams({ from: process.env.MAIL_FROM, to: message.to, subject: message.subject, text: message.text });
    await fetch(`https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64")}` },
      body
    });
    return;
  }
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
