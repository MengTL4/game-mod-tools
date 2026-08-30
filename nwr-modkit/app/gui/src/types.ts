import type * as CatalogCore from "./catalog-core";

export type MapStateRecord = {
  readonly mapId?: unknown;
  readonly x?: unknown;
  readonly y?: unknown;
  readonly direction?: unknown;
};

export type RuntimeStateRecord = { readonly currentMap?: MapStateRecord; readonly [key: string]: unknown };

export type BridgeEventRecord = {
  readonly type?: unknown;
  readonly ok?: unknown;
  readonly payload?: unknown;
  readonly scheduled?: unknown;
};

export type RecordedPosition = {
  readonly mapId: number;
  readonly x: number;
  readonly y: number;
  readonly direction: number;
  readonly fade: number;
};

export type SendCommandOptions = { readonly silent?: boolean };

export type ToolSectionOptions = { readonly keepScroll?: boolean };

export type CatalogSelection = {
  readonly kind: string;
  readonly id: number;
  readonly raw: string;
};

export type CatalogViewRenderOptions = {
  readonly kind: string;
  readonly query: string;
  readonly selectedId?: unknown;
  readonly key?: (entry: CatalogCore.CatalogEntry) => unknown;
  readonly rowKind?: (entry: CatalogCore.CatalogEntry) => unknown;
  readonly leading: (entry: CatalogCore.CatalogEntry) => string;
  readonly extra?: (entry: CatalogCore.CatalogEntry) => unknown;
  readonly actions: (entry: CatalogCore.CatalogEntry) => string;
  readonly description?: (entry: CatalogCore.CatalogEntry) => unknown;
};
