"""Original Damla high-quality basket library, Blender Z-up -> glTF Y-up.
Run Blender --background --python-exit-code 1 --python build-wedding-settings.py.
No reference assets; authoring based on our original diamond library.
"""
import bpy,bmesh,math,json,os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT.parent/'assets'/'models'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for name in ['jewelry.glb','wedding-gems.glb']:
 bpy.ops.import_scene.gltf(filepath=str(SOURCE/name))
source={}
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and o.name.startswith('Diamond_'):
  coords=[o.matrix_world@v.co for v in o.data.vertices]
  planes=[]
  for face in o.data.polygons:
   a,b,c=[coords[i] for i in face.vertices[:3]];n=(b-a).cross(c-a)
   if n.length<1e-9:continue
   n.normalize();d=n.dot(a)
   if n.dot(sum((coords[i] for i in face.vertices),Vector())/len(face.vertices)-Vector((0,0,-.20)))<0:n=-n;d=-d
   planes.append((n,d))
  source[o.name]={'coordinates':coords,'planes':planes}
for o in list(bpy.context.scene.objects):bpy.data.objects.remove(o,do_unlink=True)

def radial(name,angle,z=0):
 direction=Vector((math.cos(angle),math.sin(angle),0));best=100.
 for n,d in source[name]['planes']:
  den=n.dot(direction)
  if den>1e-8:best=min(best,(d-n.z*z)/den)
 return best

def mesh(name,verts,faces):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
 for p in data.polygons:p.use_smooth=True
 return obj

def catmull(values,t):
 n=len(values);x=t*(n-1);i=min(n-2,int(x));f=x-i
 a,b,c,d=[values[max(0,min(n-1,j))] for j in [i-1,i,i+1,i+2]]
 return [(2*b[k]+(-a[k]+c[k])*f+(2*a[k]-5*b[k]+4*c[k]-d[k])*f*f+(-a[k]+3*b[k]-3*c[k]+d[k])*f*f*f)*.5 for k in range(len(b))]

def prong(gem,angle):
 rg=radial(gem,angle,0);rc=radial(gem,angle,.105)
 # Tapered forged shoulder and a short inward folded claw. The point stays below
 # the table and just touches the actual cut-specific crown at its outside edge.
 controls=[(rg*.39,-.945,0,0),(rg*.47,-.875,.117,.094),(rg*.66,-.65,.104,.085),(rg*.85,-.37,.094,.087),(rg+.030,-.085,.099,.096),(rg+.016,.025,.096,.092),(rg*.968,.108,.085,.067),(rc+.032,.132,.060,.040),(rc-.015,.106,0,0)]
 steps=80;sides=20;verts=[];faces=[];tangent=Vector((-math.sin(angle),math.cos(angle),0));er=Vector((math.cos(angle),math.sin(angle),0))
 def at(t):return catmull(controls,max(0,min(1,t)))
 for j in range(1,steps):
  t=j/steps;r,z,w,h=at(t);r0,z0,*_=at(t-.0001);r1,z1,*_=at(t+.0001);direction=(er*(r1-r0)+Vector((0,0,z1-z0))).normalized();normal=tangent.cross(direction).normalized();center=er*r+Vector((0,0,z))
  for i in range(sides):
   a=math.tau*i/sides;p=center+tangent*(max(.0003,w)*math.cos(a))+normal*(max(.0003,h)*math.sin(a));verts.append(tuple(p))
 for j in range(steps-2):
  for i in range(sides):a=j*sides+i;b=j*sides+(i+1)%sides;c=(j+1)*sides+(i+1)%sides;d=(j+1)*sides+i;faces.append((a,b,c,d))
 first=len(verts);r,z,*_=controls[0];verts.append(tuple(er*r+Vector((0,0,z))))
 last=len(verts);r,z,*_=controls[-1];verts.append(tuple(er*r+Vector((0,0,z))))
 for i in range(sides):faces.append((first,(i+1)%sides,i));a=(steps-2)*sides+i;b=(steps-2)*sides+(i+1)%sides;faces.append((last,a,b))
 return mesh('Tapered claw',verts,faces),{'angle':angle,'girdle_radius':rg,'crown_contact_radius':rc,'tip_radius':rc-.015,'tip_height':.106}

def outline(kind,a):
 c,s=math.cos(a),math.sin(a)
 if kind=='oval':return Vector((c,s*1.38,0))
 if kind in ['round4','round6']:return Vector((c,s,0))
 exponent={'princess':9.,'cushion':3.5,'radiant':6.0}[kind]
 if kind=='radiant':
  r=min(1/max(abs(c),1e-9),1/max(abs(s),1e-9),1.66/(abs(c)+abs(s)));return Vector((c*r,s*r,0))
 return Vector((math.copysign(abs(c)**(2/exponent),c),math.copysign(abs(s)**(2/exponent),s),0))

def gallery(kind,scale,z,w,h):
 count=160;sides=16;verts=[];faces=[]
 # Smooth oval/rounded-rectangle gallery, with a flattened rounded cross section.
 for j in range(count):
  a=math.tau*j/count;center=outline(kind,a)*scale;center.z=z
  derivative=outline(kind,a+.0001)-outline(kind,a-.0001);normal=Vector((derivative.y,-derivative.x,0)).normalized()
  for i in range(sides):t=math.tau*i/sides;point=center+normal*(w*math.cos(t))+Vector((0,0,h*math.sin(t)));verts.append(tuple(point))
 for j in range(count):
  for i in range(sides):faces.append((j*sides+i,j*sides+(i+1)%sides,((j+1)%count)*sides+(i+1)%sides,((j+1)%count)*sides+i))
 return mesh('Open gallery rail',verts,faces)

reports={};objects=[]
for kind,count in [('round4',4),('round6',6),('princess',4),('cushion',4),('radiant',4),('oval',4)]:
 gem='Diamond_'+('round' if kind.startswith('round') else kind)
 parts=[];contacts=[]
 for i in range(count):
  a=math.tau*i/count+(math.pi/4 if count==4 else math.pi/6)
  body,contact=prong(gem,a);parts.append(body);contacts.append(contact)
 parts.append(gallery(kind,.805,-.345,.073,.054))
 parts.append(gallery(kind,.465,-.872,.087,.060))
 bpy.ops.object.select_all(action='DESELECT')
 for p in parts:p.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();obj=parts[0];obj.name='Basket_'+kind
 bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bad=sum(not e.is_manifold for e in bm.edges);zero=sum(f.calc_area()<1e-10 for f in bm.faces);volume=bm.calc_volume(signed=True)
 assert bad==0 and zero==0 and volume>0,(kind,bad,zero,volume)
 bm.to_mesh(obj.data);bm.free();obj.data.update()
 for p in obj.data.polygons:p.use_smooth=True
 xyz=[v.co for v in obj.data.vertices];maxz=max(v.z for v in xyz);minz=min(v.z for v in xyz)
 assert maxz<.235 and minz>-.985,(kind,minz,maxz)
 obj['canonical_half_width']=1.;obj['canonical_half_height']=1.38 if kind=='oval' else 1.;obj['girdle_height']=0.;obj['mounting_base']=minz;obj['claw_top']=maxz;obj['source']='Original tapered-claw / open-gallery authoring';obj['compatible_cut']=gem
 reports[kind]={'node':obj.name,'compatible_cut':gem,'vertices':len(obj.data.vertices),'faces':len(obj.data.polygons),'boundary_or_nonmanifold_edges':bad,'zero_area_faces':zero,'positive_volume':volume,'claw_z_max':maxz,'base_z_min':minz,'contacts':contacts,'table_height':max(v.z for v in source[gem]['coordinates']),'parts':'Individually closed claws and embedded gallery rails; intentional internal overlap at joints'}
 objects.append(obj);obj.select_set(False)
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=.001
bpy.ops.export_scene.gltf(filepath=str(SOURCE/'wedding-settings.glb'),export_format='GLB',use_selection=True,export_normals=True,export_texcoords=False,export_materials='NONE',export_yup=True,export_extras=True)
(SOURCE/'wedding-settings-manifest.json').write_text(json.dumps({'blender':bpy.app.version_string,'contract':'Blender Z -> browser Y; girdle0; half width1; oval half-height1.38; scale X/Z to gem dimensions, Y to half-width; top lift .94-.98 times half-width','models':reports},indent=2),encoding='utf-8')
# Keep library at common origin; presentation arrangement can be added non-destructively.
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'wedding-settings.blend'))
print('SETTINGS_DONE',json.dumps({k:{'vertices':v['vertices'],'faces':v['faces'],'maxZ':v['claw_z_max']} for k,v in reports.items()}),flush=True)
