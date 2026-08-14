import { useEffect, useRef, useState } from "react";
import { MousePointer2, CheckCircle2 } from "lucide-react";

interface InteractiveCarWashProps {
  onCarCleaned: () => void;
  isUnlocked: boolean;
}

export default function InteractiveCarWash({
  onCarCleaned,
  isUnlocked,
}: InteractiveCarWashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpongeMode, setIsSpongeMode] = useState(false);
  const [hasDiscoveredSponge, setHasDiscoveredSponge] = useState(false);
  const [isClean, setIsClean] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [animatingIn, setAnimatingIn] = useState(false);
  const checkRef = useRef(0);

  // Initialize canvas with dirt
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Setup clipping path to match the car silhouette precisely
    ctx.save();
    const carPath = new Path2D(
      "M 450,130 C 450,110 430,90 390,90 C 370,50 330,30 250,30 C 150,30 110,60 90,90 C 50,90 20,110 20,130 C 20,160 30,170 50,170 L 80,170 L 140,170 L 340,170 L 400,170 L 450,170 Z",
    );
    ctx.clip(carPath);

    // Fill with muddy brown dirt color
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#5c4033";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some noise/specks for dirt texture
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#3e2723" : "#4e342e";
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 5,
        Math.random() * 5,
      );
    }
    ctx.restore();
  };

  useEffect(() => {
    if (!isUnlocked && !animatingOut && !animatingIn && !isClean) {
      // Small delay to ensure it renders after animation
      setTimeout(initCanvas, 50);
    }
  }, [isUnlocked, animatingOut, animatingIn, isClean]);

  // Global double click listener for the easter egg
  useEffect(() => {
    const handleGlobalDoubleClick = () => {
      setIsSpongeMode((prev) => {
        const nextMode = !prev;
        if (!nextMode) {
          // If turning off sponge mode, reset so it asks again
          setHasDiscoveredSponge(false);
        } else {
          setHasDiscoveredSponge(true);
        }
        return nextMode;
      });
    };

    window.addEventListener("dblclick", handleGlobalDoubleClick);
    return () => {
      window.removeEventListener("dblclick", handleGlobalDoubleClick);
    };
  }, []);

  // Handle erasing
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSpongeMode || isClean || animatingOut || animatingIn) return;

    // Only scrub if mouse button is held down (for mouse events)
    if ("buttons" in e && e.buttons !== 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }

    // Scale coords to canvas logical size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x * scaleX, y * scaleY, 30, 0, Math.PI * 2);
    ctx.fill();

    checkCleanliness();
  };

  const checkCleanliness = () => {
    checkRef.current++;
    if (checkRef.current % 10 !== 0) return; // check every 10 moves for performance

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Only check the bounding box where the dirt actually is to save time
    const imgData = ctx.getImageData(20, 30, 430, 140);
    const data = imgData.data;
    let transparentCount = 0;
    let totalChecked = 0;

    // Check every 4th pixel
    for (let i = 3; i < data.length; i += 16) {
      totalChecked++;
      if (data[i] < 128) transparentCount++; // alpha channel
    }

    const cleanPercentage = transparentCount / totalChecked;

    if (cleanPercentage > 0.96 && !isClean) {
      // 96% clean is enough
      setIsClean(true);
      triggerDriveOff();
    }
  };

  const triggerDriveOff = () => {
    setAnimatingOut(true);
    setTimeout(() => {
      onCarCleaned();
      setIsClean(false);
      setAnimatingOut(false);
      setAnimatingIn(true);

      // Reset position instantly, then animate in
      setTimeout(() => {
        setAnimatingIn(false);
      }, 50); // Small delay to let the DOM apply the negative translation
    }, 1200); // 1.2s drive out
  };

  // Car SVG markup (Sleek side profile)
  const CarShape = () => (
    <svg viewBox="0 0 500 200" className="w-full h-full drop-shadow-2xl">
      {/* Car Body Base */}
      <path
        d="M 450,130 C 450,110 430,90 390,90 C 370,50 330,30 250,30 C 150,30 110,60 90,90 C 50,90 20,110 20,130 C 20,160 30,170 50,170 L 80,170 A 30,30 0 0,0 140,170 L 340,170 A 30,30 0 0,0 400,170 L 450,170 Z"
        fill="#2d3748"
      />
      {/* Car Body Highlight */}
      <path
        d="M 90,90 C 110,60 150,30 250,30 C 330,30 370,50 390,90 Z"
        fill="#4a5568"
      />
      {/* Wheels */}
      <circle
        cx="110"
        cy="170"
        r="25"
        fill="#171923"
        stroke="#e2e8f0"
        strokeWidth="4"
      />
      <circle
        cx="370"
        cy="170"
        r="25"
        fill="#171923"
        stroke="#e2e8f0"
        strokeWidth="4"
      />
      <circle cx="110" cy="170" r="10" fill="#718096" />
      <circle cx="370" cy="170" r="10" fill="#718096" />
      {/* Windows */}
      <path d="M 120,90 C 140,60 170,45 230,45 L 230,90 Z" fill="#a0aec0" />
      <path d="M 245,45 C 300,45 320,60 340,90 L 245,90 Z" fill="#a0aec0" />
      {/* Headlights */}
      <path d="M 430,110 L 450,110 L 450,120 L 430,120 Z" fill="#fefcbf" />
      <path d="M 20,110 L 40,110 L 40,120 L 20,120 Z" fill="#fc8181" />
    </svg>
  );

  return (
    <div className="relative w-full max-w-xl mx-auto aspect-[5/2] flex items-center justify-center overflow-hidden rounded-2xl border border-charcoal-700 bg-charcoal-900 shadow-inner group">
      {/* Background garage stripes */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 8px)",
        }}
      ></div>

      {isUnlocked ? (
        <div className="relative z-10 flex flex-col items-center animate-in zoom-in duration-500">
          <CheckCircle2 className="w-16 h-16 text-reward-green mb-4 drop-shadow-[0_0_15px_rgba(53,184,107,0.5)]" />
          <h3 className="text-3xl font-bold text-white mb-2">Spotless!</h3>
          <p className="text-soft-gray font-medium">
            You've unlocked your reward.
          </p>
        </div>
      ) : (
        <div
          className={`relative w-full h-full transition-transform ease-in-out flex items-center justify-center ${
            animatingOut
              ? "translate-x-[150%] duration-1000"
              : animatingIn
                ? "-translate-x-[150%] duration-0"
                : "translate-x-0 duration-700"
          }`}
        >
          {/* Base Clean Car */}
          <div className="absolute w-[80%] mx-auto">
            <CarShape />
          </div>

          {/* Dirty Canvas overlay */}
          <div className="absolute w-[80%] mx-auto h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={500}
              height={200}
              className={`w-full h-auto touch-none cursor-pointer`}
              onMouseMove={handleMove}
              onTouchMove={handleMove}
              onMouseDown={handleMove}
            />
          </div>

          {/* Instructions Overlay */}
          {!hasDiscoveredSponge && !animatingOut && !animatingIn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-charcoal/90 border border-burnt-orange/50 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(239,106,17,0.3)] animate-pulse backdrop-blur-md">
                <MousePointer2 className="w-5 h-5 text-burnt-orange" />
                <span className="text-base font-bold text-white tracking-wide">
                  Double-click to activate sponge
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
