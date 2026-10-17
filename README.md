# MoveAssist website
`https://move-assist.com/`

This static Website is converted to WordPress using ACF Pro.

A static website: HTML, CSS and JavaScript with jQuery 3.7.1. There is no build step and nothing to install.
Fonts, icons and jQuery are bundled locally, so it also works offline.

## Run it in VS Code (2 minutes)

1. **Extract the zip first.** On Windows, right-click the zip and choose *Extract All*. On a Mac, double-click it.
   Do not open `index.html` from inside the zip: only that one file is extracted, so the page appears without styling.
2. In VS Code, choose **File > Open Folder…** and select the `moveassist-website` folder (the one that contains `index.html`).
3. When VS Code suggests the recommended extension, install **Live Server**. You can also find it in the Extensions panel
   by searching for *Live Server* (by Ritwick Dey).
4. Right-click `index.html` and choose **Open with Live Server**, or click **Go Live** in the blue status bar.
   The site opens at `http://127.0.0.1:5500/index.html` and reloads automatically when you save a file.

Other ways to run it:
- **Run and Debug panel (F5):** after clicking *Go Live*, pick “Chrome: Live Server” or “Edge: Live Server”.
- **No VS Code:** after extracting, double-click `index.html`.
- **Any local server:** from this folder, run `python -m http.server 5500` and open `http://localhost:5500`.

## Project structure

```
moveassist-website/
├── index.html                  Home
├── about.html                  About
├── services.html               Services and pricing
├── service-*.html              Six service pages
├── gallery.html                Gallery
├── blog.html, blog-single.html Journal
├── contact.html                Contact and quote form
├── terms.html, privacy.html, refunds.html
├── styles.css                  All styling (design tokens are in :root at the top)
├── script.js                   All interactions (jQuery)
└── assets/
    ├── img/                    61 SVG illustrations
    ├── vendor/                 jQuery, Font Awesome brand icons, self-hosted fonts, licences
    ├── favicon.svg, moveassist-logo.svg, xpert-web-studio-logo.svg
```

## Editing tips

- **Text** lives directly in each `.html` file.
- **Images:** to swap an illustration for a photograph, save the new image in `assets/img/` and update the matching
  `src` (or keep the same file name if you export to SVG).
- **Colours and fonts** are CSS custom properties at the top of `styles.css`, with the picture-led overrides near the end.
- **Cache:** the HTML links `styles.css?v=2.2` and `script.js?v=2.2`. Raise the number after publishing changes so
  visitors' browsers fetch the new files.

## Troubleshooting

| What you see | Why | Fix |
| --- | --- | --- |
| Plain unstyled page, or a dark notice at the bottom saying the stylesheet did not load | A single HTML file was opened on its own (a chat or email preview, or straight from inside the zip) | Extract the whole folder and open it with Live Server |
| Changes not appearing | The browser is showing a cached copy | Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) |
| Map on the contact page is blank | The embedded Google Map needs an internet connection | Go online |
| Forms say “Thank you” but no email arrives | Forms are front-end only | Connect them to a form service or backend before launch |

## Before launch

- Replace the sample testimonials with genuine, attributable client reviews (required under the DMCC Act 2024).
- Confirm every value shown in [square brackets], such as team details, credentials and the legal notice periods.
- Have the Terms, Privacy and Refunds pages reviewed by a solicitor.
- Connect the forms, and replace `assets/xpert-web-studio-logo.svg` with the final logo file.

## Licences

jQuery (MIT), Font Awesome Free brand icons (CC BY 4.0 icons, SIL OFL 1.1 font) and the Archivo and
Plus Jakarta Sans typefaces (SIL OFL 1.1). Licence files are in `assets/vendor/`.

Built by [Xpert Web Studios](https://xpertwebstudio.co.uk/).
