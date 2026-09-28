/** Two-scale contact shadows for jewellery standing on a studio floor.
 * The actual meshes are rendered from below into a height buffer: a tight
 * contact term (last ~1 mm above the floor) and a broad ambient term, each
 * Gaussian-blurred separately. Follows every pose and configuration exactly. */
import * as THREE from 'three';

const quad = new THREE.PlaneGeometry(2, 2);
const blurFragment = `precision highp float; uniform sampler2D map; uniform vec2 step; varying vec2 vUv;
void main(){
 vec4 sum = texture2D(map, vUv) * .2270270270;
 sum += (texture2D(map, vUv + step * 1.3846153846) + texture2D(map, vUv - step * 1.3846153846)) * .3162162162;
 sum += (texture2D(map, vUv + step * 3.2307692308) + texture2D(map, vUv - step * 3.2307692308)) * .0702702703;
 gl_FragColor = sum;
}`;
const quadVertex = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

export class ContactShadows {
 constructor(renderer, {size = 512, contactHeight = .8, softHeight = 13, contactOpacity = .95, softOpacity = .3, color = 0x1f1810, softColor = 0x3a3128} = {}) {
  this.renderer = renderer; this.size = size;
  const options = {type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true};
  this.heightTarget = new THREE.WebGLRenderTarget(size, size, options);
  this.pingA = new THREE.WebGLRenderTarget(size, size, {...options, depthBuffer: false});
  this.pingB = new THREE.WebGLRenderTarget(size, size, {...options, depthBuffer: false});
  this.softA = new THREE.WebGLRenderTarget(size / 2, size / 2, {...options, depthBuffer: false});
  this.softB = new THREE.WebGLRenderTarget(size / 2, size / 2, {...options, depthBuffer: false});
  this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, softHeight);
  this.heights = {contact: contactHeight, soft: softHeight};
  this.heightMaterial = new THREE.ShaderMaterial({
   uniforms: {floorY: {value: 0}, contactHeight: {value: contactHeight}, softHeight: {value: softHeight}},
   vertexShader: 'varying float vHeight; uniform float floorY; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vHeight = w.y - floorY; gl_Position = projectionMatrix * viewMatrix * w; }',
   fragmentShader: `precision highp float; varying float vHeight; uniform float contactHeight; uniform float softHeight;
    void main(){ float h = max(vHeight, 0.0); float contact = pow(clamp(1.0 - h / contactHeight, 0.0, 1.0), 1.4); float soft = pow(clamp(1.0 - h / softHeight, 0.0, 1.0), 1.6); gl_FragColor = vec4(contact, soft, 0.0, 1.0); }`,
   side: THREE.DoubleSide
  });
  this.blurMaterial = new THREE.ShaderMaterial({uniforms: {map: {value: null}, step: {value: new THREE.Vector2()}}, vertexShader: quadVertex, fragmentShader: blurFragment, depthTest: false, depthWrite: false});
  this.blurScene = new THREE.Scene(); this.blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.blurScene.add(new THREE.Mesh(quad, this.blurMaterial));
  this.planeMaterial = new THREE.ShaderMaterial({
   uniforms: {contactMap: {value: this.pingA.texture}, softMap: {value: this.softA.texture}, shadowMatrix: {value: new THREE.Matrix4()},
    color: {value: new THREE.Color(color)}, softColor: {value: new THREE.Color(softColor)}, contactOpacity: {value: contactOpacity}, softOpacity: {value: softOpacity}},
   vertexShader: 'varying vec4 vShadow; uniform mat4 shadowMatrix; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vShadow = shadowMatrix * w; gl_Position = projectionMatrix * viewMatrix * w; }',
   fragmentShader: `precision highp float; uniform sampler2D contactMap; uniform sampler2D softMap; uniform vec3 color; uniform vec3 softColor; uniform float contactOpacity; uniform float softOpacity; varying vec4 vShadow;
    void main(){ vec2 uv = vShadow.xy / vShadow.w * .5 + .5; if(any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) discard;
     vec2 edge = smoothstep(vec2(0.0), vec2(.08), uv) * smoothstep(vec2(0.0), vec2(.08), 1.0 - uv);
     float c = texture2D(contactMap, uv).r * contactOpacity, s = texture2D(softMap, uv).g * softOpacity;
     float a = (1.0 - (1.0 - c) * (1.0 - s)) * edge.x * edge.y;
     // Open penumbra carries the colour of light bounced off the metal; the crease under the band is near black.
     gl_FragColor = vec4(mix(softColor, color, c / max(c + s, 1e-4)), a);
     #include <colorspace_fragment>
    }`,
   transparent: true, depthWrite: false, toneMapped: false
  });
  this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.planeMaterial);
  this.plane.rotation.x = -Math.PI / 2; this.plane.renderOrder = -1; this.plane.userData.contactShadow = true;
 }
 /** Tint of the open penumbra from the light a metal bounces onto the sweep (f0 = linear alloy reflectance). */
 setBounce(f0) { this.planeMaterial.uniforms.softColor.value.setRGB(.06 + .26 * f0.r, .06 + .26 * f0.g, .06 + .26 * f0.b, THREE.SRGBColorSpace); }
 /** Frame the shadow camera on the given world box (floor at y = floorY). */
 fit(box, floorY = 0) {
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const half = Math.max(size.x, size.z) / 2 + this.heights.soft * .9;
  const c = this.camera;
  c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 0; c.far = this.heights.soft;
  c.position.set(center.x, floorY - .001, center.z); c.up.set(0, 0, 1); c.lookAt(center.x, floorY + 1, center.z);
  c.updateProjectionMatrix(); c.updateMatrixWorld(true);
  this.heightMaterial.uniforms.floorY.value = floorY;
  this.plane.position.set(center.x, floorY + .002, center.z); this.plane.scale.set(half * 2, half * 2, 1);
  this.planeMaterial.uniforms.shadowMatrix.value.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
 }
 blur(source, target, dx, dy) {
  this.blurMaterial.uniforms.map.value = source.texture; this.blurMaterial.uniforms.step.value.set(dx, dy);
  this.renderer.setRenderTarget(target); this.renderer.render(this.blurScene, this.blurCamera);
 }
 /** Render the height buffer of `scene` (plane hidden) and blur both scales. */
 update(scene) {
  const r = this.renderer, previousTarget = r.getRenderTarget(), previousOverride = scene.overrideMaterial, previousBackground = scene.background, previousEnvironment = scene.environment;
  const previousClear = r.getClearColor(new THREE.Color()), previousAlpha = r.getClearAlpha(), previousTone = r.toneMapping;
  this.plane.visible = false; scene.overrideMaterial = this.heightMaterial; scene.background = null;
  r.toneMapping = THREE.NoToneMapping; r.setClearColor(0x000000, 0);
  r.setRenderTarget(this.heightTarget); r.clear(); r.render(scene, this.camera);
  scene.overrideMaterial = previousOverride; scene.background = previousBackground; scene.environment = previousEnvironment;
  const t = 1 / this.size, s = 2 / this.size;
  this.blur(this.heightTarget, this.pingB, t * .7, 0); this.blur(this.pingB, this.pingA, 0, t * .7);
  this.blur(this.heightTarget, this.softB, s * 2.2, 0); this.blur(this.softB, this.softA, 0, s * 2.2);
  this.blur(this.softA, this.softB, s * 3.4, 0); this.blur(this.softB, this.softA, 0, s * 3.4);
  r.setRenderTarget(previousTarget); r.setClearColor(previousClear, previousAlpha); r.toneMapping = previousTone;
  this.plane.visible = true;
 }
 dispose() {
  for (const t of [this.heightTarget, this.pingA, this.pingB, this.softA, this.softB]) t.dispose();
  this.heightMaterial.dispose(); this.blurMaterial.dispose(); this.planeMaterial.dispose(); this.plane.geometry.dispose();
 }
}
