// @ts-nocheck

import { initializeMultiPageRTE } from "./initializeMultiPageRTE";
import {
  defaultStyle,
  DocumentSize,
  loadFont,
  MultiPageEditor,
} from "./useMultiPageRTE";
import Konva from "konva";

let fontData = null;
let masterJson = null;
let isSelectingText = false;
let firstSelectedNode = null;
let lastSelectedNode = null;
let editorInstance: MultiPageEditor = null;
let editorActive = false;
let jsonByPage = null;

let stage = null;
let layer = null;
// let highlightLayer = null;
let highlightGroup = null;

let isSelected = false;

let debounceTimer = null;
let shadowSize = 25;

export const initializeMultiPageRTE = (
  initialMarkdown: string,
  mainTextSize: DocumentSize,
  documentSize: DocumentSize,
  marginSize: MarginSize,
  debounceCallback: () => {}
) => {
  const setMasterJson = (json, optionalInsertIndex) => {
    clearTimeout(debounceTimer);

    masterJson =
      optionalInsertIndex && masterJson
        ? [
            ...masterJson.slice(0, optionalInsertIndex), // Keep the elements before the replacement
            ...json, // Insert the new elements
            ...masterJson.slice(optionalInsertIndex + json.length), // Keep the elements after the replaced portion
          ]
        : json;
    // console.info("check json", masterJson, editorInstance);
    jsonByPage = getJsonByPage(masterJson);

    if (editorInstance) {
      if (jsonByPage && jsonByPage[0] && !stage) {
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
        layer = new Konva.Layer();

        stage?.add(layer);
        // stage?.add(highlightLayer);
      }

      stage.height(documentSize.height * editorInstance.pages.length);

      renderTextNodes(stage, layer, jsonByPage);

      debounceTimer = setTimeout(() => {
        // TODO: will need to actually save out formatting data as well
        // probably restore / save the masterJson, with option to restore from plaintext
        const content = editorInstance.getAllContent();
        debounceCallback(content, masterJson);
      }, 500);
    }
  };
  const setIsSelectingText = (is) => (isSelectingText = is);
  const setFirstSelectedNode = (node) => (firstSelectedNode = node);
  const setLastSelectedNode = (node) => (lastSelectedNode = node);
  const setEditorInstance = (instance) => (editorInstance = instance);
  const setEditorActive = (active) => (editorActive = active);

  const handleKeydown = (e: KeyboardEvent) => {
    e.preventDefault();

    if (editorActive) {
      // const characterId = uuidv4();

      if (!window.__canvasRTEInsertCharacterIndex) {
        console.info("trigger key with no cursor?");
        return;
      }

      switch (e.key) {
        case "Enter":
          {
            const character = "\n";

            editorInstance?.insert(
              window.__canvasRTEInsertCharacterIndex,
              character,
              defaultStyle,
              setMasterJson,
              false
            );

            window.__canvasRTEInsertCharacterIndex =
              window.__canvasRTEInsertCharacterIndex + 1;
          }
          break;
        case "Backspace":
          {
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
              character,
              defaultStyle,
              setMasterJson,
              false
            );

            window.__canvasRTEInsertCharacterIndex =
              window.__canvasRTEInsertCharacterIndex + 1;
          }
          break;
        default:
          {
            // any other character
            const type = "character";
            const character = e.key;

            // console.info("char", character);

            if (!editorActive) {
              console.error("No editor");
            }

            editorInstance?.insert(
              window.__canvasRTEInsertCharacterIndex,
              character,
              defaultStyle,
              setMasterJson,
              false
            );

            //   jsonByPage = getJsonByPage(masterJson);

            //   renderTextNodes(stage, layer, jsonByPage);

            window.__canvasRTEInsertCharacterIndex =
              window.__canvasRTEInsertCharacterIndex + 1;
          }
          break;
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
      editorInstance.renderAndRebalance(roughPage, setMasterJson, false);
    }
  };

  // when no text exists, will calculate at first character
  const handleCanvasClick = (e: KonvaEventObject<MouseEvent>) => {
    console.info("canvas click");

    setEditorActive(true);
  };

  // set the insert index to this character
  const handleTextClick = (e: KonvaEventObject<MouseEvent>) => {
    console.info("text click");

    const target = e.target;
    const characterId = target.id();
    const characterIndex = parseInt(characterId.split("-")[2]);

    console.info("characterId", characterId, characterIndex);

    const character = masterJson[characterIndex];

    window.__canvasRTEInsertCharacterIndex = characterIndex;

    setEditorActive(true);
  };

  const handleTextMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    console.info("text down", e);
    setIsSelectingText(true);

    const target = e.target;
    const characterId = target.id();

    setFirstSelectedNode(characterId);
    setLastSelectedNode(null);
  };
  const handleTextMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (isSelectingText && e.evt.buttons) {
      console.info("selecting text", e);

      const target = e.target;
      const characterId = target.id();

      // setSelectedTextNodes((nodes) => [characterId, ...nodes]);
      setLastSelectedNode(characterId);
      renderSelectionHighlight(stage, layer, jsonByPage);
    }
  };
  const handleTextMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    console.info("text up", e);
    setIsSelectingText(false);
  };

  const handleFormattingDown = (formatting: Partial<Style>) => {
    if (!firstSelectedNode || !lastSelectedNode) {
      return;
    }

    const firstIndex = parseInt(firstSelectedNode.split("-")[2]) + 1;
    const lastIndex = parseInt(lastSelectedNode.split("-")[2]);

    console.info("formatting on ", firstIndex, lastIndex, formatting);

    editorInstance?.alterFormatting(
      firstIndex,
      lastIndex,
      formatting,
      setMasterJson
    );
  };

  const renderTextNodes = (stg, lyr, jsonByPage) => {
    lyr.destroyChildren();

    // make jsonByPage return only the page, or detect current page here and filter by it?

    const roughPage = Math.floor((editorInstance.scrollPosition * 3) / 3000);
    console.info("roughPage render nodes", roughPage);

    console.info("render nodes", jsonByPage);

    let globalIndex = 0;
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
        onMouseDown: handleCanvasClick,
      });

      lyr.add(pageOuter);
      lyr.add(pageInner);
    }

    // Object.keys(jsonByPage).forEach((key, i) => {
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

    // var group2 = new Konva.Group({
    //   x: marginSize.x,
    //   y: documentSize.height * i + marginSize.y,
    // });

    for (let i = 0; i < masterJson.length; i++) {
      const charText = masterJson[i];

      if (charText?.char === "\n") {
        continue;
      }

      const charId = `${charText.char}-${charText.page}-${
        totalLengthBeforeIndex + globalIndex
      }`;
      // const isSelected = selectedTextNodes.includes(charId);
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
        text: charText.char,
        fontSize: charText.format.fontSize,
        fontFamily: charText.format.fontFamily,
        fontStyle: charText.format.italic
          ? "italic"
          : charText.format.fontWeight,
        fill: charText.format.color,
        textDecoration: charText.format.underline ? "underline" : "",
        // onClick: handleTextClick,
        // onMouseDown: handleTextMouseDown,
        // onMouseMove: handleTextMouseMove,
        // onMouseUp: handleTextMouseUp,
      });

      newText.on("click", handleTextClick);
      newText.on("mousedown", handleTextMouseDown);
      newText.on("mousemove", handleTextMouseMove);
      newText.on("mouseup", handleTextMouseUp);

      group.add(newText);

      globalIndex++;
    }

    lyr?.add(group);
    // lyr.add(group2);
    group.moveUp();
    // lyr.moveUp();
    // lyr.zIndex(2);
    // stg?.add(lyr);
    // });
  };

  const renderSelectionHighlight = (stg, lyr, jsonByPage) => {
    // lyr.destroyChildren();
    highlightGroup?.destroy();

    const roughPage = Math.floor((editorInstance.scrollPosition * 3) / 3000);
    const firstIndex = parseInt(firstSelectedNode.split("-")[2]) + 2;
    const lastIndex = parseInt(lastSelectedNode.split("-")[2]) + 1;

    let i = roughPage,
      key = roughPage;
    const masterJson = jsonByPage[key];

    highlightGroup = new Konva.Group({
      x: marginSize.x,
      y: (documentSize.height + shadowSize) * i + marginSize.y,
      name: "selectionGroup",
    });

    // masterJson.forEach((charText: RenderItem, i) => {
    for (let i = 0; i < masterJson.length; i++) {
      const charText = masterJson[i];

      if (charText?.char === "\n") continue;

      if (i < firstIndex || i > lastIndex) continue;

      let newRect = new Konva.Rect({
        id: "highlight" + i,
        x: charText?.x,
        y: charText?.y,
        width: charText?.width + 2,
        height: 26,
        fill: "lightgrey",
      });

      highlightGroup?.add(newRect);
    }
    // });

    lyr?.add(highlightGroup);
    highlightGroup.moveDown();
    // lyr?.moveDown();
    // lyr.zIndex(1);
  };

  const getJsonByPage = (masterJson) => {
    return masterJson?.reduce((acc, char) => {
      // if (!char.page) return acc;
      if (!acc[char.page]) {
        acc[char.page] = [];
      }

      acc[char.page].push(char);

      return acc;
    }, {} as { [key: number]: RenderItem[] });
  };

  loadFont((data) => {
    fontData = data;
    console.info("fontdata loaded, intializing editor", initialMarkdown.length);

    const multiPageEditor = new MultiPageEditor(mainTextSize, 70, fontData);

    editorInstance = multiPageEditor;

    multiPageEditor.insert(
      0,
      initialMarkdown,
      defaultStyle,
      setMasterJson,
      true
    );

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("scrollend", handleScrollEnd);

    document.getElementById("cmnFontSize")?.addEventListener("change", (e) => {
      handleFormattingDown({ fontSize: parseInt(e.target.value) });
    });
    document.getElementById("cmnBold")?.addEventListener("click", (e) => {
      handleFormattingDown({ fontWeight: "600" });
    });
    document.getElementById("cmnItalic")?.addEventListener("click", (e) => {
      handleFormattingDown({ italic: true });
    });
    document.getElementById("cmnUnderline")?.addEventListener("click", (e) => {
      handleFormattingDown({ underline: true });
    });

    //   return () => {
    //     window.removeEventListener("keydown", handleKeydown);
    //     window.removeEventListener("scroll", handleScroll);
    //     window.removeEventListener("scrollend", handleScrollEnd);
    //   };
  });

  jsonByPage = getJsonByPage(masterJson);
};
