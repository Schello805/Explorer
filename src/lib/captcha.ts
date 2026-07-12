import "server-only";

export async function verifyCaptcha(token: string | undefined, remoteIp?: string) {
  const provider = process.env.CAPTCHA_PROVIDER;
  if (!provider || provider === "disabled") return true;
  if (!token) return false;

  if (provider === "turnstile") {
    if (!process.env.TURNSTILE_SECRET_KEY) return false;
    const body = new FormData();
    body.set("secret", process.env.TURNSTILE_SECRET_KEY);
    body.set("response", token);
    if (remoteIp) body.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const result = await response.json() as { success?: boolean };
    return Boolean(result.success);
  }

  if (provider === "hcaptcha") {
    if (!process.env.HCAPTCHA_SECRET_KEY) return false;
    const body = new URLSearchParams({ secret: process.env.HCAPTCHA_SECRET_KEY, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const response = await fetch("https://api.hcaptcha.com/siteverify", { method: "POST", body });
    const result = await response.json() as { success?: boolean };
    return Boolean(result.success);
  }

  if (provider === "recaptcha") {
    if (!process.env.RECAPTCHA_SECRET_KEY) return false;
    const body = new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", { method: "POST", body });
    const result = await response.json() as { success?: boolean };
    return Boolean(result.success);
  }

  return false;
}
