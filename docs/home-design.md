# Rovera / Scroll Logo

The homepage uses the original Rovera navigation and footer around a single scroll-driven hero: “Your next good thing” and a silver 3D version of the actual Rovera spiral-and-tail brand mark. The platform strip, introduction, shop, sales section, account promo and FAQ are intentionally omitted.

## 3D asset

Created from the alpha contour of `public/rovera-logo.png` in Blender 5.2 through Higgsfield 3D Jutsu, revision 4:
https://higgsfield.ai/3d-jutsu/ff2901e9-f448-40d0-b580-fe1a7854a543

- `public/models/rovera-logo.glb`: beveled, continuous Rovera logo mesh.
- `public/rovera-logo-optimized.webp`: losslessly optimized exact logo fallback, shown before WebGL loads and on failure. The original PNG remains the source asset.
- `app/components/home/orbit-scene.ts`: lazy-loaded Three.js renderer, capped pixel ratio, on-demand rendering and explicit GPU cleanup.
- `app/components/home/scroll-hero.tsx`: scroll progress and OS reduced-motion support. No continuous idle animation.

`app/home.css` holds only hero styling; the old header and footer use Rovera's original global styles. Existing login and settings destinations stay in the original topbar. The logo completes a scroll-linked turn, while layered silver-to-charcoal waves rise from the hero edge and lead into the footer. Reduced-motion users get a static logo and transition. `npm run build` produces Cloudflare Pages output and copies the existing auth Worker.
