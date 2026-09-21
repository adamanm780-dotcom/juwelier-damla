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

# Profile geometry is constructed directly; no bevel modifier may clamp or distort it.
# The section is sampled by surface region and revolved with exact analytical normals.
PROFILE_REPORT = {}
RING_SEGMENTS = 320

def wedding(name):
    ri, T, W = 9., 1.7, 4.5
    h = W / 2
    settings = {
        'flach':    dict(comfort=.12, outer_edge=.19, outer_round=.22),
        'bombiert': dict(comfort=.14, outer_edge=.33, outer_round=.32),
        'oval':     dict(comfort=.30, outer_edge=.43, outer_round=.43),
        'konkav':   dict(comfort=.12, outer_edge=.29, outer_round=.28),
        'kantig':   dict(comfort=.12, outer_edge=.12, outer_round=.28),
    }[name]
    ai, bi = h-.19, .18
    ao, bo = h-settings['outer_edge'], settings['outer_round']
    ci = settings['comfort']
    # Half section: bore centre -> comfort fit -> flank -> outer crown centre.
    # Each tuple is (radius, axial position, radial tangent, axial tangent, region).
    half = [(ri, 0., 0., 1., 'inner')]
    def point(r, z, dr, dz, region):
        half.append((r,z,dr,dz,region))
    def bezier(p0, p1, p2, p3, region, count=10):
        for i in range(1,count+1):
            t=i/count; u=1-t
            r=u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0]
            z=u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]
            dr=3*u*u*(p1[0]-p0[0])+6*u*t*(p2[0]-p1[0])+3*t*t*(p3[0]-p2[0])
            dz=3*u*u*(p1[1]-p0[1])+6*u*t*(p2[1]-p1[1])+3*t*t*(p3[1]-p2[1])
            point(r,z,dr,dz,region)
    for i in range(1,13):
        z=ai*i/12
        point(ri+ci*(z/ai)**2,z,2*ci*z/(ai*ai),1.,'inner')
    k=.5522847498307936
    slope=2*ci/ai
    bezier((ri+ci,ai),(ri+ci+k*.19*slope,ai+k*.19),
           (ri+ci+bi-k*bi,h),(ri+ci+bi,h),'inner_edge')

    def outer(z):
        t=z/ao
        if name=='flach': return ri+T-.016*t**4, -.064*t**3/ao
        if name=='bombiert': return ri+T-.40*t*t, -.80*t/ao
        if name=='oval': return ri+T-.54*t*t-.035*t**4, (-1.08*t-.14*t**3)/ao
        if name=='konkav': return ri+T-.32*(1-t*t)**2, 1.28*t*(1-t*t)/ao
        # The bevelled profile has a true planar chamfer and a tiny rounded join.
        bend_z, bend_r = 1.53, .09
        z_end=bend_z+bend_r*math.sin(math.pi/4)
        r_end=ri+T-bend_r+bend_r*math.cos(math.pi/4)
        return r_end-(z-z_end), -1.

    ro, slope=outer(ao)
    point(ro-bo,h,1.,0.,'flank')
    bezier((ro-bo,h),(ro-bo+k*bo,h),(ro+k*(h-ao)*slope,ao+k*(h-ao)),
           (ro,ao),'outer_edge')
    if name=='kantig':
        bend_z,bend_r=1.53,.09
        z_end=bend_z+bend_r*math.sin(math.pi/4)
        for i in range(1,7):
            z=ao+(z_end-ao)*i/6
            r,slope=outer(z)
            point(r,z,-slope,-1.,'chamfer')
        for i in range(1,9):
            a=math.pi/4*(1-i/8)
            point(ri+T-bend_r+bend_r*math.cos(a),bend_z+bend_r*math.sin(a),
                  math.sin(a),-math.cos(a),'outer_edge')
        for i in range(1,13):
            point(ri+T,bend_z*(1-i/12),0.,-1.,'outer')
    else:
        for i in range(1,17):
            z=ao*(1-i/16)
            r,slope=outer(z)
            point(r,z,-slope,-1.,'outer')
    pts=half+[(r,-z,-dr,dz,region) for r,z,dr,dz,region in reversed(half[1:-1])]
    count=len(pts)
    # V follows distance around the entire section, so flank UVs have real area.
    lengths=[math.hypot(pts[(i+1)%count][0]-p[0],pts[(i+1)%count][1]-p[1]) for i,p in enumerate(pts)]
    perimeter=sum(lengths)
    cumulative=[0.]
    for distance in lengths: cumulative.append(cumulative[-1]+distance)
    vs=[d/perimeter for d in cumulative]
    verts,faces,normals=[],[],[]
    for j in range(RING_SEGMENTS):
        a=j*2*math.pi/RING_SEGMENTS; ca,sa=math.cos(a),math.sin(a)
        for r,z,dr,dz,region in pts:
            scale=math.hypot(dr,dz)
            verts.append((r*ca,r*sa,z))
            normals.append((-dz/scale*ca,-dz/scale*sa,dr/scale))
    for j in range(RING_SEGMENTS):
        for i in range(count):
            # Outward winding; smooth normals are the exact revolved section normals.
            faces.append((j*count+i,j*count+(i+1)%count,
                          ((j+1)%RING_SEGMENTS)*count+(i+1)%count,
                          ((j+1)%RING_SEGMENTS)*count+i))
    obj=mesh('Wedding_'+name,verts,faces,True)
    obj.data.normals_split_custom_set_from_vertices(normals)
    uv=obj.data.uv_layers.new(name='JewelryUV')
    for j in range(RING_SEGMENTS):
        for i in range(count):
            poly=obj.data.polygons[j*count+i]
            # BMesh may rotate a polygon's first corner, so assign by vertex index.
            for loop in poly.loop_indices:
                index=obj.data.loops[loop].vertex_index
                jj,ii=divmod(index,count)
                u=1. if j==RING_SEGMENTS-1 and jj==0 else jj/RING_SEGMENTS
                v=1. if i==count-1 and ii==0 else vs[ii]
                uv.data[loop].uv=(u,v)
    # These fields travel in glTF extras and make browser scaling explicit.
    outer_indices=[i for i,p in enumerate(pts) if p[4]=='outer']
    spec={
        'inner_radius_mm':ri,'thickness_mm':T,'width_mm':W,
        'profile_perimeter_mm':round(perimeter,8),
        'outer_v_min':round(min(vs[i] for i in outer_indices),8),
        'outer_v_max':round(max(vs[i] for i in outer_indices),8),
        'radial_segments':RING_SEGMENTS,'profile_samples':count,
        'max_circumference_chord_error_mm':round((ri+T)*(1-math.cos(math.pi/RING_SEGMENTS)),8),
        'normal_method':'analytical revolution with continuous section tangents',
        'uv_method':'circumference U / closed section arc-length V',
        'profile_method':'comfort fit and tangent-matched rounded edges; no bevel modifier',
    }
    for key,value in spec.items(): obj[key]=value
    PROFILE_REPORT[obj.name]=spec
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

bpy.context.scene.unit_settings.system='METRIC'
bpy.context.scene.unit_settings.scale_length=.001
bpy.context.scene.unit_settings.length_unit='MILLIMETERS'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'tools','damla-jewelry.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'jewelry.glb'),export_format='GLB',
    export_animations=False,export_yup=True,export_apply=True,export_materials='NONE',export_extras=True)
report={o.name:{'vertices':len(o.data.vertices),'faces':len(o.data.polygons)} for o in bpy.context.scene.objects if o.type=='MESH'}
with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump({'generator':bpy.app.version_string,'units':'millimetres','reference_dimensions':{'inner_radius_mm':9.,'thickness_mm':1.7,'width_mm':4.5},'profiles':PROFILE_REPORT,'meshes':report},f,indent=2)
print('DAMLA_MODELS_READY',json.dumps(report))
