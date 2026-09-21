"""Original Damla ring-profile construction, authored from public numerical shape facts.

Blender: blender --background --python build-profiles.py
Contours only: python build-profiles.py --contours-only

No reference SVG, mesh, image or shader is loaded. Circular crowns, comfort-fit
bores, tangent circular edge fillets and planar/sloped flanks are constructed
analytically, then revolved. Every export shares a browser-deformation contract:
inner radius 9 mm, radial envelope 1.7 mm, axial envelope 4.5 mm. PB08 is an
ellipse in this library; equal configured height/width restores its circle.
"""
from pathlib import Path
import json, math, sys

SOURCE = Path(__file__).resolve().parent
OUT = SOURCE.parent / "assets" / "models"
OUT.mkdir(parents=True, exist_ok=True)
RI, T, W, RADIAL_SEGMENTS = 9.0, 1.7, 4.5, 320
# Scalar observations at 4.5-mm width and 1.7-mm height, except PB09 (min 1.9)
# and PB08 (circle 4.5 x 4.5). Positive outer radius = dome; negative = concave.
PARAMETERS = {
 'PB01': dict(inner=5.3, outer=0., inner_edge=.65, outer_edge=.20, angle=0., height=1.7),
 'PB02': dict(inner=3.8, outer=22., inner_edge=.30, outer_edge=.10, angle=0., height=1.7),
 'PB03': dict(inner=7., outer=3.9, inner_edge=.30, outer_edge=.10, angle=0., height=1.7),
 'PB04': dict(inner=8.2, outer=8.2, inner_edge=.40, outer_edge=.40, angle=0., height=1.7),
 'PB05': dict(inner=3.6, outer=5.4, inner_edge=.40, outer_edge=.40, angle=0., height=1.7),
 'PB06': dict(inner=3.3, outer=8., inner_edge=.30, outer_edge=.10, angle=0., height=1.7),
 'PB07': dict(inner=4., outer=3.6, inner_edge=.30, outer_edge=.10, angle=0., height=1.7),
 'PB08': dict(inner=2.25, outer=2.25, inner_edge=0., outer_edge=0., angle=0., height=4.5),
 'PB09': dict(inner=4.8, outer=4.8, inner_edge=.012, outer_edge=.10, angle=-27., height=1.9),
 'PB10': dict(inner=10.875, outer=-13.125, inner_edge=.51, outer_edge=.51, angle=0., height=1.7),
 'PB11': dict(inner=5.8, outer=3.1, inner_edge=.20, outer_edge=.20, angle=0., height=1.7),
 'PB12': dict(inner=0., outer=0., inner_edge=.30, outer_edge=.30, angle=0., height=1.7),
 'PB13': dict(inner=8.591992607649, outer=0., inner_edge=.40, outer_edge=.10, angle=31.57484050702, height=1.7),
}
DESCRIPTIONS = {
 'PB01':'Flat outside, broad rounded comfort-fit inside',
 'PB02':'Nearly flat outside, strongly rounded inside',
 'PB03':'Domed outside, gently rounded inside',
 'PB04':'Symmetric gentle oval with generously rounded edges',
 'PB05':'Soft oval, inside more curved than outside',
 'PB06':'Mild outer dome, deep comfort-fit inside, fine outer edge',
 'PB07':'Strongly rounded lens, thin side flank',
 'PB08':'Round wire profile; nominal library mesh is an ellipse',
 'PB09':'Outward-flared sloping flank, rounded inside and outside',
 'PB10':'Concave outside, convex comfort-fit bore, softly rounded lips',
 'PB11':'Strong outer dome, mild inner dome, fine side edges',
 'PB12':'Flat inside and outside, rounded rectangular edges',
 'PB13':'Narrow outer face and broad bore, sloping flank, flat outside',
}

def circle_fillet(radius, edge, outer, height, slope, intercept):
    """Exact tangent circle to a horizontal/circular crown and oblique flank."""
    f=edge; length=math.hypot(1.,slope)
    if radius == 0:
        cy=(height-f) if outer else f
        cx=intercept+slope*cy-f*length
        curve_point=(cx,height if outer else 0.)
    else:
        rad=abs(radius)
        c0=(0., height-rad if outer and radius>0 else (height+rad if outer else rad))
        external=outer and radius<0
        distance=rad+f if external else rad-f
        # Intersect offset flank x - slope*y = intercept - f*|normal|
        d=intercept-f*length
        signed=(d+slope*c0[1])/(length*length)
        foot=(signed,c0[1]-slope*signed)
        disc=distance*distance-(signed*length)**2
        if disc<=0:raise ValueError('Fillet cannot fit circular crown')
        along=math.sqrt(disc)/length
        sign=1 if outer and radius>0 else -1
        cx,cy=foot[0]+sign*along*slope,foot[1]+sign*along
        curve_point=(rad/distance*cx,c0[1]+rad/distance*(cy-c0[1]))
    side=(cx+f/length,cy-f*slope/length)
    angle_curve=math.atan2(curve_point[1]-cy,curve_point[0]-cx)
    return {'center':(cx,cy),'curve':curve_point,'side':side,'a_curve':angle_curve,'a_side':math.atan2(-slope,1.),'radius':f}

def section(pid):
    pars=PARAMETERS[pid].copy()
    if pid=='PB08':
        pts=[]
        for i in range(112):
            a=-math.pi/2+2*math.pi*i/112
            x=W/2*math.cos(a); y=T/2+T/2*math.sin(a)
            dx=-W/2*math.sin(a); dy=T/2*math.cos(a)
            region='outer' if math.sin(a)>.15 else ('inner' if math.sin(a)<-.15 else 'edge')
            pts.append((RI+y,x,dy,dx,region))
        return pts, {'construction':'analytic ellipse, becomes circle when configured width equals height','micro_edge_mm':0}
    height=pars['height']; h=W/2; slope=-math.tan(math.radians(pars['angle']))
    intercept=h-slope*height if slope>0 else h
    fi,fo=pars['inner_edge'],pars['outer_edge']
    # Some manufacturer scalar edge dimensions overlap when treated as literal
    # circular fillet radii. Shrink both together until the original construction
    # has a positive tangent flank; this is an independent, explicit design choice.
    for attempt in range(30):
        try:
            inf=circle_fillet(pars['inner'],fi,False,height,slope,intercept)
            outf=circle_fillet(pars['outer'],fo,True,height,slope,intercept)
            if outf['side'][1]>inf['side'][1]+.001:break
        except ValueError:pass
        fi*=.94;fo*=.94
    else:raise ValueError('No valid tangent section '+pid)
    half=[(0.,0.,0.,1.,'inner')]
    # Stored construction points are (radial offset, axial x, dr, dx, region).
    def add(x,y,dx,dy,region):half.append((y,x,dy,dx,region))
    def curve_value(x,outer):
        rad=pars['outer'] if outer else pars['inner']
        if rad==0:return (height if outer else 0.),0.
        r=abs(rad);den=math.sqrt(max(1e-12,r*r-x*x));sag=r-den
        if outer and rad>0:return height-sag,-x/den
        return (height+sag if outer else sag),x/den
    xi=inf['curve'][0]
    for i in range(1,19):
        x=xi*i/18;y,dy=curve_value(x,False);add(x,y,1.,dy,'inner')
    def arc(fillet,a0,a1,region,count=12):
        cx,cy=fillet['center'];f=fillet['radius']
        while a1<a0:a1+=2*math.pi
        if a1-a0>math.pi:raise ValueError('Unexpected fillet angle '+pid)
        for i in range(1,count+1):
            a=a0+(a1-a0)*i/count
            add(cx+f*math.cos(a),cy+f*math.sin(a),-f*math.sin(a),f*math.cos(a),region)
    arc(inf,inf['a_curve'],inf['a_side'],'inner_edge')
    add(*outf['side'],slope,1.,'flank')
    arc(outf,outf['a_side'],outf['a_curve'],'outer_edge')
    xo=outf['curve'][0]
    for i in range(1,23):
        x=xo*(1-i/22);y,dy=curve_value(x,True);add(x,y,-1.,-dy,'outer')
    raw=half+[(r,-x,-dr,dx,region) for r,x,dr,dx,region in reversed(half[1:-1])]
    # Exact universal extents for the existing browser's Jacobian deformation.
    ymin=min(v[0] for v in raw);ymax=max(v[0] for v in raw);xmax=max(abs(v[1]) for v in raw)
    sy=T/(ymax-ymin);sx=(W/2)/xmax
    pts=[(RI+(r-ymin)*sy,x*sx,dr*sy,dx*sx,region) for r,x,dr,dx,region in raw]
    return pts,{'construction':'analytic circular crowns + G1 circular fillets + planar flank','actual_inner_fillet_mm_before_normalization':fi,'actual_outer_fillet_mm_before_normalization':fo,'radial_normalization':sy,'axial_normalization':sx,'micro_edge_mm':.012 if pid=='PB09' else 0}

def contour_validity(pts):
    # Proper intersections in the 2D section, excluding adjacent edges.
    def orient(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    n=len(pts);bad=[]
    for i in range(n):
        a,b=pts[i][:2],pts[(i+1)%n][:2]
        for j in range(i+2,n):
            if i==0 and j==n-1:continue
            c,d=pts[j][:2],pts[(j+1)%n][:2]
            if orient(a,b,c)*orient(a,b,d)<-1e-12 and orient(c,d,a)*orient(c,d,b)<-1e-12:bad.append((i,j))
    assert not bad,('Self intersections',bad)
    assert min(v[0] for v in pts)>=RI-1e-8
    assert abs(max(v[0] for v in pts)-(RI+T))<1e-8
    assert abs(max(v[1] for v in pts)-W/2)<1e-8
    assert all(math.hypot(v[2],v[3])>0 for v in pts)
    return {'self_intersections':0,'radial_min':min(v[0] for v in pts),'radial_max':max(v[0] for v in pts),'axial_min':min(v[1] for v in pts),'axial_max':max(v[1] for v in pts)}

ALL={}; REPORT={};SAMPLES={}
for pid in sorted(PARAMETERS):
    pts,construction=section(pid);validity=contour_validity(pts)
    lengths=[math.hypot(pts[(i+1)%len(pts)][0]-p[0],pts[(i+1)%len(pts)][1]-p[1]) for i,p in enumerate(pts)]
    perimeter=sum(lengths);cumulative=[0.]
    for d in lengths:cumulative.append(cumulative[-1]+d)
    uv=[v/perimeter for v in cumulative]
    outer=[uv[i] for i,p in enumerate(pts) if p[4]=='outer']
    spec={'inner_radius_mm':RI,'thickness_mm':T,'width_mm':W,'radial_segments':RADIAL_SEGMENTS,'profile_samples':len(pts),'profile_perimeter_mm':perimeter,'outer_v_min':min(outer),'outer_v_max':max(outer),'normal_method':'analytic revolution; tangent-continuous rounded joins','uv_method':'circumference U / closed profile arc-length V','max_circumference_chord_error_mm':(RI+T)*(1-math.cos(math.pi/RADIAL_SEGMENTS)),'profile_method':construction['construction'],'profile_id':pid,'description':DESCRIPTIONS[pid]}
    ALL[pid]=(pts,uv,spec)
    REPORT[pid]={'spec':spec,'construction':construction,'observed_parameters':PARAMETERS[pid],'validation':validity}
    SAMPLES[pid]={'object':'Wedding_'+pid,'contract':spec,'points':[{'radius':r,'axial':x,'radialTangent':dr,'axialTangent':dx,'region':region,'v':uv[i]} for i,(r,x,dr,dx,region) in enumerate(pts)]}
(OUT/'profile-crosssections.json').write_text(json.dumps(SAMPLES,indent=2)+'\n',encoding='utf-8')
(OUT/'profile-validation.json').write_text(json.dumps(REPORT,indent=2)+'\n',encoding='utf-8')
if '--contours-only' in sys.argv:
    print('CONTOURS_VALID', {k:len(v[0]) for k,v in ALL.items()})
else:
    import bpy,bmesh
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    objects=[]
    for pid,(pts,uvs,spec) in ALL.items():
        count=len(pts);vertices=[];normals=[];faces=[]
        for j in range(RADIAL_SEGMENTS):
            a=j*2*math.pi/RADIAL_SEGMENTS;ca,sa=math.cos(a),math.sin(a)
            for r,z,dr,dz,region in pts:
                den=math.hypot(dr,dz)
                vertices.append((r*ca,r*sa,z));normals.append((-dz/den*ca,-dz/den*sa,dr/den))
        for j in range(RADIAL_SEGMENTS):
            for i in range(count):faces.append((j*count+i,j*count+(i+1)%count,((j+1)%RADIAL_SEGMENTS)*count+(i+1)%count,((j+1)%RADIAL_SEGMENTS)*count+i))
        mesh=bpy.data.meshes.new('Wedding_'+pid);mesh.from_pydata(vertices,[],faces);mesh.update()
        obj=bpy.data.objects.new('Wedding_'+pid,mesh);bpy.context.collection.objects.link(obj);objects.append(obj)
        bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        badedges=sum(not e.is_manifold for e in bm.edges);zerofaces=sum(f.calc_area()<1e-10 for f in bm.faces);vol=bm.calc_volume(signed=True)
        assert badedges==0 and zerofaces==0 and vol>0,(pid,badedges,zerofaces,vol)
        bm.to_mesh(mesh);bm.free()
        for poly in mesh.polygons:poly.use_smooth=True
        mesh.normals_split_custom_set_from_vertices(normals)
        uv=mesh.uv_layers.new(name='JewelryUV')
        for j in range(RADIAL_SEGMENTS):
            for i in range(count):
                poly=mesh.polygons[j*count+i]
                for loop in poly.loop_indices:
                    jj,ii=divmod(mesh.loops[loop].vertex_index,count)
                    u=1. if j==RADIAL_SEGMENTS-1 and jj==0 else jj/RADIAL_SEGMENTS
                    v=1. if i==count-1 and ii==0 else uvs[ii]
                    uv.data[loop].uv=(u,v)
        for key,value in spec.items():obj[key]=value
        REPORT[pid]['validation'].update(vertices=len(mesh.vertices),faces=len(mesh.polygons),non_manifold_edges=badedges,zero_area_faces=zerofaces,signed_volume_mm3=vol,custom_normals=mesh.has_custom_normals)
        obj.select_set(True)
        print('PROFILE_READY',pid,len(vertices),len(faces),flush=True)
    scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=.001
    scene['authoring']='Original analytic profile construction; no reference mesh/SVG/image/shader assets.'
    scene['coordinate_contract']='Blender XY radial and Z axial; glTF Y axial, XZ radial; millimetre numeric units.'
    scene['library_contract']='Every node centered at origin; nominal bore radius9, radial envelope1.7, axial envelope4.5.'
    bpy.context.view_layer.objects.active=objects[3]
    bpy.ops.export_scene.gltf(filepath=str(OUT/'wedding-profiles.glb'),export_format='GLB',use_selection=True,export_normals=True,export_texcoords=True,export_materials='NONE',export_yup=True,export_extras=True)
    for obj in objects:
        obj.select_set(obj.name=='Wedding_PB04');obj.hide_set(obj.name!='Wedding_PB04')
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'wedding-profiles.blend'))
    (OUT/'profile-validation.json').write_text(json.dumps(REPORT,indent=2)+'\n',encoding='utf-8')
    print('PROFILES_COMPLETE',json.dumps({'blender':bpy.app.version_string,'objects':len(objects),'glb_bytes':(OUT/'wedding-profiles.glb').stat().st_size,'output':str(OUT)}),flush=True)
