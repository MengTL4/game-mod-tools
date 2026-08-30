import * as NwrGuiCatalog from "./catalog-core";

export type JsonRecord = { readonly [key: string]: unknown };

export type PathAdapter = {
  readonly join: (...segments: readonly string[]) => string;
};

export type FileSystemAdapter = {
  readonly existsSync: (filePath: string) => boolean;
  readonly readFileSync: (filePath: string, encoding: "utf8") => string;
  readonly readdirSync: (filePath: string) => string[];
};

export function loadCatalogs(fs: FileSystemAdapter, path: PathAdapter, dataDir: string): NwrGuiCatalog.Catalogs {
  const systemData = record(readJson(fs, path.join(dataDir, "System.json")));
  const catalogs: NwrGuiCatalog.Catalogs = {
    variable: loadNamedArrayCatalog(arrayField(systemData, "variables")),
    switch: loadNamedArrayCatalog(arrayField(systemData, "switches")),
    item: loadCatalog(fs, path, dataDir, "Items.json"),
    weapon: loadCatalog(fs, path, dataDir, "Weapons.json"),
    armor: loadCatalog(fs, path, dataDir, "Armors.json"),
    actor: loadCatalog(fs, path, dataDir, "Actors.json"),
    skill: loadCatalog(fs, path, dataDir, "Skills.json"),
    map: loadMapCatalog(fs, path, dataDir),
    commonEvent: loadCommonEventCatalog(fs, path, dataDir),
    all: []
  };
  catalogs.all = buildAllItemCatalog(catalogs);
  return catalogs;
}

export function readJsonArray(fs: FileSystemAdapter, filePath: string): readonly unknown[] {
  const data = readJson(fs, filePath);
  return Array.isArray(data) ? data : [];
}

export function readJson(fs: FileSystemAdapter, filePath: string): unknown {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function arrayField(row: JsonRecord | null, key: string): readonly unknown[] {
  const value = row ? row[key] : null;
  return Array.isArray(value) ? value : [];
}

export function property(row: JsonRecord | null, key: string): unknown {
  return row ? row[key] : undefined;
}

export function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

export function isRecord(value: JsonRecord | null): value is JsonRecord {
  return !!value;
}

export function isIdRecord(value: unknown): value is JsonRecord {
  const row = record(value);
  return !!row && Number.isFinite(Number(row.id));
}

export function isNamedIdRecord(value: unknown): value is JsonRecord {
  const row = record(value);
  return !!row && Number.isFinite(Number(row.id)) && !!row.name;
}

export function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function uniqueNumbers(values: readonly number[]): number[] {
  return Array.from(new Set(values.filter(Number.isFinite))).sort((a, b) => a - b);
}

function loadCatalog(fs: FileSystemAdapter, path: PathAdapter, dataDir: string, fileName: string): NwrGuiCatalog.CatalogEntry[] {
  const data = readJson(fs, path.join(dataDir, fileName));
  if (!Array.isArray(data)) return [];
  return data.filter(isNamedIdRecord).map((entry) => {
    const description = cleanText(entry.description || "");
    const noteText = cleanNote(entry.note || "");
    const id = Number(entry.id);
    return {
      id,
      name: String(entry.name),
      iconIndex: finiteNumber(entry.iconIndex, 0),
      description,
      noteText,
      searchText: makeSearchText([id, entry.name, description, noteText]),
      faceName: entry.faceName ? String(entry.faceName) : "",
      characterName: entry.characterName ? String(entry.characterName) : ""
    };
  });
}

function buildAllItemCatalog(catalogs: NwrGuiCatalog.Catalogs): NwrGuiCatalog.CatalogEntry[] {
  return ["item", "weapon", "armor"].flatMap((kind) => {
    const kindLabel = NwrGuiCatalog.ITEM_KIND_LABELS[kind] || kind;
    return (catalogs[kind] || []).map((entry) => ({
      ...entry,
      kind,
      kindLabel,
      uid: `${kind}:${entry.id}`,
      value: `${kind}:${entry.id}`,
      label: `${kindLabel} / ${entry.name}`,
      searchText: makeSearchText([
        entry.searchText,
        `${kind}:${entry.id}`,
        entry.id,
        entry.name,
        entry.description,
        entry.noteText,
        kind,
        kindLabel
      ])
    }));
  });
}

function loadNamedArrayCatalog(names: readonly unknown[]): NwrGuiCatalog.CatalogEntry[] {
  return names.flatMap((name, index) => {
    const text = cleanText(name || "");
    if (!text) return [];
    return [{
      id: index,
      name: text,
      description: "",
      noteText: "",
      searchText: makeSearchText([index, text, name])
    }];
  });
}

function loadMapCatalog(fs: FileSystemAdapter, path: PathAdapter, dataDir: string): NwrGuiCatalog.CatalogEntry[] {
  const data = readJson(fs, path.join(dataDir, "MapInfos.json"));
  if (!Array.isArray(data)) return [];
  return data.filter(isNamedIdRecord).map((entry) => {
    const parent = entry.parentId == null ? "" : `父级 ${entry.parentId}`;
    const order = entry.order == null ? "" : `序 ${entry.order}`;
    return {
      id: Number(entry.id),
      name: cleanText(entry.name),
      description: [parent, order].filter(Boolean).join(" / "),
      noteText: "",
      parentId: entry.parentId,
      order: entry.order,
      searchText: makeSearchText([entry.id, entry.name, parent, order])
    };
  });
}

function loadCommonEventCatalog(fs: FileSystemAdapter, path: PathAdapter, dataDir: string): NwrGuiCatalog.CatalogEntry[] {
  return readJsonArray(fs, path.join(dataDir, "CommonEvents.json"))
    .filter(isNamedIdRecord)
    .map((entry) => {
      const trigger = entry.trigger === 1 ? "自动" : entry.trigger === 2 ? "并行" : "调用";
      const sw = entry.switchId ? `开关 ${entry.switchId}` : "";
      return {
        id: Number(entry.id),
        name: cleanText(entry.name),
        description: [trigger, sw].filter(Boolean).join(" / "),
        noteText: "",
        trigger: entry.trigger,
        switchId: entry.switchId,
        searchText: makeSearchText([entry.id, entry.name, trigger, sw])
      };
    });
}

function cleanText(value: unknown): string {
  return String(value == null ? "" : value)
    .replace(/\\[A-Z]+\[[^\]]*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanNote(value: unknown): string {
  return cleanText(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSearchText(parts: readonly unknown[]): string {
  return parts
    .filter((part) => part != null && part !== "")
    .map((part) => String(part))
    .join(" ")
    .toLowerCase();
}
