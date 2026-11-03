# Local destination rooms

The root page selects this world through `?space=library` or `?space=studio`.
The shared engine and assets remain at the root. Rooms use procedural blocks,
batched furniture, small canvas signs, and baked lamps; no external model is
loaded.

Every interior is 24 m by 20 m with a 6 m ceiling and a solid floor, four walls,
and a roof. The spawn is `(0, 4.5)`, facing north. Movement and flight stay inside
the envelope. The overview camera remains inside the room.

| Room | Station | Walk position `(x,z)` | Look position `(x,z)` |
| --- | --- | --- | --- |
| Library | `blog` | `(-6,-3)` | `(-6,-5.5)` |
| Library | `writing` | `(6,-3)` | `(6,-5.5)` |
| Studio | `works` | `(0,-3)` | `(0,-5.5)` |

The return portal is at `(0,8)`, faces north toward the room, and routes to
`/?space=hub`. Its own sign is the only "return to the hall" label in the room;
there is no separate guide sign or pedestal. The HUD return button provides the
same route. Native station cards are defined in the root HTML.

Friend links are not a room. The hall's friends door opens the static page at
`/friends/`, which lists every link from `friends/list.js`; adding a friend edits
that file rather than placing another portal in a walkable space.

The module depends on `../space-config.js` and `../portals.js`. Portal meshes,
collision bounds, and activation behavior are supplied by the shared helper.
