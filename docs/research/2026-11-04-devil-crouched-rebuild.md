# Devil Room posture and wing rebuild

Revised locally on 2026-11-04, Asia/Shanghai, after the owner supplied a cropped
reference and rejected the preceding sculpture's face, upright posture and
straight wings. This supersedes the devil section in the earlier courtyard
polish note. The result is a stylized reconstruction, not an official model
or a claim of an exact three-dimensional recovery from a single image.

## Changes

The pedestal, location and east-facing orientation remain unchanged. The figure
above the 4.8 m cap is rebuilt around two low bent knees, folded shins, tucked
hooves and a compact torso behind the face. The former triangular robe is
removed. Overall height decreases from 11.42 m to approximately 10.15 m so the
body reads as crouching instead of standing.

Following the owner's further clarification, the skull uses a rounded face
disc, full cheeks and only a small lower muzzle/jaw projection. The long
pointed lower half and deep diagonal cheek marks have been removed. Three strips across each face row have receding depths
and outward normals. Eyebrows, compact sockets, cheeks, nose bridge, nostrils,
small mouth and forehead mark use separate relief contours. The raised claw
and low open palm retain their asymmetric poses.

Wings now have a raised shoulder arch, an outward knuckle, an inward waist
and a low sweeping tip. Cubic Bezier outlines replace the nearly straight
outer edges. Wing depth bulges near the shoulder and changes down the span;
the membrane therefore also bends in depth. Continuous oriented rectangular
bone segments replace the previous disconnected rib marks. The local Y axis
of each segment follows its 3D tangent using XYZ Euler rotation, then the
whole figure inherits the existing monument yaw.

The model remains batched with the angel using original procedural geometry.
It contains 511 boxes / 6,132 triangles. The pair totals 9,636 triangles,
within its existing 10,000-triangle check. No extra render batch, texture,
light, obstacle or source-GLB edit was introduced. The overall scene still
exceeds its existing triangle budget.

## Validation and limits

The owner-provided reference and actual front, oblique and closer detail
views were inspected. `tools/check-decor.mjs` now also saves a closer detail
view at desktop and narrow-screen sizes. Existing sculpture suites check
finite positive geometry, placement, height, paired triangle count and
recognizable features; they cannot establish artistic likeness.

Functional checks and subjective likeness are reported separately. The new
screenshots are the reviewable outcome for the owner's judgement. The parent
status note records the exact checks and final revision state.
