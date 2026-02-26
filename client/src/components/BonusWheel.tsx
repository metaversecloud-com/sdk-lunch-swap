import { useCallback, useEffect, useRef, useState } from "react";
import { WHEEL_BUFFS } from "@shared/data/wheelBuffs";
import { backendAPI } from "@/utils";

interface BonusWheelProps {
  onResult: (buff: { id: string; name: string; description: string }) => void;
}

const SEGMENT_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"];
const SPIN_DURATION_MS = 2500;
const SEGMENT_ANGLE = 360 / WHEEL_BUFFS.length;

export const BonusWheel = ({ onResult }: BonusWheelProps) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonBuff, setWonBuff] = useState<{
    id: string;
    name: string;
    description: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const wheelRef = useRef<SVGSVGElement>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => {
      mq.removeEventListener("change", handler);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  const handleSpin = useCallback(async () => {
    if (spinning) return;

    setSpinning(true);
    setError(null);

    try {
      const response = await backendAPI.post("/spin-wheel");
      const { buff } = response.data;

      // Find the index of the winning buff
      const winIndex = WHEEL_BUFFS.findIndex((b) => b.id === buff.id);
      const targetIndex = winIndex >= 0 ? winIndex : 0;

      // Calculate the rotation to land on the winning segment
      // The pointer is at the top (12 o'clock). Each segment is centered at
      // (index * SEGMENT_ANGLE) degrees from the starting position.
      // We need to rotate so the target segment aligns with the top.
      const targetAngle = targetIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      // Spin several full rotations plus the offset to land on the target
      const fullSpins = 5 * 360;
      const finalRotation = fullSpins + (360 - targetAngle);

      if (reducedMotion) {
        // Skip animation, jump to result
        setRotation(finalRotation);
        setWonBuff(buff);
        setSpinning(false);
      } else {
        setRotation(finalRotation);

        resultTimerRef.current = setTimeout(() => {
          setWonBuff(buff);
          setSpinning(false);
        }, SPIN_DURATION_MS);
      }
    } catch {
      setError("Oops! Something went wrong. Try again!");
      setSpinning(false);
    }
  }, [spinning, reducedMotion]);

  const handleClaim = () => {
    if (wonBuff) {
      onResult(wonBuff);
    }
  };

  // Generate SVG pie segments
  const createSegmentPath = (index: number): string => {
    const startAngle = (index * SEGMENT_ANGLE * Math.PI) / 180;
    const endAngle = ((index + 1) * SEGMENT_ANGLE * Math.PI) / 180;
    const radius = 100;
    const cx = 100;
    const cy = 100;

    const x1 = cx + radius * Math.sin(startAngle);
    const y1 = cy - radius * Math.cos(startAngle);
    const x2 = cx + radius * Math.sin(endAngle);
    const y2 = cy - radius * Math.cos(endAngle);

    const largeArcFlag = SEGMENT_ANGLE > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Calculate text position for each segment label
  const getTextPosition = (index: number) => {
    const midAngle = ((index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2) * Math.PI) / 180;
    const textRadius = 62;
    const cx = 100;
    const cy = 100;
    return {
      x: cx + textRadius * Math.sin(midAngle),
      y: cy - textRadius * Math.cos(midAngle),
      angle: index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2,
    };
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4" role="region" aria-label="Bonus wheel spinner">
      <h2 className="text-xl font-bold text-gray-900">Spin to Win!</h2>

      {/* Wheel container with pointer */}
      <div className="relative w-56 h-56">
        {/* Pointer triangle at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10" aria-hidden="true">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "18px solid #333333",
            }}
          />
        </div>

        {/* SVG Wheel */}
        <svg
          ref={wheelRef}
          viewBox="0 0 200 200"
          className="w-full h-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: reducedMotion ? "none" : `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`,
          }}
          aria-hidden="true"
        >
          {WHEEL_BUFFS.map((buff, i) => {
            const textPos = getTextPosition(i);
            return (
              <g key={buff.id}>
                <path d={createSegmentPath(i)} fill={SEGMENT_COLORS[i]} stroke="#FFFFFF" strokeWidth="2" />
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textPos.angle}, ${textPos.x}, ${textPos.y})`}
                  fill="#333333"
                  fontSize="8"
                  fontWeight="bold"
                  className="select-none"
                >
                  {buff.name}
                </text>
              </g>
            );
          })}
          {/* Center circle */}
          <circle cx="100" cy="100" r="15" fill="#FFFFFF" stroke="#333" strokeWidth="2" />
          <text
            x="100"
            y="100"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#333"
            fontSize="14"
            className="select-none"
          >
            {"\u{1F3B2}"}
          </text>
        </svg>
      </div>

      {/* Screen reader status */}
      <div className="sr-only" aria-live="polite" role="status">
        {spinning && "Wheel is spinning..."}
        {wonBuff && `You won: ${wonBuff.name}! ${wonBuff.description}`}
      </div>

      {/* Celebration result */}
      {wonBuff && (
        <div
          className="flex flex-col items-center gap-2 p-4 rounded-xl text-center"
          style={{
            backgroundColor: "#E8F5E9",
            border: "2px solid #4CAF50",
            animation: reducedMotion ? "none" : "bonusWheelCelebrate 0.5s ease-out",
          }}
          role="alert"
        >
          <span className="text-2xl" aria-hidden="true">
            {"\u{1F389}"}
          </span>
          <span className="text-lg font-bold text-gray-900">{wonBuff.name}</span>
          <span className="text-sm text-gray-700">{wonBuff.description}</span>
          <button
            className="btn mt-2 text-sm font-bold py-2 px-6 rounded-xl text-white"
            style={{
              backgroundColor: "#4CAF50",
              minHeight: "44px",
              minWidth: "44px",
            }}
            onClick={handleClaim}
            aria-label={`Claim your ${wonBuff.name} buff`}
          >
            Awesome! Let&apos;s go!
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 font-medium text-center" role="alert">
          {error}
        </div>
      )}

      {/* Spin button (only shown before spinning) */}
      {!wonBuff && (
        <button
          className="btn text-base font-bold py-3 px-8 rounded-xl text-white"
          style={{
            backgroundColor: spinning ? "#999" : "#FF6B6B",
            minHeight: "44px",
            minWidth: "44px",
          }}
          onClick={handleSpin}
          disabled={spinning}
          aria-label={spinning ? "Wheel is spinning" : "Spin the bonus wheel"}
        >
          {spinning ? "Spinning..." : "Spin!"}
        </button>
      )}

      {/* Keyframe styles for celebration */}
      <style>{`
        @keyframes bonusWheelCelebrate {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes bonusWheelCelebrate {
            0% { opacity: 1; transform: none; }
            100% { opacity: 1; transform: none; }
          }
        }
      `}</style>
    </div>
  );
};
