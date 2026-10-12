import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import { LogOut } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: "text" | "icon";
  icon?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

export function LiquidMetalButton({
  label = "Get Started",
  onClick,
  viewMode = "text",
  icon,
  ariaLabel,
  className,
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const shaderRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shaderMount = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);

  const dimensions = useMemo(() => {
    if (viewMode === "icon") {
      return { width: 46, height: 46 };
    }
    return { width: 142, height: 46 };
  }, [viewMode]);

  useEffect(() => {
    const styleId = "liquid-metal-button-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .liquid-metal-shader canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 100px !important;
        }
        @keyframes liquid-metal-ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    if (shaderRef.current) {
      try {
        if (shaderMount.current?.destroy) shaderMount.current.destroy();
        shaderMount.current = new ShaderMount(
          shaderRef.current,
          liquidMetalFragmentShader,
          {
            u_repetition: 4,
            u_softness: 0.5,
            u_shiftRed: 0.3,
            u_shiftBlue: 0.3,
            u_distortion: 0,
            u_contour: 0,
            u_angle: 45,
            u_scale: 8,
            u_shape: 1,
            u_offsetX: 0.1,
            u_offsetY: -0.1,
          },
          undefined,
          0.6,
        );
      } catch (error) {
        console.error("[liquid-metal-button] Failed to mount shader:", error);
      }
    }

    return () => {
      if (shaderMount.current?.destroy) {
        shaderMount.current.destroy();
        shaderMount.current = null;
      }
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    shaderMount.current?.setSpeed?.(1);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    shaderMount.current?.setSpeed?.(0.6);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (shaderMount.current?.setSpeed) {
      shaderMount.current.setSpeed(2.4);
      setTimeout(() => {
        shaderMount.current?.setSpeed?.(isHovered ? 1 : 0.6);
      }, 300);
    }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ };
      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600);
    }
    onClick?.();
  };

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: dimensions.width,
        height: dimensions.height,
        display: "inline-block",
      }}
    >
      {/* Shader background */}
      <div
        ref={shaderRef}
        className="liquid-metal-shader"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 100,
          overflow: "hidden",
          zIndex: 1,
        }}
      />

      {/* Label / icon overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          color: "#fff",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: 0.2,
          pointerEvents: "none",
          zIndex: 30,
          textShadow: "0 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        {viewMode === "icon" ? (icon ?? <LogOut size={16} />) : (
          <>
            {icon}
            <span>{label}</span>
          </>
        )}
      </div>

      {/* Click target */}
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onClick={handleClick}
        aria-label={ariaLabel ?? label}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          outline: "none",
          zIndex: 40,
          overflow: "hidden",
          borderRadius: 100,
        }}
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            style={{
              position: "absolute",
              left: ripple.x,
              top: ripple.y,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.5)",
              pointerEvents: "none",
              animation: "liquid-metal-ripple 600ms ease-out",
            }}
          />
        ))}
      </button>
    </div>
  );
}
