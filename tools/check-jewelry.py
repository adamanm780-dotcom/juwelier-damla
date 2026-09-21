"""Audit all Blender jewelry meshes and optionally render a polished wedding-ring pair.
Run: blender --background tools/damla-jewelry.blend --python tools/check-jewelry.py
Use -- --skip-render for topology-only checks, or -- --render-dir <directory>.
Inspection artifacts are written to a temporary directory, never added to the asset library.
"""
import bpy, bmesh, math, os, json, sys, tempfile, argparse, struct
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser=argparse.ArgumentParser()
parser.add_argument('--skip-render',action='store_true')
parser.add_argument('--render-dir',default=os.path.join(tempfile.gettempdir(),'damla-blender-quality'))
options=parser.parse_args(args)
os.makedirs(options.render_dir,exist_ok=True)
report={}
expected_names={'Wedding_'+n for n in ['flach','bombiert','oval','konkav','kantig']} | {'Diamond_round','Diamond_oval','Diamond_emerald','Basket_4','Basket_6'}
assert {o.name for o in bpy.context.scene.objects}==expected_names, 'Unexpected source mesh library'

for obj in list(bpy.context.scene.objects):
    bm=bmesh.new();bm.from_mesh(obj.data)
    assert all(e.is_manifold for e in bm.edges), 'Open/nonmanifold edges: '+obj.name
    assert all(e.is_contiguous for e in bm.edges), 'Inconsistent winding: '+obj.name
    assert all(f.calc_area()>1e-9 for f in bm.faces), 'Degenerate face: '+obj.name
    assert all(e.calc_length()>1e-6 for e in bm.edges), 'Collapsed edge: '+obj.name
    record={'vertices':len(bm.verts),'faces':len(bm.faces),'manifold':True,
            'min_face_area_mm2':min(f.calc_area() for f in bm.faces)}
    if obj.name.startswith('Diamond'):
        for f in bm.faces:
            center=f.calc_center_median()
            outside=max(f.normal.dot(v.co-center) for v in bm.verts)
            assert outside<.0001, f'Non-convex gemstone {obj.name}: {outside}'
            assert max(abs(f.normal.dot(v.co-center)) for v in f.verts)<.0001, 'Nonplanar facet: '+obj.name
        record['planar_convex_facets']=True
    if obj.name.startswith('Wedding'):
        assert len(bm.verts)-len(bm.edges)+len(bm.faces)==0, 'Ring must have torus topology'
        assert bm.calc_volume()>0, 'Ring winding must enclose positive volume'
        obj.data.calc_loop_triangles()
        assert obj.data.has_custom_normals, 'Missing analytical split normals'
        radii=[math.hypot(v.co.x,v.co.y) for v in bm.verts]
        assert abs(min(radii)-9.)<2e-5, 'Incorrect nominal inner radius'
        assert abs(max(radii)-10.7)<2e-5, 'Incorrect nominal maximum thickness'
        assert abs(max(v.co.z for v in bm.verts)-2.25)<2e-5, 'Incorrect half width'
        assert abs(min(v.co.z for v in bm.verts)+2.25)<2e-5, 'Incorrect half width'
        profile_count=obj['profile_samples']
        angular_count=obj['radial_segments']
        assert len(bm.verts)==profile_count*angular_count, 'Unexpected topology layout'
        # A simple, consistently wound profile prevents overlapping bands and bevel folds.
        profile=[(obj.data.vertices[i].co.x,obj.data.vertices[i].co.z) for i in range(profile_count)]
        def orient(a,b,c): return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
        for i,a in enumerate(profile):
            b=profile[(i+1)%profile_count]
            for j in range(i+2,profile_count):
                if i==0 and j==profile_count-1: continue
                c,d=profile[j],profile[(j+1)%profile_count]
                crosses=orient(a,b,c)*orient(a,b,d)<-1e-12 and orient(c,d,a)*orient(c,d,b)<-1e-12
                assert not crosses, 'Self-intersecting cross section: '+obj.name
        # Every face has usable area in UV space, including both side walls.
        uv=obj.data.uv_layers.active.data
        min_uv_area=1.
        for triangle in obj.data.loop_triangles:
            a,b,c=[uv[i].uv for i in triangle.loops]
            area=abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))*.5
            min_uv_area=min(min_uv_area,area)
        assert min_uv_area>1e-9, 'Collapsed UVs on ring flank'
        # Custom normals must point outwards and remain tangent-free around the revolution.
        npervertex={}
        for loop,normal in zip(obj.data.loops,obj.data.corner_normals):
            vi=loop.vertex_index;n=normal.vector
            npervertex.setdefault(vi,n.copy())
            assert abs(n.length-1)<2e-5, 'Non-unit normal'
            p=obj.data.vertices[vi].co;r=math.hypot(p.x,p.y)
            assert abs((-p.y*n.x+p.x*n.y)/r)<2e-4, 'Spiralling smooth normal'
        for face in obj.data.polygons:
            for vi in face.vertices:
                assert face.normal.dot(npervertex[vi])>.985, 'Unexpected normal discontinuity'
        # The coincident first/last meridians must export the same surface normal.
        for i in range(profile_count):
            n0=npervertex[i];n1=npervertex[(angular_count-1)*profile_count+i]
            a=2*math.pi/ angular_count
            radial=n1.x*math.cos(a)-n1.y*math.sin(a)
            assert abs(n0.x-radial)<1e-3 and abs(n0.z-n1.z)<1e-3, 'Longitude seam in shading normals' # Blender custom-normal storage quantizes to 16-bit angles.
        record.update({'volume_mm3':bm.calc_volume(),'euler_characteristic':0,
                       'inner_radius_mm':min(radii),'outer_radius_mm':max(radii),
                       'width_mm':max(v.co.z for v in bm.verts)-min(v.co.z for v in bm.verts),
                       'min_uv_triangle_area':min_uv_area,'self_intersections':0,
                       'analytical_normals':True,'profile_perimeter_mm':obj['profile_perimeter_mm']})
    report[obj.name]=record
    print('TOPOLOGY_OK',obj.name,json.dumps(record));bm.free()

# The GLB must retain the browser's numeric millimetre convention and metadata.
with open(os.path.join(ROOT,'assets','models','jewelry.glb'),'rb') as f: glb=f.read()
magic,version,total=struct.unpack_from('<III',glb)
assert magic==0x46546c67 and version==2 and total==len(glb), 'Invalid GLB header'
chunk_length,chunk_type=struct.unpack_from('<II',glb,12)
gltf=json.loads(glb[20:20+chunk_length])
assert {n['name'] for n in gltf['nodes'] if 'mesh' in n}==expected_names, 'Missing exported meshes'
binary_start=20+chunk_length+8

def exported_vec3(index):
    accessor=gltf['accessors'][index];view=gltf['bufferViews'][accessor['bufferView']]
    assert accessor['componentType']==5126 and accessor['type']=='VEC3'
    offset=binary_start+view.get('byteOffset',0)+accessor.get('byteOffset',0)
    stride=view.get('byteStride',12)
    return [struct.unpack_from('<fff',glb,offset+i*stride) for i in range(accessor['count'])]

for node in gltf['nodes']:
    if node.get('name','').startswith('Wedding'):
        assert abs(node.get('scale',[1,1,1])[0]-1)<1e-8, 'GLB scale changed millimetre numeric convention'
        assert node['extras']['inner_radius_mm']==9., 'Missing profile extras'
        for primitive in gltf['meshes'][node['mesh']]['primitives']:
            accessor=gltf['accessors'][primitive['attributes']['POSITION']]
            assert max(accessor['max'])>10.69, 'GLB vertices changed scale'
            positions=exported_vec3(primitive['attributes']['POSITION'])
            normals=exported_vec3(primitive['attributes']['NORMAL'])
            known={};duplicates=0;seam_error=0.
            for position,normal in zip(positions,normals):
                if position in known:
                    duplicates+=1;seam_error=max(seam_error,math.dist(normal,known[position]))
                else: known[position]=normal
            assert seam_error<1e-6, 'Exported UV seam breaks shading normals'
            report[node['name']]['exported_uv_duplicates']=duplicates
            report[node['name']]['exported_seam_normal_error']=seam_error
            print('EXPORTED_SEAMS_OK',node['name'],duplicates,seam_error,flush=True)
report['_export']={'size_bytes':len(glb),'meshes':len(gltf['meshes']),'numeric_millimetre_scale':True}
with open(os.path.join(options.render_dir,'geometry-report.json'),'w') as f: json.dump(report,f,indent=2)
print('GEOMETRY_AUDIT_PASSED',os.path.join(options.render_dir,'geometry-report.json'),flush=True)
if options.skip_render: sys.exit(0)

def material(name,color,metallic=0,roughness=.15):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=roughness
    return m

gold=material('Warm polished 18K gold',(.83,.60,.265),1,.14)
for o in bpy.context.scene.objects:o.hide_render=True

def studio_ring(source,name,ri,thickness,width,location,rotation):
    src=bpy.data.objects[source]
    band=src.copy();band.data=src.data.copy();band.name=name
    bpy.context.collection.objects.link(band);band.hide_render=False
    original_normals={}
    for loop,n in zip(src.data.loops,src.data.corner_normals): original_normals.setdefault(loop.vertex_index,n.vector.copy())
    transformed=[]
    for v in band.data.vertices:
        r=math.hypot(v.co.x,v.co.y);u,vv=v.co.x/r,v.co.y/r
        nr=ri+(r-9)*thickness/1.7
        n=original_normals[v.index];radial=n.x*u+n.y*vv;tangent=-n.x*vv+n.y*u
        transformed.append(Vector((u*radial/(thickness/1.7)-vv*tangent/(nr/r),
                                    vv*radial/(thickness/1.7)+u*tangent/(nr/r),n.z/(width/4.5))).normalized())
        v.co.x=u*nr;v.co.y=vv*nr;v.co.z*=width/4.5
    band.data.normals_split_custom_set_from_vertices(transformed)
    band.data.materials.append(gold);band.location=location;band.rotation_euler=rotation
    bpy.context.view_layer.update()
    bottom=min((band.matrix_world@v.co).z for v in band.data.vertices)
    band.location.z-=bottom
    return band

studio_ring('Wedding_flach','Polished wedding band 5.5 mm',9.3,1.8,5.5,(-6.2,1.1,0),
            (math.radians(75),math.radians(-13),math.radians(-7)))
studio_ring('Wedding_bombiert','Polished wedding band 4.5 mm',8.55,1.6,4.5,(7.0,-1.1,0),
            (math.radians(72),math.radians(11),math.radians(13)))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.cycles.max_bounces=10;scene.cycles.glossy_bounces=8
scene.world.use_nodes=True
background=scene.world.node_tree.nodes.get('Background');background.inputs['Color'].default_value=(.52,.49,.43,1);background.inputs['Strength'].default_value=.32
for name,pos,size,power,ratio in [('Large left softbox',(-25,-22,35),25,21000,1.65),
                                  ('Tall right strip',(31,-4,21),9,11000,3.2),
                                  ('Overhead silk',(0,13,46),32,23000,1.0),
                                  ('Front reflection',(0,-35,15),18,4500,1.7)]:
    light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='RECTANGLE';light.size=size;light.size_y=size*ratio
    o=bpy.data.objects.new(name,light);scene.collection.objects.link(o);o.location=pos
    o.rotation_euler=(Vector((0,0,10))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.045))
bpy.context.object.data.materials.append(material('Warm ivory studio',(.68,.655,.615),0,.42))
bpy.ops.object.camera_add(location=(35,-66,41));camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,10))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=44;scene.camera=camera
scene.view_settings.view_transform='AgX'
scene.render.resolution_x=1000;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(options.render_dir,'wedding-ring-inspection.png')
bpy.ops.render.render(write_still=True)
print('WEDDING_RENDER_READY',scene.render.filepath)
