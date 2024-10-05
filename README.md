# Common RTE

A multi-page rich text editor for the web. It leverages fontkit and Konva. It also makes use of a Rope data structure, IntervalTree, and LayoutTree to assure that no characters are dropped while typing quickly and that layout operations can be cached in a way that is decoupled from other data safely.

Features:

- Restore from Markdown (partially implemented)
- Restore from JSON for complex formatting
- 100ms or less response times in many cases

## Development

- `npm run dev` (starts a Vite server to use the editor at `index.html`)

## Publishing

- `npm run build` (outputs to the `dist` directory for publsihing)
- `npm publish`
