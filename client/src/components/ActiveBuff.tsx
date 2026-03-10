import { WHEEL_BUFFS } from "@shared/data/wheelBuffs";

interface ActiveBuffProps {
  buffId: string;
}

const BUFF_ICONS: Record<string, string> = {
  "double-xp": "\u{2728}",
  "rare-start": "\u{1F48E}",
  "big-bag": "\u{1F392}",
  "combo-finder": "\u{1F50D}",
  "epic-drop": "\u{1F31F}",
};

export const ActiveBuff = ({ buffId }: ActiveBuffProps) => {
  const buff = WHEEL_BUFFS.find((b) => b.id === buffId);

  if (!buff) return null;

  const icon = BUFF_ICONS[buffId] || "\u{26A1}";

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm"
      style={{
        backgroundColor: "#FFF3CD",
        border: "2px solid #FFD700",
        color: "#856404",
        minHeight: "32px",
      }}
      role="status"
      aria-label={`Active buff: ${buff.name}. ${buff.description}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{buff.name}</span>
    </div>
  );
};
