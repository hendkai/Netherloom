import { useEffect, useRef } from "react";
import { nodes, creatureSprites } from "./data";
import type { PeerCreature } from "./lib/peers";

type Particle = {
  from: number;
  to: number;
  speed: number;
  offset: number;
  color: string;
};

const particles: Particle[] = [
  { from: 0, to: 3, speed: 0.09, offset: 0.1, color: "#1da8ff" },
  { from: 1, to: 3, speed: 0.07, offset: 0.5, color: "#b245ff" },
  { from: 2, to: 3, speed: 0.11, offset: 0.0, color: "#29e8b8" },
  { from: 3, to: 4, speed: 0.08, offset: 0.3, color: "#8a62ff" },
  { from: 5, to: 3, speed: 0.12, offset: 0.2, color: "#c347ff" },
  { from: 6, to: 3, speed: 0.1, offset: 0.65, color: "#33e46a" },
  { from: 3, to: 7, speed: 0.06, offset: 0.42, color: "#ff9a28" },
  { from: 0, to: 1, speed: 0.05, offset: 0.15, color: "#2d98ff" },
  { from: 2, to: 6, speed: 0.04, offset: 0.7, color: "#9d4dff" },
];

function roundedLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, canvasWidth: number) {
  ctx.save();
  ctx.font = "12px Avenir Next, Segoe UI, system-ui";
  const width = ctx.measureText(text).width + 26;
  const height = 34;
  const clampedX = Math.min(Math.max(x, width / 2 + 8), canvasWidth - width / 2 - 8);
  ctx.fillStyle = "rgba(5, 10, 22, 0.78)";
  ctx.strokeStyle = "rgba(132, 158, 206, 0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(clampedX - width / 2, y - height / 2, width, height, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#dbe4f4";
  ctx.fillText(text, clampedX - width / 2 + 13, y + 4);
  ctx.restore();
}

function nodeRoleLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  role: string,
  color: string,
  canvasWidth: number,
) {
  ctx.save();
  ctx.font = "700 10px Avenir Next, Segoe UI, system-ui";
  const text = `${name} · ${role}`;
  const width = ctx.measureText(text).width + 20;
  const height = 24;
  const clampedX = Math.min(Math.max(x, width / 2 + 7), canvasWidth - width / 2 - 7);
  ctx.fillStyle = "rgba(4, 9, 20, 0.92)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(clampedX - width / 2, y - height / 2, width, height, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f2f6ff";
  ctx.textAlign = "center";
  ctx.fillText(text, clampedX, y + 3.5);
  ctx.restore();
}

export function NetworkCanvas({
  zoom = 1,
  paused = false,
  heroSprite,
  heroFilter = "none",
  peers = [],
}: {
  zoom?: number;
  paused?: boolean;
  heroSprite?: string;
  heroFilter?: string;
  peers?: PeerCreature[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomRef = useRef(zoom);
  const pausedRef = useRef(paused);
  const heroImgRef = useRef<HTMLImageElement | null>(null);
  const heroFilterRef = useRef(heroFilter);
  const peersRef = useRef(peers);
  zoomRef.current = zoom;
  pausedRef.current = paused;
  heroFilterRef.current = heroFilter;
  peersRef.current = peers;

  useEffect(() => {
    if (!heroSprite) {
      heroImgRef.current = null;
      return;
    }
    const img = new Image();
    img.decoding = "async";
    img.src = heroSprite;
    heroImgRef.current = img;
  }, [heroSprite]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame = 0;
    let clock = 0;
    let previous: number | null = null;
    const spriteImages = new Map<string, HTMLImageElement>();
    const preload = (src: string) => {
      if (spriteImages.has(src)) return;
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      spriteImages.set(src, image);
    };
    for (const node of nodes) preload(node.sprite);
    // Peer creatures reuse the base creature sprites — preload them all.
    for (const base of creatureSprites) preload(base.src);

    const stars = Array.from({ length: 230 }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      size: index % 9 === 0 ? Math.random() * 2 + 1.2 : Math.random() * 1.2 + 0.25,
      color: ["#39b8ff", "#a359ff", "#fff0b8", "#5df5c4"][index % 4],
      phase: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = (now: number) => {
      if (previous === null) previous = now;
      const delta = now - previous;
      previous = now;
      if (!pausedRef.current) clock += delta;
      const time = clock;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "#071538");
      bg.addColorStop(0.45, "#04132a");
      bg.addColorStop(1, "#0b081c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = 0.45;
      for (const star of stars) {
        const twinkle = 0.45 + Math.sin(time / 900 + star.phase) * 0.35;
        ctx.fillStyle = star.color;
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const scale = zoomRef.current;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);

      const mappedNodes = nodes.map((node) => ({ ...node, px: (node.x / 100) * w, py: (node.y / 100) * h }));
      const center = mappedNodes[3];
      const peerList = peersRef.current;
      const peerAtNode = (index: number) => {
        if (index === 3) return null;
        const peerIndex = index < 3 ? index : index - 1;
        return peerList[peerIndex];
      };

      ctx.save();
      ctx.translate(center.px, center.py);
      for (let i = 0; i < 4; i += 1) {
        ctx.strokeStyle = `rgba(40, 209, 255, ${0.34 - i * 0.06})`;
        ctx.lineWidth = 1 + i;
        ctx.beginPath();
        ctx.arc(0, 0, 36 + i * 16 + Math.sin(time / 650 + i) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      for (const particle of particles) {
        if (
          (particle.from !== 3 && !peerAtNode(particle.from))
          || (particle.to !== 3 && !peerAtNode(particle.to))
        ) {
          continue;
        }
        const a = mappedNodes[particle.from];
        const b = mappedNodes[particle.to];
        ctx.setLineDash([6, 12]);
        ctx.lineDashOffset = -time / 38;
        ctx.strokeStyle = `${particle.color}88`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        const cx = (a.px + b.px) / 2 + (b.py - a.py) * 0.09;
        const cy = (a.py + b.py) / 2 - (b.px - a.px) * 0.09;
        ctx.moveTo(a.px, a.py);
        ctx.quadraticCurveTo(cx, cy, b.px, b.py);
        ctx.stroke();
        ctx.setLineDash([]);

        const t = (time / 1000 * particle.speed + particle.offset) % 1;
        const x = (1 - t) * (1 - t) * a.px + 2 * (1 - t) * t * cx + t * t * b.px;
        const y = (1 - t) * (1 - t) * a.py + 2 * (1 - t) * t * cy + t * t * b.py;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 18);
        glow.addColorStop(0, particle.color);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#eefdff";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      mappedNodes.forEach((node, idx) => {
        const isHero = node === center;
        const peer = peerAtNode(idx);
        if (!isHero && !peer) return;

        let dispSprite = node.sprite;
        let dispColor = node.color;
        let dispName = node.name;
        let dispRole = node.role;
        if (peer) {
          dispSprite = peer.sprite;
          dispColor = peer.color;
          dispName = peer.short;
          dispRole = "I2P Router";
        }

        const radius = isHero ? 38 : 30;
        const bob = Math.sin(time / 850 + node.x) * 3;
        const halo = ctx.createRadialGradient(node.px, node.py + bob, 0, node.px, node.py + bob, radius * 2.7);
        halo.addColorStop(0, `${dispColor}99`);
        halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(node.px, node.py + bob, radius * 2.7, 0, Math.PI * 2);
        ctx.fill();

        const baseWidth = isHero ? 104 : 82;
        ctx.fillStyle = "rgba(8, 18, 34, 0.78)";
        ctx.strokeStyle = `${dispColor}bb`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(node.px, node.py + bob + radius * 0.92, baseWidth / 2, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const image = isHero && heroImgRef.current ? heroImgRef.current : spriteImages.get(dispSprite);
        if (image?.complete && image.naturalWidth > 0) {
          const drawHeight = node.size;
          const drawWidth = drawHeight * (image.naturalWidth / image.naturalHeight);
          ctx.save();
          if (isHero) ctx.filter = heroFilterRef.current;
          ctx.drawImage(image, node.px - drawWidth / 2, node.py + bob - drawHeight / 2, drawWidth, drawHeight);
          ctx.restore();
        } else {
          ctx.fillStyle = dispColor;
          ctx.beginPath();
          ctx.arc(node.px, node.py + bob, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        const roleLabelX = idx === 7 ? node.px + 72 : node.px;
        const roleLabelY = idx === 0 ? node.py + bob - radius - 18 : node.py + bob + radius + 28;
        nodeRoleLabel(ctx, roleLabelX, roleLabelY, dispName, dispRole, dispColor, w);
      });

      roundedLabel(ctx, mappedNodes[3].px + 105, mappedNodes[3].py - 46, "Let's keep the network alive!", w);

      ctx.restore();

      animationFrame = window.requestAnimationFrame(render);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    animationFrame = window.requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="network-canvas" aria-label="Connected I2P router peers represented as pets" />;
}
