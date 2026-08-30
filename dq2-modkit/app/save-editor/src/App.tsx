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

function createDownload(
  content: string,
  fileName: string,
  mime = "text/plain;charset=utf-8"
): void {
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

  const outputSaveName = useMemo(
    () => `${stripExt(loadedName)}.edited.rpgsave`,
    [loadedName]
  );
  const outputJsonName = useMemo(
    () => `${stripExt(loadedName)}.json`,
    [loadedName]
  );

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

  async function handleSaveLoad(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      setStatus("解密中");
      const text = await file.text();
      const inferredId = inferId(file.name);
      if (inferredId != null) setSaveId(String(inferredId));
      const requestedId = inferredId ?? Number(saveId);
      const result = await decodeSaveText(
        text,
        file.name,
        Number.isFinite(requestedId) ? requestedId : null
      );
      const selectedKind = modeChoice === "auto" ? result.kind : modeChoice;
      const normalized =
        selectedKind === result.kind
          ? result
          : { ...result, kind: selectedKind };
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

  async function handleJsonLoad(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
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
    return decoded?.kind ?? "v2";
  }

  function currentSaveId(): number | null {
    const kind = currentKind();
    if (kind === "config") return null;
    const value = Number(saveId);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("v2 存档需要有效的槽位 ID。");
    }
    return value;
  }

  async function handleExportSave(): Promise<void> {
    try {
      setError("");
      const restored = fromJsonFriendly(getEditorValue());
      const text = await encodeSaveText(
        restored,
        currentKind(),
        currentSaveId(),
        decoded?.parts
      );
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
      createDownload(
        JSON.stringify(getEditorValue(), null, 2),
        jsonName || outputJsonName,
        "application/json;charset=utf-8"
      );
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
    <div className="grid h-screen min-w-[980px] grid-rows-[auto_1fr]">
      <header className="flex items-center justify-between border-b bg-card/95 px-5 py-3.5 backdrop-blur">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-primary">
            Offline Save File
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            大千世界2 存档编辑器
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "inline-flex min-w-[92px] items-center justify-center rounded-full border px-3 py-1 text-sm font-semibold",
              error
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-primary/30 bg-primary/10 text-primary"
            )}
          >
            {status}
          </div>
          <Button onClick={() => saveFileRef.current?.click()}>
            打开存档
          </Button>
          <Button variant="secondary" onClick={() => jsonFileRef.current?.click()}>
            打开 JSON
          </Button>
          <Button variant="outline" onClick={handleExportJson}>
            导出 JSON
          </Button>
          <Button variant="default" onClick={() => void handleExportSave()}>
            导出存档
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 grid-cols-[328px_1fr] gap-4 overflow-auto bg-background p-4">
        <aside className="grid min-h-0 grid-rows-[auto_auto_1fr] gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">文件</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between border-t pt-2 first:border-t-0 first:pt-0">
                  <dt className="text-muted-foreground">存档</dt>
                  <dd className="break-all font-mono text-xs">{loadedName}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 first:border-t-0 first:pt-0">
                  <dt className="text-muted-foreground">类型</dt>
                  <dd className="font-mono text-xs">{decoded?.kind ?? "-"}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 first:border-t-0 first:pt-0">
                  <dt className="text-muted-foreground">槽位</dt>
                  <dd className="font-mono text-xs">{decoded?.saveId ?? "-"}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 first:border-t-0 first:pt-0">
                  <dt className="text-muted-foreground">Payload</dt>
                  <dd className="font-mono text-xs">
                    {decoded ? decoded.payloadLength.toLocaleString() : "-"}
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-2 first:border-t-0 first:pt-0">
                  <dt className="text-muted-foreground">MsgPack</dt>
                  <dd className="font-mono text-xs">
                    {decoded ? formatBytes(decoded.msgpackLength) : "-"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">编码</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>输出类型</Label>
                <Select
                  value={modeChoice}
                  onChange={(event) =>
                    setModeChoice(event.target.value as ModeChoice)
                  }
                >
                  <option value="auto">auto</option>
                  <option value="v2">v2 save/global</option>
                  <option value="config">config</option>
                </Select>
              </div>
              <div className="space-y-1.5">
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
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-6">
                <p className="break-all text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}
        </aside>

        <Card className="flex min-h-0 flex-col overflow-hidden">
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
