import { useEffect, useRef } from "react";

interface BonusWheelPromptProps {
  onSpin: () => void;
  onSkip: () => void;
}

export const BonusWheelPrompt = ({ onSpin, onSkip }: BonusWheelPromptProps) => {
  const promptRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLButtonElement>(null);

  // Focus management: focus the primary action on mount
  useEffect(() => {
    spinRef.current?.focus();
  }, []);

  return (
    <div
      ref={promptRef}
      className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl mx-auto max-w-xs text-center"
      style={{ backgroundColor: "#FFF8E1", border: "3px solid #FFD700" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bonus-wheel-title"
      aria-describedby="bonus-wheel-description"
    >
      <div className="text-4xl select-none" aria-hidden="true">
        {"\u{1F3B0}"}
      </div>

      <h2 id="bonus-wheel-title" className="text-xl font-bold text-gray-900">
        You have a Reward Token!
      </h2>

      <p id="bonus-wheel-description" className="text-sm text-gray-700">
        Spin the wheel for today&apos;s bonus?
      </p>

      <div className="flex flex-col gap-2 w-full">
        <button
          ref={spinRef}
          className="btn w-full text-base font-bold py-3 rounded-xl text-white"
          style={{
            backgroundColor: "#FF6B6B",
            minHeight: "44px",
            minWidth: "44px",
          }}
          onClick={onSpin}
          aria-label="Spin the bonus wheel to win a buff"
        >
          Spin!
        </button>

        <button
          className="btn btn-outline w-full text-sm py-2 rounded-xl"
          style={{
            minHeight: "44px",
            minWidth: "44px",
          }}
          onClick={onSkip}
          aria-label="Save reward token for later"
        >
          Save for later
        </button>
      </div>
    </div>
  );
};
