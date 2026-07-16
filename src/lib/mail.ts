import "server-only";

import nodemailer from "nodemailer";

type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  tenantSlug?: string;
  logoUrl?: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
  actionLabel?: string;
  actionUrl?: string;
  rows?: { label: string; value: string }[];
  footerNote?: string;
  createdAt: string;
};

const fallbackBaseUrl = "http://localhost:3000";

export async function sendMail(mail: Omit<Mail, "createdAt">) {
  const logoUrl = process.env.MAIL_LOGO_URL || new URL("/icons/platzguide-logo.png", process.env.NEXT_PUBLIC_BASE_URL || fallbackBaseUrl).toString();
  const message: Mail = {
    ...mail,
    logoUrl,
    html: mail.html || renderMailHtml({ ...mail, logoUrl }),
    text: appendTextFooter(mail.text, mail),
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

export function appUrl(path = "/") {
  return new URL(path, process.env.NEXT_PUBLIC_BASE_URL || fallbackBaseUrl).toString();
}

export function tenantAdminUrl(slug: string) {
  return appUrl(`/admin?tenant=${encodeURIComponent(slug)}`);
}

export function tenantPublicUrl(slug: string) {
  return appUrl(`/c/${encodeURIComponent(slug)}`);
}

function formatFrom(name: string, email: string) {
  const safeName = name.replaceAll('"', "");
  return safeName ? `"${safeName}" <${email}>` : email;
}

function renderMailHtml(mail: Omit<Mail, "createdAt">) {
  const title = mail.title || mail.subject;
  const intro = mail.intro || mail.text;
  const footerLinks = mailFooterLinks(mail);
  const action = mail.actionUrl && mail.actionLabel
    ? `<tr><td style="padding:8px 0 24px"><a href="${escapeHtml(mail.actionUrl)}" style="display:inline-block;border-radius:14px;background:#195f4c;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 20px">${escapeHtml(mail.actionLabel)}</a></td></tr>`
    : "";
  const rows = mail.rows?.length
    ? `<tr><td style="padding:8px 0 22px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;border:1px solid #e7e2d8;border-radius:16px;overflow:hidden">${mail.rows.map((row) => `<tr><td style="padding:12px 14px;background:#faf8f2;color:#6b756f;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #eee8dc;width:34%">${escapeHtml(row.label)}</td><td style="padding:12px 14px;color:#173c32;font-size:14px;border-bottom:1px solid #eee8dc">${escapeHtml(row.value)}</td></tr>`).join("")}</table></td></tr>`
    : "";
  return `<!doctype html>
<html lang="de">
  <body style="margin:0;background:#f4f1e9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#173c32">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto">
      <tr><td style="padding:0 0 16px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
          <td><img src="${escapeHtml(mail.logoUrl || "")}" alt="Platzguide" width="64" height="64" style="display:block;border-radius:16px" /></td>
          <td align="right" style="font-size:12px;color:#7d8b84">Platzguide</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:24px;padding:34px 30px;box-shadow:0 12px 32px rgba(23,60,50,.08)">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${mail.eyebrow ? `<tr><td style="padding:0 0 10px;color:#d59a3a;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">${escapeHtml(mail.eyebrow)}</td></tr>` : ""}
          <tr><td><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:32px;line-height:1.08;color:#173c32">${escapeHtml(title)}</h1></td></tr>
          <tr><td style="padding:0 0 22px;font-size:16px;line-height:1.65;color:#43534d;white-space:pre-line">${escapeHtml(intro)}</td></tr>
          ${action}
          ${rows}
          ${mail.actionUrl ? `<tr><td style="padding:0 0 12px;font-size:12px;line-height:1.6;color:#7d8b84">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br><a href="${escapeHtml(mail.actionUrl)}" style="color:#195f4c;word-break:break-all">${escapeHtml(mail.actionUrl)}</a></td></tr>` : ""}
        </table>
      </td></tr>
      <tr><td style="padding:18px 8px 0;font-size:12px;line-height:1.6;color:#7d8b84;text-align:center">
        ${escapeHtml(mail.footerNote || "Diese E-Mail wurde automatisch von Platzguide gesendet.")}
        <br>${footerLinks.map((link) => `<a href="${escapeHtml(link.href)}" style="color:#195f4c;text-decoration:none">${escapeHtml(link.label)}</a>`).join(" · ")}
        <br>© ${new Date().getFullYear()} Platzguide · Michael Schellenberger
      </td></tr>
    </table>
  </body>
</html>`;
}

function appendTextFooter(text: string, mail: Omit<Mail, "createdAt">) {
  const links = mailFooterLinks(mail).map((link) => `${link.label}: ${link.href}`).join("\n");
  return `${text.trim()}\n\n--\n${mail.footerNote || "Diese E-Mail wurde automatisch von Platzguide gesendet."}\n${links}\n© ${new Date().getFullYear()} Platzguide · Michael Schellenberger`;
}

function mailFooterLinks(mail: Pick<Mail, "tenantSlug">) {
  const links = [
    { label: "Platzguide", href: appUrl("/") },
    { label: "AGB", href: appUrl("/rechtliches/agb") },
    { label: "Datenschutz", href: appUrl("/rechtliches/datenschutz") }
  ];
  if (mail.tenantSlug) {
    links.push(
      { label: "Campingplatz", href: tenantPublicUrl(mail.tenantSlug) },
      { label: "Adminbereich", href: tenantAdminUrl(mail.tenantSlug) }
    );
  }
  return links;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
