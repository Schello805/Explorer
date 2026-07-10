import "server-only";

import nodemailer from "nodemailer";

type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  logoUrl?: string;
  createdAt: string;
};

const fallbackBaseUrl = "http://localhost:3000";

export async function sendMail(mail: Omit<Mail, "createdAt">) {
  const logoUrl = process.env.MAIL_LOGO_URL || new URL("/icons/platzguide-logo.png", process.env.NEXT_PUBLIC_BASE_URL || fallbackBaseUrl).toString();
  const message: Mail = {
    ...mail,
    logoUrl,
    html: mail.html || renderMailHtml(mail.subject, mail.text, logoUrl),
    createdAt: new Date().toISOString()
  };
  const host = process.env.SMTP_HOST;
  const fromEmail = process.env.MAIL_FROM;
  if (!host || !fromEmail) throw new Error("SMTP ist nicht konfiguriert: SMTP_HOST und MAIL_FROM fehlen.");
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined
  });
  await transporter.sendMail({
    from: formatFrom(process.env.MAIL_FROM_NAME ?? "Platzguide", fromEmail),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
}

function formatFrom(name: string, email: string) {
  const safeName = name.replaceAll('"', "");
  return safeName ? `"${safeName}" <${email}>` : email;
}

function renderMailHtml(subject: string, text: string, logoUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#173c32">
      <img src="${escapeHtml(logoUrl)}" alt="Platzguide" width="72" height="72" style="display:block;margin-bottom:24px" />
      <h1 style="font-size:24px;margin:0 0 12px">${escapeHtml(subject)}</h1>
      <p style="white-space:pre-line;margin:0">${escapeHtml(text)}</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
