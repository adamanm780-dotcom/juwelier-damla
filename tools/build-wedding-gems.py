"""Original faceted Princess, Cushion and Radiant diamond geometry for Damla.
Run with Blender 5.1: blender --background --python build-gems.py
Canonical girdle half-width/height = 1. Crown is +Z; exported GLB uses +Y up.
All surfaces are planar, convex optical facets, compatible with a <=96-plane ray tracer.
The construction uses cut-specific crown stars, lower-girdle facets and pavilion mains.
"""
import bpy,bmesh,math,os,json
from mathutils import Vector
SOURCE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.join(os.path.dirname(SOURCE),"assets","models")
os.makedirs(ROOT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def square_point(angle):
 c,s=math.cos(angle),math.sin(angle);r=1/max(abs(c),abs(s))
 return c*r,s*r

def cushion_point(angle):
 c,s=math.cos(angle),math.sin(angle);power=2/3.5
 return math.copysign(abs(c)**power,c),math.copysign(abs(s)**power,s)

def radiant_point(angle):
 c,s=math.cos(angle),math.sin(angle)
 r=min(1/max(abs(c),1e-12),1/max(abs(s),1e-12),1.66/(abs(c)+abs(s)))
 return c*r,s*r

def outline(fn,count,phase=0):return [fn(phase+2*math.pi*i/count) for i in range(count)]

def build(name,girdle,crown,table,pavilion):
 verts=[]
 for shape,scale,z in [(girdle,1.,0.),(girdle,1.,-.035),(crown,.82,.16),(table,.57,.30),(pavilion,.59,-.43)]:
  verts.extend((x*scale,y*scale,z) for x,y in shape)
 if name=='Diamond_princess':
  # Additional crown stars and lower pavilion chevrons are characteristic of a square brilliant cut.
  verts.extend((x*.68,y*.68,.245) for x,y in [(-1,-1),(1,-1),(1,1),(-1,1)])
  verts.extend((x*.25,y*.25,-.68) for x,y in [(-1,-1),(1,-1),(1,1),(-1,1)])
 verts.append((0,0,-.85))
 bm=bmesh.new()
 for co in verts:bm.verts.new(co)
 result=bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
 unused=[v for v in bm.verts if not v.link_faces]
 if unused:bmesh.ops.delete(bm,geom=unused,context='VERTS')
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-8)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 bmesh.ops.dissolve_limit(bm,angle_limit=1e-3,use_dissolve_boundaries=False,verts=list(bm.verts),edges=list(bm.edges))
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 assert all(e.is_manifold and e.is_contiguous for e in bm.edges),name+' non-manifold'
 assert len(bm.verts)-len(bm.edges)+len(bm.faces)==2,name+' not a closed genus-zero solid'
 assert bm.calc_volume()>0,name+' invalid volume'
 planes=[]
 for face in bm.faces:
  assert face.calc_area()>1e-8,name+' degenerate facet'
  center=face.calc_center_median();normal=face.normal;offset=normal.dot(center)
  assert max(abs(normal.dot(v.co)-offset) for v in face.verts)<1e-6,name+' nonplanar facet'
  assert max(normal.dot(v.co)-offset for v in bm.verts)<1e-6,name+' nonconvex optical solid'
  plane=(*normal,offset)
  if not any(max(abs(a-b) for a,b in zip(plane,q))<1e-5 for q in planes):planes.append(plane)
 assert 40<=len(planes)<=96,(name,len(planes))
 data=bpy.data.meshes.new(name);bm.to_mesh(data);bm.free();data.update()
 for face in data.polygons:face.use_smooth=False
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
 obj['girdle_half_width']=1.;obj['girdle_half_height']=1.;obj['crown_height']=.30;obj['pavilion_depth']=.85
 obj['optical_plane_count']=len(planes);obj['construction']='Original cut-specific convex faceted gemstone; flat optical normals'
 coords=[v.co for v in data.vertices]
 report={'vertices':len(data.vertices),'facets':len(data.polygons),'optical_planes':len(planes),'triangles':sum(len(p.vertices)-2 for p in data.polygons),
         'width':max(v.x for v in coords)-min(v.x for v in coords),'height':max(v.y for v in coords)-min(v.y for v in coords),
         'crown_height':max(v.z for v in coords),'pavilion_depth':-min(v.z for v in coords),'manifold':True,'convex':True,'flat_facets':True,
         'girdle_vertices':len(girdle),'index_of_refraction':2.417}
 print('GEM_READY',name,json.dumps(report),flush=True)
 return obj,report

square=[(-1,-1),(1,-1),(1,1),(-1,1)]
clipped=[(-.66,-1),(.66,-1),(1,-.66),(1,.66),(.66,1),(-.66,1),(-1,.66),(-1,-.66)]
models=[
 ('Diamond_princess',square,outline(square_point,8,math.pi/8),square,outline(square_point,8,math.pi/8)),
 ('Diamond_cushion',outline(cushion_point,16),outline(cushion_point,8,math.pi/8),outline(cushion_point,8),outline(cushion_point,8,math.pi/8)),
 ('Diamond_radiant',clipped,outline(radiant_point,8),clipped,outline(radiant_point,16,math.pi/16)),
]
reports={}
material=bpy.data.materials.new('Diamond optical glass');material.use_nodes=True
nodes=material.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');glass=nodes.new('ShaderNodeBsdfGlass')
glass.inputs['Color'].default_value=(1,1,1,1);glass.inputs['Roughness'].default_value=0.;glass.inputs['IOR'].default_value=2.417
material.node_tree.links.new(glass.outputs['BSDF'],out.inputs['Surface'])
for spec in models:
 obj,report=build(*spec);obj.data.materials.append(material);reports[obj.name]=report
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'wedding-gems.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'wedding-gems.glb'),export_format='GLB',export_animations=False,export_yup=True,export_apply=True,export_materials='NONE',export_extras=True)
with open(os.path.join(ROOT,'wedding-gems-manifest.json'),'w') as f:json.dump({'generator':bpy.app.version_string,'units':'normalized girdle half-width = 1','meshes':reports},f,indent=2)
print('CUSTOM_DIAMONDS_COMPLETE',flush=True)
