import type { LipFinish } from "../types/texture";

const FINISHES: { id: LipFinish; label: string; icon: string }[] = [
  { id: "matte", label: "Matte", icon: "💄" },
  { id: "gloss", label: "Glossy", icon: "✨" },
  { id: "oil", label: "Lip Oil", icon: "💧" },
  { id: "blurred", label: "Blur/Tint", icon: "🌸" },
];

export const LipControls = ({
  currentFinish,
  onSelectFinish,
}: {
  currentFinish: LipFinish;
  onSelectFinish: (f: LipFinish) => void;
}) => {
  return (
    <div className=" flex gap-3 bg-black/60 backdrop-blur-md p-2 rounded-full z-20">
      {FINISHES.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelectFinish(item.id)}
          className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
            currentFinish === item.id
              ? "bg-white text-black shadow-lg scale-105"
              : "text-white/80 hover:text-white hover:bg-white/10"
          }`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
