"""Original Blender jewelry HDRI. Run with blender --background --python this_file.py."""
from pathlib import Path
import json
import math
import sys
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT.parent / "assets" / "models"
ASSETS.mkdir(parents=True, exist_ok=True)
DIAMOND = '--diamond' in sys.argv
STEM = 'wedding-diamond-studio' if DIAMOND else 'wedding-studio'
HDR = ASSETS / (STEM+'.hdr')
PREVIEW = ASSETS / (STEM+'-preview.jpg')
BLEND = ROOT / (STEM+'.blend')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for mat in list(bpy.data.materials):
    bpy.data.materials.remove(mat)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 1
scene.cycles.diffuse_bounces = 0
scene.cycles.glossy_bounces = 0
scene.cycles.transmission_bounces = 0
scene.cycles.transparent_max_bounces = 12
scene.render.resolution_x = 2048
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = 'HDR'
scene.render.image_settings.color_mode = 'RGB'
scene.render.filepath = str(HDR)
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = 0
BASE = (0.10,0.11,0.125,1.0) if DIAMOND else (0.72,0.745,0.78,1.0)
world = bpy.data.worlds.new('Damla | neutral luminous room')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = BASE
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
scene.world = world

def material(name, radiance, feather):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    n, l = mat.node_tree.nodes, mat.node_tree.links
    n.clear()
    uv = n.new('ShaderNodeTexCoord')
    uv.location = (-850, 100)
    separate = n.new('ShaderNodeSeparateXYZ')
    separate.location = (-650, 100)
    l.new(uv.outputs['UV'], separate.inputs[0])
    edges = []
    for i, axis in enumerate(('X', 'Y')):
        center = n.new('ShaderNodeMath')
        center.operation = 'SUBTRACT'
        center.inputs[1].default_value = 0.5
        l.new(separate.outputs[axis], center.inputs[0])
        absolute = n.new('ShaderNodeMath')
        absolute.operation = 'ABSOLUTE'
        l.new(center.outputs[0], absolute.inputs[0])
        edge = n.new('ShaderNodeMapRange')
        edge.interpolation_type = 'SMOOTHERSTEP'
        edge.clamp = True
        edge.inputs['From Min'].default_value = 0.5 - (feather[i] if isinstance(feather,tuple) else feather)
        edge.inputs['From Max'].default_value = 0.5
        edge.inputs['To Min'].default_value = 1.0
        edge.inputs['To Max'].default_value = 0.0
        l.new(absolute.outputs[0], edge.inputs['Value'])
        center.location = (-450, 100 - i * 230)
        absolute.location = (-280, 100 - i * 230)
        edge.location = (-100, 100 - i * 230)
        edges.append(edge)
    aperture = n.new('ShaderNodeMath')
    aperture.operation = 'MULTIPLY'
    aperture.label = 'Soft rectangular aperture'
    aperture.location = (130, 20)
    l.new(edges[0].outputs['Result'], aperture.inputs[0])
    l.new(edges[1].outputs['Result'], aperture.inputs[1])
    emission = n.new('ShaderNodeEmission')
    emission.location = (510, 20)
    emission.inputs['Strength'].default_value = 1
    emission.inputs['Color'].default_value = (*radiance, 1.0)
    out = n.new('ShaderNodeOutputMaterial')
    out.location = (720, 20)
    transparent = n.new('ShaderNodeBsdfTransparent')
    transparent.location = (510, -120)
    blend = n.new('ShaderNodeMixShader')
    blend.location = (720, 20)
    out.location = (930, 20)
    l.new(aperture.outputs[0], blend.inputs[0])
    l.new(transparent.outputs[0], blend.inputs[1])
    l.new(emission.outputs[0], blend.inputs[2])
    l.new(blend.outputs[0], out.inputs['Surface'])
    return mat

def panel(name, azimuth, elevation, width, height, radiance, feather=0.25, radius=5.0, roll=0):
    az, el = math.radians(azimuth), math.radians(elevation)
    p = Vector((math.cos(el)*math.cos(az), math.cos(el)*math.sin(az), math.sin(el))) * radius
    bpy.ops.mesh.primitive_plane_add(size=2, location=p)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (-p).to_track_quat('Z', 'Y').to_euler()
    if roll:
        obj.rotation_euler.rotate_axis('Z', math.radians(roll))
    obj.scale = (width/2, height/2, 1)
    obj.data.materials.append(material(name+' | feathered radiance', radiance, feather))
    obj['design_note'] = 'Original reflection card; linear emission, smoothly feathered edges.'

# A broad, continuous studio with one primary reflection and controlled edge accents.
# Source RGB is scene-linear. Feathered rectangular cards preserve long reflections.
if not DIAMOND:
    panel('01 Key | graduated ivory silk', -38, 17, 7.4, 12.0, (3.5,3.43,3.3), (.48,.28), radius=5.5, roll=-5)
    panel('02 Fill | large pearl return', 65, 6, 7.6, 11.5, (2.2,2.24,2.3), (.47,.30), radius=5.6, roll=5)
    panel('03 Rear key | soft ivory gradient', 153, 15, 7.2, 11.5, (3.2,3.15,3.04), (.48,.30), radius=5.4, roll=-7)
    panel('04 Silver return | broad gentle gradient', -130, 3, 7.8, 12.0, (1.95,2.02,2.12), (.48,.32), radius=5.7, roll=7)
    panel('05 Ceiling | silk dome', 8, 82, 10, 9, (2.05,2.03,1.96), (.45,.45), radius=6.5)
    panel('06 Floor | cream bounce', -18, -82, 11, 10, (1.16,1.19,1.23), (.44,.44), radius=6.5)
    # Two silver-gray gradients reveal curvature; they are narrow and never black.
    panel('07 Contour | soft near silver', 9, -2, 1.10, 11, (.24,.255,.275), (.47,.22), radius=4.3, roll=2)
    panel('08 Contour | soft far silver', -100, 4, 1.15, 11, (.27,.285,.31), (.47,.22), radius=4.3, roll=-4)
    # Only two edge accents. Tall enough to avoid round point-like reflections.
    panel('09 Accent | long porcelain edge', -66, 5, .92, 12.8, (3.5,3.42,3.28), (.25,.27), radius=4.2, roll=-4)
    panel('10 Accent | long pearl edge', 128, 7, 1.02, 12.5, (3.3,3.34,3.4), (.25,.27), radius=4.2, roll=3)
else:
    # A separate gem environment supplies dark facets and large luminous refractions.
    # The original gold environment remains bright; this one is only for the gemstone cubemap.
    panel('01 Gem key | broad neutral silk', -42, 34, 6.4, 8.8, (2.9,2.95,3.0), (.30,.28), radius=5.8, roll=-8)
    panel('02 Gem rim | long white edge', 60, 11, 1.4, 10.5, (4.1,4.15,4.2), (.16,.22), radius=5.1, roll=5)
    panel('03 Gem soft fill | silver', 137, -13, 4.8, 8.3, (.92,.98,1.04), (.44,.31), radius=5.8, roll=-11)
    panel('04 Gem rear key | neutral white', -153, 25, 4.1, 8.6, (2.3,2.36,2.42), (.24,.30), radius=5.8, roll=9)
    panel('05 Gem lower return | pearl', -37, -64, 6.8, 7.8, (.42,.455,.49), (.44,.44), radius=6.4)
    panel('06 Gem ceiling | diffuse silver', 10, 79, 7.5, 7, (.65,.69,.73), (.45,.45), radius=7)
    panel('07 Gem negative | long charcoal card', 5, 0, 2.5, 11, (.034,.038,.045), (.30,.24), radius=4.5, roll=7)
    panel('08 Gem negative | rear charcoal card', 96, 0, 1.8, 10, (.042,.048,.058), (.30,.24), radius=4.5, roll=-5)
    panel('09 Gem edge | long white reflection', -100, -5, .80, 11.7, (3.5,3.58,3.67), (.20,.25), radius=4.9, roll=-3)
bpy.ops.object.camera_add(location=(0,0,0))
camera = bpy.context.object
camera.name = '360 HDR capture | scene center'
camera.data.type = 'PANO'
camera.data.panorama_type = 'EQUIRECTANGULAR'
camera.rotation_euler = (math.pi/2,0,-math.pi/2)
scene.camera = camera
scene['authoring'] = 'Original Juwelier Damla jewelry studio; Blender 5.1; original emissive geometry; no third-party imagery.'
scene['output_color_space'] = 'Scene-linear Rec.709/sRGB primaries; Radiance RGBE; no display transform baked into HDR.'
scene['browser_use'] = 'Three.js HDRLoader + PMREMGenerator.fromEquirectangular; tone map in renderer only.'
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.render.render(write_still=True)
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.quality = 92
bpy.data.images['Render Result'].save_render(str(PREVIEW), scene=scene)
metadata = {
    'name': 'Damla original gemstone studio v4' if DIAMOND else 'Damla original soft metal studio v4',
    'generator': 'Blender '+bpy.app.version_string+' / Cycles',
    'source': 'build-wedding-studios-v4.py', 'editable_scene': BLEND.name,
    'environment': HDR.name, 'preview': PREVIEW.name,
    'resolution': [2048,1024], 'color_space': 'scene-linear RGB; Rec.709/sRGB primaries; Radiance RGBE',
    'display_transform_baked': False, 'samples': 24, 'revision': 4,
    'base_linear_rgb': list(BASE[:3]),
    'design': ('Dedicated gem-only cubemap: dark neutral field, broad soft white keys, two elongated edge reflections, charcoal cards.' if DIAMOND else 'Four broad fully graduated silk cards, two long controlled edges, soft silver contour gradients, neutral pearl bounce.'),
    'copyright': 'Original Blender emissive geometry; no third-party HDR imagery.',
    'file_bytes': HDR.stat().st_size,
}
(ASSETS/(STEM+'.json')).write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
print('DAMLA_STUDIO_V4_COMPLETE '+json.dumps(metadata))
