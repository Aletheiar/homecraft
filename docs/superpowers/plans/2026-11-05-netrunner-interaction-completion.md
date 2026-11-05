# Netrunner interaction completion

The owner supplied the visual design and explicitly requested direct implementation.
Keep the existing workstation and its two supplied WebP images. Complete its
interaction through the engine's tap dispatch and existing modal page system.

- [x] Reproduce duplicate screen activation; add camera and browser regressions.
- [x] Route workstation taps once, before walking or ordinary station activation.
      Use nearest visible fixture faces and three-dimensional player reach.
- [x] Add a reusable camera transition and view snapshot. Sit at 1.28 m eye
      height, block movement/flight while seated, and restore the previous view.
      Add a touch-accessible exit button and make Escape/F/E modal-aware.
- [x] Fix terminal form submission, panel content protection and mount lifecycle.
      Source telemetry from the engine's measured frame statistics.
- [x] Align physical colliders, remove the illuminated poster frame, verify
      geometry clearance and inspect desktop/touch screenshots.
- [x] Run Node suites, workstation acceptance, engine input/camera regressions,
      npm run check and the static build. Record comparable performance and limits.

No deployment, external messages, new runtime dependency, real-time light,
unrelated scene edit or new portal is part of this change.

## Owner-directed composition revision

- [x] Replace the flat wall with a stepped centre, open joints and 60-degree left wing.
- [x] Enlarge the main image to 3.2 m (57% of the 5.6 m backdrop), move V entirely onto the wing.
- [x] Recess the backdrop and project the rack/cabinet forward without moving the chair approach.
- [x] Match poster hit tests to the real oriented planes; test roof clearance, all interactions and shelf separation.
