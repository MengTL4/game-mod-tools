import { createContext, useContext, useState, useCallback } from "react";
import { sendCommand } from "./lib/bridge";
import type { GameState, GameEvent, ToolTab } from "./types";

interface AppContextValue {
  state: GameState | null;
  events: GameEvent[];
  fresh: boolean;
  toast: string;
  showToast: (message: string) => void;
  activeTab: ToolTab;
  setActiveTab: (tab: ToolTab) => void;
  activeSections: Record<ToolTab, string>;
  setActiveSection: (tab: ToolTab, section: string) => void;
  recordedPosition: { mapId: number; x: number; y: number; direction: number; fade: number } | null;
  setRecordedPosition: (pos: any) => void;
  switchValue: boolean;
  setSwitchValue: (value: boolean) => void;
  offlineHuntMode: "map" | "troop";
  setOfflineHuntMode: (mode: "map" | "troop") => void;
  itemKind: string;
  setItemKind: (kind: string) => void;
  selectedItemKind: string;
  setSelectedItemKind: (kind: string) => void;
  postCommand: (command: any) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  state,
  events,
  fresh,
}: {
  children: React.ReactNode;
  state: GameState | null;
  events: GameEvent[];
  fresh: boolean;
}) {
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTabState] = useState<ToolTab>("core");
  const [activeSections, setActiveSections] = useState<Record<ToolTab, string>>({
    core: "gold",
    catalog: "item",
    fishing: "power",
    offline: "map",
    world: "map",
    misc: "variable",
    debug: "command",
  });
  const [recordedPosition, setRecordedPosition] = useState<any>(null);
  const [switchValue, setSwitchValue] = useState(true);
  const [offlineHuntMode, setOfflineHuntModeState] = useState<"map" | "troop">("map");
  const [itemKind, setItemKind] = useState("all");
  const [selectedItemKind, setSelectedItemKind] = useState("item");

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  }, []);

  const postCommand = useCallback(
    (command: any) => {
      try {
        sendCommand(command);
        showToast(`已发送：${command.type}`);
      } catch (error: any) {
        showToast(`发送失败：${error.message || error}`);
      }
    },
    [showToast]
  );

  const setActiveTab = useCallback((tab: ToolTab) => {
    setActiveTabState(tab);
    if (tab === "offline") {
      setActiveSections((prev) => ({ ...prev, offline: prev.offline === "troop" ? "troop" : "map" }));
    }
  }, []);

  const setActiveSection = useCallback((tab: ToolTab, section: string) => {
    setActiveSections((prev) => ({ ...prev, [tab]: section }));
  }, []);

  const setOfflineHuntMode = useCallback((mode: "map" | "troop") => {
    setOfflineHuntModeState(mode);
    setActiveSections((prev) => ({ ...prev, offline: mode }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        events,
        fresh,
        toast,
        showToast,
        activeTab,
        setActiveTab,
        activeSections,
        setActiveSection,
        recordedPosition,
        setRecordedPosition,
        switchValue,
        setSwitchValue,
        offlineHuntMode,
        setOfflineHuntMode,
        itemKind,
        setItemKind,
        selectedItemKind,
        setSelectedItemKind,
        postCommand,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
