import type { SelectableLipFinish } from "../types/texture";

const FINISHES: { id: SelectableLipFinish; label: string }[] = [
  { id: "matte", label: "Matte" },
  { id: "gloss", label: "Gloss" },
  { id: "blurred", label: "Tint" },
];

export const LipsControl = ({
  currentFinish,
  onSelectFinish,
}: {
  currentFinish: SelectableLipFinish;
  onSelectFinish: (finish: SelectableLipFinish) => void;
}) => {
  return (
    <div
      aria-label="Lip finish"
      className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#eadbd9] bg-[#fff8f8] p-1.5"
    >
      {FINISHES.map((item) => (
        <button
          type="button"
          key={item.id}
          onClick={() => onSelectFinish(item.id)}
          aria-pressed={currentFinish === item.id}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors md:text-sm ${
            currentFinish === item.id
              ? "bg-[#473636] text-white shadow-sm"
              : "text-[#6b5555] hover:bg-[#f9dfe0] hover:text-[#473636]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
