import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Textarea } from "@rpgmv-modkit/ui";
import { useApp } from "../../AppContext";

export function CustomCommandPanel() {
  const { postCommand, showToast } = useApp();
  const [value, setValue] = useState('{ "type": "ping" }');

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">自定义命令</CardTitle>
        <Textarea spellCheck={false} value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={() => {
            try {
              const command = JSON.parse(value);
              postCommand(command);
            } catch (error: any) {
              showToast(`JSON 错误：${error.message}`);
            }
          }}>发送 JSON</Button>
        </div>
      </CardContent>
    </Card>
  );
}
