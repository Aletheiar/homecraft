"""Prepare authentic NewHeaven courtyard, scenic surroundings and water regions.
Requires numpy, trimesh and shapely. The source is read-only.
"""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
import trimesh
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.affinity import scale as scale_shape
from shapely import contains_xy, polygons as shape_polygons, union_all, constrained_delaunay_triangles, get_parts, get_coordinates

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source',type=Path,required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
out=root/'assets/models'; out.mkdir(parents=True,exist_ok=True)
original=args.source.read_bytes(); scene=trimesh.load(args.source,force='scene')
scale=.4; core=trimesh.Scene(); scenery=trimesh.Scene(); background={}; before=sum(len(g.faces) for g in scene.geometry.values())
meshes={}
for name,g in scene.geometry.items():
    mesh=g.copy(); node=next(n for n in scene.graph.nodes_geometry if scene.graph[n][1]==name)
    mesh.apply_transform(scene.graph[node][0]); v=mesh.vertices.copy()
    v[:,0]=(v[:,0]+17)*scale; v[:,1]=(v[:,1]-.5)*scale; v[:,2]=(v[:,2]-2)*scale
    mesh.vertices=v; meshes[name]=mesh

# Keep decorative pyramids and their paving bases at the original coordinates.
# The courtyard fence is now inside them, at the former outer pool edge.
placements=[]
for side in ['east','north','south']:
    placements.append({'side':side,'outward_shift':0,'courtyard_fence':39.5,'original_base_nearest':41.4})
water_tri=meshes['minecraft_block-water_still'].triangles[:,:,[0,2]]
shape=unary_union([Polygon(t) for t in water_tri if Polygon(t).area>1e-6])
parts=list(shape.geoms) if shape.geom_type=='MultiPolygon' else [shape]
pool_scale=.88
polygons=[np.round(np.array(scale_shape(p.convex_hull.simplify(.3),xfact=pool_scale,yfact=pool_scale,origin='centroid').exterior.coords)[:-1],4).tolist() for p in parts]
(out/'pool-regions.js').write_text('export default '+json.dumps(polygons)+';\n',encoding='utf-8')

for name,mesh in meshes.items():
    center=mesh.triangles_center
    courtyard=(abs(center[:,0])<39.9)&(abs(center[:,2])<39.9)&(center[:,1]>-.41)
    keep=courtyard.copy()
    # The native water renderer supplies real swim-depth basins. Keep original
    # glass openings intact; remove only old shallow pool floors and surfaces.
    # Replace the complete original coping as well as the shallow basin floor.
    # Protect the main pyramid's footing, which sits near the inner pool edges.
    old_pool=contains_xy(shape.buffer(1.3),center[:,0],center[:,2])
    protected=(np.maximum(abs(center[:,0]),abs(center[:,2]))<18.5)
    keep &= ~((center[:,1]<.5)&old_pool&~protected)
    if 'water_still' in name: keep[:]=False
    if keep.any():
        g=mesh.submesh([np.flatnonzero(keep)],append=True,repair=False)
        if 'stained_glass' in name:
            g.visual.material.alphaMode='BLEND';g.visual.material.baseColorFactor=[205,228,232,125];g.visual.material.doubleSided=True
        core.add_geometry(g,geom_name=name)
    outer=~courtyard
    if not outer.any(): continue
    g=mesh.submesh([np.flatnonzero(outer)],append=True,repair=False)
    if any(k in name for k in ['sandstone','birch']): color=(224,204,161,255)
    elif 'glass' in name: color=(118,155,160,255)
    elif any(k in name for k in ['stone_bricks','gray_wool','terracotta']): color=(99,111,111,255)
    elif any(k in name for k in ['planks','spruce']): color=(143,119,83,255)
    else: color=(174,179,169,255)
    background.setdefault(color,[]).append(g.triangles.copy())
# Merge coplanar source surfaces, preserving their covered area and openings.
# Triangle collapse on disconnected voxel faces damaged the facade; planar
# unions remove subdivision edges without deleting walls or filling windows.
for index,(color,items) in enumerate(background.items()):
    tri=np.concatenate(items); vectors=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
    axes=np.argmax(abs(vectors),axis=1); magnitude=np.linalg.norm(vectors,axis=1)
    aligned=np.max(abs(vectors),axis=1)>magnitude*.999999
    merged=[]
    for axis in range(3):
        chosen=tri[(axes==axis)&aligned]
        if not len(chosen): continue
        planes=np.round(chosen[:,:,axis].mean(axis=1),5)
        dims=[i for i in range(3) if i!=axis]
        for plane in np.unique(planes):
            faces=chosen[planes==plane]
            xy=np.round(faces[:,:,dims],5)
            a=xy[:,1]-xy[:,0];b=xy[:,2]-xy[:,0]
            area=abs(a[:,0]*b[:,1]-a[:,1]*b[:,0])
            xy=xy[area>1e-9]
            if not len(xy): continue
            surface=union_all(shape_polygons(xy)).simplify(.00002,preserve_topology=True)
            triangles=get_parts(constrained_delaunay_triangles(surface))
            for polygon in triangles:
                coords=get_coordinates(polygon)[:3]
                vertices=np.zeros((3,3));vertices[:,axis]=plane;vertices[:,dims]=coords
                merged.append(vertices)
    merged.extend(tri[~aligned])
    v=np.asarray(merged).reshape(-1,3)
    g=trimesh.Trimesh(vertices=v,faces=np.arange(len(v)).reshape(-1,3),process=True)
    g.visual=trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(baseColorFactor=color,roughnessFactor=.95,doubleSided=True))
    scenery.add_geometry(g,geom_name=f'original-facade-{index}')
core_data=core.export(file_type='glb'); back_data=scenery.export(file_type='glb')
(out/'newheaven-courtyard.glb').write_bytes(core_data)
(out/'newheaven-scenery.glb').write_bytes(back_data)
report={'author':'NewHeaven','source_url':'https://www.minecraft.net/en-us/article/louvre-craft','source_sha256':hashlib.sha256(original).hexdigest(),
 'source_bytes':len(original),'source_triangles':before,'output_bytes':len(core_data),'output_triangles':sum(len(g.faces) for g in core.geometry.values()),
 'scenery_bytes':len(back_data),'scenery_triangles':sum(len(g.faces) for g in scenery.geometry.values()),'output_sha256':hashlib.sha256(core_data).hexdigest(),
 'bounds':core.bounds.tolist(),'transform':{'center_x':-17,'center_z':2,'ground_y':.5,'scale':scale},'entrance':'Original west-side opening; no new doorway cut',
 'changes':['Recenter and uniform scale','Original scenery: coplanar unions preserve covered surfaces; five distant material colors','Original west opening retained','Seven polygon basins replace shallow decorative water','Small pyramids restored to original bases; fence inset to 39.5m; individual pools scaled to 88% with new coping'],
 'pool_scale':pool_scale,'courtyard_fence_half':39.5,
 'water_regions':len(polygons),'decorative_pyramid_placements':placements,'publication_status':'Local preview only; third-party redistribution permissions remain unestablished.'}
(out/'provenance.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
assert hashlib.sha256(args.source.read_bytes()).hexdigest()==report['source_sha256']
print(json.dumps(report,indent=2))
