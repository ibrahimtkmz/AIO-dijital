import crypto from "node:crypto";
import { cookies } from "next/headers";
import { get, put } from "@vercel/blob";

const TOKEN_PATH = "canva/oauth-token.json";
const STATE_COOKIE = "canva_oauth_state";
const VERIFIER_COOKIE = "canva_oauth_verifier";
const API = "https://api.canva.com/rest/v1";
const DEFAULT_SCOPES = [
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "asset:read",
  "asset:write",
  "brandtemplate:meta:read",
  "brandtemplate:content:read",
];

type StoredToken = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} tanımlı değil.`);
  return value;
}

function encryptionKey() {
  const raw = required("CANVA_TOKEN_ENCRYPTION_KEY");
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("CANVA_TOKEN_ENCRYPTION_KEY 64 karakterlik hex olmalı.");
  }
  return Buffer.from(raw, "hex");
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decrypt(value: string) {
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

async function saveToken(token: StoredToken) {
  await put(TOKEN_PATH, encrypt(JSON.stringify(token)), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
  });
}

async function loadToken(): Promise<StoredToken | null> {
  try {
    const result = await get(TOKEN_PATH, { access: "private", useCache: false });
    if (!result) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(decrypt(text)) as StoredToken;
  } catch {
    return null;
  }
}

function basicAuth() {
  const credentials = Buffer.from(
    `${required("CANVA_CLIENT_ID")}:${required("CANVA_CLIENT_SECRET")}`,
  ).toString("base64");
  return `Basic ${credentials}`;
}

export function createCanvaAuthorization() {
  const verifier = crypto.randomBytes(96).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(32).toString("base64url");
  const redirectUri = required("CANVA_REDIRECT_URI");
  const scopes = process.env.CANVA_SCOPES || DEFAULT_SCOPES.join(" ");

  const url = new URL("https://www.canva.com/api/oauth/authorize");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "s256");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", required("CANVA_CLIENT_ID"));
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);

  return { url: url.toString(), state, verifier };
}

export async function storeOAuthCookies(state: string, verifier: string) {
  const jar = cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  jar.set(VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
}

export async function exchangeCanvaCode(code: string, state: string) {
  const jar = cookies();
  const savedState = jar.get(STATE_COOKIE)?.value;
  const verifier = jar.get(VERIFIER_COOKIE)?.value;
  const stateMatches =
    !!savedState &&
    !!verifier &&
    Buffer.byteLength(savedState, "utf8") === Buffer.byteLength(state, "utf8") &&
    crypto.timingSafeEqual(Buffer.from(savedState), Buffer.from(state));

  if (!stateMatches) {
    throw new Error("Canva OAuth state doğrulanamadı.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: required("CANVA_REDIRECT_URI"),
  });

  const response = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token || !data.refresh_token) {
    throw new Error(data.message || "Canva OAuth token alınamadı.");
  }

  await saveToken({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + Number(data.expires_in || 14400) * 1000,
  });

  jar.delete(STATE_COOKIE);
  jar.delete(VERIFIER_COOKIE);
}

export async function getCanvaAccessToken() {
  const token = await loadToken();
  if (!token) throw new Error("Canva bağlı değil. Önce Canva'yı bağlayın.");

  if (token.expires_at - Date.now() > 5 * 60 * 1000) return token.access_token;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });

  const response = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token || !data.refresh_token) {
    throw new Error(data.message || "Canva erişim anahtarı yenilenemedi. Canva'yı yeniden bağlayın.");
  }

  await saveToken({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + Number(data.expires_in || 14400) * 1000,
  });

  return data.access_token as string;
}
