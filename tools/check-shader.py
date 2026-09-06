"""Compile the gemstone GLSL with native OpenGL (no browser).
Requires moderngl. An optional first argument points to a temporary pip target.
Three.js provides matrix/attribute declarations and output chunks in the browser;
this check substitutes their declarations to validate the ray tracer's GLSL.
"""
from pathlib import Path
import re,sys
if len(sys.argv)>1:sys.path.insert(0,sys.argv[1])
import moderngl
source=(Path(__file__).resolve().parents[1]/'assets/jewelry-studio.js').read_text(encoding='utf-8')
vertex=re.search(r'vertexShader:`(.*?)`',source,re.S).group(1)
fragment=re.search(r'fragmentShader:`(.*?)`',source,re.S).group(1)
vertex='#version 330\nin vec3 position; in vec3 normal; uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix;\n'+vertex.replace('varying ','out ')
fragment='#version 330\nout vec4 result;\n'+fragment.replace('precision highp float;','').replace('varying ','in ').replace('textureCube(','texture(').replace('gl_FragColor','result')
fragment=re.sub(r'#include <[^>]+>','',fragment)
context=moderngl.create_standalone_context(require=330)
program=context.program(vertex_shader=vertex,fragment_shader=fragment)
print('GEM_SHADER_OK',context.info['GL_RENDERER'],'uniform array',program['facets'].array_length)
program.release();context.release()
