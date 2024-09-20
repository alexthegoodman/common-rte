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
let editorInstance: MultiPageEditor = null;
let editorActive = false;
let jsonByPage = null;

let stage = null;
let layer = null;

const setMasterJson = (json, optionalInsertIndex) => {
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

      layer = new Konva.Layer();

      stage?.add(layer);
    }

    stage.height(documentSize.height * editorInstance.pages.length);

    renderTextNodes(stage, layer, jsonByPage);
  }
};
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

    // console.info("rendering", jsonByPage);

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

// const testMarkdown = `The ancient Mayan civilization was renowned for its remarkable architecture and monumental structures that continue to captivate researchers and historians to this day. Through detailed research and analysis, scholars have gained valuable insights into the unique architectural styles and construction techniques of the Maya. This document presents a comprehensive overview of the research findings on ancient Mayan architecture and monuments, shedding light on the significance and lasting legacy of these impressive structures. From towering pyramids to intricately carved monuments, join us as we delve into the rich history and cultural significance of the architectural wonders of the ancient Maya civilization. The ancient Mayan civilization was renowned for its remarkable architecture and monumental structures that continue to captivate researchers and historians to this day. Through detailed research and analysis, scholars have gained valuable insights into the unique architectural styles and construction techniques of the Maya. This document presents a comprehensive overview of the research findings on ancient Mayan architecture and monuments, shedding light on the significance and lasting legacy of these impressive structures. From towering pyramids to intricately carved monuments, join us as we delve into the rich history and cultural significance of the architectural wonders of the ancient Maya civilization. The ancient Mayan civilization was renowned for its remarkable architecture and monumental structures that continue to captivate researchers and historians to this day. Through detailed research and analysis, scholars have gained valuable insights into the unique architectural styles and construction techniques of the Maya. This document presents a comprehensive overview of the research findings on ancient Mayan architecture and monuments, shedding light on the significance and lasting legacy of these impressive structures. From towering pyramids to intricately carved monuments, join us as we delve into the rich history and cultural significance of the architectural wonders of the ancient Maya civilization. The ancient Mayan civilization was renowned for its remarkable architecture and monumental structures that continue to captivate researchers and historians to this day. Through detailed research and analysis, scholars have gained valuable insights into the unique architectural styles and construction techniques of the Maya. This document presents a comprehensive overview of the research findings on ancient Mayan architecture and monuments, shedding light on the significance and lasting legacy of these impressive structures. From towering pyramids to intricately carved monuments, join us as we delve into the rich history and cultural significance of the architectural wonders of the ancient Maya civilization.`;
const testMarkdown = `Introduction:

Virtual Reality (VR) technology has revolutionized the way we learn and interact with information, bringing immersive experiences that were once only imagined in science fiction to reality. One aspect of VR that has shown great promise in educational settings is the creation of interactive quizzes that engage learners in a dynamic and immersive way. In this document, we will explore the process of designing and creating interactive educational quizzes for VR immersive experiences. We will dive into the various components involved in the development process, from conceptualization to implementation, and provide insights on how to effectively utilize VR technology to enhance the learning experience. Throughout this document, we will highlight the benefits of using VR for educational quizzes, as well as address potential challenges and considerations to keep in mind when embarking on such a project. By the end of this document, readers will have a comprehensive understanding of the key factors to consider when creating interactive educational quizzes for VR immersive experiences, and be inspired to leverage this exciting technology to engage and educate learners in new and innovative ways.

# Benefits of Using VR in Education
Benefits of Using VR in Education:

Virtual Reality (VR) technology offers a wide array of benefits when utilized in an educational setting, particularly when it comes to creating interactive quizzes for immersive learning experiences. Below are some of the key advantages of using VR in education:

1. Immersive Learning Environment: VR technology creates a highly immersive and engaging learning environment that captivates learners' attention and enhances their overall learning experience. By transporting learners to virtual environments, interactive quizzes in VR can make learning more interactive, memorable, and enjoyable.

2. Enhanced Retention and Understanding: Studies have shown that immersive experiences in VR can lead to better retention of information and deeper understanding of concepts. When learners actively participate in interactive quizzes within a virtual environment, they are more likely to remember and apply the knowledge they have gained.

3. Personalized Learning: VR technology allows for personalized learning experiences, as quizzes can be tailored to the individual needs and learning styles of each learner. This customization can help improve learning outcomes by catering to each student's unique strengths and challenges.

4. Real-world Application: Interactive educational quizzes in VR can provide students with real-world scenarios and simulations that mimic tasks and situations they may encounter in their future careers. This hands-on learning experience helps students develop valuable skills and knowledge that are directly applicable to their future endeavors.

5. Collaboration and Communication: VR quizzes can facilitate collaboration and communication among students, enabling them to work together to solve problems, discuss concepts, and share knowledge in a virtual space. This fosters teamwork, critical thinking, and social skills that are essential for success in the modern workplace.

6. Accessibility and Inclusivity: VR technology has the potential to make education more accessible and inclusive for all learners, including those with disabilities or learning difficulties. By providing alternative ways of engaging with content, VR quizzes can accommodate diverse learning needs and create a more equitable learning environment.

Overall, the use of VR in education offers a host of benefits that can revolutionize the way we teach and learn. By incorporating interactive quizzes in VR immersive experiences, educators can create engaging, effective, and innovative learning opportunities that inspire and empower students to reach their full potential.

# Designing Interactive Educational Quizzes for VR
Designing Interactive Educational Quizzes for VR:

Creating interactive educational quizzes for Virtual Reality (VR) immersive experiences involves a comprehensive and purposeful design process that takes into account various factors to ensure effective learning outcomes. Below are key considerations and best practices for designing interactive educational quizzes for VR:

1. Define Learning Objectives: Begin by clearly defining the learning objectives that the interactive quiz aims to achieve. Identify the specific knowledge or skills that students should acquire through the quiz and tailor the questions and scenarios in the VR environment to align with these objectives.

2. Engagement and Interactivity: Use VR technology to its full potential by incorporating interactive elements that engage learners and encourage active participation. Include features such as branching scenarios, simulations, and gamified elements to make the quiz experience dynamic and fun.

3. User Experience Design: Focus on creating an intuitive and user-friendly interface that allows learners to navigate the VR environment smoothly and interact with the quiz content easily. Consider factors such as visual cues, audio feedback, and clear instructions to enhance the overall user experience.

4. Feedback and Assessment: Provide immediate feedback to learners during the quiz to reinforce learning and allow students to track their progress. Incorporate assessment mechanisms such as scoring, progress tracking, and performance analytics to help educators evaluate student understanding and adapt instruction accordingly.

5. Realism and Immersion: Design the VR quiz environment to be realistic and immersive, creating a sense of presence and engagement that enhances the learning experience. Utilize high-quality graphics, spatial audio, and interactive elements to make the virtual environment feel authentic and compelling.

6. Integration with Curriculum: Ensure that the interactive educational quiz aligns with the broader curriculum and educational goals of the course or subject matter. Integrate the quiz into the learning sequence in a meaningful way that reinforces and supplements classroom instruction.

7. Iterative Design Process: Employ an iterative design process that involves testing, gathering feedback, and refining the interactive quiz based on user input. Continuously iterate on the design to improve usability, engagement, and learning effectiveness.

By following these design principles and best practices, educators can create interactive educational quizzes for VR immersive experiences that are engaging, effective, and conducive to student learning. Through thoughtful design and innovative use of VR technology, interactive quizzes in the virtual environment can transform the educational experience and inspire students to explore and understand complex concepts in new and exciting ways.

# Engaging Users in VR Quizzes
Engaging Users in VR Quizzes:

Engaging users in Virtual Reality (VR) quizzes is crucial for creating a memorable and effective learning experience that maximizes student involvement and knowledge retention. In order to make VR quizzes engaging and impactful, educators must consider several factors and strategies to captivate users' attention and enhance their learning journey. Below are key considerations and best practices for engaging users in VR quizzes:

1. Immersive Storytelling: Utilize immersive storytelling techniques to contextualize the quiz content within a narrative or scenario that captures users' interest and emotions. By weaving a compelling story line into the quiz experience, users are more likely to feel invested in the learning process and motivated to interact with the content.

2. Gamification Elements: Incorporate gamification elements such as points, badges, levels, and rewards to make the quiz experience more engaging and interactive. Gamified elements can foster a sense of competition, achievement, and motivation among users, leading to increased participation and enjoyment.

3. Multisensory Feedback: Provide multisensory feedback mechanisms that stimulate users' senses and enhance their immersion in the VR environment. Utilize visual, auditory, and haptic feedback to reinforce correct responses, provide cues for navigation, and create a rich sensory experience that enhances user engagement.

4. Interactive Elements: Integrate interactive elements such as clickable objects, branching pathways, and dynamic scenarios to encourage users to explore the VR environment and actively engage with the quiz content. By offering opportunities for hands-on interaction and decision-making, users are empowered to drive their own learning experience and participate in a meaningful way.

5. Social Interaction: Foster social interaction and collaboration among users by incorporating multiplayer capabilities, cooperative tasks, or shared challenges in the VR quiz experience. Encouraging users to work together, communicate, and solve problems as a team not only enhances engagement but also promotes teamwork and communication skills.

6. Personalization and Choice: Offer users personalized learning experiences by allowing them to make choices, customize their learning paths, and receive tailored feedback based on their preferences and performance. Providing users with autonomy and control over their learning journey can increase their engagement and investment in the quiz experience.

7. Dynamic Content Updates: Keep the VR quiz content fresh and relevant by periodically updating, expanding, or rotating the quiz questions, scenarios, and challenges. By introducing new content and activities on a regular basis, users are more likely to stay engaged, motivated, and excited to return to the VR quiz environment.

By incorporating these engagement strategies and best practices into the design and implementation of VR quizzes, educators can create immersive and dynamic learning experiences that captivate users' attention, promote active participation, and enhance learning outcomes. Engaging users in VR quizzes not only makes the learning process more enjoyable and rewarding but also cultivates a passion for learning and exploration that can inspire and empower users to excel in their educational pursuits.

# Conclusion and Future Trends in VR Education
Conclusion and Future Trends in VR Education:

In conclusion, the utilization of Virtual Reality (VR) technology in education, particularly in the form of interactive quizzes for immersive learning experiences, holds immense potential for transforming the way students learn, engage, and retain knowledge. By leveraging the capabilities of VR technology to create interactive, immersive, and engaging quiz experiences, educators can significantly enhance learning outcomes, foster curiosity and exploration, and inspire students to actively participate in their own learning journey.

As VR technology continues to evolve and become more accessible, there are exciting opportunities for innovation and growth in the field of VR education. Looking ahead, some future trends in VR education include:

1. Adaptive Learning Experiences: Incorporating artificial intelligence and machine learning algorithms to personalize VR quiz experiences based on individual learning styles, preferences, and progress, leading to tailored learning paths and optimized learning outcomes.

2. Social VR Learning Communities: Building virtual learning communities and collaborative spaces where students can interact, communicate, and learn together in virtual environments, fostering social connections and encouraging peer-to-peer knowledge sharing.

3. Augmented Reality (AR) Integration: Integrating augmented reality features into VR quizzes to merge the physical and digital worlds, providing opportunities for interactive learning experiences that blend real-world objects with virtual content.

4. Mobile VR Learning Platforms: Developing mobile VR learning platforms that enable students to access educational content and quizzes on smartphones or portable VR devices, making learning more flexible, convenient, and accessible anytime, anywhere.

5. Lifelong Learning and Skill Development: Expanding VR education beyond traditional classroom settings to offer lifelong learning opportunities and skill development programs for learners of all ages and backgrounds, catering to the growing demand for continuous upskilling and reskilling.

In embracing these future trends and leveraging the power of VR technology in education, we can create transformative, engaging, and effective learning experiences that prepare students for the challenges and opportunities of the digital age. As VR continues to advance and integrate into mainstream education, educators have the opportunity to inspire curiosity, foster creativity, and empower learners to explore the boundless possibilities of knowledge and discovery in the virtual realm. The future of VR education is bright, and with continued innovation and collaboration, we can unlock even greater potentials for immersive learning experiences that shape the next generation of lifelong learners.`;

useMultiPageRTE(testMarkdown, mainTextSize);

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
      fontStyle: charText.format.italic ? "italic" : charText.format.fontWeight,
      fill: charText.format.color,
      textDecoration: charText.format.underline ? "underline" : "",
      // onClick: handleTextClick,
      // onMouseDown: handleTextMouseDown,
      // onMouseMove: handleTextMouseMove,
      // onMouseUp: handleTextMouseUp,
    });

    newText.on("click", handleTextClick);

    group.add(newText);

    globalIndex++;
  });

  lyr?.add(group);
  // stg?.add(lyr);
  // });
};
