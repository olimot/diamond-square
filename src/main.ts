import { mat4, vec3 } from "gl-matrix";
import { up } from "./config";
import { listenInputEvents } from "./input";
import { moveXY, pinchOrbit, rotateOrbit } from "./orbital";

const width = 257;
const depth = 257;
const heightMap = {
  width,
  height: depth,
  src: new Float32Array(width * depth),
};

function diamondSquare(map: typeof heightMap) {
  let chunkSize = map.width;
  let scale = 2 ** -1;

  while (chunkSize > 1) {
    const half = Math.floor(chunkSize / 2);
    // # square steps
    for (let y = half; y < map.height; y += chunkSize) {
      for (let x = half; x < map.width; x += chunkSize) {
        let avg = 0;
        avg += map.src[x - half + (y - half) * map.width];
        avg += map.src[x - half + (y + half) * map.width];
        avg += map.src[x + half + (y - half) * map.width];
        avg += map.src[x + half + (y + half) * map.width];
        avg /= 4;
        map.src[x + y * map.width] = avg + scale * (Math.random() * 2 - 1);
      }
    }

    // # diamond step
    for (let y = 0, i = 0; y < map.height; y += half, i++) {
      const xBegin = i % 2 ? 0 : half;
      for (let x = xBegin; x < map.width; x += chunkSize) {
        let count = 0;
        let avg = 0;
        if (x - half >= 0) {
          avg += map.src[x - half + y * map.width];
          count++;
        }
        if (x + half < map.width) {
          avg += map.src[x + half + y * map.width];
          count++;
        }
        if (y - half >= 0) {
          avg += map.src[x + (y - half) * map.width];
          count++;
        }
        if (y + half < map.height) {
          avg += map.src[x + (y + half) * map.width];
          count++;
        }
        avg /= count;
        map.src[x + y * map.width] = avg + scale * (Math.random() * 2 - 1);
      }
    }
    chunkSize = half;
    scale *= 2 ** -1;
  }
}
diamondSquare(heightMap);
console.log(heightMap);

async function diamondSquare2D() {
  const canvas = document.getElementById(
    "diamond-square-2d",
  ) as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(heightMap.width, heightMap.height);
  for (let y = 0; y < heightMap.height; y++) {
    for (let x = 0; x < heightMap.width; x++) {
      const value = heightMap.src[y * heightMap.width + x];
      const p = Math.floor((value + 1) * 127);
      const color = [p, p, p, 255];
      imageData.data.set(color, y * heightMap.width * 4 + x * 4);
    }
  }
  canvas.width = heightMap.width;
  canvas.height = heightMap.height;
  ctx.putImageData(imageData, 0, 0);
}

function diamondSquare3D() {
  const vertices = new Float32Array(width * depth * 3);
  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      let value = heightMap.src[z * heightMap.width + x];
      value += heightMap.src[(z - 1) * heightMap.width + (x - 1)] ?? 0;
      value += heightMap.src[(z - 1) * heightMap.width + x] ?? 0;
      value += heightMap.src[(z - 1) * heightMap.width + x + 1] ?? 0;
      value += heightMap.src[z * heightMap.width + x - 1] ?? 0;
      value += heightMap.src[z * heightMap.width + x + 1] ?? 0;
      value += heightMap.src[(z + 1) * heightMap.width + (x - 1)] ?? 0;
      value += heightMap.src[(z + 1) * heightMap.width + x] ?? 0;
      value += heightMap.src[(z + 1) * heightMap.width + x + 1] ?? 0;
      value /= 9;
      const y = Math.max(40, 40 + value * 80);
      vertices.set([x, y, z], (width * z + x) * 3);
    }
  }
  const elements = new Uint32Array(width * depth * 6);
  const triIds = [0, width, 1, 1, width, width + 1];
  for (let z = 0; z < depth - 1; z++) {
    for (let x = 0; x < width - 1; x++) {
      for (let i = 0; i < 6; i++) {
        const index = width * z + x + triIds[i];
        elements[(width * z + x) * 6 + i] = index;
      }
    }
  }

  const projection = mat4.create();
  const target = vec3.fromValues(150, 10, 150);
  const view = mat4.lookAt(mat4.create(), [335, 284, 335], target, up);
  const viewProjection = mat4.identity(mat4.create());

  const canvas = document.getElementById(
    "diamond-square-3d",
  ) as HTMLCanvasElement;
  listenInputEvents(canvas, (e, st) => {
    if ((st.keys.Space && st.keys.ShiftLeft) || st.buttons === 5) {
      rotateOrbit(view, target, st.delta);
    } else if ((st.keys.Space && st.keys.ControlLeft) || st.buttons === 6) {
      pinchOrbit(view, target, st.delta);
    } else if (st.keys.Space || st.buttons === 4) {
      moveXY(view, target, st.delta);
    } else {
      return;
    }
    e.preventDefault();
  });

  const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.depthFunc(gl.LEQUAL);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );
  gl.blendEquation(gl.FUNC_ADD);
  gl.colorMask(true, true, true, true);
  gl.clearColor(31 / 255, 31 / 255, 31 / 255, 1);
  gl.clearDepth(1);

  const vertexArray = gl.createVertexArray();
  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elements, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const vert = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
  const frag = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
  gl.shaderSource(
    vert,
    /* glsl */ `#version 300 es 
    uniform mat4 viewProjection;
    in vec4 POSITION;
    out vec3 vPosition;
    void main() {
      vPosition = POSITION.xyz;
      gl_Position = viewProjection * POSITION;
    }
  `,
  );
  gl.shaderSource(
    frag,
    /* glsl */ `#version 300 es
    precision highp float;
    in vec3 vPosition;
    out vec4 finalColor;
    void main() {
      vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
      finalColor = vec4((normal + 1.f) / 2.f, 1.f);
    }
  `,
  );
  gl.compileShader(vert);
  gl.compileShader(frag);
  const program = gl.createProgram() as WebGLProgram;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.bindAttribLocation(program, 0, "POSITION");
  gl.bindAttribLocation(program, 1, "NORMAL");
  gl.linkProgram(program);
  console.log(gl.getShaderInfoLog(vert));
  console.log(gl.getShaderInfoLog(frag));

  gl.useProgram(program);
  const viewProjectionLoc = gl.getUniformLocation(program, "viewProjection");

  requestAnimationFrame(function frame() {
    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    mat4.ortho(projection, -100, 100, -80, 80, 0, 320); // alternatively
    mat4.perspective(projection, Math.PI / 4, aspectRatio, 0.01, +Infinity);
    mat4.multiply(viewProjection, projection, view);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniformMatrix4fv(viewProjectionLoc, false, viewProjection);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.bindVertexArray(vertexArray);
    gl.drawElements(gl.TRIANGLES, elements.length, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);

    requestAnimationFrame(frame);
  });
}

diamondSquare2D();
diamondSquare3D();

export {};
