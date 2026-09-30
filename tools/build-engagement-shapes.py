"""Stones for the engagement-ring configurator that the base libraries do not have.
Run: blender --background --python-exit-code 1 --python tools/build-engagement-shapes.py
Contract as wedding-gems: Blender Z-up -> glTF Y-up, girdle at z=0, half-width 1 along X, length along Blender Y
(browser -Z). Pear point and heart lobes lie on +Y, so they face away from the hero camera.
Centre stones: pear, marquise, heart, Asscher, elongated cushion, Old European (round Altschliff).
Side stones for the trilogy: tapered baguette and trapeze (step cuts, long axis along X, wide end on -X).
Every optical facet is planar and each solid stays under the tracer's 96 planes. The heart is concave at its cleft
and ships a convex companion 'Optics_heart' whose planes drive the browser ray tracer.
Baskets are generated in the browser (assets/engagement-basket.js) from each stone's `girdle` extra.
"""
import bpy,bmesh,math,os,json
from mathutils import Vector
TOOLS=os.path.dirname(os.path.abspath(__file__))
MODELS=os.environ.get('DAMLA_SHAPES_OUT') or os.path.join(os.path.dirname(TOOLS),'assets','models')
os.makedirs(MODELS,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

# ---------- Outlines: closed curves t -> (x, y) with half-width 1 --------------------------------------------
PEAR_LENGTH,MARQUISE_LENGTH=1.62,2.05
_PEAR_W=max(abs(math.sin(t)*math.sin(t/2)) for t in [i*math.tau/4096 for i in range(4096)])
def pear(t):
 # Teardrop: point at t=0 on +Y, round end on -Y, gently curved flanks.
 return (math.sin(t)*math.sin(t/2)/_PEAR_W,PEAR_LENGTH*math.cos(t))
_MARQUISE_R=(1+MARQUISE_LENGTH**2)/2
def marquise(t):
 # Classic navette: two circular arcs meeting in true points on the Y axis.
 y=MARQUISE_LENGTH*math.cos(t);return (math.copysign(math.sqrt(_MARQUISE_R**2-y*y)-(_MARQUISE_R-1),math.sin(t)),y)
ASSCHER=[(1,-.5),(1,.5),(.5,1),(-.5,1),(-1,.5),(-1,-.5),(-.5,-1),(.5,-1)]
ELONGATED_CUSHION=1.2
def cushion(t):
 # Same superellipse as the wedding library's cushion (build-wedding-gems.py), stretched to L/W 1.2.
 c,s=math.cos(t),math.sin(t);k=2/3.5;return (math.copysign(abs(c)**k,c),ELONGATED_CUSHION*math.copysign(abs(s)**k,s))
def circle(t):return (math.cos(t),math.sin(t))
TAPERED_BAGUETTE=[(-1,-.5),(1,-.3),(1,.3),(-1,.5)]
TRAPEZE=[(-1,-.82),(1,-.46),(1,.46),(-1,.82)]
def heart_points(arc=7):
 """Two overlapping lobes and straight flanks meeting in a 90 degree point on -Y; cleft on +Y.
 Returns the sparse facet outline, starting at the cleft and running over the right lobe."""
 c,R=.42,.58;shift=.33;cleft=math.atan2(math.sqrt(R*R-c*c),-c);tangent=-math.pi/4
 right=[(c+R*math.cos(cleft+(tangent-cleft)*k/arc),R*math.sin(cleft+(tangent-cleft)*k/arc)) for k in range(1,arc+1)]
 tip=(0.,-(c+R*math.sqrt(2)));mid=((right[-1][0]+tip[0])/2+.012,(right[-1][1]+tip[1])/2-.012)
 side=right+[mid];pts=[(0.,math.sqrt(R*R-c*c))]+side+[tip]+[(-x,y) for x,y in reversed(side)]
 return [(x,y+shift) for x,y in pts]
def heart_dense():
 return heart_points(96)

def sample(fn,count,phase=0):return [fn(phase+math.tau*i/count) for i in range(count)]
def polyline_fn(points):
 """Closed polyline parametrised by arc length over [0, 2pi)."""
 seg=[math.dist(points[i],points[(i+1)%len(points)]) for i in range(len(points))];total=sum(seg)
 def fn(t):
  d=(t%math.tau)/math.tau*total
  for i,l in enumerate(seg):
   if d<=l or i==len(seg)-1:
    f=d/l if l else 0;a,b=points[i],points[(i+1)%len(points)];return (a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f)
   d-=l
 return fn

# ---------- Gems --------------------------------------------------------------------------------------------
def planes_of(bm,name,convex=True):
 planes=[]
 for face in bm.faces:
  assert face.calc_area()>1e-8,name+' degenerate facet'
  center=face.calc_center_median();normal=face.normal;offset=normal.dot(center)
  assert max(abs(normal.dot(v.co)-offset) for v in face.verts)<1e-6,name+' nonplanar facet'
  if convex:assert max(normal.dot(v.co)-offset for v in bm.verts)<1e-6,name+' nonconvex optical solid'
  plane=(*normal,offset)
  if not any(max(abs(a-b) for a,b in zip(plane,q))<1e-5 for q in planes):planes.append(plane)
 return planes

def finish(name,bm,planes,kind):
 data=bpy.data.meshes.new(name);bm.to_mesh(data);bm.free();data.update()
 for face in data.polygons:face.use_smooth=False
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
 coords=[v.co for v in data.vertices]
 obj['girdle_half_width']=1.;obj['crown_height']=.30;obj['pavilion_depth']=.85;obj['optical_plane_count']=len(planes);obj['construction']=kind
 report={'vertices':len(coords),'facets':len(data.polygons),'optical_planes':len(planes),'width':max(v.x for v in coords)-min(v.x for v in coords),'length':max(v.y for v in coords)-min(v.y for v in coords),'crown':max(v.z for v in coords),'pavilion':-min(v.z for v in coords)}
 print('GEM_READY',name,json.dumps(report),flush=True);return obj,report

def hull_gem(name,rings,culet=(0,0,-.85),kind='Convex brilliant-style facets from phased outline rings'):
 """Convex hull of outline rings (outline, scale, z); coplanar triangles are merged into single facets."""
 bm=bmesh.new()
 for shape,scale,z in rings:
  sx,sy=scale if isinstance(scale,tuple) else (scale,scale)
  for x,y in shape:bm.verts.new((x*sx,y*sy,z))
 for point in (culet if isinstance(culet[0],tuple) else [culet]):bm.verts.new(point)
 bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
 unused=[v for v in bm.verts if not v.link_faces]
 if unused:bmesh.ops.delete(bm,geom=unused,context='VERTS')
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-8)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 bmesh.ops.dissolve_limit(bm,angle_limit=1e-3,use_dissolve_boundaries=False,verts=list(bm.verts),edges=list(bm.edges))
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 assert all(e.is_manifold for e in bm.edges),name+' non-manifold'
 assert len(bm.verts)-len(bm.edges)+len(bm.faces)==2,name+' not a closed genus-zero solid'
 assert bm.calc_volume()>0,name+' invalid volume'
 planes=planes_of(bm,name)
 assert 30<=len(planes)<=96,(name,len(planes))
 return finish(name,bm,planes,kind)

def ring_gem(name,outline,profile,culet=(0,0,-.85)):
 """Explicit facets between scaled copies of one outline: table, crown bands, girdle, pavilion bands, culet.
 Parallel ring edges keep every quad planar, so concave outlines (heart) keep their shape."""
 bm=bmesh.new();rings=[[bm.verts.new((x*s,y*s,z)) for x,y in outline] for s,z in profile];n=len(outline)
 bm.faces.new(rings[0])
 for a,b in zip(rings,rings[1:]):
  for i in range(n):bm.faces.new((a[i],a[(i+1)%n],b[(i+1)%n],b[i]))
 tip=bm.verts.new(culet)
 for i in range(n):bm.faces.new((rings[-1][i],rings[-1][(i+1)%n],tip))
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 assert all(e.is_manifold for e in bm.edges),name+' non-manifold'
 assert len(bm.verts)-len(bm.edges)+len(bm.faces)==2,name+' not closed'
 assert bm.calc_volume()>0,name+' invalid volume'
 planes=planes_of(bm,name,convex=False)
 assert len(planes)<=96,(name,len(planes))
 return finish(name,bm,planes,'Concave facets between parallel outline rings; trace with the convex companion')

def ELONGATED(fn,length,girdle=16,crown=8,pavilion=8):
 # Brilliant-style rings for long stones. The pavilion rings step in by the same distance along the length as
 # across the width, and the culet is a short keel, so the pavilion stays about as steep at the points as at the
 # sides: this keeps the stone bright instead of showing a dark bow-tie through a shallow pavilion.
 inset=lambda d:(1-d,1-d/length)
 return [(sample(fn,girdle),1.,0.),(sample(fn,girdle),1.,-.035),(sample(fn,crown,math.pi/crown),.82,.16),(sample(fn,crown),.57,.30),
  (sample(fn,pavilion,math.pi/pavilion),inset(.41),-.43),(sample(fn,4,math.pi/4),inset(.72),-.70)],((0,-(length-1),-.85),(0,length-1,-.85))
reports={};objects={}
def keep(pair):obj,report=pair;objects[obj.name]=obj;reports[obj.name]=report;return obj
rings,keel=ELONGATED(pear,PEAR_LENGTH);keep(hull_gem('Diamond_pear',rings,keel))
rings,keel=ELONGATED(marquise,MARQUISE_LENGTH);keep(hull_gem('Diamond_marquise',rings,keel))
step=[(ASSCHER,1.,0.),(ASSCHER,1.,-.035),(ASSCHER,.92,.075),(ASSCHER,.8,.165),(ASSCHER,.68,.235),(ASSCHER,.56,.30),(ASSCHER,.84,-.25),(ASSCHER,.64,-.47),(ASSCHER,.42,-.66),(ASSCHER,.2,-.8)]
keep(hull_gem('Diamond_asscher',step,kind='Convex step cut: stepped crown and pavilion, cropped corners'))
rings,keel=ELONGATED(cushion,ELONGATED_CUSHION);keep(hull_gem('Diamond_elongatedCushion',rings,keel))
# Old European cut (Altschliff): high crown, small table, deep pavilion and an open culet (small flat facet).
keep(hull_gem('Diamond_oldEuropean',[(sample(circle,16),1.,0.),(sample(circle,16),1.,-.035),(sample(circle,8,math.pi/8),.8,.2),(sample(circle,8),.47,.33),
 (sample(circle,8,math.pi/8),.56,-.47),(sample(circle,4,math.pi/4),.08,-.9)],culet=(0,0,-.9),kind='Old European cut: high crown, small table, open culet'))
def step_side(name,outline):
 rings=[(outline,1.,0.),(outline,1.,-.035),(outline,.9,.1),(outline,.78,.2),(outline,.68,.26),(outline,.86,-.24),(outline,.66,-.46),(outline,.44,-.64),(outline,.2,-.78)]
 return keep(hull_gem(name,rings,culet=((-.05,0,-.82),(.05,0,-.82)),kind='Step-cut side stone with a short keel'))
step_side('Diamond_taperedBaguette',TAPERED_BAGUETTE)
step_side('Diamond_trapez',TRAPEZE)
HEART=heart_points()
keep(ring_gem('Diamond_heart',HEART,[(.57,.30),(.82,.16),(1.,0.),(1.,-.035),(.59,-.43)]))
# Convex companion for the tracer: the heart's own vertices, hulled.
bm=bmesh.new()
for v in objects['Diamond_heart'].data.vertices:bm.verts.new(v.co)
bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
unused=[v for v in bm.verts if not v.link_faces]
if unused:bmesh.ops.delete(bm,geom=unused,context='VERTS')
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.dissolve_limit(bm,angle_limit=1e-3,use_dissolve_boundaries=False,verts=list(bm.verts),edges=list(bm.edges));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
planes=planes_of(bm,'Optics_heart');assert len(planes)<=96,len(planes)
keep(finish('Optics_heart',bm,planes,'Convex hull of Diamond_heart: optical planes for the browser tracer'))

# Dense analytic girdles for the browser (bezel collar, halo rail): the facet girdle is only a 16-18-gon.
# Blender (x, y) becomes glTF (x, -z); the list is flat [x0, z0, x1, z1, ...].
def girdle_extra(points):return [round(c,5) for x,y in points for c in (x,-y)]
def dense_polygon(points,count=192):fn=polyline_fn(points);return [fn(math.tau*i/count) for i in range(count)]
objects['Diamond_pear']['girdle']=girdle_extra(sample(pear,192))
objects['Diamond_marquise']['girdle']=girdle_extra(sample(marquise,192))
objects['Diamond_heart']['girdle']=girdle_extra(heart_dense())
objects['Diamond_asscher']['girdle']=girdle_extra(dense_polygon(ASSCHER))
objects['Diamond_elongatedCushion']['girdle']=girdle_extra(sample(cushion,192))
objects['Diamond_oldEuropean']['girdle']=girdle_extra(sample(circle,192))
objects['Diamond_taperedBaguette']['girdle']=girdle_extra(dense_polygon(TAPERED_BAGUETTE))
objects['Diamond_trapez']['girdle']=girdle_extra(dense_polygon(TRAPEZE))
bpy.ops.object.select_all(action='DESELECT')
for o in objects.values():o.select_set(True)
bpy.context.view_layer.objects.active=next(iter(objects.values()))
bpy.ops.export_scene.gltf(filepath=os.path.join(MODELS,'engagement-shapes.glb'),export_format='GLB',use_selection=True,export_normals=True,export_texcoords=False,export_materials='NONE',export_yup=True,export_apply=True,export_extras=True)
with open(os.path.join(MODELS,'engagement-shapes-manifest.json'),'w') as f:json.dump({'generator':bpy.app.version_string,'contract':'girdle y=0, half-width 1 (x), length along -z in glTF; pear point and heart lobes on -z; side stones long along x, wide end on -x','meshes':reports},f,indent=2)
print('SHAPES_DONE',flush=True)
