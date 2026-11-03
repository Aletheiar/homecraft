"""Verify decorative pyramids remain wholly beyond the courtyard boundary."""
from pathlib import Path
import numpy as np
import trimesh

path = Path(__file__).resolve().parent.parent / 'assets/models/newheaven-scenery.glb'
scene = trimesh.load(path, force='scene')
triangles = np.concatenate([g.triangles for g in scene.geometry.values()])
center = triangles.mean(axis=1)
for name, axis, sign, other in [('east', 0, 1, 2), ('north', 2, -1, 0), ('south', 2, 1, 0)]:
    radial = sign * center[:, axis]
    mask = (radial > 40) & (radial < 58) & (abs(center[:, other]) < 6)
    mask &= (triangles[:, :, 1].max(axis=1) > .05) & (triangles[:, :, 1].max(axis=1) < 6.2)
    points = triangles[mask].reshape(-1, 3)
    assert len(points), f'{name}: decorative pyramid was removed'
    nearest = (sign * points[:, axis]).min()
    assert abs(nearest-41.4)<.05, f'{name}: base moved away from original position: {nearest:.2f}'
    assert nearest-39.5 >= 1.8, f'{name}: insufficient clearance from inset fence'
    print(f'{name}: original base {nearest:.2f} m, inset fence 39.5 m, clearance {nearest-39.5:.2f} m')
