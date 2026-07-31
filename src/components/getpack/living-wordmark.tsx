"use client";

import { useEffect, useRef, useState } from "react";

export function LivingWordmark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true })!;
    if (!context) return;

    const texture = document.createElement("canvas");
    const textureContext = texture.getContext("2d", { alpha: true })!;
    if (!textureContext) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let hasDrawn = false;
    const displayFont = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Arial Black";

    function fitFontSize(word: string, maxWidth: number, maxHeight: number) {
      let size = Math.min(maxWidth * 0.2, maxHeight * 0.44);
      context.font = `400 ${size}px ${displayFont}, Arial Black, sans-serif`;
      const measured = context.measureText(word).width;
      size *= Math.min(1, maxWidth / measured);
      return size;
    }

    function draw(time: number) {
      pointerX += (targetX - pointerX) * 0.045;
      pointerY += (targetY - pointerY) * 0.045;

      context.clearRect(0, 0, width, height);
      textureContext.clearRect(0, 0, width, height);

      const drift = reducedMotion ? 18 : time * 0.000028;
      const sky = textureContext.createLinearGradient(0, height, width, 0);
      sky.addColorStop(0, "#173f78");
      sky.addColorStop(0.48, "#4389d4");
      sky.addColorStop(1, "#8fc5e3");
      textureContext.fillStyle = sky;
      textureContext.fillRect(0, 0, width, height);

      for (let index = 0; index < 8; index += 1) {
        const phase = drift + index * 0.82;
        const x = width * (0.08 + index * 0.135) + Math.sin(phase) * width * 0.09 + (pointerX - 0.5) * width * (0.08 + index * 0.006);
        const y = height * (0.3 + (index % 3) * 0.16) + Math.cos(phase * 0.73) * height * 0.08 + (pointerY - 0.5) * height * 0.08;
        const radius = Math.max(width * (0.12 + (index % 2) * 0.035), 120);
        const cloud = textureContext.createRadialGradient(x, y, 0, x, y, radius);
        cloud.addColorStop(0, index % 2 ? "rgba(244,248,246,.92)" : "rgba(199,225,234,.78)");
        cloud.addColorStop(0.48, index % 2 ? "rgba(228,238,235,.5)" : "rgba(169,207,224,.36)");
        cloud.addColorStop(1, "rgba(255,255,255,0)");
        textureContext.fillStyle = cloud;
        textureContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }

      textureContext.globalAlpha = 0.12;
      textureContext.fillStyle = "#f3eee3";
      const grid = Math.max(5, Math.round(width / 260));
      for (let x = 0; x < width; x += grid * 2) {
        for (let y = 0; y < height; y += grid * 2) {
          if ((x / grid + y / grid) % 4 < 2) textureContext.fillRect(x, y, grid, grid);
        }
      }
      textureContext.globalAlpha = 1;

      const word = "GetPack";
      const fontSize = fitFontSize(word, width * (window.innerWidth <= 600 ? 0.84 : 0.82), height * 0.48);
      const baseline = height * 0.51;
      const font = `400 ${fontSize}px ${displayFont}, Arial Black, sans-serif`;

      context.save();
      context.font = font;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "rgba(143,133,115,.16)";
      context.fillText(word, width / 2 + 2 * dpr, baseline + 4 * dpr);
      context.restore();

      textureContext.globalCompositeOperation = "destination-in";
      textureContext.font = font;
      textureContext.textAlign = "center";
      textureContext.textBaseline = "middle";
      textureContext.fillStyle = "#fff";
      textureContext.fillText(word, width / 2, baseline);
      textureContext.globalCompositeOperation = "source-over";

      context.drawImage(texture, 0, 0);
      if (!hasDrawn) {
        hasDrawn = true;
        setReady(true);
      }

      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      texture.width = width;
      texture.height = height;
      draw(reducedMotion ? 640000 : performance.now());
    }

    function movePointer(event: PointerEvent) {
      targetX = event.clientX / window.innerWidth;
      targetY = event.clientY / window.innerHeight;
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener("pointermove", movePointer, { passive: true });

    document.fonts.ready.then(resize);
    resize();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", movePointer);
    };
  }, []);

  return (
    <div className={`gp-wordmark ${ready ? "is-ready" : ""}`}>
      <h1>GetPack</h1>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
