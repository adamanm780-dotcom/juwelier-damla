"""Blender 5.1 source for Damla's reusable, millimetre-scale jewelry meshes.
Run: blender --background --python tools/build-jewelry.py
The GLB library is deformed parametrically in the browser; the .blend is editable.
"""
import bpy, math, os, json
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'models')
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mesh(name, verts, faces, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    # Ensure consistent exterior winding and preserve deliberately flat gem facets.
    import bmesh
    bm = bmesh.new(); bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data); bm.free()
    for p in data.polygons: p.use_smooth = smooth
    return obj

def wedding(name):
    # Closed cross-section with continuously rounded inner AND outer edges.
    ri, T, W, bevel = 9., 1.7, 4.5, .16
    def outer(t):
        if name == 'bombiert': return T * (1 - .30*t*t)
        if name == 'oval': return T * (1 - .40*t*t)
        if name == 'konkav': return T * (1 - .26*(1-t*t))
        if name == 'kantig': return T*(1-.34*max(0,(abs(t)-.72)/.28))
        return T*(1-.04*abs(t)**8)
    def inner(t): return (.20*T*t*t if name == 'oval' else .07*T*t*t)
    # Sample a closed profile then bevel in Blender for jewelry-quality edge normals.
    n = 40
    pts = [(ri+inner(-1+2*i/n), W/2*(-1+2*i/n)) for i in range(n+1)]
    pts += [(ri+outer(1-2*i/n), W/2*(1-2*i/n)) for i in range(n+1)]
    verts, faces = [], []
    seg = 256
    for j in range(seg):
        a = j*2*math.pi/seg
        verts.extend((r*math.cos(a),r*math.sin(a),z) for r,z in pts)
    p = len(pts)
    for j in range(seg):
        for i in range(p):
            faces.append((j*p+i, ((j+1)%seg)*p+i, ((j+1)%seg)*p+(i+1)%p, j*p+(i+1)%p))
    obj = mesh('Wedding_'+name, verts, faces, True)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new('Soft polished edges', 'BEVEL')
    mod.width=bevel; mod.segments=5; mod.limit_method='ANGLE'; mod.angle_limit=.35
    bpy.ops.object.modifier_apply(modifier=mod.name)
    import bmesh
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.00001)
    bmesh.ops.dissolve_degenerate(bm,edges=bm.edges,dist=.00001)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bm.to_mesh(obj.data);bm.free();obj.data.update()
    # Cylindrical UVs: u runs around the ring, v across its width.
    uv = obj.data.uv_layers.new(name='JewelryUV')
    for poly in obj.data.polygons:
        angles = [math.atan2(obj.data.vertices[obj.data.loops[l].vertex_index].co.y,
                             obj.data.vertices[obj.data.loops[l].vertex_index].co.x)/(2*math.pi)%1 for l in poly.loop_indices]
        seam = max(angles)-min(angles)>.5
        for l,u in zip(poly.loop_indices, angles):
            co=obj.data.vertices[obj.data.loops[l].vertex_index].co
            uv.data[l].uv=(u+1 if seam and u<.5 else u, co.z/W+.5)
    return obj

def brilliant(name='Diamond_round', oval=1.):
    # 57 primary facets: table, 8 stars, 8 bezels, 16 upper girdles,
    # 8 pavilion mains and 16 lower girdles. Thin 16-sided girdle is additional.
    v=[]
    def ring(n,r,z,phase=0):
        start=len(v)
        v.extend((r*math.cos(2*math.pi*i/n+phase),r*math.sin(2*math.pi*i/n+phase)*oval,z) for i in range(n))
        return [start+i for i in range(n)]
    t=ring(8,.56,.32); s=ring(8,(1-.175*.44/.32)/math.cos(math.pi/8),.175,math.pi/8)
    g=ring(16,1.,0); b=ring(16,1.,-.035)
    p=ring(8,.60,-.87+.835*.60*math.cos(math.pi/8),math.pi/8)
    cu=len(v);v.append((0,0,-.87))
    f=[tuple(t)]
    for i in range(8):
        j=(i+1)%8;k=2*i
        f.extend([(t[i],t[j],s[i]),(t[i],s[i],g[k],s[(i-1)%8]),
                  (s[i],g[k],g[(k+1)%16]),(s[i],g[(k+1)%16],g[(k+2)%16]),
                  (cu,p[(i-1)%8],b[k],p[i]),
                  (p[i],b[k],b[(k+1)%16]),(p[i],b[(k+1)%16],b[(k+2)%16])])
    f.extend((g[i],b[i],b[(i+1)%16],g[(i+1)%16]) for i in range(16))
    return mesh(name,v,f)

def emerald():
    outline=[(-.64,-1),(.64,-1),(1,-.64),(1,.64),(.64,1),(-.64,1),(-1,.64),(-1,-.64)]
    verts=[]
    for scale,z in [(.57,.28),(.78,.16),(1,0),(1,-.035),(.78,-.24),(.48,-.50),(.10,-.69)]:
        verts.extend((x*scale,y*scale*1.35,z) for x,y in outline)
    faces=[tuple(range(8))]
    for j in range(6):
        for i in range(8): faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
    faces.append(tuple(range(48,56)))
    return mesh('Diamond_emerald',verts,faces)

def curve(name, coords, radius, cyclic=False):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=12
    data.bevel_depth=radius;data.bevel_resolution=5
    data.use_fill_caps=True
    sp=data.splines.new('BEZIER');sp.bezier_points.add(len(coords)-1)
    for pt,co in zip(sp.bezier_points,coords):
        pt.co=co;pt.handle_left_type=pt.handle_right_type='AUTO'
    sp.use_cyclic_u=cyclic
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.convert(target='MESH');obj.select_set(False)
    return bpy.context.view_layer.objects.active

for name in ['flach','bombiert','oval','konkav','kantig']: wedding(name)
brilliant();brilliant('Diamond_oval',1.38);emerald()

# A complete gallery basket in reference units: girdle radius 1, at z=0.
# Separate metal and stones allow changing alloy without tinting the diamond.
for count in [4,6]:
    parts=[]
    for i in range(count):
        a=2*math.pi*i/count+math.pi/4
        def point(r,z):return (r*math.cos(a),r*math.sin(a),z)
        parts.append(curve('Prong', [point(.40,-.90),point(.79,-.48),point(1.025,-.05),point(1.01,.065),point(.945,.09)], .065))
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.066,location=point(.945,.09))
        tip=bpy.context.object
        for face in tip.data.polygons:face.use_smooth=True
        parts.append(tip)
    parts.append(curve('Gallery',[(.81*math.cos(i*math.pi/8),.81*math.sin(i*math.pi/8),-.42) for i in range(16)],.052,True))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
    parts[0].name='Basket_'+str(count)
    import bmesh
    bm=bmesh.new();bm.from_mesh(parts[0].data)
    bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.00001)
    bmesh.ops.dissolve_degenerate(bm,edges=bm.edges,dist=.00001)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bm.to_mesh(parts[0].data);bm.free()
    bpy.ops.object.select_all(action='DESELECT')

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'tools','damla-jewelry.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'jewelry.glb'),export_format='GLB',
    export_animations=False,export_yup=True,export_apply=True,export_materials='NONE')
report={o.name:{'vertices':len(o.data.vertices),'faces':len(o.data.polygons)} for o in bpy.context.scene.objects if o.type=='MESH'}
with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump({'generator':bpy.app.version_string,'units':'millimetres','meshes':report},f,indent=2)
print('DAMLA_MODELS_READY',json.dumps(report))
