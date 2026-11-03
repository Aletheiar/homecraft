# Deployment

Homecraft is a static site. Run `bash tools/build.sh`, then deploy the files in `dist/` to a static hosting service or your own server.

The build script minifies JavaScript modules when `npx` is available locally, and generates gzip copies for text files larger than 255 bytes. If `brotli` is installed, Brotli copies are also generated.

## GitHub Pages

1. Go to the repository's **Actions** page and enable workflows when prompted.
2. **Settings → Pages** — set **Source** to **GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables** — create a variable `DEPLOY_PAGES` with value `true`.
4. Push to `main`. Once deployment completes, find the site URL in the Pages settings.

The `DEPLOY_PAGES=true` variable is also required for manual dispatch. The
closeout only synchronizes source and checks; it does not enable this variable
or hosting. See [Project status](project-status.md) for remaining release limits.

To use a custom domain, enter it in the Pages settings and configure DNS as instructed.

## Cloudflare Pages / Vercel / Netlify

After importing the repository, configure:

- Build command: `bash tools/build.sh`
- Output directory: `dist`

## Your Own Server

```sh
DEPLOY_TARGET=user@your-server:/var/www/site/ tools/build.sh --deploy
```

The deploy command syncs the target directory to match the contents of `dist/`, including deleting extraneous files in the target directory. `DEPLOY_TARGET` should point to a directory dedicated to this site.

Server configuration:

1. **Send `Cache-Control: no-cache`.** After an update, mixing old and new JavaScript modules can cause the 3D scene to fail to start.
2. **Enable pre-compressed file serving.** Prefer sending existing Brotli or gzip copies to reduce transfer size.

Caddy:

```
example.com {
  root * /var/www/site
  header Cache-Control "no-cache"
  file_server {
    precompressed br gzip
  }
}
```

Nginx:

```nginx
location / {
  root /var/www/site;
  gzip_static on;          # serve .gz files
  # brotli_static on;      # requires the ngx_brotli module
  add_header Cache-Control "no-cache";
}
```

## Access and Loading

- After deployment, verify actual access from both domestic and overseas locations.
- Use WebP for new images, and add `loading="lazy"` to card images. First-load size should be measured by actual browser transfer.

## Updating an Existing Website

The engine is maintained in this repository; there is no upstream update path. After changing it, preview and test the source, then redeploy through your existing hosting setup.

Deployed websites serve their own JavaScript copies. Changes take effect only
after their code is redeployed. This repository does not publish the shared
Homecraft directory or engine releases.

## Post-Deployment Checklist

- On both desktop and mobile, test movement, flight, cards, portals, and all enabled languages.
- Update the URL, name, description, and logo in `homecraft.json`. Check the share metadata in `index.html`; a 1200×630 screenshot of the site can be used as the share image.
- Follow [Site Metadata](site-metadata.md) to configure and verify cross-origin access to `homecraft.json`.
- Follow the [Portal Protocol](protocol.md) to preserve referrer information on navigation.

This site is not listed in the public directory, and no directory data is kept here.
