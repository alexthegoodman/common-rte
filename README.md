# Common RTE

A multi-page rich text editor for the web. It leverages fontkit and Konva for text rendering as well as shape rendering on the canvas. The coexistence of freely positioned shapes and text, along with the multi-page rendering, are essential features of this editor. This is intended to replicate a Google Docs experience, while for a Notion-like experience I would recommend Lexical.

It also makes use of a Rope data structure, IntervalTree, and LayoutTree to assure that no characters are dropped while typing quickly and that layout operations can be cached in a way that is decoupled from other data safely.

Features:

- Bold, italics, underline and other formatting
- Visuals including rectangles, circles, and images
- Restore from Markdown (partially implemented)
- Restore from JSON for complex formatting
- Average of 50ms response time for each keystroke, making it feel responsive and snappy

## Example Usage

```
<div id="cmnToolbarPrimary" class="toolbar">
          <label>Alter Text:</label>
          <button id="cmnColor">Color</button>
          <select id="cmnFontSize">
            <option value="10">10</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="24">24</option>
            <option value="36">36</option>
            <option value="48">48</option>
          </select>
          <button id="cmnBold">Bold</button>
          <button id="cmnItalic">Italic</button>
          <button id="cmnUnderline">Underline</button>
          <label>Add Visuals:</label>
          <button id="cmnCircle">Circle</button>
          <button id="cmnRectangle">Rectangle</button>
          <button id="cmnImageButton">Image</button>
          <input id="cmnImageFile" type="file" class="hidden" />
          <span>Last Saved:</span>
          <span id="cmnLastSaved"></span>
        </div>
        <div id="cmnToolbarShape" class="toolbar">
          <label>Shape Properties:</label>
          <label>Width</label>
          <input id="cmnShapeWidth" type="text" name="width" />
          <label>Height</label>
          <input id="cmnShapeHeight" type="text" name="height" />
          <button id="cmnShapeColor">Color</button>
        </div>
        <div id="cmnContainer"></div>
        <script type="module" src="./src/index.ts"></script>
        <style>
            @font-face {
              font-family: "Inter";
              src: url("./src/assets/fonts/Inter-Regular.ttf");
              font-weight: normal;
              font-style: normal;
            }
            @font-face {
              font-family: "Oswald";
              src: url("./src/assets/fonts/Oswald[wght].ttf");
              font-weight: normal;
              font-style: normal;
            }
            .toolbar {
              display: flex;
              flex-direction: row;
              gap: 5px;
              position: fixed;
              top: 0;
              left: 0;
              z-index: 2;
            }
            .hidden {
              display: none;
            }
            body {
              padding: 25px 0;
            }
          </style>
          <div className="preloadFont" style="font-family: 'Inter'">
            .
          </div>
          <div className="preloadFont" style="font-family: 'Oswald'">
            .
          </div>
          <script type="module">
            // @ts-nocheck

import { initializeMultiPageRTE } from "./src/initializeMultiPageRTE";
import {
  defaultStyle,
  MultiPageEditor,
} from "./src/useMultiPageRTE";

import fontUrlInter from "./src/assets/fonts/Inter-Regular.ttf";
import fontUrlOswald from "./src/assets/fonts/Oswald[wght].ttf"

const pxPerIn = 96;
const marginSizeIn = { x: 1, y: 0.5 };
const documentSizeIn = {
  width: 8.3,
  height: 11.7,
};

const marginSize = {
  x: marginSizeIn.x * pxPerIn,
  y: marginSizeIn.y * pxPerIn,
};

const documentSize = {
  width: documentSizeIn.width * pxPerIn,
  height: documentSizeIn.height * pxPerIn,
};

const mainTextSize = {
  width: (documentSizeIn.width - marginSizeIn.x * 2) * pxPerIn,
  height: (documentSizeIn.height - marginSizeIn.y * 2) * pxPerIn,
};

const debounceCallback = (content, masterJson, masterVisuals) =>
  console.info("debounce content", masterJson, masterVisuals);

initializeMultiPageRTE(
  testMarkdown, // initial markdown content
  null, // initial masterJson
  [], // initial masterVisuals
  mainTextSize,
  documentSize,
  marginSize,
  debounceCallback, // after 3s, all content is output for saving
  [
    {
      name: "Inter",
      url: fontUrlInter
    },
    {
      name: "Oswald",
      url: fontUrlOswald
    },
  ],
  uploadImage // async function takes fileName, fileSize, fileType, and base64 fileData, must return url to image
);
</script>
```

## Development

- `npm run dev` (starts a Vite server to use the editor at `index.html`)

## Publishing

- `npm run build` (outputs to the `dist` directory for publsihing)
- `npm publish`
