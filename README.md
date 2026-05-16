# STEP1FILM — Ayman Hassdo

Personal portfolio for filmmaker Ayman Hassdo (STEP1FILM).

## Files

| File | Purpose |
|---|---|
| `index.html` | Page markup |
| `style.css` | All styling |
| `main.js` | Loader, clapperboard scroll, hero video, cursor, tweaks |
| `image-slot.js` | Drag-and-drop image placeholders (films, portrait) |
| `bg-stage.jpg` | Background behind the clapperboard |
| `cursor.png` | Custom cursor |
| `robots.txt` | Search engine directive |
| `sitemap.xml` | Sitemap for search engines |

## Deploy to GitHub Pages

1. Create a repo (e.g. `step1film/myweb`) on GitHub.
2. Upload all the files above to the **root** of the repo.
3. Go to **Settings → Pages → Source → Deploy from a branch → main → / (root)**.
4. Wait ~1 minute. Your site will be live at `https://<username>.github.io/<repo>/`.

## Change the showreel video

Open `index.html`, find this line near the bottom:

```js
window.STEP1FILM_VIDEO = { provider: 'youtube', id: 'bW9R0R8KKw8' };
```

Replace the `id` with your YouTube video ID. For Vimeo, change `provider` to `'vimeo'`.

## Drop your own stills

Open the site, scroll to the Films panel, and **drag any image onto a thumbnail slot**. The same works for the About portrait. Images persist in your browser's localStorage.

## Domain / SEO

When you point a custom domain at the GitHub Pages deploy, update these URLs in `index.html` (search for `step1film.com`) and in `sitemap.xml`.
