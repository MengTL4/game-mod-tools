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
  Separator,
  Switch,
  Textarea,
} from "@game-mod-tools/ui";
import {
  decodeSaveText,
  encodeSaveText,
  fromJsonFriendly,
  toJsonFriendly,
  type SaveTextParts,
} from "./codec";

function createDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function stripExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) {
    return filename;
  }
  return filename.slice(0, dot);
}

function App() {
  const [saveInput, setSaveInput] = useState("");
  const [saveOutput, setSaveOutput] = useState("");
  const [status, setStatus] = useState("就绪，可加载存档。");
  const [error, setError] = useState<string | null>(null);
  const [preserveAffix, setPreserveAffix] = useState(true);
  const [lastSaveName, setLastSaveName] = useState("file1.rpgsave");
  const [parts, setParts] = useState<SaveTextParts | null>(null);

  const saveFileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<JSONEditor | null>(null);

  const outputSaveName = useMemo(() => `${stripExt(lastSaveName)}.rebuilt.rpgsave`, [lastSaveName]);
  const outputJsonName = useMemo(() => `${stripExt(lastSaveName)}.json`, [lastSaveName]);

  useEffect(() => {
    if (!editorHostRef.current) {
      return;
    }

    const options: JSONEditorOptions = {
      mode: "tree",
      modes: ["tree", "view", "form", "code", "text"],
      language: "zh-CN",
      mainMenuBar: true,
      navigationBar: true,
      statusBar: true,
      onError: (errorValue: Error) => {
        setError(`编辑器错误：${errorValue.message}`);
      },
    };

    const editor = new JSONEditor(editorHostRef.current, options, {});
    editorRef.current = editor;
    setStatus("编辑器已就绪，可解密并编辑 JSON（支持节点展开/收缩）。");

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  const setEditorValue = (value: unknown): void => {
    if (!editorRef.current) {
      throw new Error("JSON 编辑器尚未初始化。请稍等页面加载完成。");
    }
    editorRef.current.set(value as never);
  };

  const getEditorValue = (): unknown => {
    if (!editorRef.current) {
      throw new Error("JSON 编辑器尚未初始化。请稍等页面加载完成。");
    }
    return editorRef.current.get();
  };

  const handleSaveFileLoad = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setSaveInput(text);
    setLastSaveName(file.name);
    setStatus(`已加载存档文本：${file.name}（${text.length.toLocaleString()} 字符）`);
    setError(null);
    event.target.value = "";
  };

  const handleJsonFileLoad = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      setEditorValue(parsed);
      setLastSaveName(file.name);
      setStatus(`已加载 JSON：${file.name}（${text.length.toLocaleString()} 字符）`);
      setError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(`载入 JSON 失败：${message}`);
      setStatus("载入 JSON 失败。");
    }
    event.target.value = "";
  };

  const handleDecode = (): void => {
    setError(null);
    try {
      const decoded = decodeSaveText(saveInput);
      const friendly = toJsonFriendly(decoded.value);
      setEditorValue(friendly);
      setParts(decoded.parts);
      setStatus(
        `解密成功：payload ${decoded.parts.payload.length.toLocaleString()} 字符，` +
          `前缀 ${decoded.parts.prefix.length} 字符，后缀 ${decoded.parts.suffix.length} 字符。`
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(`解密失败：${message}`);
      setStatus("解密失败。");
    }
  };

  const handleEncode = (): void => {
    setError(null);
    try {
      const editorValue = getEditorValue();
      const restored = fromJsonFriendly(editorValue);
      const encoded = encodeSaveText(restored, preserveAffix && parts ? parts : undefined);
      setSaveOutput(encoded);
      setStatus(`加密成功：输出 ${encoded.length.toLocaleString()} 字符。`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(`加密失败：${message}`);
      setStatus("加密失败。");
    }
  };

  const handleFormatJson = (): void => {
    setError(null);
    try {
      const parsed = getEditorValue();
      setEditorValue(parsed);
      setStatus("JSON 已规范化。");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(`格式化失败：${message}`);
      setStatus("格式化失败。");
    }
  };

  const handleValidateJson = (): void => {
    setError(null);
    try {
      const parsed = getEditorValue();
      fromJsonFriendly(parsed);
      setStatus("JSON 校验通过，标记字段可正常解析。");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(`校验失败：${message}`);
      setStatus("校验失败。");
    }
  };

  const handleExpandAll = (): void => {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.expandAll();
    setStatus("已展开全部节点。");
  };

  const handleCollapseAll = (): void => {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.collapseAll();
    setStatus("已收起全部节点。");
  };

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <header className="mx-auto mb-6 max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle>RPG 存档加解密 + JSON 树形编辑器</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              支持格式：<code>base64 -&gt; zlib -&gt; MessagePack</code>。JSON 编辑区支持节点逐级展开/收缩，适合处理大体积数据。
              标记对象 <code>$binary</code>、<code>$ext</code>、<code>$map</code>、<code>$bigint</code> 可安全往返。
            </p>
          </CardContent>
        </Card>
      </header>

      <main className="mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>工具栏</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => saveFileInputRef.current?.click()}>加载存档文件</Button>
              <Button onClick={() => jsonFileInputRef.current?.click()}>加载 JSON 文件</Button>
              <Button onClick={handleDecode}>解密存档 -&gt; JSON</Button>
              <Button onClick={handleEncode}>加密 JSON -&gt; 存档</Button>
              <Button onClick={handleValidateJson} variant="secondary">
                校验 JSON
              </Button>
              <Button onClick={handleFormatJson} variant="secondary">
                规范化 JSON
              </Button>
              <Button onClick={handleExpandAll} variant="secondary">
                展开全部
              </Button>
              <Button onClick={handleCollapseAll} variant="secondary">
                收起全部
              </Button>
              <Button
                onClick={() => {
                  try {
                    const value = JSON.stringify(getEditorValue(), null, 2);
                    createDownload(value, lastSaveName ? outputJsonName : "file.json");
                  } catch (cause) {
                    const message = cause instanceof Error ? cause.message : String(cause);
                    setError(`导出 JSON 失败：${message}`);
                  }
                }}
                variant="outline"
              >
                下载 JSON
              </Button>
              <Button
                onClick={() => {
                  if (!saveOutput.trim()) {
                    setError("无法下载存档：加密输出为空。");
                    return;
                  }
                  createDownload(saveOutput, outputSaveName);
                }}
                variant="outline"
              >
                下载存档
              </Button>

              <div className="flex items-center gap-2">
                <Switch
                  id="preserve-affix"
                  checked={preserveAffix}
                  onChange={(event) => setPreserveAffix(event.target.checked)}
                />
                <Label htmlFor="preserve-affix">保留源存档前后缀</Label>
              </div>
            </div>

            <Input
              ref={saveFileInputRef}
              type="file"
              accept=".rpgsave,.txt"
              className="hidden"
              onChange={handleSaveFileLoad}
            />
            <Input
              ref={jsonFileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleJsonFileLoad}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">状态：</span>
                {status}
              </div>
              {parts && (
                <div>
                  <span className="font-medium">检测到前后缀：</span>前缀 {parts.prefix.length} 字符，后缀{" "}
                  {parts.suffix.length} 字符
                </div>
              )}
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-destructive">{error}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>加密存档输入</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <Textarea
                value={saveInput}
                onChange={(event) => setSaveInput(event.target.value)}
                placeholder="在此粘贴 .rpgsave 文本（或点击按钮加载文件）"
                className="min-h-[160px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>加密存档输出</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <Textarea
                value={saveOutput}
                onChange={(event) => setSaveOutput(event.target.value)}
                placeholder="执行“加密 JSON -&gt; 存档”后，结果会显示在这里"
                className="min-h-[160px] font-mono text-sm"
              />
            </CardContent>
          </Card>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>解密 JSON 编辑区（树形，可逐节点展开/收缩）</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={editorHostRef} className="min-h-[400px] rounded-md border" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default App;
