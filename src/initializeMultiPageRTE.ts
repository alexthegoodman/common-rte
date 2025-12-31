import {
  defaultStyle,
  DocumentSize,
  FontData,
  loadFonts,
  MarginSize,
  MultiPageEditor,
  RenderItem,
  SpanItem,
  Style,
  VisualKinds,
} from "./useMultiPageRTE";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import Picker from "vanilla-picker";

let fontData = null;
let masterJson: SpanItem[][] | null = null;
let isSelectingText = false;
let firstSelectedNode: string | null = null;
let lastSelectedNode: string | null = null;
let editorInstance: MultiPageEditor | null = null;
let editorActive = false;
let jsonByPage: SpanItem[][] | null = null;

let stage: Konva.Stage | null = null;
let layer: Konva.Layer | null = null;
// let highlightLayer = null;
let visualsLayer: Konva.Layer | null = null;
let cursorLayer: Konva.Layer | null = null;
let highlightGroup = null;
let visualsTransformer: Konva.Transformer | null = null;
let cursorGroup = null;

let isSelected = false;
let mouseIsDown = false;

let debounceTimer = null;
let shadowSize = 25;
let cursorInterval = null;
let selectionDirection = "forward";

let selectedShape = null;
let picker = null;
let shapePicker = null;

export const initializeMultiPageRTE = (
  initialMarkdown: string,
  initialMasterJson: any,
  initialVisualsJson: any,
  mainTextSize: DocumentSize,
  documentSize: DocumentSize,
  marginSize: MarginSize,
  debounceCallback: () => {},
  fontUrls: FontData[], // for now just Inter
  uploadImageHandler: () => {}
) => {
  const setMasterJson = (
    // json: RenderItem[], 
    jsonByPage: SpanItem[][],
    optionalInsertIndex, 
    runCallback = true
  ) => {
    clearTimeout(debounceTimer);

    console.info("set master json", jsonByPage);

    masterJson = jsonByPage;

    // masterJson =
    //   optionalInsertIndex && masterJson
    //     ? [
    //         ...masterJson.slice(0, optionalInsertIndex), // Keep the elements before the replacement
    //         ...json, // Insert the new elements
    //         ...masterJson.slice(optionalInsertIndex + json.length), // Keep the elements after the replaced portion
    //       ]
    //     : json;
    // // console.info("check json", masterJson, editorInstance);
    // jsonByPage = getJsonByPage(masterJson);

    if (editorInstance) {
      if (!stage) {
        // console.info(
        //   "render nodes",
        //   Object.keys(jsonByPage).length,
        //   editorInstance.pages.length
        // );
        // initialize stage and layers
        stage = new Konva.Stage({
          container: "cmnContainer",
          width: documentSize.width + shadowSize,
          height:
            (documentSize.height + shadowSize) * editorInstance.pages.length,
        });

        // highlightLayer = new Konva.Layer();
        visualsLayer = new Konva.Layer();
        cursorLayer = new Konva.Layer();
        layer = new Konva.Layer();

        stage?.add(layer);
        stage?.add(visualsLayer);
        stage?.add(cursorLayer);

        visualsTransformer = new Konva.Transformer();
        visualsLayer.add(visualsTransformer);
      }

      stage.height(documentSize.height * editorInstance.pages.length);

      renderTextNodes(stage, layer, jsonByPage);

      if (runCallback) {
        startDebounceTimeout();
      }
    }
  };

  const startDebounceTimeout = () => {
    debounceTimer = setTimeout(() => {
      // TODO: will need to actually save out formatting data as well
      // probably restore / save the masterJson, with option to restore from plaintext
      // TODO: may want to pop up Are you sure? alert if user closes tab before debounce has ran
      editorInstance?.updatePageLayouts(0); // may be best called before setMasterJson entirely, before the json is prepared, but this functions
      const content = editorInstance?.getAllContent();
      debounceCallback(content, masterJson, editorInstance.visuals);
      const lastSavedLabel = document.querySelector("#cmnLastSaved");
      lastSavedLabel?.setHTMLUnsafe(new Date().toString());
    }, 3000);
  };

  const setIsSelectingText = (is) => (isSelectingText = is);
  const setFirstSelectedNode = (node) => (firstSelectedNode = node);
  const setLastSelectedNode = (node) => (lastSelectedNode = node);
  const setEditorInstance = (instance) => (editorInstance = instance);
  const setEditorActive = (active) => (editorActive = active);
  const setSelectionDirection = (dir) => (selectionDirection = dir);

  const handleKeydown = (e: KeyboardEvent) => {
    // e.preventDefault();

    // some key triggers do not require the editor to be active (?)
    if (editorActive) {
      // const characterId = uuidv4();

      // some key triggers do not require a cursor
      //   if (!window.__canvasRTEInsertCharacterIndex) {
      //     console.info("trigger key with no cursor?");
      //     return;
      //   }

      // Check if Ctrl key (or Cmd key on Mac) is pressed
      const isCtrlPressed = e.ctrlKey || e.metaKey;

      // Handle copy (Ctrl+C / Cmd+C)
      if (isCtrlPressed && e.key === "c") {
        console.info("copy text");
        //     const selectedText = window.getSelection().toString();
        //   if (selectedText) {
        //     navigator.clipboard.writeText(selectedText)
        //       .then(() => console.log('Text copied to clipboard'))
        //       .catch(err => console.error('Failed to copy text: ', err));
        //   }
        e.preventDefault();
      }

      // Handle paste (Ctrl+V / Cmd+V)
      else if (isCtrlPressed && e.key === "v") {
        console.info("paste text");

        navigator.clipboard
          .readText()
          .then((text) => {
            console.log("Pasted text:", text);

            editorInstance?.insert(
              window.__canvasRTEInsertCharacterIndex,
              window.__canvasRTEInsertCharacterIndexNl,
              text,
              defaultStyle,
              setMasterJson,
              false
            );

            window.__canvasRTEInsertCharacterIndex =
              window.__canvasRTEInsertCharacterIndex + text.length;
            window.__canvasRTEInsertCharacterIndexNl =
              window.__canvasRTEInsertCharacterIndexNl + text.length;

            renderCursor();
          })
          .catch((err) => console.error("Failed to paste text: ", err));

        e.preventDefault();
      }

      // Handle cut (Ctrl+X / Cmd+X)
      else if (isCtrlPressed && e.key === "x") {
        console.info("cut text");
        // copy then delete
        e.preventDefault();
      }

      if (!isCtrlPressed) {
        switch (e.key) {
          case "Enter":
            {
              e.preventDefault();

              const character = "\n";

              editorInstance?.insert(
                window.__canvasRTEInsertCharacterIndex,
                window.__canvasRTEInsertCharacterIndexNl,
                character,
                defaultStyle,
                setMasterJson,
                false
              );

              // window.__canvasRTEInsertCharacterIndex =
              //   window.__canvasRTEInsertCharacterIndex + 1;
              window.__canvasRTEInsertCharacterIndexNl =
                window.__canvasRTEInsertCharacterIndexNl + 1;
            }
            break;
          case "Backspace":
            {
              if (firstSelectedNode && lastSelectedNode) {
                const firstIndex = parseInt(firstSelectedNode.split("-")[2]);
                const lastIndex = parseInt(lastSelectedNode.split("-")[2]);
                const firstIndexNl = parseInt(firstSelectedNode.split("-")[3]);
                const lastIndexNl = parseInt(lastSelectedNode.split("-")[3]);

                const newlineCount = editorInstance?.getNewlinesBetween(
                  0,
                  firstIndex
                );

                console.info("backspace selection", newlineCount);

                editorInstance?.delete(
                  firstIndex,
                  lastIndex,
                  firstIndexNl,
                  lastIndexNl + 1,
                  setMasterJson
                );

                setFirstSelectedNode(null);
                setLastSelectedNode(null);

                if (selectionDirection === "backward") {
                  let selectionLength = Math.abs(lastIndex - firstIndex);
                  let selectionLengthNl = Math.abs(lastIndexNl - firstIndexNl);

                  console.info(
                    "selection length",
                    selectionLength,
                    selectionLengthNl
                  );

                  window.__canvasRTEInsertCharacterIndex =
                    window.__canvasRTEInsertCharacterIndex - selectionLength;

                  window.__canvasRTEInsertCharacterIndexNl =
                    window.__canvasRTEInsertCharacterIndexNl -
                    selectionLengthNl;
                }
              } else {
                if (!editorActive) {
                  console.error("Editor not active");
                }

                const char = editorInstance?.getCharAtIndex(
                  window.__canvasRTEInsertCharacterIndex
                );

                console.info("backspace", char);

                editorInstance?.delete(
                  window.__canvasRTEInsertCharacterIndex - 1,
                  window.__canvasRTEInsertCharacterIndex,
                  window.__canvasRTEInsertCharacterIndexNl - 1,
                  window.__canvasRTEInsertCharacterIndexNl,
                  setMasterJson
                );

                if (char !== "\n") {
                  window.__canvasRTEInsertCharacterIndex =
                    window.__canvasRTEInsertCharacterIndex - 1;
                }

                window.__canvasRTEInsertCharacterIndexNl =
                  window.__canvasRTEInsertCharacterIndexNl - 1;
              }

              renderCursor();
            }
            break;
          case "Delete":
            {
            }
            break;
          case "ArrowLeft":
            {
            }
            break;
          case "ArrowRight":
            {
            }
            break;
          case "ArrowUp":
            {
            }
            break;
          case "ArrowDown":
            {
            }
            break;
          case "Escape":
            {
              setEditorActive(false);
            }
            break;
          case "Shift":
            {
            }
            break;
          case "Meta":
            {
            }
            break;
          case "Tab":
            {
              const type = "tab";
              const character = "    ";

              editorInstance?.insert(
                window.__canvasRTEInsertCharacterIndex,
                window.__canvasRTEInsertCharacterIndexNl,
                character,
                defaultStyle,
                setMasterJson,
                false
              );

              window.__canvasRTEInsertCharacterIndex =
                window.__canvasRTEInsertCharacterIndex + 1;
              window.__canvasRTEInsertCharacterIndexNl =
                window.__canvasRTEInsertCharacterIndexNl + 1;
            }
            break;
          default:
            {
              e.preventDefault();

              // any other character
              const type = "character";
              const character = e.key;

              // console.info("char", character);

              if (!editorActive) {
                console.error("No editor");
              }

              editorInstance?.insert(
                window.__canvasRTEInsertCharacterIndex,
                window.__canvasRTEInsertCharacterIndexNl,
                character,
                defaultStyle,
                setMasterJson,
                false
              );

              //   jsonByPage = getJsonByPage(masterJson);

              //   renderTextNodes(stage, layer, jsonByPage);

              window.__canvasRTEInsertCharacterIndex =
                window.__canvasRTEInsertCharacterIndex + 1;
              window.__canvasRTEInsertCharacterIndexNl =
                window.__canvasRTEInsertCharacterIndexNl + 1;

              renderCursor();
            }
            break;
        }
      }

      // const renderable = editorInstanceRef.current?.renderVisible();

      // if (renderable) {
      //   setMasterJson(renderable);
      // }
    }
  };

  const handleScroll = (e: Event) => {
    if (editorInstance) {
      editorInstance.scrollPosition = window.scrollY;
    }
  };

  const handleScrollEnd = (e: Event) => {
    if (editorInstance) {
      // const { startIndex, combined } = editorInstance.renderVisible();
      // setMasterJson(combined);
      const roughPage = Math.floor((editorInstance.scrollPosition * 3) / 3000);
      console.info("roughPage", roughPage);
      editorInstance.renderAndRebalance(
        roughPage,
        (json, optionalInsertIndex) =>
          setMasterJson(json, optionalInsertIndex, false),
        false
      );
    }
  };

  // when no text exists, will calculate at first character
  const handleCanvasClick = (e: KonvaEventObject<MouseEvent>) => {
    setEditorActive(true);

    const roughPage = Math.floor((editorInstance.scrollPosition * 3) / 3000);

    window.__canvasRTEInsertCharacterIndex = editorInstance.getTextLength(
      undefined,
      false
    );
    window.__canvasRTEInsertCharacterIndexNl = editorInstance.getTextLength();

    console.info(
      "canvas click",
      window.__canvasRTEInsertCharacterIndex,
      window.__canvasRTEInsertCharacterIndexNl
    );

    renderCursor();
  };

  const handleShapeClick = (e: KonvaEventObject<MouseEvent>) => {
    // get selectedShape from id

    editorActive = false;
    selectedShape = e.target.attrs.id;
    console.info("shape e", e.target, selectedShape);
    // clear selection
    setFirstSelectedNode(null);
    setLastSelectedNode(null);
    clearSelectionHightlight(stage, layer);
    // clear cursor
    window.__canvasRTEInsertCharacterIndex = 0;
    window.__canvasRTEInsertCharacterIndexNl = 0;
    renderCursor();
    // show shape toolbar
    showShapeToolbar(e);
    // rerender visuals with selection data
    renderVisuals();
  };

  const handleDragVisual = (e) => {
    const { x, y } = e.target.attrs;

    clearTimeout(debounceTimer);

    editorInstance.updateVisual(selectedShape, {
      x,
      y,
    });

    startDebounceTimeout();
  };

  // set the insert index to this character
  // const handleTextClick = (e: KonvaEventObject<MouseEvent>) => {
  //   console.info("text click");

  //   setFirstSelectedNode(null);
  //   setLastSelectedNode(null);

  //   insertCursor(e);

  //   clearSelectionHightlight(stage, layer);

  //   showPrimaryToolbar();
  //   selectedShape = null;
  //   renderVisuals();
  // };

  // const insertCursor = (e: KonvaEventObject<MouseEvent>) => {
  //   console.info("text click");

  //   const target = e.target;
  //   const characterId = target.id();
  //   const characterIndex = parseInt(characterId.split("-")[2]);
  //   const characterNlIndex = parseInt(characterId.split("-")[3]);

  //   console.info("characterId", characterId, characterIndex);

  //   const character = masterJson[characterIndex];

  //   window.__canvasRTEInsertCharacterIndex = characterIndex;
  //   window.__canvasRTEInsertCharacterIndexNl = characterNlIndex;

  //   setEditorActive(true);

  //   renderCursor();
  // };

  // const handleTextMouseDown = (e: KonvaEventObject<MouseEvent>) => {
  //   console.info("text down", e);
  //   setIsSelectingText(true);

  //   const target = e.target;
  //   const characterId = target.id();

  //   setFirstSelectedNode(characterId);
  //   setLastSelectedNode(characterId);
  //   // setEditorActive(true);
  //   insertCursor(e); // for now this reuse has no side effects, convenient
  // };

  const handleTextClick = (e: KonvaEventObject<MouseEvent>) => {
    if (!isSelectingText) {
      console.info("text click");
      setFirstSelectedNode(null);
      setLastSelectedNode(null);

      insertCursor(e);

      clearSelectionHightlight(stage, layer);

      showPrimaryToolbar();
      selectedShape = null;
      renderVisuals();
    }

    setIsSelectingText(false);
  };

  const insertCursor = (e: KonvaEventObject<MouseEvent>) => {
    if (!masterJson) return;
    if (!firstSelectedNode) return;

    const target = e.target;
    const spanId = target.id();
    const pageIndex = parseInt(spanId.split("-")[0]);
    const spanIndex = parseInt(spanId.split("-")[1]);
    const charIndexInSpan = parseInt(firstSelectedNode.split("-")[3]);

    // Get the span's RenderItem
    const page = masterJson[pageIndex];
    const span = page[spanIndex];

    if (!charIndexInSpan) {
      console.warn("No character discovered for cursor");
    }
    
    // Calculate global character index
    // Need to sum up all previous spans' lengths
    let globalCharIndex = 0;
    for (let i = 0; i < spanIndex; i++) {
      globalCharIndex += page[i].text.length;
    }
    globalCharIndex += charIndexInSpan;
    
    // console.info("cursor at global index:", "charIndexInSpan", charIndexInSpan);
    
    window.__canvasRTEInsertCharacterIndex = globalCharIndex;
    // window.__canvasRTEInsertCharacterIndexNl = ???; // Need to recalculate this
    window.__canvasRTEInsertCharacterIndexNl = globalCharIndex;
    
    setEditorActive(true);
    renderCursor();
  };

  const getCharIndex = (masterJson: SpanItem[][], e: KonvaEventObject<MouseEvent>) => {
    const target = e.target;
    const spanId = target.id();

    const pageIndex = parseInt(spanId.split("-")[0]);
    const spanIndex = parseInt(spanId.split("-")[1]);

    // Get the span's RenderItem
    const page = masterJson[pageIndex];
    const span = page[spanIndex];

    // TODO: this loop may not be optimal
    // consider attaching only the span-relative index in the selectionNode string
    let totalLength = 0;
    for (let index = 0; index < masterJson.length; index++) {
      const page = masterJson[index];
      if (index > pageIndex) break;

      for (let x = 0; x < page.length; x++) {
        const span = page[x];
        if (x > spanIndex) break;

        totalLength += span.text.length;
      }
    }

    // Find which character in the span was clicked using charPositions
    let charIndexInSpan = 0;
    let accumulatedWidth = 0;
    
    const clickX = e.evt.offsetX - marginSize.x;
    const clickY = e.evt.offsetY - marginSize.y;
    let capHeight = span.height || 0;

    // Find character by both X and Y
    for (let i = 0; i < span.charPositions.length; i++) {
      const char = span.charPositions[i];
      
      if (clickY < char.y + capHeight && clickY > char.y) {
        if (clickX < char.x + char.width && clickX > char.x) {
          charIndexInSpan = i;
          break;
        }
      }
    }

    return [charIndexInSpan, totalLength + charIndexInSpan]
  }

  const handleTextMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!masterJson) return;

    console.info("text down", e);

    mouseIsDown = true;

    const target = e.target;
    const spanId = target.id();

    const [indexInSpan, fullIndex] = getCharIndex(masterJson, e);

    const selectionNode = spanId + "-" + fullIndex + "-" + indexInSpan;

    setFirstSelectedNode(selectionNode);
    setLastSelectedNode(selectionNode);
    
    insertCursor(e);
  };

  // const handleTextMouseMove = (e: KonvaEventObject<MouseEvent>) => {
  //   if (isSelectingText && e.evt.buttons) {
  //     // console.info("selecting text", e);

  //     const target = e.target;
  //     const characterId = target.id();

  //     const characterNlIndex = parseInt(characterId.split("-")[3]);
  //     const firstIndex = parseInt(firstSelectedNode.split("-")[3]);

  //     if (firstIndex >= characterNlIndex) {
  //       setFirstSelectedNode(characterId);
  //       setSelectionDirection("backward");
  //     } else {
  //       setLastSelectedNode(characterId);
  //       setSelectionDirection("forward");
  //     }

  //     renderSelectionHighlight(stage, layer, jsonByPage);
  //   }
  // };

  const handleTextMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!masterJson) return;

    if (mouseIsDown) {
      setIsSelectingText(true);
    }

    if (isSelectingText && e.evt.buttons) {
      const target = e.target;
      const spanId = target.id();

      const [indexInSpan, fullIndex] = getCharIndex(masterJson, e);

      const selectionNode = spanId + "-" + fullIndex + "-" + indexInSpan;

      const firstGlobalIndex = firstSelectedNode ? parseInt(firstSelectedNode.split("-")[2]) : 0;

      console.info("txt move", firstGlobalIndex >= fullIndex, firstGlobalIndex, fullIndex)
      
      // Determine selection direction
      if (firstGlobalIndex >= fullIndex) {
        // setFirstSelectedNode(selectionNode);
        setSelectionDirection("backward");
      } else {
        setLastSelectedNode(selectionNode);
        setSelectionDirection("forward");
      }

      renderSelectionHighlight(stage, layer, masterJson);
    }
  };

  const handleTextMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    console.info("text up", e);
    mouseIsDown = false;
  };

  const handleFormattingDown = (formatting: Partial<Style>) => {
    if (!firstSelectedNode || !lastSelectedNode) {
      return;
    }

    const firstIndex = parseInt(firstSelectedNode.split("-")[2]);
    const lastIndex = parseInt(lastSelectedNode.split("-")[2]);

    console.info("formatting on ", firstIndex, lastIndex, formatting);

    editorInstance?.alterFormatting(
      firstIndex,
      lastIndex,
      formatting,
      setMasterJson
    );
  };

  const renderTextNodes = (
    stg, 
    lyr, 
    // jsonByPage: { [key: number]: RenderItem[] }
    jsonByPage: SpanItem[][]
  ) => {
    if (!editorInstance || !jsonByPage) return;

    lyr.destroyChildren();

    const roughPage = Math.floor((editorInstance.scrollPosition * 3) / 3000);

    let globalIndex = 0;
    let globalNlIndex = 0;
    for (let i = 0; i < editorInstance.pages.length; i++) {
      const masterJson = jsonByPage[i];

      var pageOuter = new Konva.Rect({
        x: 0,
        y: (documentSize.height + shadowSize) * i,
        width: documentSize.width,
        height: documentSize.height,
        fill: "#fff",
        shadowEnabled: true,
        shadowColor: "black",
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowBlur: 20,
        shadowOpacity: 0.3,
      });

      var pageInner = new Konva.Rect({
        x: marginSize.x,
        y: (documentSize.height + shadowSize) * i + marginSize.y,
        width: mainTextSize.width,
        height: mainTextSize.height,
        fill: "#fff",
        // onMouseDown: handleCanvasClick,
      });

      pageInner.on("mousedown", handleCanvasClick);

      lyr.add(pageOuter);
      lyr.add(pageInner);
    }

    let i = roughPage,
      key = roughPage;
    // add up all lengths in array of arrays before index
    let totalLengthBeforeIndex = Object.values(jsonByPage)
      .slice(0, roughPage) // Get all arrays before the index
      .reduce((sum, arr) => sum + arr.length, 0); // Sum up their lengths

    const masterJson = jsonByPage[key];

    var group = new Konva.Group({
      x: marginSize.x,
      y: (documentSize.height + shadowSize) * i + marginSize.y,
    });

    for (let i = 0; i < masterJson?.length; i++) {
      const charText = masterJson[i];

      globalNlIndex++;

      if (charText?.text === "\n") {
        continue;
      }

      let text = charText?.text?.split("\n").join(""); // we already account for this

      // const charId = `${charText.text}-${charText.page}-${
      //   totalLengthBeforeIndex + globalIndex
      // }-${totalLengthBeforeIndex + globalNlIndex - 1}`; // will want a totalLengthBeforeIndexWithoutNewlines as well

      const charId = `${charText.page}-${i}`;

      // console.info("span id", charId)

      if (firstSelectedNode === charId && lastSelectedNode) {
        isSelected = true;
      }

      if (lastSelectedNode === charId) {
        isSelected = false;
      }

      let newText = new Konva.Text({
        id: charId,
        x: charText?.x,
        y: charText?.y,
        text: text,
        fontSize: charText.format.fontSize,
        fontFamily: charText.format.fontFamily,
        fontStyle: charText.format.italic
          ? "italic"
          : charText.format.fontWeight,
        fill: charText.format.color,
        textDecoration: charText.format.underline ? "underline" : "",
        // width: charText.width,
        wrap: "char"
      });

      newText.on("click", handleTextClick);
      newText.on("mousedown", handleTextMouseDown);
      newText.on("mousemove", handleTextMouseMove);
      newText.on("mouseup", handleTextMouseUp);

      group.add(newText);

      globalIndex++;
    }

    lyr?.add(group);
    group.moveUp();
  };

  const renderSelectionHighlight = (stg, lyr, jsonByPage: SpanItem[][]) => {
    if (!jsonByPage) return;
    if (!editorInstance) return;
    if (!firstSelectedNode) return;
    if (!lastSelectedNode) return;

    highlightGroup?.destroy();

    // const roughPage = Math.floor((editorInstance.scrollPosition * 3) / 3000);
    const pageIndex = parseInt(firstSelectedNode.split("-")[0]);
    const spanIndex = parseInt(firstSelectedNode.split("-")[1]);
    // const firstIndex = parseInt(firstSelectedNode.split("-")[2]);
    // const lastIndex = parseInt(lastSelectedNode.split("-")[2]);
    const firstIndex = parseInt(firstSelectedNode.split("-")[3]);
    const lastIndex = parseInt(lastSelectedNode.split("-")[3]);

    // let i = roughPage,
    //   key = roughPage;
    // const page = jsonByPage[key];

    highlightGroup = new Konva.Group({
      x: marginSize.x,
      y: (documentSize.height + shadowSize) * pageIndex + marginSize.y,
      name: "selectionGroup",
    });

    const page = jsonByPage[pageIndex];
    const span = page[spanIndex];

    let contentIndex = 0;
    for (let i = 0; i < span.charPositions?.length; i++) {
      const char = span.charPositions[i];

      if (span?.text === "\n") continue;

      contentIndex++;

      if (contentIndex - 1 < firstIndex || contentIndex - 1 > lastIndex)
        continue;

      let newRect = new Konva.Rect({
        id: "highlight" + i,
        x: char?.x,
        y: char?.y,
        width: char?.width + 2,
        height: 26,
        fill: "lightgrey",
      });

      highlightGroup?.add(newRect);
    }

    lyr?.add(highlightGroup);
    highlightGroup.moveDown();
  };

  const clearSelectionHightlight = (stg, lyr) => {
    highlightGroup?.destroy();
  };

  const handleTransformVisual = (e, selectedVisuals) => {
    clearTimeout(debounceTimer);

    const scaledWidth = e.target.attrs.width * e.target.attrs.scaleX;
    const scaledHeight = e.target.attrs.height * e.target.attrs.scaleY;

    console.info("transform", scaledWidth, scaledHeight);

    document.getElementById("cmnShapeWidth").value = scaledWidth;
    document.getElementById("cmnShapeHeight").value = scaledHeight;

    editorInstance.updateVisual(selectedShape, {
      width: scaledWidth,
      height: scaledHeight,
    });

    startDebounceTimeout();
  };

  let allVisualsAdded = [];
  const renderVisuals = () => {
    console.info("renderVisuals", editorInstance.visuals.length);
    // visualsLayer?.destroyChildren();
    // visualsTransformer?.detach();

    let selectedVisuals = [];
    for (let x = 0; x < editorInstance.visuals.length; x++) {
      let pageVisual = editorInstance.visuals[x];

      console.info("pageVIsual", pageVisual, allVisualsAdded);

      if (pageVisual.id === selectedShape) {
        selectedVisuals = [];
        selectedVisuals.push(
          allVisualsAdded.find((vis) => vis.attrs.id === pageVisual.id)
        );
      }

      if (allVisualsAdded.find((vis) => vis.attrs.id === pageVisual.id))
        continue;

      let numVis = allVisualsAdded.length;
      if (pageVisual.kind === VisualKinds.circle) {
        console.info("rendering circle...");

        allVisualsAdded[numVis] = new Konva.Circle({
          ...pageVisual,
          draggable: true,
        });
        finishVisual(allVisualsAdded, numVis);
      } else if (pageVisual.kind === VisualKinds.rectangle) {
        console.info("rendering rectangle...");

        allVisualsAdded[numVis] = new Konva.Rect({
          ...pageVisual,
          draggable: true,
        });
        finishVisual(allVisualsAdded, numVis);
      } else if (pageVisual.kind === VisualKinds.image) {
        console.info("rendering image...", pageVisual.url);

        var imageObj = new Image();
        imageObj.onload = function () {
          var image = new Konva.Image({
            ...pageVisual,
            image: imageObj,
            draggable: true,
          });

          allVisualsAdded[numVis] = image;
          finishVisual(allVisualsAdded, numVis);
          finishVisuals(selectedVisuals);
        };
        imageObj.src = pageVisual.url;
      }
    }

    finishVisuals(selectedVisuals);

    // handleShapeClick();
  };

  const finishVisual = (allVisualsAdded, numVis) => {
    allVisualsAdded[numVis].on("click", handleShapeClick);
    allVisualsAdded[numVis].on("dragmove", handleDragVisual);
    visualsLayer.add(allVisualsAdded[numVis]);
    visualsLayer.draw(); // ?
  };

  const finishVisuals = (selectedVisuals) => {
    visualsTransformer.nodes(selectedVisuals);
    visualsTransformer.on("transform", (e) =>
      handleTransformVisual(e, selectedVisuals)
    );
    visualsLayer.batchDraw();
  };

  // const renderCursor = () => {
  //   if (
  //     window.__canvasRTEInsertCharacterIndex >= 0 ||
  //     window.__canvasRTEInsertCharacterIndexNl >= 0
  //   ) {
  //     cursorGroup?.destroy();

  //     const roughPage = Math.floor((editorInstance.scrollPosition * 3) / 3000);

  //     cursorGroup = new Konva.Group({
  //       x: marginSize.x,
  //       y: (documentSize.height + shadowSize) * roughPage + marginSize.y,
  //       name: "selectionGroup",
  //     });

  //     let charData = masterJson[window.__canvasRTEInsertCharacterIndexNl];

  //     if (!charData) {
  //       let prevData = masterJson[window.__canvasRTEInsertCharacterIndexNl - 1];

  //       charData = {
  //         x: prevData?.x + prevData?.width,
  //         y: prevData?.y,
  //       };
  //     }

  //     if (masterJson.length === 0) {
  //       charData = {
  //         x: 0,
  //         y: 0,
  //       };
  //     }

  //     //   console.info(
  //     //     "charData",
  //     //     window.__canvasRTEInsertCharacterIndexNl,
  //     //     charData
  //     //   );
  //     const cursor = new Konva.Rect({
  //       width: 2,
  //       height: 16,
  //       x: charData.x - 1,
  //       y: charData.y,
  //       fill: "black",
  //     });

  //     cursorGroup.add(cursor);
  //     cursorLayer.add(cursorGroup);

  //     // Create the blinking animation
  //     const anim = new Konva.Animation(function (frame) {
  //       const period = 1000; // 1 second
  //       const time = (frame.time % period) / period;

  //       cursor.opacity(Math.abs(Math.sin(time * Math.PI)));
  //     }, cursorLayer);

  //     // Start the animation
  //     anim.start();
  //   } else if (
  //     window.__canvasRTEInsertCharacterIndex < 0 ||
  //     window.__canvasRTEInsertCharacterIndexNl < 0
  //   ) {
  //     cursorGroup?.destroy();
  //   }
  // };

  const renderCursor = () => {
    if (window.__canvasRTEInsertCharacterIndex >= 0) {
      cursorGroup?.destroy();

      const roughPage = Math.floor((editorInstance.scrollPosition * 3) / 3000);
      const activePage = masterJson[roughPage];

      cursorGroup = new Konva.Group({
        x: marginSize.x,
        y: (documentSize.height + shadowSize) * roughPage + marginSize.y,
        name: "selectionGroup",
      });

      // Find which span contains the cursor position
      let globalCharIndex = window.__canvasRTEInsertCharacterIndex;
      let spanIndex = 0;
      let charIndexInSpan = 0;
      let accumulatedLength = 0;

      for (let i = 0; i < activePage.length; i++) {
        const span = activePage[i];
        const spanLength = span.text.length;
        
        if (globalCharIndex <= accumulatedLength + spanLength) {
          spanIndex = i;
          charIndexInSpan = globalCharIndex - accumulatedLength;
          break;
        }
        
        accumulatedLength += spanLength;
      }

      const span = activePage[spanIndex];
      let charData;

      if (!span) {
        // Empty document or cursor at very end
        const lastSpan = activePage[activePage.length - 1];
        if (lastSpan) {
          const lastCharPos = lastSpan.charPositions[lastSpan.charPositions.length - 1];
          charData = {
            x: lastCharPos.x + lastCharPos.width,
            y: lastSpan.y,
          };
        } else {
          charData = { x: 0, y: 0 };
        }
      } else if (charIndexInSpan === 0) {
        // Cursor at start of span
        charData = {
          x: span.x,
          y: span.y,
        };
      } else if (charIndexInSpan >= span.charPositions.length) {
        // Cursor at end of span
        const lastCharPos = span.charPositions[span.charPositions.length - 1];
        charData = {
          x: lastCharPos.x + lastCharPos.width,
          y: span.y,
        };
      } else {
        // Cursor in middle of span
        const charPos = span.charPositions[charIndexInSpan];
        charData = {
          x: charPos.x,
          y: span.y,
        };
      }

      const cursor = new Konva.Rect({
        width: 2,
        height: span?.format?.fontSize || 16,
        x: charData.x - 1,
        y: charData.y,
        fill: "black",
      });

      cursorGroup.add(cursor);
      cursorLayer.add(cursorGroup);

      // Create the blinking animation
      const anim = new Konva.Animation(function (frame) {
        const period = 1000;
        const time = (frame.time % period) / period;
        cursor.opacity(Math.abs(Math.sin(time * Math.PI)));
      }, cursorLayer);

      anim.start();
    } else if (window.__canvasRTEInsertCharacterIndex < 0) {
      cursorGroup?.destroy();
    }
  };

  const getJsonByPage = (masterJson: RenderItem[]): { [key: number]: RenderItem[] } => {
    return masterJson?.reduce((acc, char) => {
      // if (!char.page) return acc;
      if (!acc[char.page]) {
        acc[char.page] = [];
      }

      acc[char.page].push(char);

      return acc;
    }, {} as { [key: number]: RenderItem[] });
  };

  loadFonts((allFontsData) => {
    fontData = allFontsData;
    console.info(
      "fontdata loaded, intializing editor",
      initialMarkdown?.length,
      initialMasterJson?.length
    );

    const multiPageEditor = new MultiPageEditor(mainTextSize, 70, fontData);

    editorInstance = multiPageEditor;

    if (initialMasterJson?.length) {
      multiPageEditor.insertJson(initialMasterJson, setMasterJson);
    } else if (initialMarkdown?.length) {
      multiPageEditor.insert(
        0,
        0,
        initialMarkdown,
        defaultStyle,
        setMasterJson,
        true
      );
      if (editorInstance) {
        // const { startIndex, combined } = editorInstance.renderVisible();
        // setMasterJson(combined);
        const roughPage = Math.floor((editorInstance.scrollPosition * 3) / 3000);
        console.info("roughPage", roughPage);
        editorInstance.renderAndRebalance(
          roughPage,
          (json, optionalInsertIndex) =>
            setMasterJson(json, optionalInsertIndex, false),
          false
        );
      }
    } else {
      // no markdown or json
      setMasterJson([], 0, true);
    }

    multiPageEditor.visuals = initialVisualsJson;

    renderVisuals();
  }, fontUrls);

  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("scroll", handleScroll);
  window.addEventListener("scrollend", handleScrollEnd);

  const handleFontSize = (e) => {
    handleFormattingDown({ fontSize: parseInt(e.target.value) });
  };

  const handleBold = (e) => {
    handleFormattingDown({ fontWeight: "600" });
  };

  const handleItalic = (e) => {
    handleFormattingDown({ italic: true });
  };

  const handleUnderline = (e) => {
    handleFormattingDown({ underline: true });
  };

  const handleFontFamily = (e) => {
    handleFormattingDown({ fontFamily: e.target.value });
  };

  document
    .getElementById("cmnFontFamily")
    ?.addEventListener("change", handleFontFamily);
  document
    .getElementById("cmnFontSize")
    ?.addEventListener("change", handleFontSize);

  document.getElementById("cmnBold")?.addEventListener("click", handleBold);
  document.getElementById("cmnItalic")?.addEventListener("click", handleItalic);
  document
    .getElementById("cmnUnderline")
    ?.addEventListener("click", handleUnderline);

  const parent = document.querySelector("#cmnColor");
  picker = new Picker(parent);

  picker.onDone = function (color) {
    handleFormattingDown({ color: color.rgbaString });
  };

  const handleCircle = (e) => {
    editorInstance.addVisual({
      kind: VisualKinds.circle,
      fill: "red",
    });

    renderVisuals();
  };

  document.getElementById("cmnCircle")?.addEventListener("click", handleCircle);

  const handleRectangle = (e) => {
    editorInstance.addVisual({
      kind: VisualKinds.rectangle,
      fill: "red",
    });

    renderVisuals();
  };

  document
    .getElementById("cmnRectangle")
    ?.addEventListener("click", handleRectangle);

  const handleImageButton = (e) => {
    document.getElementById("cmnImageFile")?.click();
  };

  document
    .getElementById("cmnImageButton")
    ?.addEventListener("click", handleImageButton);

  const handleImageFile = (e) => {
    const file = e.target["files"][0];
    const reader = new FileReader();

    let fileName = file.name;
    let fileSize = file.size;
    let fileType = file.type;

    reader.onload = async function (item) {
      const base64 = item?.target?.result as string;
      let fileData = base64;

      console.info("reader.onload form values", fileName, fileSize, fileType);

      const publicUrl = await uploadImageHandler(
        fileName,
        fileSize,
        fileType,
        fileData
      );

      editorInstance.addVisual({
        kind: VisualKinds.image,
        url: publicUrl,
      });

      renderVisuals();
    };

    reader.readAsDataURL(file);
  };

  document
    .getElementById("cmnImageFile")
    ?.addEventListener("change", handleImageFile);

  const handleShapeWidthChange = (e) => {
    const visual = allVisualsAdded.find(
      (vis) => vis.attrs.id === selectedShape
    );
    const width = parseInt(e.target.value);
    visual.width(width);
    visual.scaleX(1);
    visualsTransformer.width(width);
    editorInstance.updateVisual(selectedShape, { width });
  };

  const handleShapeHeightChange = (e) => {
    const visual = allVisualsAdded.find(
      (vis) => vis.attrs.id === selectedShape
    );
    const height = parseInt(e.target.value);
    visual.height(height);
    visual.scaleY(1);
    visualsTransformer.height(height);
    editorInstance.updateVisual(selectedShape, { height });
  };

  const showPrimaryToolbar = () => {
    if (shapePicker) {
      shapePicker.destroy();
      shapePicker = null;
    }
    document
      .getElementById("cmnToolbarPrimary")
      ?.setAttribute("style", "display: flex");
    document
      .getElementById("cmnToolbarShape")
      ?.setAttribute("style", "display: none");
  };

  const showShapeToolbar = (e) => {
    // remove if already set
    if (shapePicker) {
      shapePicker.destroy();
      shapePicker = null;
    }
    document
      .getElementById("cmnShapeWidth")
      ?.removeEventListener("change", handleShapeWidthChange);
    document
      .getElementById("cmnShapeHeight")
      ?.removeEventListener("change", handleShapeHeightChange);

    document
      .getElementById("cmnToolbarPrimary")
      ?.setAttribute("style", "display: none");
    document
      .getElementById("cmnToolbarShape")
      ?.setAttribute("style", "display: flex");

    const width = e.target.attrs.width;
    const height = e.target.attrs.height;
    const fill = e.target.attrs.fill;

    document.getElementById("cmnShapeWidth").value = width;
    document.getElementById("cmnShapeHeight").value = height;

    document
      .getElementById("cmnShapeWidth")
      ?.addEventListener("change", handleShapeWidthChange);
    document
      .getElementById("cmnShapeHeight")
      ?.addEventListener("change", handleShapeHeightChange);

    const parent = document.querySelector("#cmnShapeColor");
    shapePicker = new Picker(parent);

    shapePicker.onDone = function (color) {
      const visual = allVisualsAdded.find(
        (vis) => vis.attrs.id === e.target.attrs.id
      );
      visual.fill(color.rgbaString);
      editorInstance.updateVisual(e.target.attrs.id, {
        fill: color.rgbaString,
      });
    };
  };

  showPrimaryToolbar();

  const detach = () => {
    editorInstance = null;
    masterJson = null;
    jsonByPage = null;
    stage = null;
    layer = null;
    visualsLayer = null;
    cursorLayer = null;
    highlightGroup = null;
    visualsTransformer = null;
    cursorGroup = null;
    editorActive = false;
    isSelectingText = false;
    firstSelectedNode = null;
    lastSelectedNode = null;
    isSelected = false;
    debounceTimer = null;
    shadowSize = 25;
    cursorInterval = null;
    selectionDirection = "forward";
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("scrollend", handleScrollEnd);
    document
      .getElementById("cmnFontFamily")
      ?.removeEventListener("change", handleFontFamily);
    document
      .getElementById("cmnFontSize")
      ?.removeEventListener("change", handleFontSize);
    document
      .getElementById("cmnBold")
      ?.removeEventListener("click", handleBold);
    document
      .getElementById("cmnItalic")
      ?.removeEventListener("click", handleItalic);
    document
      .getElementById("cmnUnderline")
      ?.removeEventListener("click", handleUnderline);

    if (picker) {
      picker.destroy();
      picker = null;
    }

    if (shapePicker) {
      shapePicker.destroy();
      shapePicker = null;
    }

    document
      .getElementById("cmnCircle")
      ?.removeEventListener("click", handleCircle);
    document
      .getElementById("cmnRectangle")
      ?.removeEventListener("click", handleRectangle);
    document
      .getElementById("cmnImageButton")
      ?.removeEventListener("click", handleImageButton);
    document
      .getElementById("cmnImageFile")
      ?.removeEventListener("change", handleImageFile);
    document
      .getElementById("cmnShapeWidth")
      ?.removeEventListener("change", handleShapeWidthChange);
    document
      .getElementById("cmnShapeHeight")
      ?.removeEventListener("change", handleShapeHeightChange);
  };

  jsonByPage = getJsonByPage(masterJson);

  return detach;
};
