# El Nexo — Notebook Theme Update

This update applies the warm engineering-notebook visual direction from the supplied
`El Nexo Studio Concepts` reference while retaining the existing framework and Studio
runtime code.

## Included UI changes
- Warm graph-paper background, cream panels, navy ink, muted red accents and a yellow Run action.
- Playground and AI Assistant remain grouped beside the El Nexo brand.
- The M/avatar control remains at the far right and opens the AI Assistant.
- Header refresh reloads the complete Studio.
- Removed the redundant refresh control from the Live Canvas.
- Improved spacing and visibility for preview action buttons.
- Removed the two footer/tagline lines requested.
- Performance iframe uses a matching light notebook palette.
- Existing editor, Run, AI, project explorer, component explorer, Fiber inspector,
  runtime activity and performance functionality are retained.

## Start
From the project root (the folder containing `package.json`):

```powershell
npm install
npm start
```

Then open `http://localhost:5500/playground/`.

The package does not include `node_modules` or `.git`; dependencies are restored with
`npm install`.
