<h1 align="center">fram starter template</h1>

This is a starter template for [fram](https://github.com/unindented/fram-c17), a small static photo and video gallery generator. Fork it, add your media, and publish the generated site.

## Contents

```text
media/          Photos and videos. Each directory becomes an album.
templates/      Page templates: album.html, plus header and footer partials.
static/         Files that the build copies as-is: CSS, lightbox script, icons, manifest.
deploy/         Optional password protection for bunny.net.
docs/           The generated site.
fram.toml       Gallery title, author, directories, and image sizes.
```

## Usage

1. [Install fram](https://github.com/unindented/fram-c17#installation).
2. Replace the sample albums in `media/` with your own photos (`.jpg`, `.jpeg`) and videos (`.mp4`).
3. Set `title` and `author` in `fram.toml`.
4. Build the gallery:

```sh
fram build -v
```

The site lands in `docs/`. Run `fram config` to print the resolved configuration, and see the [fram README](https://github.com/unindented/fram-c17#usage) for every option.

### Preview

To rebuild the gallery whenever `fram.toml`, a template, or a static file changes, I use [`entr`](https://eradman.com/entrproject/):

```sh
while sleep 0.2; do
  find fram.toml templates static -type f | entr -d -c -s 'fram build -v'
done
```

`entr -d` exits when you add a file to a watched directory, so the loop restarts it with the new list of files. Press Ctrl-C twice to stop.

To view the site, serve the output directory with any static server, for example:

```sh
python3 -m http.server -d docs
```

## Customization

- **Image sizes:** Each `[derivatives.*]` table in `fram.toml` sets a width, height, JPEG quality, and whether to crop.
- **Layout:** Edit `templates/album.html` and the partials in `templates/partials/`.
- **Styles and behavior:** Edit `static/css/fram.css` and `static/js/fram-lightbox.js`.
- **App name and icons:** Edit `static/manifest.webmanifest`, and replace the icons in `static/images/` and at the top level of `static/`.
- **Search engines:** `static/robots.txt` blocks all crawlers. Change it if you want the gallery indexed.

## Deployment

The output is plain static files, so any static host works.

- **GitHub Pages:** In _Settings > Pages_, deploy from the `main` branch and the `/docs` folder.
- **bunny.net:** Upload `docs/` to a storage zone. To ask for a password before serving any file, see [`deploy/README.md`](deploy/README.md).

## License

The code in this template is under the [MIT License](LICENSE.txt). The icons are Font Awesome Free, from [Font Awesome](https://fontawesome.com), under CC BY 4.0. The sample photos are by Martin Vorel, from [LibreShot](https://libreshot.com), under CC0 1.0. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
