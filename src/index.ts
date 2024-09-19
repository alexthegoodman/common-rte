// @ts-nocheck

import {
  defaultStyle,
  DocumentSize,
  loadFont,
  MultiPageEditor,
} from "./useMultiPageRTE";
import Konva from "konva";

console.info("Welcome to Common RTE");

let fontData = null;
let masterJson = null;
let isSelectingText = false;
let firstSelectedNode = null;
let lastSelectedNode = null;
let editorInstance = null;
let editorActive = false;
let jsonByPage = null;

let stage = null;
let layer = null;

const setMasterJson = (json) => (masterJson = json);
const setIsSelectingText = (is) => (isSelectingText = is);
const setFirstSelectedNode = (node) => (firstSelectedNode = node);
const setLastSelectedNode = (node) => (lastSelectedNode = node);
const setEditorInstance = (instance) => (editorInstance = instance);
const setEditorActive = (active) => (editorActive = active);

let isSelected = false;
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

          jsonByPage = getJsonByPage(masterJson);

          renderTextNodes(stage, layer, jsonByPage);

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
    const renderable = editorInstance.renderVisible();
    setMasterJson(renderable);
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

export const useMultiPageRTE = (
  initialMarkdown: string,
  mainTextSize: DocumentSize
) => {
  //   useEffect(() => {
  loadFont((data) => {
    fontData = data;
    console.info("fontdata loaded, intializing editor", initialMarkdown.length);

    const multiPageEditor = new MultiPageEditor(mainTextSize, 70, fontData);
    multiPageEditor.insert(
      0,
      initialMarkdown,
      defaultStyle,
      setMasterJson,
      true
    );

    //   setEditorInstance(multiPageEditor);
    editorInstance = multiPageEditor;
    jsonByPage = getJsonByPage(masterJson);

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("scrollend", handleScrollEnd);

    console.info("rendering", jsonByPage);

    if (jsonByPage && jsonByPage[0]) {
      console.info("render nodes");
      // initialize stage and layers
      stage = new Konva.Stage({
        container: "container",
        width: documentSize.width,
        height: documentSize.height * Object.keys(jsonByPage).length,
      });

      layer = new Konva.Layer();
    }

    if (jsonByPage && jsonByPage[0]) {
      // update text nodes
      let stg = stage ? stage : pureStage;
      let lyr = layer ? layer : pureLayer;

      console.info("render text nodes", stg, lyr);

      renderTextNodes(stg, lyr, jsonByPage);
    }

    //   return () => {
    //     window.removeEventListener("keydown", handleKeydown);
    //     window.removeEventListener("scroll", handleScroll);
    //     window.removeEventListener("scrollend", handleScrollEnd);
    //   };
  });
  //   }, []);

  jsonByPage = getJsonByPage(masterJson);

  return {
    masterJson,
    jsonByPage,
    // firstSelectedNode,
    // lastSelectedNode,
    // added to text nodes dynamically, not needed to be returned
    // handleCanvasClick,
    // handleTextClick,
    // handleTextMouseDown,
    // handleTextMouseMove,
    // handleTextMouseUp,
    // handleFormattingDown,
  };
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

const testMarkdown = `The ancient Mayan civilization was renowned for its remarkable architecture and monumental structures that continue to captivate researchers and historians to this day. Through detailed research and analysis, scholars have gained valuable insights into the unique architectural styles and construction techniques of the Maya. This document presents a comprehensive overview of the research findings on ancient Mayan architecture and monuments, shedding light on the significance and lasting legacy of these impressive structures. From towering pyramids to intricately carved monuments, join us as we delve into the rich history and cultural significance of the architectural wonders of the ancient Maya civilization. The ancient Mayan civilization was renowned for its remarkable architecture and monumental structures that continue to captivate researchers and historians to this day. Through detailed research and analysis, scholars have gained valuable insights into the unique architectural styles and construction techniques of the Maya. This document presents a comprehensive overview of the research findings on ancient Mayan architecture and monuments, shedding light on the significance and lasting legacy of these impressive structures. From towering pyramids to intricately carved monuments, join us as we delve into the rich history and cultural significance of the architectural wonders of the ancient Maya civilization. The ancient Mayan civilization was renowned for its remarkable architecture and monumental structures that continue to captivate researchers and historians to this day. Through detailed research and analysis, scholars have gained valuable insights into the unique architectural styles and construction techniques of the Maya. This document presents a comprehensive overview of the research findings on ancient Mayan architecture and monuments, shedding light on the significance and lasting legacy of these impressive structures. From towering pyramids to intricately carved monuments, join us as we delve into the rich history and cultural significance of the architectural wonders of the ancient Maya civilization. The ancient Mayan civilization was renowned for its remarkable architecture and monumental structures that continue to captivate researchers and historians to this day. Through detailed research and analysis, scholars have gained valuable insights into the unique architectural styles and construction techniques of the Maya. This document presents a comprehensive overview of the research findings on ancient Mayan architecture and monuments, shedding light on the significance and lasting legacy of these impressive structures. From towering pyramids to intricately carved monuments, join us as we delve into the rich history and cultural significance of the architectural wonders of the ancient Maya civilization.`;

useMultiPageRTE(testMarkdown, mainTextSize);

const renderTextNodes = (stg, lyr, jsonByPage) => {
  lyr.destroyChildren();

  Object.keys(jsonByPage).forEach((key, i) => {
    const masterJson = jsonByPage[key];

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

    var group = new Konva.Group({
      x: marginSize.x,
      y: documentSize.height * i + marginSize.y,
    });

    masterJson.forEach((charText: RenderItem, i) => {
      const charId = `${charText.char}-${charText.page}-${i}`;
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

      group.add(newText);
    });

    lyr?.add(group);
    stg?.add(lyr);
  });
};
