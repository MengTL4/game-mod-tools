import { Button, cn } from "@game-mod-tools/ui";

interface SectionNavProps {
  sections: { key: string; label: string }[];
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function SectionNav({ sections, activeSection, onSectionChange }: SectionNavProps) {
  if (sections.length <= 1) return null;
  return (
    <nav className="flex flex-wrap gap-2 p-2 border rounded-xl bg-muted/30">
      {sections.map((section) => (
        <Button
          key={section.key}
          variant={activeSection === section.key ? "default" : "ghost"}
          size="sm"
          onClick={() => onSectionChange(section.key)}
          className={cn(activeSection === section.key && "bg-green-100 text-green-700 hover:bg-green-200")}
        >
          {section.label}
        </Button>
      ))}
    </nav>
  );
}
