# Common RTE

A multi-page rich text editor for the web. It leverages fontkit and Konva for text rendering as well as shape rendering on the canvas. The coexistence of freely positioned shapes and text, along with the multi-page rendering, are essential features of this editor. This is intended to replicate a Google Docs experience, while for a Notion-like experience I would recommend Lexical.

It also makes use of a Rope data structure, IntervalTree, and LayoutTree to assure that no characters are dropped while typing quickly and that layout operations can be cached in a way that is decoupled from other data safely.

Features:

- Average of 50ms or below response time for each keystroke, making it feel responsive and snappy
- Keystrokes profiled at as low as 16ms and as high as 72ms for large documents
- Bold, italics, underline and other formatting
- Visuals including rectangles, circles, and images
- Restore from Markdown (partially implemented)
- Restore from JSON for complex formatting

## Example Usage

Please see `index.html` for example usage.

## Development

- `npm run dev` (starts a Vite server to use the editor at `index.html`)

## Publishing

- `npm run build` (outputs to the `dist` directory for publsihing)
- `npm publish`
