"use client";

import { useEffect, useRef } from "react";
import type { ShaderNode } from "@/lib/scene/schema";

const VERTEX = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

/** Fragment shaders share uniforms: time (s), resolution, two brand colours, intensity. */
const HEADER = `precision mediump float;
uniform float u_time; uniform vec2 u_res; uniform vec3 u_c1; uniform vec3 u_c2; uniform float u_intensity;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y); }
`;

const FRAGMENTS: Record<ShaderNode["preset"], string> = {
  "mesh-gradient": `${HEADER}
void main(){ vec2 uv = gl_FragCoord.xy / u_res; float t = u_time * 0.25;
  vec2 a = vec2(0.3 + 0.2*sin(t), 0.35 + 0.2*cos(t*1.3)); vec2 b = vec2(0.7 + 0.2*cos(t*0.8), 0.65 + 0.2*sin(t*1.1));
  float w = smoothstep(0.0, 0.9, distance(uv, a)) - smoothstep(0.0, 0.9, distance(uv, b)) * 0.6;
  vec3 col = mix(u_c2, u_c1, clamp(0.5 + w, 0.0, 1.0));
  gl_FragColor = vec4(mix(u_c1, col, u_intensity), 1.0); }`,
  aurora: `${HEADER}
void main(){ vec2 uv = gl_FragCoord.xy / u_res; float t = u_time * 0.2;
  float band = noise(vec2(uv.x * 3.0 + t, uv.y * 1.5 - t * 0.5));
  float glow = smoothstep(0.35, 0.9, band) * (1.0 - uv.y * 0.6);
  gl_FragColor = vec4(mix(u_c1, u_c2, glow * u_intensity), 1.0); }`,
  waves: `${HEADER}
void main(){ vec2 uv = gl_FragCoord.xy / u_res; float t = u_time * 0.6;
  float wave = 0.5 + 0.5 * sin((uv.y + 0.08 * sin(uv.x * 6.0 + t)) * 18.0 - t);
  gl_FragColor = vec4(mix(u_c1, u_c2, wave * u_intensity * 0.7), 1.0); }`,
  grain: `${HEADER}
void main(){ vec2 uv = gl_FragCoord.xy / u_res; float t = floor(u_time * 12.0);
  float g = hash(gl_FragCoord.xy + t) - 0.5;
  vec3 base = mix(u_c1, u_c2, uv.y * 0.5);
  gl_FragColor = vec4(base + g * u_intensity * 0.4, 1.0); }`,
};

function hexToVec3(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

type Program = { gl: WebGLRenderingContext; uniforms: Record<string, WebGLUniformLocation | null> };

function compile(gl: WebGLRenderingContext, fragment: string): Program | null {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERTEX);
  const fs = shader(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(["u_time", "u_res", "u_c1", "u_c2", "u_intensity"].map((name) => [name, gl.getUniformLocation(program, name)]));
  return { gl, uniforms };
}

/**
 * A WebGL shader fill drawn for an explicit time, so preview and video export
 * get identical frames. The buffer is preserved so frames can be captured.
 */
export function SceneShader({ node, time, colors }: { node: ShaderNode; time: number; colors: [string, string] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const programRef = useRef<Program | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
    programRef.current = gl ? compile(gl, FRAGMENTS[node.preset]) : null;
    // No explicit loseContext(): a remount (e.g. React dev double effects) gets the
    // same context back from getContext, and a lost one would stay blank.
    return () => {
      programRef.current = null;
    };
  }, [node.preset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const program = programRef.current;
    if (!canvas || !program) return;
    // Half resolution keeps shaders cheap; the fill is soft anyway.
    const width = Math.max(1, Math.round(canvas.clientWidth / 2));
    const height = Math.max(1, Math.round(canvas.clientHeight / 2));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const { gl, uniforms } = program;
    gl.viewport(0, 0, width, height);
    gl.uniform1f(uniforms.u_time, (time / 1000) * node.speed);
    gl.uniform2f(uniforms.u_res, width, height);
    gl.uniform3fv(uniforms.u_c1, hexToVec3(colors[0]));
    gl.uniform3fv(uniforms.u_c2, hexToVec3(colors[1]));
    gl.uniform1f(uniforms.u_intensity, node.intensity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });

  return <canvas ref={canvasRef} data-scene-node={node.id} data-scene-shader={node.preset} style={{ width: "100%", height: "100%", display: "block" }} />;
}
