# Portal Spaces and Courtyard Interactions

The user approved local implementation after moving the three small decorative pyramids outside the walking boundary.

## Deliverables

- Keep the decorative pyramid displacement in the model preparation pipeline and validate final geometry clearance.
- Add a rotatable crystal sculpture, a time-of-day console and seating to the dry west entrance plaza without blocking its main route.
- Replace selected hall kiosks with identifiable portals to a small enclosed library, a project studio and a friend lounge. Walking through or pressing F near a portal enters its destination. Every local room has a return portal and a return button.
- Keep native HTML cards and clearly labeled sample articles as the content layer. Example external blogs must be labeled examples; no personal friend relationship is invented.
- Hang original generated Hatsune Miku fan art inside the pyramid, above walking height. Save images and generation prompts locally and retain an accessible image view.
- Preserve courtyard swimming, glass collision and existing content links.

## Implementation

- `world/portal-rules.js`: pure crossing and URL validation, tested in Node.
- `world/space-config.js`, `world/boot.js`: bounded room selection and import-map bootstrap.
- `world/portals.js`: shared portal frames and site-level interaction controller.
- `world/rooms/`: independent room layouts, furniture and configuration.
- `world/foyer.js`: outdoor interaction furniture and crystal animation.
- `world/gallery.js`: suspended framed illustrations.
- `index.html`: native destination and interaction cards with regular links as a fallback.

## Validation

Run the existing geometry/boundary tests, portal rule tests, browser travel/return tests, native card checks, outdoor interaction checks, room containment checks, and desktop/mobile visual inspection. Verify local asset loading and no browser errors. External portal tests intercept destination requests rather than posting to or changing other sites.

Local preview only. No push or deployment. Existing rendering-budget limits remain documented; room scenes should be lightweight and must not load the large courtyard GLBs.
