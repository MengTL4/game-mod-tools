export interface CatalogEntry {
  id: number;
  name: string;
  description?: string;
  noteText?: string;
  searchText?: string;
  iconIndex?: number;
  faceName?: string;
  characterName?: string;
  kind?: string;
  kindLabel?: string;
  uid?: string;
  value?: string | number;
  label?: string;
  // hunt map
  hasEncounters?: boolean;
  encounterCount?: number;
  encounterStep?: number;
  troopIds?: number[];
  // troop
  tags?: string[];
  exp?: number;
  gold?: number;
  maps?: string[];
  dropNames?: string[];
  enemyText?: string;
  // common event
  trigger?: number;
  switchId?: number;
  // map
  parentId?: number;
  order?: number;
}

export interface StateMap {
  mapId?: number;
  x?: number;
  y?: number;
  direction?: number;
  through?: boolean;
}

export interface PartyMember {
  id: number;
  name?: string;
  level?: number;
  hp?: number;
  mhp?: number;
  mp?: number;
  mmp?: number;
}

export interface GameState {
  ts?: number;
  bridgeVersion?: string;
  storagePatched?: boolean;
  hasParty?: boolean;
  lastError?: string;
  gold?: number;
  saveDirExists?: boolean;
  currentMap?: StateMap;
  saveFiles?: string[];
  partyMembers?: PartyMember[];
  trainerOptions?: Record<string, any>;
  hooksPatched?: boolean;
  rateStats?: { last?: { name?: string; ts?: number } };
  battleStats?: { last?: { name?: string; ts?: number } };
  fishingOptions?: Record<string, any>;
  fishing?: { calls?: Record<string, any>; fields?: Record<string, any>; variables?: Record<string, any>; switches?: Record<string, any> };
  fishingStats?: { last?: { name?: string; ts?: number } };
  offlineHunt?: any;
}

export interface GameEvent {
  ts?: number;
  type?: string;
  ok?: boolean;
  payload?: any;
}

export type ToolTab = "core" | "catalog" | "fishing" | "offline" | "world" | "misc" | "debug";

export type CatalogAction =
  | "item-add"
  | "skill-learn"
  | "skill-forget"
  | "actor-unlock"
  | "actor-select"
  | "variable-select"
  | "variable-set"
  | "switch-on"
  | "switch-off"
  | "map-transfer"
  | "offline-hunt-select"
  | "offline-troop-select"
  | "offline-troop-run"
  | "battle-start"
  | "common-event-run";
