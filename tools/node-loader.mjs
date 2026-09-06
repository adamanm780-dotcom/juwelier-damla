import { pathToFileURL } from 'node:url';
import { resolve as pathResolve } from 'node:path';
export async function resolve(specifier, context, nextResolve) {
  if(specifier==='three')return {url:pathToFileURL(pathResolve('assets/vendor/three.module.js')).href,shortCircuit:true};
  if(specifier.startsWith('three/'))return {url:pathToFileURL(pathResolve('assets/vendor',specifier.slice(6))).href,shortCircuit:true};
  return nextResolve(specifier,context);
}
