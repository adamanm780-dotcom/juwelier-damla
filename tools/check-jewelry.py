"""Validate Blender source topology, gemstone convexity and a studio render.
Run with Blender --background tools/damla-jewelry.blend --python tools/check-jewelry.py.
The render is a model inspection artifact, not a browser screenshot.
"""
import bpy, bmesh, math, os
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for obj in list(bpy.context.scene.objects):
    bm=bmesh.new();bm.from_mesh(obj.data)
    assert all(e.is_manifold for e in bm.edges), 'Open/nonmanifold edges: '+obj.name
    assert all(f.calc_area()>1e-9 for f in bm.faces), 'Degenerate face: '+obj.name
    if obj.name.startswith('Diamond'):
        for f in bm.faces:
            center=f.calc_center_median()
            outside=max(f.normal.dot(v.co-center) for v in bm.verts)
            assert outside<.0001, f'Non-convex gemstone {obj.name}: {outside}'
            assert max(abs(f.normal.dot(v.co-center)) for v in f.verts)<.0001, 'Nonplanar facet: '+obj.name
    print('TOPOLOGY_OK',obj.name,len(bm.verts),len(bm.faces));bm.free()

def material(name,color,metallic=0,roughness=.15):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=roughness
    return m
gold=material('18K gold',(.78,.51,.21),1)
gem=bpy.data.materials.new('Diamond');gem.use_nodes=True
n=gem.node_tree.nodes;n.clear();out=n.new('ShaderNodeOutputMaterial');glass=n.new('ShaderNodeBsdfGlass');glass.inputs['IOR'].default_value=2.417;glass.inputs['Roughness'].default_value=0
gem.node_tree.links.new(glass.outputs[0],out.inputs[0])

for o in bpy.context.scene.objects:o.hide_render=True
band=bpy.data.objects['Wedding_oval'];band.hide_render=False
for v in band.data.vertices:
    radius=math.hypot(v.co.x,v.co.y);nr=54/(2*math.pi)+(radius-9)*1.6/1.7
    v.co.x*=nr/radius;v.co.y*=nr/radius;v.co.z*=2.2/4.5
band.rotation_euler.x=math.pi/2;band.data.materials.append(gold)
r=3.25;seat=54/(2*math.pi)+1.6+r*.92
for name,mat in [('Diamond_round',gem),('Basket_4',gold)]:
    o=bpy.data.objects[name];o.hide_render=False;o.scale=(r,r,r);o.location=(0,0,seat);o.data.materials.append(mat)

def tube(coords):
    data=bpy.data.curves.new('Shoulder','CURVE');data.dimensions='3D';data.resolution_u=16;data.bevel_depth=.38;data.bevel_resolution=5
    s=data.splines.new('BEZIER');s.bezier_points.add(len(coords)-1)
    for p,co in zip(s.bezier_points,coords):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
    o=bpy.data.objects.new('Shoulder',data);bpy.context.collection.objects.link(o);o.data.materials.append(gold)
ri=54/(2*math.pi)
for sign in [-1,1]:tube([(sign*4.5,0,math.sqrt((ri+1.6*.65)**2-4.5**2)),(sign*3.4,0,ri+1.6+.3),(sign*r*.52,0,seat-r*.72)])

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.cycles.max_bounces=16;scene.cycles.transmission_bounces=12
scene.world.color=(.22,.22,.22)
for name,pos,size,power in [('Key',(-25,-20,35),20,16000),('Strip',(25,5,20),10,10000),('Top',(0,15,40),20,12000)]:
    light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='RECTANGLE';light.size=size;light.size_y=size*2
    o=bpy.data.objects.new(name,light);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,4))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-10.2));bpy.context.object.data.materials.append(material('Ivory',(.65,.63,.60),0,.6))
bpy.ops.object.camera_add(location=(30,-47,29));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,3))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=34;scene.camera=camera
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(ROOT,'tools','model-inspection.png')
bpy.ops.render.render(write_still=True)
