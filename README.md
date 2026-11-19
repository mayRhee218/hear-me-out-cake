# Hear Me Out Cake 🎂

Make a virtual cake for your most unexpected crushes. I built this with Codex for a slumber party with a friend, inspired by the Hear Me Out Cake trend (가능충 케이크 in Korean).

[Make your own cake](https://mayrhee218.github.io/hear-me-out-cake/)

## Demo

[![Mobile demo preview showing seven photo toppers on a mint-frosted cake](docs/media/hear-me-out-cake-preview.webp)](https://x.com/MayRhee218/status/2123235452375478369/video/1)

The 56-second mobile demo shows photos becoming toppers, a frosting change, and a switch to a larger layout. [Watch on X](https://x.com/MayRhee218/status/2123235452375478369/video/1) · [Download the MP4](docs/media/hear-me-out-cake-demo.mp4)

## Make a cake

1. Pick a frosting color and choose **7, 15, or 20** topper slots. The editor starts with seven.
2. Tap a **+** to pick a photo. It appears on the cake as a flag. Tap an occupied slot to replace or remove its photo.
3. Select **Download cake** to save your creation as a PNG.

The editor processes photos on your device and keeps previews in browser memory. Reloading starts a fresh cake. [Privacy policy](https://mayrhee218.github.io/hear-me-out-cake/privacy.html)

## Run locally

The project uses React, TypeScript, Vite, and Tailwind CSS. Use Node.js 22 to match the GitHub Pages build.

```sh
npm ci
npm run dev
```

Run `npm run build` to type-check the project and create the production site in `dist/`.
