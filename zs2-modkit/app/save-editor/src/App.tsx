import { useEffect, useMemo, useRef, useState } from "react";
import JSONEditor, { type JSONEditorOptions } from "jsoneditor";
import "jsoneditor/dist/jsoneditor.css";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  cn,
} from "@rpgmv-modkit/ui";
import {
  decodeSaveText,
  encodeSaveText,
  fromJsonFriendly,
  toJsonFriendly,
  type DecodedSave,
  type SaveKind,
} from "./codec";

type ModeChoice = "auto" | SaveKind;

function stripExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

function inferId(fileName: string): number | null {
  const lower = fileName.toLowerCase();
  if (lower === "global.rpgsave" || lower === "global") return 0;
  const match = lower.match(/^file(\d+)(?:\.rpgsave)?$/);
  return match ? Number(match[1]) : null;
}

function createDownload(content: string, fileName: string, mime = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export default function App() {
  const [status, setStatus] = useState("就绪");
  const [error, setError] = useState("");
  const [loadedName, setLoadedName] = useState("file1.rpgsave");
  const [modeChoice, setModeChoice] = useState<ModeChoice>("auto");
  const [saveId, setSaveId] = useState("1");
  const [decoded, setDecoded] = useState<DecodedSave | null>(null);
  const [jsonName, setJsonName] = useState("file1.json");

  const saveFileRef = useRef<HTMLInputElement | null>(null);
  const jsonFileRef = useRef<HTMLInputElement | null>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<JSONEditor | null>(null);

  const outputSaveName = useMemo(() => `${stripExt(loadedName)}.edited.rpgsave`, [loadedName]);
  const outputJsonName = useMemo(() => `${stripExt(loadedName)}.json`, [loadedName]);

  useEffect(() => {
    if (!editorHostRef.current) return;
    const options: JSONEditorOptions = {
      mode: "tree",
      modes: ["tree", "view", "form", "code", "text"],
      language: "zh-CN",
      mainMenuBar: true,
      navigationBar: true,
      statusBar: true,
      onError: (value: Error) => setError(value.message),
    };
    const editor = new JSONEditor(editorHostRef.current, options, {});
    editorRef.current = editor;
    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  function setEditorValue(value: unknown): void {
    if (!editorRef.current) throw new Error("编辑器尚未初始化。");
    editorRef.current.set(value as never);
  }

  function getEditorValue(): unknown {
    if (!editorRef.current) throw new Error("编辑器尚未初始化。");
    return editorRef.current.get();
  }

  async function handleSaveLoad(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      setStatus("解密中");
      const text = await file.text();
      const inferredId = inferId(file.name);
      if (inferredId != null) setSaveId(String(inferredId));
      const requestedId = inferredId ?? Number(saveId);
      const result = await decodeSaveText(text, file.name, Number.isFinite(requestedId) ? requestedId : null);
      const selectedKind = modeChoice === "auto" ? result.kind : modeChoice;
      const normalized = selectedKind === result.kind ? result : { ...result, kind: selectedKind };
      setLoadedName(file.name);
      setJsonName(`${stripExt(file.name)}.json`);
      setDecoded(normalized);
      if (normalized.saveId != null) setSaveId(String(normalized.saveId));
      setEditorValue(toJsonFriendly(normalized.value));
      setStatus(`已解密 ${file.name}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus("解密失败");
    } finally {
      event.target.value = "";
    }
  }

  async function handleJsonLoad(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      const text = await file.text();
      setEditorValue(JSON.parse(text));
      setJsonName(file.name);
      setStatus(`已载入 ${file.name}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus("载入失败");
    } finally {
      event.target.value = "";
    }
  }

  function currentKind(): SaveKind {
    if (modeChoice !== "auto") return modeChoice;
    return decoded?.kind ?? "rpgsave";
  }

  function currentSaveId(): number | null {
    const value = Number(saveId);
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  async function handleExportSave(): Promise<void> {
    try {
      setError("");
      const restored = fromJsonFriendly(getEditorValue());
      const text = await encodeSaveText(restored, currentKind(), currentSaveId(), decoded?.parts);
      createDownload(text, outputSaveName);
      setStatus(`已导出 ${outputSaveName}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus("导出失败");
    }
  }

  function handleExportJson(): void {
    try {
      setError("");
      createDownload(JSON.stringify(getEditorValue(), null, 2), jsonName || outputJsonName, "application/json;charset=utf-8");
      setStatus(`已导出 ${jsonName || outputJsonName}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus("导出失败");
    }
  }

  function handleValidate(): void {
    try {
      setError("");
      fromJsonFriendly(getEditorValue());
      setStatus("JSON 有效");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus("校验失败");
    }
  }

  return (
    <div className="flex flex-col min-h-screen min-w-[980px] bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div>
          <div className="text-xs font-extrabold tracking-widest text-primary uppercase">
            OFFLINE SAVE FILE
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
            再刷一把2 存档编辑器
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-semibold border",
              error
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-primary/10 text-primary border-primary/20"
            )}
          >
            {status}
          </div>
          <Button onClick={() => saveFileRef.current?.click()}>打开存档</Button>
          <Button variant="secondary" onClick={() => jsonFileRef.current?.click()}>
            打开 JSON
          </Button>
          <Button variant="secondary" onClick={handleExportJson}>
            导出 JSON
          </Button>
          <Button onClick={() => void handleExportSave()}>导出存档</Button>
        </div>
      </header>

      <main
        className="grid flex-1 gap-4 p-4 min-h-0"
        style={{ gridTemplateColumns: "328px minmax(0, 1fr)" }}
      >
        <aside className="flex flex-col gap-3 min-h-0 overflow-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-primary">文件</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">存档</dt>
                <dd className="font-mono break-all">{loadedName}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">类型</dt>
                <dd className="font-mono break-all">{decoded?.kind ?? "-"}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">槽位</dt>
                <dd className="font-mono break-all">{decoded?.saveId ?? "-"}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">Payload</dt>
                <dd className="font-mono break-all">
                  {decoded ? decoded.payloadLength.toLocaleString() : "-"}
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">MsgPack</dt>
                <dd className="font-mono break-all">
                  {decoded ? formatBytes(decoded.msgpackLength) : "-"}
                </dd>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-primary">编码</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>输出类型</Label>
                <Select
                  value={modeChoice}
                  onChange={(event) => setModeChoice(event.target.value as ModeChoice)}
                >
                  <option value="auto">auto</option>
                  <option value="rpgsave">save/global</option>
                  <option value="config">config</option>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>槽位 ID</Label>
                <Input
                  value={saveId}
                  onChange={(event) => setSaveId(event.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={handleValidate}>
                  校验
                </Button>
                <Button
                  variant="outline"
                  onClick={() => editorRef.current?.expandAll()}
                >
                  展开
                </Button>
                <Button
                  variant="outline"
                  onClick={() => editorRef.current?.collapseAll()}
                >
                  收起
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive/30 bg-destructive/10">
              <CardContent className="py-4 text-sm text-destructive break-all">
                {error}
              </CardContent>
            </Card>
          )}
        </aside>

        <Card className="flex flex-col overflow-hidden p-0">
          <div ref={editorHostRef} className="flex-1" />
        </Card>
      </main>

      <input
        ref={saveFileRef}
        type="file"
        accept=".rpgsave,.txt"
        hidden
        onChange={(event) => void handleSaveLoad(event)}
      />
      <input
        ref={jsonFileRef}
        type="file"
        accept=".json"
        hidden
        onChange={(event) => void handleJsonLoad(event)}
      />
    </div>
  );
}
