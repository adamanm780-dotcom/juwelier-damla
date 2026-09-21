"""Original Blender jewelry HDRI. Run with blender --background --python this_file.py."""
from pathlib import Path
import json
import math
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets' / 'models'
ASSETS.mkdir(parents=True, exist_ok=True)
HDR = ASSETS / 'wedding-studio.hdr'
PREVIEW = ASSETS / 'wedding-studio-preview.jpg'
BLEND = ROOT / 'tools' / 'wedding-studio.blend'
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
BASE = (0.65, 0.67, 0.70, 1.0)
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
        edge.inputs['From Min'].default_value = 0.5 - feather
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

panel('01 Key | long cream diffusion', -42, 22, 5.0, 8.0, (3.4,3.28,3.03), .15)
panel('02 Fill | broad pearl diffusion', 59, 12, 5.8, 7.8, (1.9,1.92,1.94), .20)
panel('03 Rim | elongated ivory diffusion', 157, 18, 4.0, 7.5, (2.9,2.82,2.63), .15)
panel('04 Rear fill | silver diffusion', -140, -2, 5.4, 7.8, (1.75,1.78,1.81), .20)
panel('05 Ceiling | large silk', 10, 80, 8.2, 7.5, (2.0,1.98,1.90), .25, radius=7)
panel('06 Floor | low pearl bounce', -15, -85, 10, 9, (.90,.92,.93), .25, radius=8)
panel('07 Negative fill | narrow gray left', 6, 0, .65, 8.2, (.07,.08,.09), .30, radius=4.3)
panel('08 Negative fill | narrow gray rear', 112, 5, .65, 7.4, (.09,.10,.12), .30, radius=4.3)
panel('09 Negative fill | diagonal graphite', -96, 5, .65, 7.5, (.08,.09,.10), .32, radius=4.3, roll=9)
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
    'name': 'Damla original wedding jewelry studio',
    'generator': 'Blender '+bpy.app.version_string+' / Cycles',
    'source': 'tools/build-wedding-studio.py',
    'editable_scene': 'tools/wedding-studio.blend',
    'environment': 'assets/models/wedding-studio.hdr',
    'preview': 'assets/models/wedding-studio-preview.jpg',
    'resolution': [2048,1024],
    'color_space': 'scene-linear RGB; Rec.709/sRGB primaries; Radiance RGBE',
    'display_transform_baked': False,
    'samples': 24,
    'revision': 2,
    'base_linear_rgb': list(BASE[:3]),
    'adjustment': 'Brighter reference-matched fill, wider rectangular key/rim diffusion, thin gray contour cards.',
    'copyright': 'Original generated studio; no third-party HDR imagery or textures.',
    'design': 'Bright neutral fill, five broad rectangular ivory/silver softboxes, pearl floor bounce, three thin feathered gray contour cards.',
    'file_bytes': HDR.stat().st_size,
}
(ASSETS/'wedding-studio.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
print('DAMLA_STUDIO_COMPLETE '+json.dumps(metadata))

