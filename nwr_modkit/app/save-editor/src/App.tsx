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
  Separator,
  cn,
} from "@game-mod-tools/ui";
import {
  decodeSaveText,
  encodeSaveText,
  fromJsonFriendly,
  toJsonFriendly,
  type DecodedSave,
} from "./codec";
import {
  analyzePrisonGuards,
  hasBlockingPrisonRisk,
  repairPrisonGuards,
  type PrisonGuardCheck,
  type PrisonGuardReport,
} from "./prisonGuards";
import SimpleEditor, { type GameDataIndex } from "./SimpleEditor";

type EditorMode = "json" | "simple";

function stripExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readPath(value: unknown, path: string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    const record = asRecord(current);
    if (!record || !(key in record)) return undefined;
    current = record[key];
  }
  return current;
}

function describe(value: unknown): string {
  if (value === undefined) return "-";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function severityText(check: PrisonGuardCheck): string {
  if (check.severity === "danger") return "命中";
  if (check.severity === "warning") return "提示";
  return "通过";
}

export default function App() {
  const [status, setStatus] = useState("就绪");
  const [error, setError] = useState("");
  const [loadedName, setLoadedName] = useState("file1.rpgsave");
  const [decoded, setDecoded] = useState<DecodedSave | null>(null);
  const [jsonName, setJsonName] = useState("file1.json");
  const [prisonReport, setPrisonReport] = useState<PrisonGuardReport | null>(null);
  const [showGuardDetails, setShowGuardDetails] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("json");
  const [currentValue, setCurrentValue] = useState<unknown | null>(null);
  const [gameDataIndex, setGameDataIndex] = useState<GameDataIndex | null>(null);

  const saveFileRef = useRef<HTMLInputElement | null>(null);
  const jsonFileRef = useRef<HTMLInputElement | null>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<JSONEditor | null>(null);
  const guardCloseRef = useRef<HTMLButtonElement | null>(null);

  const outputSaveName = useMemo(() => {
    const source = decoded ? loadedName : jsonName;
    return `${stripExt(source)}.edited.rpgsave`;
  }, [decoded, jsonName, loadedName]);
  const outputJsonName = useMemo(
    () => `${stripExt(loadedName)}.json`,
    [loadedName]
  );

  const quickInfo = useMemo(() => {
    const value = currentValue ?? decoded?.value ?? null;
    return {
      gold: readPath(value, ["party", "_gold"]),
      mapId: readPath(value, ["map", "_mapId"]),
      playerX: readPath(value, ["player", "_x"]),
      playerY: readPath(value, ["player", "_y"]),
      saveCount: readPath(value, ["system", "_saveCount"]),
    };
  }, [currentValue, decoded]);

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

  useEffect(() => {
    let cancelled = false;
    fetch("/game-data-index.json")
      .then((response): Promise<GameDataIndex | null> => {
        const contentType = response.headers.get("content-type") || "";
        if (
          response.status === 404 ||
          !contentType.includes("application/json")
        )
          return Promise.resolve(null);
        if (!response.ok)
          throw new Error(`字段索引读取失败：${response.status}`);
        return response.json() as Promise<GameDataIndex>;
      })
      .then((value) => {
        if (!cancelled && value) setGameDataIndex(value);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showGuardDetails) return;
    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    guardCloseRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowGuardDetails(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      activeElement?.focus();
    };
  }, [showGuardDetails]);

  function setEditorValue(value: unknown): void {
    if (!editorRef.current) throw new Error("编辑器尚未初始化。");
    editorRef.current.set(value as never);
  }

  function getEditorValue(): unknown {
    if (!editorRef.current) throw new Error("编辑器尚未初始化。");
    return editorRef.current.get();
  }

  function getWorkingValue(): unknown {
    if (editorMode === "json") return getEditorValue();
    if (currentValue == null) throw new Error("还没有打开存档。");
    return currentValue;
  }

  function applyWorkingValue(value: unknown, message: string): void {
    setCurrentValue(value);
    setEditorValue(value);
    setPrisonReport(analyzePrisonGuards(fromJsonFriendly(value)));
    setStatus(message);
  }

  function handleModeChange(nextMode: EditorMode): void {
    try {
      setError("");
      if (nextMode === "simple") {
        const value = getEditorValue();
        fromJsonFriendly(value);
        setCurrentValue(value);
        setPrisonReport(analyzePrisonGuards(fromJsonFriendly(value)));
      } else if (currentValue != null) {
        setEditorValue(currentValue);
      }
      setEditorMode(nextMode);
      setStatus(nextMode === "simple" ? "简易编辑" : "标准编辑");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus("切换失败");
    }
  }

  async function handleSaveLoad(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      setStatus("解码中");
      const text = await file.text();
      const result = await decodeSaveText(text);
      setLoadedName(file.name);
      setJsonName(`${stripExt(file.name)}.json`);
      setDecoded(result);
      const editorValue = toJsonFriendly(result.value);
      setEditorValue(editorValue);
      setCurrentValue(editorValue);
      setPrisonReport(analyzePrisonGuards(editorValue));
      setStatus(`已打开 ${file.name}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus("打开失败");
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
      const value = JSON.parse(text);
      setEditorValue(value);
      setCurrentValue(value);
      setJsonName(file.name);
      setLoadedName(`${stripExt(file.name)}.rpgsave`);
      setDecoded(null);
      setPrisonReport(analyzePrisonGuards(value));
      setStatus(`已载入 ${file.name}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus("载入失败");
    } finally {
      event.target.value = "";
    }
  }

  async function handleExportSave(): Promise<void> {
    try {
      setError("");
      const restored = fromJsonFriendly(getWorkingValue());
      const report = analyzePrisonGuards(restored);
      setPrisonReport(report);
      if (hasBlockingPrisonRisk(report)) {
        throw new Error(
          `导出已拦截：发现 ${report.hits.length} 项小黑屋硬风险。请先点“一键修复”或手动调低风险值。`
        );
      }
      const text = await encodeSaveText(restored, decoded?.parts);
      createDownload(text, outputSaveName);
      setStatus(`已导出 ${outputSaveName}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus(message.includes("导出已拦截") ? "已拦截" : "导出失败");
    }
  }

  function handleExportJson(): void {
    try {
      setError("");
      createDownload(
        JSON.stringify(getWorkingValue(), null, 2),
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
      const value = getWorkingValue();
      fromJsonFriendly(value);
      setCurrentValue(value);
      setStatus("JSON 有效");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus("校验失败");
    }
  }

  function handleRefreshPrisonGuards(): void {
    try {
      setError("");
      const value = fromJsonFriendly(getWorkingValue());
      const report = analyzePrisonGuards(value);
      setPrisonReport(report);
      setStatus(
        report.hits.length ? `发现 ${report.hits.length} 项风险` : "小黑屋检查通过"
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus("检查失败");
    }
  }

  function handleRepairPrisonGuards(): void {
    try {
      setError("");
      const value = fromJsonFriendly(getWorkingValue());
      const result = repairPrisonGuards(value);
      const editorValue = toJsonFriendly(result.value);
      setEditorValue(editorValue);
      setCurrentValue(editorValue);
      setPrisonReport(analyzePrisonGuards(result.value));
      setStatus(
        result.fixed.length ? `已修复 ${result.fixed.length} 项风险` : "无需修复"
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setStatus("修复失败");
    }
  }

  const metaItem = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="p-6 pb-0">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-semibold tracking-tight text-primary">
                  NATIVE RPGSAVE JSON
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  梦魇：无归 存档编辑器
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium",
                    error
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-foreground"
                  )}
                  aria-live="polite"
                >
                  {status}
                </div>
                <div
                  className="flex items-center gap-2 rounded-md border p-1"
                  role="tablist"
                  aria-label="编辑模式"
                >
                  <Button
                    variant={editorMode === "json" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleModeChange("json")}
                  >
                    标准
                  </Button>
                  <Button
                    variant={editorMode === "simple" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleModeChange("simple")}
                  >
                    简易
                  </Button>
                </div>
                <Button onClick={() => saveFileRef.current?.click()}>
                  打开存档
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => jsonFileRef.current?.click()}
                >
                  打开 JSON
                </Button>
                <Button variant="outline" onClick={handleExportJson}>
                  导出 JSON
                </Button>
                <Button onClick={() => void handleExportSave()}>
                  导出存档
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </header>

      <main className="flex-1 p-6">
        <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>文件</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metaItem("存档", loadedName)}
                {metaItem("格式", decoded?.kind ?? "JSON")}
                {metaItem(
                  "Payload",
                  decoded ? decoded.payloadLength.toLocaleString() : "-"
                )}
                {metaItem(
                  "JSON",
                  decoded ? formatBytes(decoded.jsonLength) : "-"
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>当前摘要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metaItem("金币", describe(quickInfo.gold))}
                {metaItem("地图", describe(quickInfo.mapId))}
                {metaItem(
                  "坐标",
                  `${describe(quickInfo.playerX)}, ${describe(
                    quickInfo.playerY
                  )}`
                )}
                {metaItem("保存次数", describe(quickInfo.saveCount))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>常用位置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  {metaItem("金币", "party._gold")}
                  {metaItem("变量", "variables._data.@a")}
                  {metaItem("开关", "switches._data.@a")}
                  {metaItem("角色", "actors._data.@a")}
                  {metaItem(
                    "背包",
                    "party._items / _weapons / _armors"
                  )}
                </div>
                <Separator />
                <div className="grid grid-cols-3 gap-3">
                  <Button size="sm" onClick={handleValidate}>
                    校验
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => editorRef.current?.expandAll()}
                  >
                    展开
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => editorRef.current?.collapseAll()}
                  >
                    收起
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>小黑屋护栏</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className={cn(
                    "rounded-md border px-3 py-2 text-center text-sm font-semibold",
                    !prisonReport && "bg-muted text-muted-foreground",
                    prisonReport &&
                      prisonReport.hits.length === 0 &&
                      "bg-primary/10 text-primary",
                    prisonReport &&
                      prisonReport.hits.length > 0 &&
                      "bg-destructive/10 text-destructive"
                  )}
                >
                  {prisonReport
                    ? prisonReport.hits.length
                      ? `${prisonReport.hits.length} 项硬风险`
                      : "已知硬阈值通过"
                    : "未检查"}
                </div>
                {prisonReport && (
                  <div
                    className="grid grid-cols-3 gap-3"
                    aria-label="小黑屋检测统计"
                  >
                    <div className="rounded-md border p-3 text-center">
                      <div className="text-xs text-muted-foreground">硬风险</div>
                      <div className="text-lg font-semibold">
                        {prisonReport.hits.length}
                      </div>
                    </div>
                    <div className="rounded-md border p-3 text-center">
                      <div className="text-xs text-muted-foreground">提示</div>
                      <div className="text-lg font-semibold">
                        {prisonReport.warnings.length}
                      </div>
                    </div>
                    <div className="rounded-md border p-3 text-center">
                      <div className="text-xs text-muted-foreground">
                        总规则
                      </div>
                      <div className="text-lg font-semibold">
                        {prisonReport.checks.length}
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <Button size="sm" onClick={handleRefreshPrisonGuards}>
                    刷新检测
                  </Button>
                  <Button size="sm" onClick={handleRepairPrisonGuards}>
                    一键修复
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowGuardDetails(true)}
                    disabled={!prisonReport}
                  >
                    检测清单
                  </Button>
                </div>
                {prisonReport && (
                  <div className="space-y-3">
                    {prisonReport.checks
                      .filter((check) => check.severity !== "ok")
                      .map((check) => (
                        <div
                          key={check.id}
                          className={cn(
                            "rounded-md border p-3 text-sm",
                            check.severity === "danger" &&
                              "bg-destructive/10 text-destructive",
                            check.severity === "warning" &&
                              "bg-secondary text-secondary-foreground"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <strong>{check.label}</strong>
                            <span>
                              {check.value} / {check.limit}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {check.path}
                          </div>
                          {check.note && (
                            <div className="text-xs text-muted-foreground">
                              {check.note}
                            </div>
                          )}
                        </div>
                      ))}
                    {!prisonReport.hits.length && (
                      <div className="rounded-md border bg-primary/10 p-3 text-sm text-primary">
                        <div className="flex items-center justify-between">
                          <strong>硬风险</strong>
                          <span>无命中</span>
                        </div>
                        <div className="text-xs opacity-80">
                          导出前仍会重新检查
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {error && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="p-6 text-sm text-destructive">
                  {error}
                </CardContent>
              </Card>
            )}
          </aside>

          <Card className="flex flex-col">
            <CardContent className="flex-1 p-0">
              <div
                className={cn(
                  "h-full",
                  editorMode === "json" ? "block" : "hidden"
                )}
              >
                <div
                  ref={editorHostRef}
                  className="h-full min-h-[400px]"
                />
              </div>
              {editorMode === "simple" && (
                <SimpleEditor
                  value={currentValue}
                  dataIndex={gameDataIndex}
                  onChange={applyWorkingValue}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Input
        ref={saveFileRef}
        type="file"
        accept=".rpgsave,.txt"
        className="hidden"
        onChange={(event) => void handleSaveLoad(event)}
      />
      <Input
        ref={jsonFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(event) => void handleJsonLoad(event)}
      />

      {showGuardDetails && prisonReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          role="presentation"
          onMouseDown={() => setShowGuardDetails(false)}
        >
          <Card
            className="flex max-h-[90vh] w-full max-w-7xl flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guard-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold tracking-tight text-primary">
                    PRISON CHECKS
                  </div>
                  <CardTitle id="guard-modal-title">小黑屋检测清单</CardTitle>
                </div>
                <Button
                  ref={guardCloseRef}
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGuardDetails(false)}
                >
                  关闭
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border bg-muted px-3 py-1 text-xs font-semibold">
                  命中 {prisonReport.hits.length}
                </span>
                <span className="rounded-full border bg-muted px-3 py-1 text-xs font-semibold">
                  提示 {prisonReport.warnings.length}
                </span>
                <span className="rounded-full border bg-muted px-3 py-1 text-xs font-semibold">
                  位置 Map{prisonReport.mapId ?? "-"} ({prisonReport.playerX ??
                    "-"}, {prisonReport.playerY ?? "-"})
                </span>
              </div>
              <div className="overflow-auto">
                <table className="w-full min-w-[1000px] border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border-b px-3 py-2 text-left">状态</th>
                      <th className="border-b px-3 py-2 text-left">分组</th>
                      <th className="border-b px-3 py-2 text-left">检测项</th>
                      <th className="border-b px-3 py-2 text-left">当前值</th>
                      <th className="border-b px-3 py-2 text-left">安全条件</th>
                      <th className="border-b px-3 py-2 text-left">触发后</th>
                      <th className="border-b px-3 py-2 text-left">路径</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prisonReport.checks.map((check) => (
                      <tr
                        key={check.id}
                        className={cn(
                          check.severity === "danger" &&
                            "bg-destructive/10 text-destructive",
                          check.severity === "warning" && "bg-secondary"
                        )}
                      >
                        <td className="border-b px-3 py-2">
                          <span
                            className={cn(
                              "inline-block rounded-full border px-2 py-1 text-xs font-semibold",
                              check.severity === "danger" &&
                                "bg-destructive/10 text-destructive",
                              check.severity === "warning" &&
                                "bg-secondary text-secondary-foreground",
                              check.severity === "ok" &&
                                "bg-primary/10 text-primary"
                            )}
                          >
                            {severityText(check)}
                          </span>
                        </td>
                        <td className="border-b px-3 py-2">{check.group}</td>
                        <td className="border-b px-3 py-2">
                          <strong>{check.label}</strong>
                          {check.note && (
                            <div className="text-xs text-muted-foreground">
                              {check.note}
                            </div>
                          )}
                        </td>
                        <td className="border-b px-3 py-2 font-mono text-xs">
                          {check.value}
                        </td>
                        <td className="border-b px-3 py-2 font-mono text-xs">
                          {check.limit}
                        </td>
                        <td className="border-b px-3 py-2">{check.effect}</td>
                        <td className="border-b px-3 py-2 font-mono text-xs text-primary">
                          {check.path}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
