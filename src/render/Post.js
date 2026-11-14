// BENTONVILLE ROYALE — post-processing: ink outlines + soft bloom + tone mapping.
//
//   import { Post } from '../render/Post.js';
//   const post = new Post(renderer, scene, camera, { outline: true, bloom: true });
//   post.render(scene, camera)          // instead of renderer.render(scene, camera)
//   post.setSize(cssW, cssH)            // after renderer.setSize
//   post.setPixelRatio(pr)              // after renderer.setPixelRatio
//   post.configure({ outline, bloom, msaa, fogDensity })
//   post.dispose()
//
// Pipeline: RenderPass (linear HDR, half-float, MSAA, with a depth texture)
//   -> InkPass   screen-space outlines from the depth buffer alone (no second scene pass),
//                so instanced, skinned and shader-displaced geometry all get ink for free
//   -> UnrealBloomPass  subtle, high threshold: only the sun, glows and hot highlights bloom
//   -> OutputPass  tone mapping (renderer.toneMapping / exposure) + sRGB conversion
//   -> FXAAPass    when the target is single-sampled (the default). A multisampled target does
//                  not resolve into the depth texture on ANGLE/Metal, so the ink path is always
//                  single-sampled; msaa > 0 is only honoured for bloom-only, and it measured
//                  ~6 ms/frame slower than FXAA at 720p on an M1.
// With outline and bloom both off, render() is a plain renderer.render() (renderer does the
// tone mapping), which is the low-quality path.
//
// Ink detection: w = 1 / viewDepth is affine in screen space for any plane, so its discrete
// Laplacian is zero on flat surfaces and large where depth jumps (silhouettes) or the
// surface folds towards the camera (convex creases). Taking only the positive side puts a
// one-sided line on the nearer object. Lines fade with distance and with the scene's fog.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const INK_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const INK_FRAGMENT = /* glsl */ `
#include <packing>
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uTexel;       // offset of one sample step, in uv
uniform float uNear;
uniform float uFar;
uniform float uFogDensity;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uSilhouette; // relative Laplacian where silhouettes reach full ink
uniform float uCrease;     // relative Laplacian where creases start to ink
uniform float uStrength;
uniform vec3 uInk;         // ink tint (linear), multiplied with the surface colour
varying vec2 vUv;

float invDepth(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return -1.0 / perspectiveDepthToViewZ(d, uNear, uFar); // 1 / distance along view axis
}
// positive where the centre is nearer than its neighbours one offset away on either axis
float laplace(float wc, vec2 ox, vec2 oy) {
  float lx = 2.0 * wc - invDepth(vUv - ox) - invDepth(vUv + ox);
  float ly = 2.0 * wc - invDepth(vUv - oy) - invDepth(vUv + oy);
  return max(lx, ly) / wc;
}

void main() {
  vec4 col = texture2D(tDiffuse, vUv);
  float dc = texture2D(tDepth, vUv).x;
  if (dc >= 1.0) { gl_FragColor = col; return; } // sky: nothing in front to outline
  float wc = -1.0 / perspectiveDepthToViewZ(dc, uNear, uFar);
  vec2 ox = vec2(uTexel.x, 0.0);
  vec2 oy = vec2(0.0, uTexel.y);
  // two radii: the inner one gives a crisp 1-sample core, the outer one thickens the line
  float e = max(laplace(wc, ox, oy), laplace(wc, ox * 2.0, oy * 2.0) * 0.8);
  float ink = smoothstep(uCrease, uSilhouette, e);

  float dist = 1.0 / wc;
  ink *= 1.0 - smoothstep(uFadeStart, uFadeEnd, dist);
  float fog = exp(-uFogDensity * uFogDensity * dist * dist);
  ink *= fog;
  ink *= uStrength;

  col.rgb = mix(col.rgb, col.rgb * uInk, clamp(ink, 0.0, 1.0));
  gl_FragColor = col;
}
`;

class InkPass extends Pass {
  constructor(camera) {
    super();
    this.camera = camera;
    this.material = new THREE.ShaderMaterial({
      name: 'InkPass',
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
        uNear: { value: 0.3 },
        uFar: { value: 3000 },
        uFogDensity: { value: 0 },
        uFadeStart: { value: 220 },
        uFadeEnd: { value: 650 },
        uSilhouette: { value: 0.09 },
        uCrease: { value: 0.012 },
        uStrength: { value: 1.0 },
        uInk: { value: new THREE.Color(0x1d1830).multiplyScalar(1.6) },
      },
      vertexShader: INK_VERTEX,
      fragmentShader: INK_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    this.fsQuad = new FullScreenQuad(this.material);
    this.thickness = 1.4;
  }

  setSize(width, height) {
    // one sample step = `thickness` device pixels at 720p, scaled with resolution
    const px = Math.max(1, this.thickness * (height / 720));
    this.material.uniforms.uTexel.value.set(px / width, px / height);
  }

  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tDepth.value = readBuffer.depthTexture;
    u.uNear.value = this.camera.near;
    u.uFar.value = this.camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}

export class Post {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {{ outline?: boolean, bloom?: boolean, msaa?: number }} [opts]
   */
  constructor(renderer, scene, camera, opts = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.outline = opts.outline !== false;
    this.bloom = opts.bloom !== false;
    this.msaa = opts.msaa ?? 0; // MSAA on the HDR target costs ~6 ms on an M1; FXAA instead
    this._composer = null;
    this._w = 0;
    this._h = 0;
    this._pr = renderer.getPixelRatio();
    const size = renderer.getSize(new THREE.Vector2());
    this._w = size.x;
    this._h = size.y;
    this._fogDensity = 0;
    this._build();
  }

  get enabled() {
    return this.outline || this.bloom;
  }

  _build() {
    this._disposeComposer();
    if (!this.enabled) return;
    const r = this.renderer;
    const w = Math.max(1, Math.round(this._w * this._pr));
    const h = Math.max(1, Math.round(this._h * this._pr));
    const depthTexture = new THREE.DepthTexture(w, h);
    depthTexture.type = THREE.UnsignedIntType;
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      samples: this.outline ? 0 : this.msaa,
      depthTexture: this.outline ? depthTexture : null,
    });
    if (!this.outline) depthTexture.dispose();
    rt.texture.name = 'Post.rt';
    const composer = new EffectComposer(r, rt);
    composer.setPixelRatio(this._pr);
    composer.setSize(this._w, this._h);

    this._renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(this._renderPass);

    this._ink = null;
    if (this.outline) {
      this._ink = new InkPass(this.camera);
      this._ink.material.uniforms.uFogDensity.value = this._fogDensity;
      composer.addPass(this._ink);
    }

    this._bloom = null;
    if (this.bloom) {
      // half-resolution internally; strength, radius, threshold (linear luminance, HDR)
      this._bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.55, 0.92);
      composer.addPass(this._bloom);
    }

    composer.addPass(new OutputPass());
    if (!rt.samples) composer.addPass(new FXAAPass());
    this._composer = composer;
  }

  _disposeComposer() {
    if (!this._composer) return;
    for (const p of this._composer.passes) if (p.dispose) p.dispose();
    this._composer.renderTarget1.depthTexture?.dispose();
    this._composer.renderTarget2.depthTexture?.dispose();
    this._composer.dispose();
    this._composer = null;
  }

  /** @param {{ outline?: boolean, bloom?: boolean, msaa?: number, fogDensity?: number }} o */
  configure(o = {}) {
    if (o.fogDensity != null) this.setFogDensity(o.fogDensity);
    const outline = o.outline ?? this.outline;
    const bloom = o.bloom ?? this.bloom;
    const msaa = o.msaa ?? this.msaa;
    if (outline === this.outline && bloom === this.bloom && msaa === this.msaa && (this._composer || !this.enabled)) return;
    this.outline = outline;
    this.bloom = bloom;
    this.msaa = msaa;
    this._build();
  }

  setFogDensity(d) {
    this._fogDensity = d;
    if (this._ink) this._ink.material.uniforms.uFogDensity.value = d;
  }

  setSize(w, h) {
    this._w = w;
    this._h = h;
    if (this._composer) this._composer.setSize(w, h);
  }

  setPixelRatio(pr) {
    if (pr === this._pr) return;
    this._pr = pr;
    if (this._composer) {
      this._composer.setPixelRatio(pr);
      this._composer.setSize(this._w, this._h);
    }
  }

  render(scene = this.scene, camera = this.camera, dt) {
    if (!this._composer) {
      this.renderer.render(scene, camera);
      return;
    }
    if (scene.fog && scene.fog.density != null) this.setFogDensity(scene.fog.density);
    this._renderPass.scene = scene;
    this._renderPass.camera = camera;
    if (this._ink) this._ink.camera = camera;
    this._composer.render(dt);
  }

  dispose() {
    this._disposeComposer();
  }
}
