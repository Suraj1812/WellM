# Brand and image assets

Created on 4 October 2026 with the built-in imagegen tool, using the supplied WellM logo as the identity reference. All generated assets are saved in the project. No image-generation CLI or external image API runner was used.

| File                                | Format and dimensions       | Use                                                                                                                         |
| ----------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `assets/brand/wellm-reference.png`  | PNG, 200 × 200              | Original supplied logo, including its tagline. Kept as the identity reference.                                              |
| `assets/brand/wellm-logo.png`       | Transparent PNG, 1810 × 480 | App header wordmark. Original grey lettering, orange/yellow W and yellow/green M preserved. Tagline omitted at small sizes. |
| `assets/brand/wellm-app-icon.png`   | Opaque PNG, 1024 × 1024     | App icon with a simplified WM symbol and generous safe margins.                                                             |
| `assets/images/bedside-evening.png` | PNG, 1536 × 1024            | Original generated bedside photograph.                                                                                      |
| `assets/images/bedside-evening.jpg` | JPEG, 1280 × 853            | Smaller copy for the mobile hero image.                                                                                     |

The generated wordmark was cropped with macOS `sips` to remove empty transparent padding. The icon was resized to 1024 × 1024. The photograph received a JPEG export at quality 85 for mobile delivery. These were technical crop, resize and encoding operations; the imagery and logo reconstruction came from imagegen.

Visually checked the wordmark spelling and brand colors, transparent background, icon safe margins, and photograph composition. The photograph contains no people, visible screen content, text or logos. Use a hero card tall enough to keep the phone on the lower-right bedside table visible.

## Prompt set

### Wordmark

Use case: background-extraction. Edit target: the supplied WellM logo. Create a faithful high-resolution transparent horizontal wordmark for a mobile app header. Preserve the exact word "WellM", its distinctive rounded grey lettering, the original orange-to-yellow curved W detail, and yellow-to-green curved M detail. Match the reference proportions and geometry closely. Remove the white background, remove the small tagline for legibility at mobile header size, and remove excess padding. Crisp smooth edges, flat brand colors, no shadows, no embellishments. Center the tightly framed complete wordmark on a genuinely transparent canvas.

### App icon

Use case: logo-brand. Asset: 1024 x 1024 square mobile app icon. Use the supplied WellM logo as the brand reference. Create a restrained, polished WM symbol using the reference’s distinctive rounded grey uprights, orange-to-yellow lower curved W, and yellow-to-green upper curved M. Keep the original brand geometry recognizable. Center just the W and M with balanced spacing and generous safe margins on a solid warm off-white background #F7F7F2. Flat clean graphic, crisp smooth edges, no texture, no shadows, no border, no rounded-corner mask. No other lettering, no tagline, no added symbols.

### Bedside photograph

Use case: photorealistic-natural. Asset: landscape mobile app hero image, wide 3:2 composition. Editorial lifestyle photograph of a quiet real bedroom at dusk. Close bedside view: a simple oak bedside table holds a modern phone lying face up with its screen completely off and a small linen-shade lamp casting soft warm light. Rumpled white linen bedding, a muted olive wall, and gentle evening window light create a calm lived-in scene. Authentic fabric, wood grain, and soft imperfect shadows; understated premium photography with a natural 35mm lens feel. Balanced composition that still reads when cropped to a wide mobile card. No people, no text, no logos, no visible apps or screen content, no 3D or CGI appearance.
