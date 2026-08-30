import { Button, Card, CardContent, CardHeader, CardTitle, Textarea } from "@game-mod-tools/ui";

interface DebugPanelProps {
  state: any;
  setField: (key: string, value: any) => void;
  onSend: () => void;
}

export function DebugPanel({ state, setField, onSend }: DebugPanelProps) {
  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">自定义命令</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          spellCheck={false}
          value={state.customCommand}
          onChange={(e) => setField("customCommand", e.target.value)}
          className="min-h-[112px] font-mono text-xs"
        />
        <Button variant="secondary" onClick={onSend}>发送 JSON</Button>
      </CardContent>
    </Card>
  );
}
