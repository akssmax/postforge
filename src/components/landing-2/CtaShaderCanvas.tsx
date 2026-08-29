"use client";

import { useEffect, useRef } from "react";

const VERT_SRC = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uBg;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(11.3, 7.9);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 1.6;
  float t = uTime * 0.12;

  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(
    fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.3 * t),
    fbm(p + 2.0 * q + vec2(8.3, 2.8) - 0.2 * t)
  );
  float f = fbm(p + 2.5 * r);

  vec3 col = uBg;
  col = mix(col, uC1, smoothstep(0.32, 0.78, f) * 0.85);
  col = mix(col, uC2, smoothstep(0.45, 0.95, length(q)) * 0.6);
  col = mix(col, uC3, smoothstep(0.55, 1.0, r.x) * 0.45);

  float vig = smoothstep(1.2, 0.3, length(uv - 0.5));
  col = mix(uBg, col, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

// CSS vars can't be fed to canvas directly — resolve via a probe element,
// then rasterize through a 1px 2D canvas to get theme-aware RGB bytes.
function resolveCssColor(token: string, fallback: string): [number, number, number] {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;opacity:0;pointer-events:none;color:var(${token}, ${fallback})`;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  const raster = document.createElement("canvas");
  raster.width = 1;
  raster.height = 1;
  const ctx = raster.getContext("2d");
  if (!ctx) return [0, 0, 0];
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

export function CtaShaderCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    let visible = true;
    let teardown: (() => void) | null = null;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const setup = () => {
      const gl = canvas.getContext("webgl", {
        antialias: false,
        alpha: false,
        powerPreference: "low-power",
      });
      if (!gl) return;

      const compile = (type: number, src: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
      const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
      const prog = gl.createProgram();
      if (!vs || !fs || !prog) return;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      const posLoc = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const uRes = gl.getUniformLocation(prog, "uRes");
      const uTime = gl.getUniformLocation(prog, "uTime");
      const uBg = gl.getUniformLocation(prog, "uBg");
      const uC1 = gl.getUniformLocation(prog, "uC1");
      const uC2 = gl.getUniformLocation(prog, "uC2");
      const uC3 = gl.getUniformLocation(prog, "uC3");

      const applyColors = () => {
        gl.uniform3fv(uBg, resolveCssColor("--surface-primary", "#ffffff"));
        gl.uniform3fv(uC1, resolveCssColor("--brand-500", "#ff6140"));
        gl.uniform3fv(uC2, resolveCssColor("--brand-300", "#ffa487"));
        gl.uniform3fv(uC3, resolveCssColor("--brand-700", "#8f321f"));
      };

      const resize = () => {
        const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.66;
        const w = Math.max(1, Math.floor(canvas.clientWidth * scale));
        const h = Math.max(1, Math.floor(canvas.clientHeight * scale));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
      };

      const start = performance.now();
      const frame = () => {
        resize();
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, (performance.now() - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!reduceMotion.matches && visible) {
          raf = requestAnimationFrame(frame);
        }
      };

      applyColors();
      frame();

      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible && !reduceMotion.matches) raf = requestAnimationFrame(frame);
      });
      io.observe(canvas);

      const mo = new MutationObserver(() => {
        applyColors();
        if (reduceMotion.matches) frame();
      });
      mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });

      teardown = () => {
        io.disconnect();
        mo.disconnect();
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buf);
      };
    };

    setup();

    const onMotionChange = () => {
      cancelAnimationFrame(raf);
      teardown?.();
      teardown = null;
      setup();
    };
    reduceMotion.addEventListener("change", onMotionChange);

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
    };
    const onRestored = () => {
      teardown?.();
      teardown = null;
      setup();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    return () => {
      cancelAnimationFrame(raf);
      reduceMotion.removeEventListener("change", onMotionChange);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      teardown?.();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
