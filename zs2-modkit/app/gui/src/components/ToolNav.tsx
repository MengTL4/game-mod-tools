import { Button, cn } from "@rpgmv-modkit/ui";

interface ToolNavProps {
  tabs: { key: string; label: string; hint: string }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ToolNav({ tabs, activeTab, onTabChange }: ToolNavProps) {
  return (
    <nav className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 p-2 border rounded-xl bg-muted/30">
      {tabs.map((tab) => (
        <Button
          key={tab.key}
          variant={activeTab === tab.key ? "default" : "ghost"}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "h-auto min-h-[52px] flex-col items-start text-left justify-start py-2 px-3",
            activeTab === tab.key && "bg-primary/10 text-primary hover:bg-primary/15"
          )}
        >
          <span className="font-bold text-sm leading-none">{tab.label}</span>
          <span className="text-[10px] text-muted-foreground leading-tight">{tab.hint}</span>
        </Button>
      ))}
    </nav>
  );
}
