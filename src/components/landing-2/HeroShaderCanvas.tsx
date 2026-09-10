"use client";

import { useEffect, useRef } from "react";

const vertexSource = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// Two low-frequency fields keep the hero atmospheric without the cost of
// multi-octave noise. The shader is deliberately rendered below native DPR.
const fragmentSource = `
precision mediump float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uAccentSoft;

float glow(vec2 point, vec2 origin, float radius) {
  return exp(-dot(point - origin, point - origin) * radius);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 aspectUv = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float time = uTime * 0.16;

  vec2 primary = vec2(-0.12 + sin(time) * 0.10, 0.18 + cos(time * 0.7) * 0.07);
  vec2 secondary = vec2(0.48 + cos(time * 0.8) * 0.10, -0.18 + sin(time * 0.6) * 0.08);
  float a = glow(aspectUv, primary, 5.5);
  float b = glow(aspectUv, secondary, 8.0);
  float edge = smoothstep(0.88, 0.16, length(uv - 0.5));

  vec3 color = uAccent * a + uAccentSoft * b;
  gl_FragColor = vec4(color, (a * 0.62 + b * 0.34) * edge);
}
`;

function readColor(variable: string, fallback: string): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.cssText = `position:absolute;opacity:0;color:var(${variable}, ${fallback})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return [1, 0.38, 0.25];
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return [red / 255, green / 255, blue / 255];
}

export function HeroShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertexShader || !fragmentShader || !program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, "uResolution");
    const time = gl.getUniformLocation(program, "uTime");
    const accent = gl.getUniformLocation(program, "uAccent");
    const accentSoft = gl.getUniformLocation(program, "uAccentSoft");
    let frameId = 0;
    let isVisible = true;
    let lastFrame = 0;
    const start = performance.now();

    const applyColors = () => {
      gl.uniform3fv(accent, readColor("--brand-500", "#ff6140"));
      gl.uniform3fv(accentSoft, readColor("--brand-300", "#ffa487"));
    };

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.25) * 0.72;
      const width = Math.max(1, Math.floor(canvas.clientWidth * scale));
      const height = Math.max(1, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const draw = (now: number) => {
      resize();
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, (now - start) / 1000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const animate = (now: number) => {
      if (now - lastFrame >= 1000 / 30) {
        lastFrame = now;
        draw(now);
      }
      if (isVisible && !prefersReducedMotion.matches && !document.hidden) {
        frameId = requestAnimationFrame(animate);
      }
    };

    const render = () => {
      cancelAnimationFrame(frameId);
      draw(performance.now());
      if (isVisible && !prefersReducedMotion.matches && !document.hidden) {
        frameId = requestAnimationFrame(animate);
      }
    };

    applyColors();
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      render();
    });
    observer.observe(canvas);
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(canvas);
    const themeObserver = new MutationObserver(() => {
      applyColors();
      render();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("visibilitychange", render);
    prefersReducedMotion.addEventListener("change", render);
    render();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", render);
      prefersReducedMotion.removeEventListener("change", render);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} className="pf-hero-v2-shader" aria-hidden="true" />;
}
