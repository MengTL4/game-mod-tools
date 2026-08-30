import { ExtData, decode as msgpackDecode, encode as msgpackEncode } from "@msgpack/msgpack";
import pako from "pako";

const BASE64_CHUNK_RE = /[A-Za-z0-9+/=\r\n]{32,}/g;

export type SaveKind = "rpgsave" | "config";

export interface SaveTextParts {
  prefix: string;
  payload: string;
  suffix: string;
}

export interface DecodedSave {
  value: unknown;
  kind: SaveKind;
  saveId: number | null;
  parts: SaveTextParts;
  payloadLength: number;
  msgpackLength: number;
}

function normalizeBase64(value: string): string {
  return value.replace(/\s+/g, "");
}

function isBase64Text(value: string): boolean {
  return value.length > 0 && /^[A-Za-z0-9+/=]+$/.test(value);
}

export function extractSavePayload(raw: string): SaveTextParts {
  const compact = normalizeBase64(raw.trim());
  if (compact.length >= 32 && isBase64Text(compact)) {
    return { prefix: "", payload: compact, suffix: "" };
  }

  const candidates = Array.from(raw.matchAll(BASE64_CHUNK_RE));
  let best: RegExpMatchArray | null = null;
  let bestLength = 0;

  for (const candidate of candidates) {
    const segment = normalizeBase64(candidate[0]);
    if (!segment || !isBase64Text(segment)) continue;
    if (segment.length > bestLength) {
      best = candidate;
      bestLength = segment.length;
    }
  }

  if (!best || best.index == null) {
    throw new Error("未找到有效的 base64 存档内容。");
  }

  return {
    prefix: raw.slice(0, best.index),
    payload: normalizeBase64(best[0]),
    suffix: raw.slice(best.index + best[0].length)
  };
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function inferSaveId(fileName: string): number | null {
  const lower = fileName.toLowerCase();
  if (lower === "global.rpgsave" || lower === "global") return 0;
  const match = lower.match(/^file(\d+)(?:\.rpgsave)?$/);
  if (!match) return null;
  return Number(match[1]);
}

function inferKind(fileName: string): SaveKind {
  return fileName.toLowerCase().startsWith("config") ? "config" : "rpgsave";
}

export async function decodeSaveText(raw: string, fileName: string, requestedSaveId?: number | null): Promise<DecodedSave> {
  const parts = extractSavePayload(raw);
  const payload = base64ToBytes(parts.payload);
  const msgpackBytes = pako.inflate(payload);

  return {
    value: msgpackDecode(msgpackBytes),
    kind: inferKind(fileName),
    saveId: requestedSaveId ?? inferSaveId(fileName),
    parts,
    payloadLength: parts.payload.length,
    msgpackLength: msgpackBytes.length
  };
}

export async function encodeSaveText(
  value: unknown,
  kind: SaveKind,
  saveId: number | null,
  parts?: SaveTextParts | null
): Promise<string> {
  void kind;
  void saveId;
  const msgpackBytes = msgpackEncode(value);
  const payload = bytesToBase64(pako.deflate(msgpackBytes, { level: 9 }));
  if (!parts) return payload;
  return `${parts.prefix}${payload}${parts.suffix}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function toJsonFriendly(value: unknown): unknown {
  if (typeof value === "bigint") return { $bigint: value.toString() };
  if (value instanceof Uint8Array) return { $binary: bytesToBase64(value) };
  if (value instanceof ExtData) {
    const dataValue = typeof value.data === "function" ? value.data(0) : value.data;
    return { $ext: { type: value.type, data: bytesToBase64(dataValue) } };
  }
  if (value instanceof Map) {
    return { $map: Array.from(value.entries()).map(([key, val]) => [toJsonFriendly(key), toJsonFriendly(val)]) };
  }
  if (Array.isArray(value)) return value.map((item) => toJsonFriendly(item));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) out[key] = toJsonFriendly(val);
    return out;
  }
  return value;
}

export function fromJsonFriendly(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => fromJsonFriendly(item));

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "$binary") {
      if (typeof value.$binary !== "string") throw new Error("$binary 必须是 base64 字符串。");
      return base64ToBytes(value.$binary);
    }
    if (keys.length === 1 && keys[0] === "$bigint") {
      if (typeof value.$bigint !== "string") throw new Error("$bigint 必须是十进制字符串。");
      return BigInt(value.$bigint);
    }
    if (keys.length === 1 && keys[0] === "$ext") {
      const extObj = value.$ext;
      if (!isPlainObject(extObj)) throw new Error("$ext 必须是对象。");
      if (typeof extObj.type !== "number") throw new Error("$ext.type 必须是数字。");
      if (typeof extObj.data !== "string") throw new Error("$ext.data 必须是 base64 字符串。");
      return new ExtData(extObj.type, base64ToBytes(extObj.data));
    }
    if (keys.length === 1 && keys[0] === "$map") {
      if (!Array.isArray(value.$map)) throw new Error("$map 必须是 [key, value] 数组。");
      const map = new Map<unknown, unknown>();
      for (const pair of value.$map) {
        if (!Array.isArray(pair) || pair.length !== 2) throw new Error("$map 条目必须是 [key, value]。");
        map.set(fromJsonFriendly(pair[0]), fromJsonFriendly(pair[1]));
      }
      return map;
    }

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) out[key] = fromJsonFriendly(val);
    return out;
  }

  return value;
}
