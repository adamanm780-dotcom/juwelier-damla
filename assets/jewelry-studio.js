import * as THREE from 'three';
import { GLTFLoader } from 'three/GLTFLoader.js';

let library;
export async function loadJewelry() {
  if (!library) library = new GLTFLoader().loadAsync(new URL('./models/jewelry.glb', import.meta.url).href)
    .then(gltf => {
      const meshes = new Map();
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(o => {
        if (o.isMesh) meshes.set(o.name, o.geometry.clone().applyMatrix4(o.matrixWorld));
      });
      return meshes;
    }).catch(error => { library = null; throw error; });
  return library;
}

export function weddingGeometry(source, ri, thickness, width) {
  const geo = source.clone(), p = geo.attributes.position, n = geo.attributes.normal;
  // Radial deformation keeps the inner circumference exact, independently of width.
  // Transform normals by the inverse Jacobian, preserving Blender's welded edge normals.
  for (let i=0; i<p.count; i++) {
    const x=p.getX(i), z=p.getZ(i), r=Math.hypot(x,z), u=x/r, v=z/r;
    const nr=ri+(r-9)*thickness/1.7;
    const radial=n.getX(i)*u+n.getZ(i)*v;
    const tangent=-n.getX(i)*v+n.getZ(i)*u;
    const normal=new THREE.Vector3(u*radial/(thickness/1.7)-v*tangent/(nr/r),
      n.getY(i)/(width/4.5),v*radial/(thickness/1.7)+u*tangent/(nr/r)).normalize();
    p.setXYZ(i,u*nr,p.getY(i)*width/4.5,v*nr);
    n.setXYZ(i,normal.x,normal.y,normal.z);
  }
  p.needsUpdate=n.needsUpdate=true;
  geo.computeBoundingSphere();
  return geo;
}

export function createStudio(renderer) {
  const environment = new THREE.Scene();
  environment.background = new THREE.Color(0x858991);
  const box = new THREE.Mesh(new THREE.BoxGeometry(120,100,120),
    new THREE.MeshBasicMaterial({color:0x858991,side:THREE.BackSide}));
  environment.add(box);
  // Diffusion cloth provides broad gradients instead of a dark room with
  // isolated hard white reflections across polished gold.
  const cloth=document.createElement('canvas');cloth.width=cloth.height=128;
  const context=cloth.getContext('2d');
  const gradient=context.createRadialGradient(64,64,10,64,64,66);
  gradient.addColorStop(0,'rgba(255,255,255,1)');
  gradient.addColorStop(.5,'rgba(255,255,255,.94)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  context.fillStyle=gradient;context.fillRect(0,0,128,128);
  const softbox=new THREE.CanvasTexture(cloth);softbox.colorSpace=THREE.SRGBColorSpace;
  const panel=(w,h,position,intensity,color=0xffffff)=>{
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({
      color:new THREE.Color(color).multiplyScalar(intensity),map:softbox,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
    m.position.set(...position);m.lookAt(0,0,0);environment.add(m);
  };
  panel(70,90,[-30,20,35],2.8);
  panel(42,78,[35,18,15],3.1);
  panel(85,42,[0,44,-8],2.7);
  panel(24,65,[-20,8,-45],3.8,0xf1f5ff);
  panel(55,30,[15,-35,25],1.8);
  panel(12,72,[40,4,-27],1,0x171b20);
  panel(16,80,[-42,0,-12],1,0x292b30);
  const cube=new THREE.WebGLCubeRenderTarget(512,{type:THREE.HalfFloatType,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
  const capture=new THREE.CubeCamera(.1,200,cube);capture.update(renderer,environment);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const filtered=pmrem.fromCubemap(cube.texture);
  pmrem.dispose();
  environment.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  softbox.dispose();
  return {metal:filtered.texture,diamond:cube.texture,dispose(){filtered.dispose();cube.dispose();}};
}

const planeCache=new WeakMap();
function facetPlanes(geo) {
  if(planeCache.has(geo))return planeCache.get(geo);
  const pos=geo.attributes.position, idx=geo.index;
  const planes=[], a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3();
  const count=idx?idx.count:pos.count;
  for(let i=0;i<count;i+=3){
    a.fromBufferAttribute(pos,idx?idx.getX(i):i);
    b.fromBufferAttribute(pos,idx?idx.getX(i+1):i+1);
    c.fromBufferAttribute(pos,idx?idx.getX(i+2):i+2);
    const normal=b.sub(a).cross(c.sub(a)).normalize(), d=normal.dot(a);
    if(!planes.some(p=>normal.dot(new THREE.Vector3(p.x,p.y,p.z))>.99999&&Math.abs(p.w-d)<.0001))
      planes.push(new THREE.Vector4(normal.x,normal.y,normal.z,d));
  }
  if(planes.length>96)throw new Error('Too many gemstone facets');
  const result={count:planes.length,planes:planes.concat(Array.from({length:96-planes.length},()=>new THREE.Vector4()))};
  planeCache.set(geo,result);return result;
}

// Convex-facet ray tracing: refraction, total internal reflection and subtle dispersion.
// All intersections use the actual Blender cut; no glitter sprites or painted facets.
export function diamondMesh(geometry, environment) {
  const facets=facetPlanes(geometry);
  const material=new THREE.ShaderMaterial({
    uniforms:{env:{value:environment},facets:{value:facets.planes},facetCount:{value:facets.count},
      eye:{value:new THREE.Vector3()},orientation:{value:new THREE.Matrix3()}},
    vertexShader:`varying vec3 localPosition; varying vec3 localNormal;
      void main(){localPosition=position;localNormal=normal;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`precision highp float;
      uniform samplerCube env; uniform vec4 facets[96]; uniform int facetCount;
      uniform vec3 eye; uniform mat3 orientation;
      varying vec3 localPosition; varying vec3 localNormal;
      vec3 sampleStudio(vec3 d){return textureCube(env,normalize(orientation*d)).rgb;}
      float fresnel(float cosine,float ior){float r=(ior-1.0)/(ior+1.0);r*=r;return r+(1.0-r)*pow(1.0-clamp(cosine,0.0,1.0),5.0);}
      vec3 traceGem(vec3 incident,vec3 normal,float ior){
        float entry=fresnel(dot(-incident,normal),ior);
        vec3 light=sampleStudio(reflect(incident,normal))*entry;
        vec3 direction=refract(incident,normal,1.0/ior);
        vec3 origin=localPosition+direction*.0005;
        float energy=1.0-entry;
        for(int bounce=0;bounce<5;bounce++){
          float distance=1.e8;vec3 hitNormal=normal;
          for(int i=0;i<96;i++){
            if(i>=facetCount)break;
            float den=dot(facets[i].xyz,direction);
            if(den>.00001){float t=(facets[i].w-dot(facets[i].xyz,origin))/den;
              if(t>.00001&&t<distance){distance=t;hitNormal=facets[i].xyz;}}
          }
          if(distance>1.e7)break;
          origin+=direction*distance;
          vec3 exitDirection=refract(direction,-hitNormal,ior);
          float reflection=fresnel(dot(direction,hitNormal),ior);
          if(dot(exitDirection,exitDirection)>.01){light+=sampleStudio(exitDirection)*energy*(1.0-reflection);energy*=reflection;}
          direction=reflect(direction,hitNormal);origin+=direction*.0005;
        }
        light+=sampleStudio(direction)*energy*.65;
        return light;
      }
      void main(){vec3 incident=normalize(localPosition-eye);vec3 n=normalize(localNormal);
        vec3 red=traceGem(incident,n,2.407);vec3 green=traceGem(incident,n,2.417);vec3 blue=traceGem(incident,n,2.435);
        gl_FragColor=vec4(red.r,green.g,blue.b,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh=new THREE.Mesh(geometry,material);
  mesh.onBeforeRender=(_renderer,_scene,camera)=>{
    mesh.worldToLocal(material.uniforms.eye.value.setFromMatrixPosition(camera.matrixWorld));
    material.uniforms.orientation.value.setFromMatrix4(mesh.matrixWorld);
    material.uniformsNeedUpdate=true;
  };
  return mesh;
}

export function metalMaterial(color, roughness=.14) {
  return new THREE.MeshPhysicalMaterial({color,metalness:1,roughness,envMapIntensity:1.05});
}
