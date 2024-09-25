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
          container: "container",
          width: documentSize.width,
          height: documentSize.height * editorInstance.pages.length,
        });

        // highlightLayer = new Konva.Layer();
        layer = new Konva.Layer();

        stage?.add(layer);
        // stage?.add(highlightLayer);
      }

      stage.height(documentSize.height * editorInstance.pages.length);

      renderTextNodes(stage, layer, jsonByPage);

      debounceTimer = setTimeout(() => {
        const content = editorInstance.getAllContent();
        debounceCallback(content);
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
        y: documentSize.height * i,
        width: documentSize.width,
        height: documentSize.height,
        fill: "#e5e5e5",
      });

      var pageInner = new Konva.Rect({
        x: marginSize.x,
        y: documentSize.height * i + marginSize.y,
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
      y: documentSize.height * i + marginSize.y,
    });

    // var group2 = new Konva.Group({
    //   x: marginSize.x,
    //   y: documentSize.height * i + marginSize.y,
    // });

    masterJson.forEach((charText: RenderItem, i) => {
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

      // let testPoint = new Konva.Rect({
      //   id: "highlight" + i,
      //   x: charText?.x,
      //   y: charText?.y,
      //   width: charText?.width + 2,
      //   height: 26,
      //   fill: "blue",
      // });

      newText.on("click", handleTextClick);
      newText.on("mousedown", handleTextMouseDown);
      newText.on("mousemove", handleTextMouseMove);
      newText.on("mouseup", handleTextMouseUp);

      // group2.add(testPoint);
      group.add(newText);

      globalIndex++;
    });

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
    const firstIndex = parseInt(firstSelectedNode.split("-")[2]);
    const lastIndex = parseInt(lastSelectedNode.split("-")[2]);

    let i = roughPage,
      key = roughPage;
    const masterJson = jsonByPage[key];

    highlightGroup = new Konva.Group({
      x: marginSize.x,
      y: documentSize.height * i + marginSize.y,
      name: "selectionGroup",
    });

    masterJson.forEach((charText: RenderItem, i) => {
      if (i < firstIndex || i > lastIndex) return;

      let newRect = new Konva.Rect({
        id: "highlight" + i,
        x: charText?.x,
        y: charText?.y,
        width: charText?.width + 2,
        height: 26,
        fill: "lightgrey",
      });

      highlightGroup?.add(newRect);
    });

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

    //   return () => {
    //     window.removeEventListener("keydown", handleKeydown);
    //     window.removeEventListener("scroll", handleScroll);
    //     window.removeEventListener("scrollend", handleScrollEnd);
    //   };
  });

  jsonByPage = getJsonByPage(masterJson);
};