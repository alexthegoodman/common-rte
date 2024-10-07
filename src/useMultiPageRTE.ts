// @ts-nocheck

// import RopeSequence from "rope-sequence";
import { ComponentRope } from "./ComponentRope";
import IntervalTree, {
  Interval,
  SearchOutput,
} from "@flatten-js/interval-tree";
import * as fontkit from "fontkit";
import { v4 as uuidv4 } from "uuid";
// import { KonvaEventObject } from "konva/lib/Node";
// import { useEffect, useMemo, useRef, useState } from "react";
import { Buffer } from "buffer";

// import fontUrl from "../src/assets/fonts/Inter-Regular.ttf";

// @ts-ignore
window.Buffer = Buffer;

interface MappedFormat {
  interval: {
    high: number;
    low: number;
  };
  format: Style;
}

interface FormattedText {
  text: string;
  format: Style | null;
}

export interface RenderItem {
  realChar: string;
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capHeight: number;
  format: Style;
  page: number;
}

export type Style = {
  color: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  italic: boolean;
  underline: boolean;
  isLineBreak: boolean;
};

export interface DocumentSize {
  width: number;
  height: number;
}

export type MarginSize = {
  x: number;
  y: number;
};

export enum VisualKinds {
  circle = "Circle",
  rectangle = "Rectangle",
  image = "Image",
}

export interface Visual {
  id: string;
  kind: VisualKinds;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  page: number;
  url: string;
}

export const defaultVisual: Visual = {
  id: "none",
  kind: VisualKinds.circle,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  page: 0,
};

const letterSpacing = 1;
export const defaultStyle: Style = {
  color: "black",
  fontSize: 16,
  fontWeight: "normal",
  fontFamily: "Inter",
  italic: false,
  underline: false,
  isLineBreak: false,
};

const blobToBuffer = async (blob: Blob) => {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = window.Buffer.from(arrayBuffer);
  return buffer;
};

export const loadFont = async (
  setFont: (font: fontkit.Font) => void,
  fontUrl: string
) => {
  try {
    const response = await fetch(fontUrl);
    const blob = await response.blob();
    const buffer = await blobToBuffer(blob);
    const font = fontkit.create(buffer);
    setFont(font as fontkit.Font);
  } catch (error) {
    console.error("Error loading font", fontUrl, error);
    // TODO: show snackbar, disable loading of initial text, possibly try loading other font
  }
};

// extend window type
declare global {
  interface Window {
    // __canvasRTEEditorActive: boolean;
    //   __canvasRTEInsertCharacterId: string | null;
    __canvasRTEInsertCharacterIndex: number;
    __canvasRTEInsertCharacterIndexNl: number;
  }
}

// window.__canvasRTEEditorActive = false;
//   window.__canvasRTEInsertCharacterId = null;
window.__canvasRTEInsertCharacterIndex = 0;
window.__canvasRTEInsertCharacterIndexNl = 0;

class LayoutTree {
  public root: LayoutNode;
  public maxSafeInt: number = 3000;

  constructor() {
    this.root = new LayoutNode(0, Infinity);
  }

  update(start: number, end: number, layoutInfo: RenderItem[]) {
    this.root.update(start, end, layoutInfo);
  }

  query(start: number, end: number) {
    return this.root.query(start, end);
  }

  queryInfos(index: number) {
    const query = this.root.query(0, this.root.max);
    // console.info("queryInfos", query);
    return query[0].layoutInfo ? query[0].layoutInfo[index] : null;
  }
}

class LayoutNode {
  public start: number;
  public end: number;
  public left: LayoutNode | null;
  public right: LayoutNode | null;
  public layoutInfo: RenderItem[] | null;
  public max: number;

  constructor(
    start: number,
    end: number,
    layoutInfo: RenderItem[] | null = null
  ) {
    this.start = start;
    this.end = end;
    this.left = null;
    this.right = null;
    this.layoutInfo = layoutInfo ? layoutInfo : null;
    this.max = end; // Helps in quickly determining if a range intersects this node
  }

  update(start: number, end: number, layoutInfo: RenderItem[]) {
    // console.info("LayoutNode update: ", start, end, layoutInfo);

    this.layoutInfo = layoutInfo;

    // If the update range is completely outside this node's range, do nothing
    if (end <= this.start || start >= this.end) {
      return;
    }

    // If this node is completely contained in the update range
    if (start <= this.start && end >= this.end) {
      return;
    }

    // console.info("working on update...");

    // Recurse on children
    if (this.left) {
      this.left.update(start, end, layoutInfo);
    }
    if (this.right) {
      this.right.update(start, end, layoutInfo);
    }

    // If this node is a leaf and partially overlaps, split it
    if (!this.left && !this.right) {
      // console.info("split");
      this.split();
    }

    // Update max value
    this.max = Math.max(
      this.left ? this.left.max : this.end,
      this.right ? this.right.max : this.end
    );
  }

  query(start: number, end: number): LayoutNode[] {
    // If the query range is completely outside this node's range, return empty array
    if (end <= this.start || start >= this.max) {
      // console.warn("node query out of range", end, this.start, start, this.max);
      return [];
    }

    // If this node is a leaf, return its layout info
    if (!this.left && !this.right) {
      // return [
      //   { start: this.start, end: this.end, layoutInfo: this.layoutInfo },
      // ];
      // console.info("leaf");
      return [new LayoutNode(this.start, this.end, this.layoutInfo)];
    }

    // Recurse on children
    let result: LayoutNode[] = [];
    if (this.left) {
      // console.info("has left");
      result = result.concat(this.left.query(start, end));
    }
    if (this.right) {
      // console.info("has right");
      result = result.concat(this.right.query(start, end));
    }

    // console.info("LayoutNode query: ", result);

    return result;
  }

  split() {
    const mid = Math.floor((this.start + this.end) / 2);
    this.left = new LayoutNode(this.start, mid);
    this.right = new LayoutNode(mid, this.end);

    if (this.layoutInfo) {
      // console.info("split set layoutInfo", this.layoutInfo);
      this.left.layoutInfo = this.layoutInfo;
      this.right.layoutInfo = this.layoutInfo;
    }
  }
}

// class LayoutNode {
//   public start: number;
//   public end: number;
//   public left: LayoutNode | null;
//   public right: LayoutNode | null;
//   public layoutInfo: RenderItem[] | null;
//   public max: number;
//   public maxSafeInt: number = 3000;

//   constructor(
//     start: number,
//     end: number,
//     layoutInfo: RenderItem[] | null = null
//   ) {
//     this.start = start;
//     this.end = end;
//     this.left = null;
//     this.right = null;
//     this.layoutInfo = layoutInfo;
//     this.max = end;
//   }

//   update(start: number, end: number, layoutInfo: RenderItem[]) {
//     console.log("Updating node", {
//       currentStart: this.start,
//       currentEnd: this.end,
//       updateStart: start,
//       updateEnd: end,
//     });

//     if (end <= this.start || start >= this.end) {
//       console.log("No overlap, returning", {
//         currentStart: this.start,
//         currentEnd: this.end,
//         updateStart: start,
//         updateEnd: end,
//       });
//       return;
//     }

//     if (start <= this.start && end >= this.end) {
//       console.log("Full overlap, updating layoutInfo");
//       this.layoutInfo = layoutInfo;
//       return;
//     }

//     if (!this.left && !this.right) {
//       console.log("Splitting node", {
//         currentStart: this.start,
//         currentEnd: this.end,
//       });
//       this.split();
//     }

//     if (this.left) {
//       console.log("Updating left node", {
//         leftStart: this.left.start,
//         leftEnd: this.left.end,
//       });
//       this.left.update(start, end, layoutInfo);
//     }
//     if (this.right) {
//       console.log("Updating right node", {
//         rightStart: this.right.start,
//         rightEnd: this.right.end,
//       });
//       this.right.update(start, end, layoutInfo);
//     }

//     this.max = Math.max(
//       this.left ? this.left.max : this.end,
//       this.right ? this.right.max : this.end
//     );
//   }

//   query(start: number, end: number): LayoutNode[] {
//     if (end <= this.start || start >= this.max) {
//       return [];
//     }

//     if (!this.left && !this.right) {
//       return [new LayoutNode(this.start, this.end, this.layoutInfo)];
//     }

//     let result: LayoutNode[] = [];
//     if (this.left) {
//       result = result.concat(this.left.query(start, end));
//     }
//     if (this.right) {
//       result = result.concat(this.right.query(start, end));
//     }

//     return result;
//   }

//   split() {
//     if (this.end - this.start <= 1) {
//       return; // Stop splitting if the range is too small
//     }

//     const mid = Math.floor((this.start + this.end) / 2);
//     this.left = new LayoutNode(this.start, mid, this.layoutInfo);
//     this.right = new LayoutNode(mid, this.end, this.layoutInfo);
//   }
// }

class FormattedPage {
  //   public content: RopeSequence<any>;
  public content: ComponentRope;
  public formatting: IntervalTree;
  public layout: LayoutTree;
  public size: DocumentSize;
  public pageNumber: number;

  public fontData: fontkit.Font;

  constructor(
    size: DocumentSize,
    fontData: fontkit.Font,
    pageNumber: number = 0
  ) {
    this.content = new ComponentRope("");
    this.formatting = new IntervalTree();
    this.layout = new LayoutTree();
    this.size = size;
    this.fontData = fontData;
    this.pageNumber = pageNumber;
  }

  getCharAtIndex(localIndexNl: number) {
    return this.content.substring(localIndexNl, localIndexNl + 1);
  }

  // getNewlinesBetween(startIndexNl: number, endIndexNl: number) {
  //   const content = this.content.substring(startIndexNl, endIndexNl);
  //   console.info("getNewlinesBetween", startIndexNl, endIndexNl, content);
  //   let count = 0;
  //   for (let i = 0; i < content.length; i++) {
  //     const char = content[i];
  //     if (char === "\n") {
  //       count++;
  //     }
  //   }
  //   return count;
  // }

  // insert(index: number, text: string, format: Style) {
  //   performance.mark("page-insert-started");

  //   const lines = text.split(/\r?\n/);
  //   let currentIndex = index;

  //   for (let i = 0; i < lines.length; i++) {
  //     const line = lines[i];

  //     currentIndex = Math.min(currentIndex, this.content.length);

  //     if (line.length > 0) {
  //       // Insert the line
  //       this.content.insert(currentIndex, line);
  //       this.formatting.insert(
  //         new Interval(currentIndex, currentIndex + line.length),
  //         format
  //       );
  //     }

  //     currentIndex += line.length;

  //     // If this isn't the last line, insert a line break
  //     if (i < lines.length - 1 || line === "") {
  //       this.insertLineBreak(currentIndex);
  //       currentIndex++;
  //     }
  //   }

  //   performance.mark("page-insert-ended");

  //   performance.measure(
  //     "pageInsert",
  //     "page-insert-started",
  //     "page-insert-ended"
  //   );
  // }

  insert(index: number, nlIndex: number, text: string, format: Style) {
    // if (text === "\n") {
    //   console.info("text is newline");
    // }
    // console.info("insert ", index, nlIndex, text);

    performance.mark("page-insert-started");

    const lines = text.split(/\r?\n/);
    let currentIndex = index;
    let currentNlIndex = nlIndex;
    let totalInsertedLength = 0;

    let linesFinished = 0; // one newline for each line

    // console.info("text lines", lines);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      currentIndex = Math.min(currentIndex, this.content.length);
      currentNlIndex = Math.min(currentNlIndex, this.content.length);

      if (text !== "\n") {
        if (line.length > 0) {
          // Insert the line
          this.content.insert(currentNlIndex, line);

          // Shift existing intervals
          // this.shiftIntervalsAfter(currentIndex, line.length);

          // Insert new formatting
          this.formatting.insert(
            new Interval(currentIndex, currentIndex + line.length),
            format
          );
          // console.info(
          //   "inserted format in insert",
          //   this.pageNumber,
          //   currentIndex,
          //   currentIndex + line.length,
          //   format
          // );

          totalInsertedLength += line.length;
        }
      }

      currentIndex += line.length;
      currentNlIndex += line.length;

      // If this isn't the last line, insert a line break
      if (i < lines.length - 1) {
        this.insertLineBreak(currentIndex, currentNlIndex);
        // this.shiftIntervalsAfter(currentIndex, 1);
        // currentIndex++;
        currentNlIndex++;
        totalInsertedLength++;
      }

      linesFinished++;
    }

    // Shift all intervals after the entire insertion
    this.shiftIntervalsAfter(index, totalInsertedLength);

    performance.mark("page-insert-ended");
    performance.measure(
      "pageInsert",
      "page-insert-started",
      "page-insert-ended"
    );
  }

  insertJson(json: RenderItem[]) {
    let currentFormat = null;
    let formatStart = 0;
    let formatEnd = 0;
    let formatDiff = 0;
    let isNewLine = true;
    let contentIndex = 0;
    for (let i = 0; i < json.length; i++) {
      contentIndex++;

      const renderItem = json[i];

      const prevRenderItem = json[i - 1];
      const nextRenderItem = json[i + 1];

      if (prevRenderItem?.char === "\n") {
        // currentX = 0;
        // currentY += lineHeight;
        isNewLine = true;
        // isBulletPoint = false;
        // isHeadline1 = false;
        // continue;
      }

      // if (i < 20) {
      //   console.info(
      //     "insertJson",
      //     renderItem,
      //     isNewLine,
      //     renderItem.char === "#",
      //     nextRenderItem.char === " "
      //   );
      // }

      this.content.insert(contentIndex - 1, renderItem.realChar);

      if (
        isNewLine &&
        renderItem.realChar === "-" &&
        nextRenderItem.realChar === " "
      ) {
        contentIndex++;
        this.content.insert(contentIndex - 1, " ");
        i += 1;
        continue;
      }

      if (
        isNewLine &&
        renderItem.realChar === "#" &&
        nextRenderItem.realChar === " "
      ) {
        console.info("indent");
        contentIndex++;
        this.content.insert(contentIndex - 1, " ");
        i += 1;
        continue;
      }

      if (!currentFormat) {
        currentFormat = renderItem.format;
      }

      if (
        currentFormat?.color !== renderItem.format.color ||
        currentFormat?.fontFamily !== renderItem.format.fontFamily ||
        currentFormat?.fontSize !== renderItem.format.fontSize ||
        currentFormat?.fontWeight !== renderItem.format.fontWeight ||
        currentFormat?.isLineBreak !== renderItem.format.isLineBreak ||
        currentFormat?.italic !== renderItem.format.italic ||
        currentFormat?.underline !== renderItem.format.underline
      ) {
        console.info(
          "formatting insert",
          formatStart,
          formatEnd,
          currentFormat,
          renderItem
        );

        this.formatting.insert(
          new Interval(formatStart, formatEnd - 1),
          currentFormat
        );

        formatStart += formatDiff;
        currentFormat = renderItem.format;
        formatDiff = 0;
      }

      formatEnd++;
      formatDiff++;
      isNewLine = false;

      // this.layout.update(i, i + 1, [renderItem]); // should be unnecessary as rebalance updates layouts
    }
  }

  shiftIntervalsAfter(index: number, shiftAmount: number) {
    // Get all intervals
    const allIntervals = this.formatting.search(
      new Interval(-Infinity, Infinity),
      (value, key) => ({
        interval: key,
        format: value,
      })
    ) as unknown as MappedFormat[];

    // Remove all intervals from the tree
    this.formatting.clear();

    // Shift and reinsert intervals
    // allIntervals.forEach(([start, end, format]) => {
    for (const { interval, format } of allIntervals) {
      let start = interval.low;
      let end = interval.high;

      if (start >= index) {
        // Interval starts after or at the index, shift entirely
        this.formatting.insert(
          new Interval(start + shiftAmount, end + shiftAmount),
          format
        );
      } else if (end > index) {
        // Interval overlaps with the index, extend the end
        this.formatting.insert(new Interval(start, end + shiftAmount), format);
      } else {
        // Interval is before the index, no change needed
        this.formatting.insert(new Interval(start, end), format);
      }
    }
    // });
  }

  insertLineBreak(index: number, nlIndex: number) {
    // console.info("insertLineBreak", index, nlIndex);
    // Insert a special character or object to represent a line break
    index = Math.min(index, this.content.length);
    nlIndex = Math.min(nlIndex, this.content.length);
    // console.info("inserting line break");
    this.content.insert(nlIndex, "\n");
    // this.content.insert(index + 1, "\n");
    // this.updateFormatting(index, 1, { isLineBreak: true });
    this.formatting.insert(new Interval(index, index + 1), {
      ...defaultStyle,
      isLineBreak: true,
    });
  }

  // nl for newlines because content contains newlines
  delete(start: number, end: number, nlStart: number, nlEnd: number) {
    const deleteLength = end - start;
    this.content.remove(
      typeof nlStart !== "undefined" ? nlStart : start,
      typeof nlEnd !== "undefined" ? nlEnd : end
    );
    this.formatting.remove(new Interval(start, end));
    this.adjustFormatting(start, -deleteLength);
  }

  adjustFormatting(index: number, length: number) {
    // this.formatting.forEach([index, Infinity], (interval: Interval) => {
    // TODO: optimize
    this.formatting.forEach((key: [number, number], value) => {
      if (key[0] >= index) {
        this.formatting.remove(key);
        // this.formatting.insert([key[0] + length, key[1] + length], value);
        this.formatting.insert(
          new Interval(key[0] + length, key[1] + length),
          value
        );
      } else if (key[1] > index) {
        this.formatting.remove(key);
        // this.formatting.insert([key[0], key[1] + length], value);
        this.formatting.insert(new Interval(key[0], key[1] + length), value);
      }
    });
  }

  alterFormatting(start: number, end: number, formatChanges: Partial<Style>) {
    // console.info("alterFormatting", start, end);
    // Ensure start and end are within bounds
    start = Math.max(0, Math.min(start, this.content.length));
    end = Math.max(start, Math.min(end, this.content.length));

    const formatStart = start;
    const formatEnd = end;

    // Get existing formatting in the range
    const existingFormats = this.formatting.search(
      new Interval(formatStart, formatEnd),
      (value, key) => ({
        interval: key,
        format: value,
      })
    ) as unknown as MappedFormat[];

    console.info("existing formats", existingFormats);

    // Remove existing formatting in the range
    this.formatting.remove(new Interval(formatStart, formatEnd));

    // Apply new formatting
    for (const { interval, format } of existingFormats) {
      const newStart = Math.max(interval.low, formatStart);
      const newEnd = Math.min(interval.high, formatEnd);

      // console.info("check", formatStart, formatEnd, newStart, newEnd);

      if (newStart < newEnd) {
        const updatedFormat = { ...format, ...formatChanges };
        // console.info(
        //   "apply new formatting",
        //   newStart,
        //   newEnd,
        //   format,
        //   updatedFormat
        // );
        this.formatting.remove(new Interval(newStart, newEnd));
        this.formatting.insert(new Interval(newStart, newEnd), updatedFormat);
      }
    }

    // If there's any gap in formatting, fill it with the new format
    if (
      existingFormats.length === 0 ||
      existingFormats[0].interval.low > start ||
      existingFormats[existingFormats.length - 1].interval.high < end
    ) {
      const defaultFormatWithChanges = { ...defaultStyle, ...formatChanges };
      this.formatting.insert(
        new Interval(formatStart, formatEnd),
        defaultFormatWithChanges
      );
      console.info("format inserted");
    }

    // Update layout for the affected range
    // this.updateLayout(formatStart, formatEnd);
    this.updateLayout(0, this.content.length);
  }

  getFormattedText(start: number, end: number) {
    const text = this.content.substring(start, end);
    // console.info("check text", text.includes("\n"));
    const formats = this.formatting.search(
      new Interval(start, end),
      (value, key) => ({
        interval: key,
        format: value,
      })
    ) as unknown as MappedFormat[];
    console.info("also getFormattedText", this.pageNumber, start, end, formats);
    return this.mergeTextAndFormatting(text, formats, start);
  }

  mergeTextAndFormatting(
    text: string,
    formats: MappedFormat[],
    offset: number
  ) {
    let result: FormattedText[] = [];
    let currentIndex = 0;

    // formats.sort((a, b) => a[0] - b[0]);
    formats.sort((a, b) => a.interval.low - a.interval.low);

    // console.info("formats", formats);

    for (let { interval, format } of formats) {
      // let start = interval[0];
      // let end = interval[1];
      let start = interval.low;
      let end = interval.high;

      // if format interval is 0 and 0, it will continue to pull from 0...

      start = Math.max(start - offset, 0);
      end = Math.min(end - offset, text.length);

      if (currentIndex < start) {
        result.push({ text: text.slice(currentIndex, start), format: null });
      }

      result.push({ text: text.slice(start, end), format });
      currentIndex = end;
    }

    if (currentIndex < text.length) {
      result.push({ text: text.slice(currentIndex), format: null });
    }

    return result;
  }

  updateLayout(
    start: number,
    end: number,
    insertLength: number,
    insertIndex: number
  ) {
    const text = this.content.substring(start, end);
    const formats = this.formatting.search(
      new Interval(start, end),
      (value, key) => ({
        interval: key,
        format: value,
      })
    ) as unknown as MappedFormat[];
    // console.info("updateLayout: ", text, formats, start);
    const layoutInfo = this.calculateLayout(
      text,
      formats,
      start,
      0,
      insertLength,
      insertIndex
    );
    // console.info("updateLayout: ", start, end);
    this.layout.update(start, end, layoutInfo);
  }

  // calculateLayout(
  //   text: string,
  //   formats: MappedFormat[],
  //   offset: number,
  //   pageNumber: number,
  //   insertLength: number,
  //   insertIndex: number
  // ): RenderItem[] {
  //   let layoutInfo = [];
  //   let currentX = 0;
  //   let currentY = 0;
  //   let lineHeight = 0;

  //   let currentPageNumber = this.pageNumber;
  //   const pageHeight = this.size.height; // Assuming you have a pageHeight property

  //   console.info("calculateLayout", pageNumber);

  //   let contentIndex = 0;
  //   for (let i = 0; i < text.length; i++) {
  //     const char = text[i];

  //     // if (char === "\n" || format?.isLineBreak) { // TODO: verify that format.isLineBreak is indeed at same index as this char, otherwise may be misplaced
  //     if (char === "\n") {
  //       // Move to the next line
  //       currentX = 0;
  //       currentY += lineHeight;
  //       // lineHeight = 0;
  //       continue;
  //     }

  //     contentIndex++;

  //     // const format = this.getFormatAtIndex(i + offset, formats);
  //     const format = this.getFormatAtIndex(contentIndex - 1, formats);

  //     let layoutIndex =
  //       contentIndex > insertIndex ? contentIndex - insertLength : contentIndex; // minus because from old layout

  //     let prevLayoutInfo = this.layout.queryInfos(layoutIndex - 1);
  //     let prevLayoutInfoCheck = this.layout.queryInfos(contentIndex - 1);

  //     // console.info("layout at index", prevLayoutInfo);

  //     if (!format?.fontSize) {
  //       console.warn("no format on char?");
  //     }

  //     // const fontData = this.getFontData(format.fontFamily);
  //     const style = {
  //       ...defaultStyle,
  //       fontSize: format?.fontSize ? format.fontSize : defaultStyle.fontSize,
  //       fontWeight: format?.fontWeight
  //         ? format.fontWeight
  //         : defaultStyle.fontWeight,
  //     };

  //     let cachedWidth = 0;
  //     let cachedHeight = 0;

  //     if (prevLayoutInfoCheck && prevLayoutInfoCheck.char === char) {
  //       prevLayoutInfo = prevLayoutInfoCheck;
  //     }

  //     // if (prevLayoutInfo && prevLayoutInfo.char !== char) {
  //     //   console.info(
  //     //     "no match on layout ",
  //     //     currentPageNumber,
  //     //     layoutIndex,
  //     //     contentIndex,
  //     //     insertLength,
  //     //     insertIndex,
  //     //     char,
  //     //     prevLayoutInfo,
  //     //     prevLayoutInfoCheck
  //     //   );
  //     // }

  //     // yes, this caching helps when the chars match, but frequently they don't when a new char is inserted
  //     // in theory, by providing length of text inserted and insertion index, we can be more likely to grab the cached value
  //     if (prevLayoutInfo && prevLayoutInfo.char === char) {
  //       // console.info("prevLayoutInfo", char, prevLayoutInfo);

  //       if (
  //         prevLayoutInfo?.format.color !== style.color ||
  //         prevLayoutInfo?.format.fontFamily !== style.fontFamily ||
  //         prevLayoutInfo?.format.fontSize !== style.fontSize ||
  //         prevLayoutInfo?.format.fontWeight !== style.fontWeight ||
  //         prevLayoutInfo?.format.isLineBreak !== style.isLineBreak ||
  //         prevLayoutInfo?.format.italic !== style.italic ||
  //         prevLayoutInfo?.format.underline !== style.underline
  //       ) {
  //         // console.info(
  //         //   "difference detected, get new width and height",
  //         //   prevLayoutInfo,
  //         //   cachedWidth,
  //         //   cachedHeight
  //         // );

  //         const { width, height } = getCharacterBoundingBox(
  //           this.fontData,
  //           char,
  //           style
  //         );

  //         cachedWidth = width;
  //         cachedHeight = height;
  //       } else {
  //         // no difference detected, uses cached dimensions
  //         cachedWidth = prevLayoutInfo?.width;
  //         cachedHeight = prevLayoutInfo?.height;
  //       }
  //     } else {
  //       const { width, height } = getCharacterBoundingBox(
  //         this.fontData,
  //         char,
  //         style
  //       );

  //       cachedWidth = width;
  //       cachedHeight = height;
  //     }

  //     const capHeight = getCapHeightPx(this.fontData, style.fontSize);

  //     // Check if we need to wrap to the next line
  //     if (currentX + cachedWidth > this.size.width) {
  //       currentX = 0;
  //       currentY += lineHeight;
  //       lineHeight = 0;
  //     }

  //     // // Check again for new page after line break
  //     // console.info("check page ", currentY + capHeight, pageHeight);
  //     if (currentY + capHeight > pageHeight) {
  //       currentPageNumber++;
  //       currentY = 0;
  //       // console.warn("new page", currentPageNumber);
  //     }

  //     layoutInfo.push({
  //       char,
  //       x: currentX ? currentX + letterSpacing : 0,
  //       y: currentY,
  //       width: cachedWidth,
  //       height: cachedHeight,
  //       capHeight,
  //       format,
  //       page: currentPageNumber,
  //     });

  //     currentX += cachedWidth + letterSpacing;
  //     lineHeight = Math.max(lineHeight, capHeight);
  //   }

  //   // console.info("layoutinfo", layoutInfo);

  //   return layoutInfo;
  // }

  calculateLayout(
    text: string,
    formats: MappedFormat[],
    offset: number,
    pageNumber: number,
    insertLength: number,
    insertIndex: number
  ): RenderItem[] {
    let layoutInfo = [];
    let currentX = 0;
    let currentY = 0;
    let lineHeight = 0;
    let currentPageNumber = this.pageNumber;
    const pageHeight = this.size.height;
    let contentIndex = 0;
    let isNewLine = true;
    let isBulletPoint = false;
    let isHeadline1 = false;
    const bulletIndent = 40; // Adjust as needed

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === "\n") {
        currentX = 0;
        currentY += lineHeight;
        isNewLine = true;
        isBulletPoint = false;
        isHeadline1 = false;
        continue;
      }

      if (isNewLine && char === "-" && text[i + 1] === " ") {
        isBulletPoint = true;
        i++; // Skip the space after the dash
        currentX = bulletIndent; // Indent the text after the bullet
        contentIndex++; // ?
      }

      if (isNewLine && char === "#" && text[i + 1] === " ") {
        isHeadline1 = true;
        i++; // Skip the space after the pound
        contentIndex++; // ?
      }

      contentIndex++;

      const format = this.getFormatAtIndex(contentIndex - 1, formats);
      let layoutIndex =
        contentIndex > insertIndex ? contentIndex - insertLength : contentIndex;

      let prevLayoutInfo = this.layout.queryInfos(layoutIndex - 1);
      let prevLayoutInfoCheck = this.layout.queryInfos(contentIndex - 1);

      const style = {
        ...defaultStyle,
        fontSize: format?.fontSize ?? defaultStyle.fontSize,
        fontWeight: format?.fontWeight ?? defaultStyle.fontWeight,
        color: format?.color ?? defaultStyle.color,
        fontFamily: format?.fontFamily ?? defaultStyle.fontFamily,
        isLineBreak: format?.isLineBreak ?? defaultStyle.isLineBreak,
        italic: format?.italic ?? defaultStyle.italic,
        underline: format?.underline ?? defaultStyle.underline,
      };

      // TODO: users should be able to change a headlines size when not knowing markdown was imported (having to remove the # )
      if (isHeadline1) {
        style.fontSize = 36;
        // lineHeight = 26;
      }

      let cachedWidth = 0;
      let cachedHeight = 0;

      if (prevLayoutInfoCheck && prevLayoutInfoCheck.char === char) {
        prevLayoutInfo = prevLayoutInfoCheck;
      }

      if (prevLayoutInfo && prevLayoutInfo.char === char) {
        if (
          prevLayoutInfo?.format.color !== style.color ||
          prevLayoutInfo?.format.fontFamily !== style.fontFamily ||
          prevLayoutInfo?.format.fontSize !== style.fontSize ||
          prevLayoutInfo?.format.fontWeight !== style.fontWeight ||
          prevLayoutInfo?.format.isLineBreak !== style.isLineBreak ||
          prevLayoutInfo?.format.italic !== style.italic ||
          prevLayoutInfo?.format.underline !== style.underline
        ) {
          const { width, height } = getCharacterBoundingBox(
            this.fontData,
            char,
            style
          );
          cachedWidth = width;
          cachedHeight = height;
        } else {
          cachedWidth = prevLayoutInfo?.width;
          cachedHeight = prevLayoutInfo?.height;
        }
      } else {
        const { width, height } = getCharacterBoundingBox(
          this.fontData,
          char,
          style
        );
        cachedWidth = width;
        cachedHeight = height;
      }

      const capHeight = getCapHeightPx(this.fontData, style.fontSize);

      if (isNewLine) {
        lineHeight = capHeight;
      } else {
        lineHeight = Math.max(lineHeight, capHeight);
      }

      // if (cachedHeight > 20) {
      //   console.info("bigger", char, cachedHeight, lineHeight);
      // }

      if (currentX + cachedWidth > this.size.width) {
        currentX = isBulletPoint ? bulletIndent : 0;
        currentY += lineHeight;
        lineHeight = 0;
      }

      if (currentY + capHeight > pageHeight) {
        currentPageNumber++;
        currentY = 0;
        isNewLine = true;
        isBulletPoint = false;
      }

      // Add bullet point if necessary
      if (isHeadline1 && isNewLine) {
        layoutInfo.push({
          realChar: "#",
          char: "", // hide markdown
          x: 0, // Adjust as needed
          y: currentY,
          width: cachedWidth,
          height: cachedHeight,
          capHeight,
          format: style,
          page: currentPageNumber,
        });
        layoutInfo.push({
          realChar: " ", // hide markdown, keep everything indexed properly
          char: "",
          x: 0,
          y: currentY,
          width: cachedWidth,
          height: cachedHeight,
          capHeight,
          format: style,
          page: currentPageNumber,
        });
      } else if (isBulletPoint && isNewLine) {
        layoutInfo.push({
          realChar: "-",
          char: "•", // Unicode bullet character
          x: 25, // Adjust as needed
          y: currentY,
          width: cachedWidth,
          height: cachedHeight,
          capHeight,
          format: style,
          page: currentPageNumber,
        });
        layoutInfo.push({
          realChar: " ",
          char: "", // keep everything indexed properly
          x: 25,
          y: currentY,
          width: cachedWidth,
          height: cachedHeight,
          capHeight,
          format: style,
          page: currentPageNumber,
        });
      } else {
        layoutInfo.push({
          char,
          x: currentX ? currentX + letterSpacing : 0,
          y: currentY,
          width: cachedWidth,
          height: cachedHeight,
          capHeight,
          // format, // ?
          format: style,
          page: currentPageNumber,
        });
      }

      if (isHeadline1 && isNewLine) {
        currentX += 0;
      } else {
        currentX += cachedWidth + letterSpacing;
      }

      isNewLine = false;
    }

    return layoutInfo;
  }

  getFormatAtIndex(index: number, formats: MappedFormat[]) {
    let result = null;
    let narrowestRange = Infinity;

    for (const obj of formats) {
      const { low, high } = obj.interval;

      // console.info("checking", low, high, index);

      // Check if the index is within the current interval
      if (index >= low && index <= high) {
        const currentRange = high - low;

        // Update the result if this interval is narrower
        if (currentRange < narrowestRange) {
          narrowestRange = currentRange;
          result = obj;
        }
      }
    }

    // if (!result?.format) {
    //   console.info("!result", result);
    // }

    return result?.format ? result?.format : defaultStyle;
    // return defaultStyle;
  }
}

const getCharacterBoundingBox = (
  fontData: fontkit.Font,
  character: string,
  style: Style
) => {
  const glyph = fontData?.layout(character);
  const boundingBox = glyph?.bbox;
  const unitsPerEm = fontData?.unitsPerEm;
  const { xAdvance, xOffset } = glyph.positions[0];

  if (
    !boundingBox ||
    boundingBox.width == -Infinity ||
    boundingBox.height == -Infinity ||
    !unitsPerEm
  ) {
    return {
      width: 5,
      height: 5,
    };
  }

  // console.info("getCharacterBoundingBox", character, style.fontSize);

  return {
    width: (boundingBox.width / unitsPerEm) * style.fontSize,
    height: (boundingBox.height / unitsPerEm) * style.fontSize,
  };
};

const getCapHeightPx = (fontData: fontkit.Font, fontSize: number) => {
  return (
    ((fontData.capHeight + fontData.ascent + fontData.descent) /
      fontData.unitsPerEm) *
    fontSize
  );
};
export class MultiPageEditor {
  public pages: FormattedPage[];
  public visuals: Visual[] = []; // needn't be organized by page
  public size: DocumentSize;
  public visibleLines: number;
  public scrollPosition: number;
  public fontData: fontkit.Font;

  public rebalanceDebounce: any;
  public rebalanceDebounceStaggered: any;
  public avgPageLength = 3000; // TODO: better algorithm for determining exact overflow is needed

  constructor(
    size: DocumentSize,
    visibleLines: number,
    fontData: fontkit.Font
  ) {
    this.pages = [new FormattedPage(size, fontData)];
    this.size = size; // Height of a page in characters or pixels
    this.visibleLines = visibleLines;
    this.scrollPosition = 0;
    this.fontData = fontData;
  }

  // TODO: getRenderChunks creates RenderItems as chunks of text, split by formatting AND newlines
  // could be huge performance boost
  // problem is, these chunks actually need to be passed to layout, so fontkit runs less, in theory

  getCharAtIndex(globalIndex: number) {
    let pageIndex = this.getPageIndexForGlobalIndex(globalIndex, true);
    let localIndexNl = this.getLocalIndex(globalIndex, pageIndex, true);

    return this.pages[pageIndex].getCharAtIndex(localIndexNl);
  }

  getNewlinesBetween(startGlobalIndex: number, endGlobalIndex: number) {
    let startPageIndex = this.getPageIndexForGlobalIndex(
      startGlobalIndex,
      true
    );
    let endPageIndex = this.getPageIndexForGlobalIndex(endGlobalIndex, true);

    let startIndexNl = this.getLocalIndex(
      startGlobalIndex,
      startPageIndex,
      true
    );
    let endIndexNl = this.getLocalIndex(endGlobalIndex, endPageIndex, true);

    // console.info("getNewlinesBetween", startGlobalIndex, endGlobalIndex);

    let count = 0;
    for (let i = 0; i <= endPageIndex; i++) {
      const currentPage = this.pages[i];
      const content = currentPage.content.substring(startIndexNl, endIndexNl);

      // console.info("content", content);

      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === "\n") {
          count++;
        }
      }
    }

    return count;
  }

  addVisual(data: Partial<Visual>) {
    this.visuals.push({
      ...defaultVisual,
      id: uuidv4(),
      ...data,
    });
  }

  updateVisual(id: string, data: Partial<Visual>) {
    this.visuals = this.visuals.map((visual) => {
      if (visual.id === id) {
        return { ...visual, ...data };
      } else {
        return visual;
      }
    });
  }

  getAllContent() {
    let content = "";
    for (let index = 0; index < this.pages.length; index++) {
      const page = this.pages[index];
      content += page.content.substring(0, page.content.length);
    }
    return content;
  }

  delete(
    globalStart: number,
    globalEnd: number,
    globalStartNl: number,
    globalEndNl: number,
    setMasterJson: any
  ) {
    let startPageIndex = this.getPageIndexForGlobalIndex(globalStart, false);
    let startLocalIndex = this.getLocalIndex(
      globalStart,
      startPageIndex,
      false
    );
    let adjustedStartLocal = this.getLocalIndex(
      globalStartNl,
      startPageIndex,
      false
    );

    let endPageIndex = this.getPageIndexForGlobalIndex(globalEnd, false);
    let endLocalIndex = this.getLocalIndex(globalEnd, endPageIndex, false);
    let adjustedEndLocal = this.getLocalIndex(globalEndNl, endPageIndex, false);

    // console.info(
    //   "check indexes",
    //   globalStart,
    //   globalStartNl,
    //   startPageIndex,
    //   startLocalIndex,
    //   adjustedStartLocal,
    //   endPageIndex,
    //   endLocalIndex,
    //   adjustedEndLocal
    // );

    this.pages[startPageIndex].delete(
      startLocalIndex,
      endLocalIndex,
      adjustedStartLocal,
      adjustedEndLocal
    );

    // console.info("deleted");

    // this.updatePageLayouts(startPageIndex);
    this.renderAndRebalance(startPageIndex, setMasterJson, false, 0, 0, false);
  }

  addNewlinesToIndex(globalIndex: number) {}

  // run on scroll?
  // TODO: account for newlines?
  renderVisible() {
    performance.mark("render-visible-started");
    // const startIndex = this.scrollPosition * this.size.height;
    // const startIndex = Math.round(
    //   this.scrollPosition ? this.scrollPosition / 26 : 0
    // );
    const startIndex = Math.round(this.scrollPosition * 3);
    // const endIndex = this.pages.length * this.avgPageLength;
    // const scrollPage = startIndex / (this.pages.length * this.avgPageLength)
    // const endIndex = this.avgPageLength;
    const endIndex = startIndex + this.avgPageLength;

    const formattedText = this.getFormattedText(startIndex, endIndex);
    const layout = this.getLayoutInfo(startIndex, endIndex);
    // console.info("check items", formattedText, layout);
    const combined = this.combineTextAndLayout(
      formattedText,
      layout,
      startIndex,
      endIndex
    );

    performance.mark("render-visible-ended");
    performance.measure(
      "renderVisible",
      "render-visible-started",
      "render-visible-ended"
    );

    return { startIndex, combined };
  }

  renderAll() {
    // const startIndex = this.scrollPosition * this.size.height;
    // console.info("render all", this.pages.length);
    const startIndex = 0;
    const endIndex = this.pages.length * this.avgPageLength;

    const formattedText = this.getFormattedText(startIndex, endIndex);
    // console.info("formattedText", formattedText);
    const layout = this.getLayoutInfo(startIndex, endIndex);

    const combined = this.combineTextAndLayout(
      formattedText,
      layout,
      startIndex,
      endIndex
    );

    console.info("renderAll", formattedText, layout, combined);

    return combined;
  }

  alterFormatting(
    globalStart: number,
    globalEnd: number,
    formatChanges: Partial<Style>,
    setMasterJson: any
  ) {
    let startPageIndex = this.getPageIndexForGlobalIndex(globalStart, false);
    let startLocalIndex = this.getLocalIndex(
      globalStart,
      startPageIndex,
      false
    );

    let endPageIndex = this.getPageIndexForGlobalIndex(globalEnd, false);
    let endLocalIndex = this.getLocalIndex(globalEnd, endPageIndex, false);

    // console.info(
    //   "alter formatting ",
    //   startPageIndex,
    //   endPageIndex,
    //   startLocalIndex,
    //   endLocalIndex
    // );

    if (startPageIndex === endPageIndex) {
      this.pages[startPageIndex].alterFormatting(
        startLocalIndex,
        endLocalIndex,
        formatChanges
      );

      this.renderAndRebalance(startPageIndex, setMasterJson, false);
    }
  }

  insert(
    globalIndex: number,
    globalNlIndex: number,
    text: string,
    format: Style,
    setMasterJson: any,
    initialize = false
  ) {
    performance.mark("insert-started");

    // console.info("insert", globalIndex, globalNlIndex);

    let pageIndex = this.getPageIndexForGlobalIndex(globalIndex, false);
    let localNlIndex = this.getLocalIndex(globalNlIndex, pageIndex, false);
    let localIndex = this.getLocalIndex(globalIndex, pageIndex, false);

    // console.info("insert indexes: ", pageIndex, localIndex);

    this.pages[pageIndex].insert(localIndex, localNlIndex, text, format);

    this.renderAndRebalance(
      pageIndex,
      setMasterJson,
      initialize,
      text.length,
      localIndex
    );

    performance.mark("insert-ended");

    performance.measure("insert", "insert-started", "insert-ended");
  }

  insertJson(json: RenderItem[], setMasterJson: any) {
    this.pages[0].insertJson(json);

    this.renderAndRebalance(0, setMasterJson, true, json.length, 0);
  }

  renderAndRebalance(
    pageIndex: number,
    setMasterJson: any,
    initialize = false,
    insertLength: number,
    insertIndex: number,
    isInsertion: boolean = true
  ) {
    clearTimeout(this.rebalanceDebounce);
    clearTimeout(this.rebalanceDebounceStaggered);

    if (initialize) {
      this.updatePageLayouts(pageIndex); // run again on itialize
    }

    if (initialize) {
      this.rebalancePages(pageIndex, initialize, 0, 0, true);
    } else {
      this.rebalancePages(
        pageIndex,
        initialize,
        insertLength,
        insertIndex,
        isInsertion
      );
    }

    // const { startIndex, combined } = this.renderVisible();
    // console.info("renderAndRebalance", startIndex, combined);
    // setMasterJson(combined, startIndex);

    if (initialize) {
      this.updatePageLayouts(pageIndex); // run again on itialize
    }

    const renderableAll = this.renderAll();
    setMasterJson(renderableAll);

    // this.rebalanceDebounceStaggered = setTimeout(() => {
    //   // update other page layouts in staggered fashion, first is done in rebalancePages()

    // }, 500);
  }

  getLayoutInfo(start: number, end: number) {
    let result: LayoutNode[] = [];
    let currentIndex = start;
    let startPage = this.getPageIndexForGlobalIndex(start);
    let endPage = this.getPageIndexForGlobalIndex(end);

    // console.info("getLayoutInfo: ", start, end, startPage, endPage);

    // Optimization for single-page queries
    if (startPage === endPage) {
      const page = this.pages[startPage];
      const pageStartIndex = this.getLocalIndex(start, startPage);
      const pageEndIndex = this.getLocalIndex(end, startPage);
      const queryResult = page.layout.query(pageStartIndex, pageEndIndex);
      return queryResult;
    }

    for (let i = startPage; i <= endPage; i++) {
      const page = this.pages[i];
      const pageStartIndex = i === startPage ? this.getLocalIndex(start, i) : 0;
      const pageEndIndex =
        i === endPage ? this.getLocalIndex(end, i) : page.content.length;

      result = result.concat(page.layout.query(pageStartIndex, pageEndIndex));
      currentIndex += pageEndIndex - pageStartIndex;
    }

    return result;
  }

  getNewlinesTillChar(text: string) {
    let newlines = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === "\n") {
        newlines++;
      } else {
        break;
      }
    }
    return newlines;
  }

  combineTextAndLayout(
    formattedText: FormattedText[],
    layout: LayoutNode[],
    startIndex: number,
    endIndex: number
  ): RenderItem[] {
    let renderItems: RenderItem[] = [];
    let textIndex = 0;

    const startPage = this.getPageIndexForGlobalIndex(startIndex);

    for (const layoutItem of layout) {
      const { start, end, layoutInfo } = layoutItem;

      if (!layoutInfo) {
        continue;
      }

      // Skip layout items that are completely before the virtualized range
      if (end < startIndex) {
        textIndex++;
        continue;
      }

      // Stop processing if we've gone past the virtualized range
      if (start > endIndex) {
        break;
      }

      const virtualizedStart = startIndex - startPage * 3000;
      const virtualizedEnd = layoutInfo.length;

      let newlinesEndIndex = 0;
      let contentIndex = 0; // TODO: need to use some sort of contentIndex in other places as well?
      for (let i = virtualizedStart; i < virtualizedEnd; i++) {
        const charLayout = layoutInfo[i];

        let format: Style | undefined | null;

        if (newlinesEndIndex && contentIndex < newlinesEndIndex) {
          continue;
        }

        // const thisChar = this.pages[textIndex].content.substring(i, i + 1);
        // if (charLayout.char === "\n") {
        //   continue;
        // }

        // const textItem = formattedText[textIndex];
        // TODO: get substring of next character and check if newline
        const nextChars = this.pages[textIndex].content.substring(
          contentIndex + 1
        );
        const newlinesToAdd = this.getNewlinesTillChar(nextChars);
        if (newlinesToAdd) {
          newlinesEndIndex = contentIndex + newlinesToAdd;
          contentIndex += newlinesToAdd;
        }
        // console.info("newlinesTOAdd", newlinesToAdd);
        const textItems = this.pages[textIndex].formatting.search(
          [i, i + 1],
          (value, key) => ({
            interval: key,
            format: value,
          })
        ) as unknown as MappedFormat[];

        const textItem = textItems[textItems.length - 1];

        if (textItem) {
          format = textItem.format;
        }

        // if (!format) {
        //   format = defaultStyle;
        // }

        // if (charLayout.x === -1 && charLayout.y -1) {
        //   console.info("no position", charLayout.char);
        //   continue;
        // }

        renderItems.push({
          realChar: charLayout.realChar ? charLayout.realChar : charLayout.char,
          char: charLayout.char,
          x: charLayout.x,
          y: charLayout.y,
          width: charLayout.width,
          height: charLayout.height,
          capHeight: charLayout.capHeight,
          // format: format, // ?
          format: charLayout.format,
          page: charLayout.page,
        });

        contentIndex++;

        if (newlinesToAdd) {
          for (let n = 0; n < newlinesToAdd; n++) {
            renderItems.push({
              realChar: "\n",
              char: "\n",
              x: charLayout.x,
              y: charLayout.y,
              width: charLayout.width,
              height: charLayout.height,
              capHeight: charLayout.capHeight,
              format: charLayout.format,
              page: charLayout.page,
            });
          }
        }
      }

      textIndex++;
    }

    return renderItems;
  }

  getTextLength(beforePage?: number) {
    let total = 0;
    for (let i = 0; i < this.pages.length; i++) {
      const page = this.pages[i];
      if (typeof beforePage !== "undefined" && i < beforePage) {
        total += page.content.length;
      } else if (typeof beforePage === "undefined") {
        total += page.content.length;
      }
    }
    return total;
  }

  // rebalancePages(
  //   startPageIndex: number,
  //   initialize = false,
  //   insertLength: number,
  //   insertIndex: number
  // ) {
  //   performance.mark("rebalance-started");

  //   const pageHeight = this.size.height;

  //   let totalPages = this.pages.length;
  //   if (initialize) {
  //     totalPages = Math.max(
  //       1,
  //       Math.ceil(this.pages[0].content.length / this.avgPageLength)
  //     );
  //   }

  //   for (let i = startPageIndex; i < totalPages; i++) {
  //     const currentPage = this.pages[i];

  //     if (typeof currentPage === "undefined") {
  //       break;
  //     }

  //     const nextPage =
  //       this.pages[i + 1] || new FormattedPage(this.size, this.fontData);

  //     currentPage.pageNumber = i;
  //     nextPage.pageNumber = i + 1;

  //     // Calculate layout for the current page
  //     const layoutInfo = currentPage.calculateLayout(
  //       currentPage.content.substring(0, currentPage.content.length),
  //       currentPage.formatting.search(
  //         [0, currentPage.content.length],
  //         (value, key) => ({
  //           interval: key,
  //           format: value,
  //         })
  //       ) as unknown as MappedFormat[],
  //       0,
  //       i,
  //       insertLength,
  //       insertIndex
  //     );
  //     const nextPageStartIndex = layoutInfo?.findIndex(
  //       (info) => info?.page > i
  //     );

  //     if (nextPageStartIndex !== -1) {
  //       const overflowText = currentPage.content.substring(nextPageStartIndex);
  //       const overflowFormatting = currentPage.formatting.search(
  //         [nextPageStartIndex, Infinity],
  //         (value, key) => ({
  //           interval: key,
  //           format: value,
  //         })
  //       ) as unknown as MappedFormat[];

  //       currentPage.delete(nextPageStartIndex, currentPage.content.length);
  //       nextPage.insert(0, 0, overflowText, overflowFormatting[0].format);
  //     }

  //     if (nextPage.content.length > 0 && !this.pages[i + 1]) {
  //       this.pages.push(nextPage);
  //     }
  //   }

  //   // update layouts in staggered manner
  //   this.pages[startPageIndex].updateLayout(
  //     0,
  //     this.pages[startPageIndex].content.length,
  //     insertLength,
  //     insertIndex
  //   );

  //   performance.mark("rebalance-ended");
  //   performance.measure("rebalance", "rebalance-started", "rebalance-ended");
  // }

  rebalancePages(
    startPageIndex: number,
    initialize = false,
    changeLength: number,
    changeIndex: number,
    isInsertion: boolean = true
  ) {
    performance.mark("rebalance-started");

    let totalPages = this.pages.length;
    if (initialize) {
      totalPages = Math.max(
        1,
        Math.ceil(this.pages[0].content.length / this.avgPageLength)
      );
    }

    for (let i = startPageIndex; i < totalPages; i++) {
      const currentPage = this.pages[i];

      if (typeof currentPage === "undefined") {
        break;
      }

      const nextPage =
        this.pages[i + 1] || new FormattedPage(this.size, this.fontData);

      currentPage.pageNumber = i;
      nextPage.pageNumber = i + 1;

      // Calculate layout for the current page
      const layoutInfo = currentPage.calculateLayout(
        currentPage.content.substring(0, currentPage.content.length),
        currentPage.formatting.search(
          [0, currentPage.content.length],
          (value, key) => ({
            interval: key,
            format: value,
          })
        ) as unknown as MappedFormat[],
        0,
        i,
        changeLength,
        changeIndex
      );

      const nextPageStartIndex = layoutInfo.findIndex((info) => info.page > i);

      if (nextPageStartIndex !== -1) {
        // Handle overflow
        const overflowText = currentPage.content.substring(nextPageStartIndex);
        const overflowFormatting = currentPage.formatting.search(
          new Interval(nextPageStartIndex, Infinity),
          (value, key) => ({
            interval: key,
            format: value,
          })
        ) as unknown as MappedFormat[];

        currentPage.delete(nextPageStartIndex, currentPage.content.length);
        nextPage.insert(0, 0, overflowText, overflowFormatting[0].format);
      } else if (!isInsertion && nextPage.content.length > 0) {
        // Handle underflow
        const nextPageLayout = nextPage.calculateLayout(
          nextPage.content.substring(0, nextPage.content.length),
          nextPage.formatting.search(
            new Interval(0, nextPage.content.length),
            (value, key) => ({
              interval: key,
              format: value,
            })
          ) as unknown as MappedFormat[],
          0,
          i + 1,
          0,
          0
        );

        const contentToMoveIndex = nextPageLayout.findIndex(
          (info) => info.page > i + 1
        );

        if (contentToMoveIndex !== -1) {
          const contentToMove = nextPage.content.substring(
            0,
            contentToMoveIndex
          );
          const formatToMove = nextPage.formatting.search(
            new Interval(0, contentToMoveIndex),
            (value, key) => ({
              interval: key,
              format: value,
            })
          )[0].format;

          currentPage.insert(
            currentPage.content.length, // TODO: remove newlines
            currentPage.content.length,
            contentToMove,
            formatToMove
          );
          nextPage.delete(0, contentToMoveIndex);
        } else {
          // If all content from next page fits, move it all
          currentPage.insert(
            currentPage.content.length, // TODO: remove newlines
            currentPage.content.length,
            nextPage.content.substring(0, nextPage.content.length),
            nextPage.formatting.search(new Interval(0, 1), (value) => value)[0]
          );
          nextPage.delete(0, nextPage.content.length);
        }
      }

      if (nextPage.content.length > 0 && !this.pages[i + 1]) {
        this.pages.push(nextPage);
      } else if (nextPage.content.length === 0 && this.pages[i + 1]) {
        // Remove empty pages
        this.pages.splice(i + 1, 1);
        totalPages--;
        i--; // Recheck this index in the next iteration
      }
    }

    // update layouts in staggered manner
    this.pages[startPageIndex].updateLayout(
      0,
      this.pages[startPageIndex].content.length,
      changeLength,
      changeIndex
    );

    performance.mark("rebalance-ended");
    performance.measure("rebalance", "rebalance-started", "rebalance-ended");
  }

  updatePageLayouts(startPageIndex: number) {
    console.info("updatePageLayouts");
    for (let i = startPageIndex + 1; i < this.pages.length; i++) {
      // this.pages[i].updateLayout(
      //   this.pages[i].content.length - this.avgPageLength,
      //   this.pages[i].content.length
      // );
      this.pages[i].updateLayout(0, this.pages[i].content.length);
    }
  }

  getPageIndexForGlobalIndex(globalIndex: number, withNewlines = true) {
    let accumIndex = 0;
    for (let i = 0; i < this.pages.length; i++) {
      let contentLength = this.pages[i].content.length;
      if (!withNewlines) {
        let content = this.pages[i].content.substring(
          0,
          this.pages[i].content.length
        );
        content = content.split("\n").join("");
        contentLength = content.length;
      }
      if (accumIndex + contentLength > globalIndex) {
        return i;
      }
      accumIndex += contentLength;
    }
    return this.pages.length - 1; // need page index, not number
    // return this.pages.length;
  }

  getLocalIndex(globalIndex: number, pageIndex: number, withNewlines = true) {
    let accumIndex = 0;
    if (!pageIndex && withNewlines) {
      let content = this.pages[0].content.substring(0, globalIndex);
      let totalNewlines = 0;

      let count = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (char === "\n") {
          totalNewlines++;
        } else {
          count++;
        }
        if (count - 1 > globalIndex) {
          break;
        }
      }

      // console.info("totalNewlines", totalNewlines);

      return globalIndex + totalNewlines;
    } else {
      for (let i = 0; i < pageIndex; i++) {
        if (withNewlines) {
          accumIndex += this.pages[i].content.length;
        } else {
          let content = this.pages[i].content.substring(
            0,
            this.pages[i].content.length
          );
          content = content.split("\n").join("");
          console.info("content includes", content.includes("\n"));
          accumIndex += content.length;
        }
      }
      return globalIndex - accumIndex;
    }
  }

  getFormattedText(startIndex: number, endIndex: number) {
    let result: FormattedText[] = [];
    let currentIndex = startIndex;
    let startPage = this.getPageIndexForGlobalIndex(startIndex);
    let endPage = this.getPageIndexForGlobalIndex(endIndex);

    // console.info("getFormattedText", startPage, endPage);

    for (let i = startPage; i <= endPage; i++) {
      const page = this.pages[i];
      const pageStartIndex =
        i === startPage ? this.getLocalIndex(startIndex, i) : 0;
      const pageEndIndex =
        i === endPage ? this.getLocalIndex(endIndex, i) : page.content.length;

      result = result.concat(
        page.getFormattedText(pageStartIndex, pageEndIndex)
      );
      currentIndex += pageEndIndex - pageStartIndex;
    }

    return result;
  }
}
