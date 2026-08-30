import fs from "fs";
import type { GuiPaths } from "./paths";

export interface Client {
  ensureBridgeDir(): void;
  readEvents(): any[];
  readState(): any;
  eventSize(): number;
  appendCommand(command: any): any;
  clearEvents(): void;
}

export function createBridgeClient(paths: GuiPaths): Client {
  function ensureBridgeDir(): void {
    fs.mkdirSync(paths.bridgeDir, { recursive: true });
  }

  function readJson(file: string): any {
    try {
      if (!fs.existsSync(file)) return null;
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return null;
    }
  }

  return {
    ensureBridgeDir,
    readEvents(): any[] {
      try {
        if (!fs.existsSync(paths.eventPath)) return [];
        const text = fs.readFileSync(paths.eventPath, "utf8").trim();
        if (!text) return [];
        return text.split(/\r?\n/).map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(Boolean);
      } catch {
        return [];
      }
    },
    readState(): any {
      return readJson(paths.statePath);
    },
    eventSize(): number {
      return fs.existsSync(paths.eventPath) ? fs.statSync(paths.eventPath).size : 0;
    },
    appendCommand(command: any): any {
      ensureBridgeDir();
      const payload = {
        ...command,
        commandId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ts: Date.now()
      };
      fs.appendFileSync(paths.commandPath, JSON.stringify(payload) + "\n", "utf8");
      return payload;
    },
    clearEvents(): void {
      ensureBridgeDir();
      fs.writeFileSync(paths.eventPath, "", "utf8");
    }
  };
}
