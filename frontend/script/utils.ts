import { WebsiteTranslatesFull } from "@/shared/models/website";
import { GOLINGO_HOST } from "./constants";
import { TextItem } from "../shared/shared-types";

// utils
type AnyFunction = (...args: any[]) => any;

function debounce<T extends AnyFunction>(func: T, delay: number) {
  let timeoutId: NodeJS.Timeout;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this;

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  } as T;
}

// Function to get the DOM path of a node
function getDomPath(el: Node): string {
  const stack: string[] = [];
  let currentNode: Node | null = el;

  while (currentNode?.parentNode) {
    const parentNode: Node | null = currentNode.parentNode;
    const siblingCount: number = Array.from(parentNode.childNodes).filter(
      (sib) => sib.nodeName === currentNode?.nodeName
    ).length;
    let siblingIndex: number = 0;

    if (siblingCount > 1) {
      // @ts-ignore
      siblingIndex =
        // @ts-ignore
        Array.from(parentNode.childNodes).indexOf(currentNode as Node) -
        Array.from(parentNode.childNodes).indexOf(
          // @ts-ignore
          currentNode?.nodeName === "#text"
            ? (currentNode as Text).previousSibling
            : currentNode
        );
    }

    if (parentNode.nodeType === 1) {
      const idAttribute: string | null = (
        parentNode as HTMLElement
      ).getAttribute("id");
      let segment: string = (parentNode.nodeName || "").toLowerCase();

      if (idAttribute && idAttribute !== "") {
        segment += `#${idAttribute}`;
      } else if (siblingCount > 1) {
        segment += `:nth-child(${siblingIndex + 1})`;
      }

      stack.unshift(segment);
    }

    currentNode = currentNode.parentNode;
  }

  return (
    stack
      .slice(1)
      .join(" > ")
      .replace(/:nth-child\(1\)/, "") || ""
  );
}

// Function to generate a hash for a string
function hashString(str: string): string {
  let hash: number = 0;

  if (str.length === 0) {
    return hash.toString();
  }

  for (let i = 0; i < str.length; i++) {
    const char: number = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16);
}

const textWrapperPrefix = "golingo_highlighted";
// this method will find all texts and wrap them with span and give them unique id
const identifyTexts = (node: Node, excludedTags: string[]): TextItem[] => {
  let nodes: TextItem[] = [];
  const tagName = (node as HTMLElement)?.tagName?.toLowerCase() ?? "";

  if (node.nodeType === 3) {
    // Text node and not already highlighted
    // @ts-ignore

    const content: string = (node.nodeValue || "").trim();
    if (content.length <= 2) {
      return [];
    }
    if (content !== "") {
      // @ts-ignore
      const isElExists = node.parentNode.classList.contains(textWrapperPrefix);

      let wrapper: HTMLSpanElement;

      if (isElExists) {
        wrapper = node.parentNode as HTMLSpanElement;
      } else {
        wrapper = document.createElement("span");
        const contentHash: string = hashString(content);
        wrapper.id = `${textWrapperPrefix}_${contentHash}`;
        wrapper.className = textWrapperPrefix;
        wrapper.textContent = content;
      }
      // Display the position in the console
      const position: string = getDomPath(node.parentNode as Node);

      if (node.parentNode && !isElExists) {
        node.parentNode.replaceChild(wrapper, node);
      }
      const textItem: TextItem = {
        wrapperId: wrapper.id,
        position,
        text: content,
      };
      nodes.push(textItem);
    }
    //
  } else if (node.nodeType === 1 && !excludedTags.includes(tagName)) {
    // Element node
    const elementNode = node as HTMLElement;
    for (let i = 0; i < elementNode.childNodes.length; i++) {
      let detectedNodes = identifyTexts(
        elementNode.childNodes[i],
        excludedTags
      );
      nodes.push(...detectedNodes);
    }
  }
  return nodes;
};

// load translations datas from api
const loadTranslations = async (websiteCode: string, path: string) => {
  const response = await fetch(
    `${GOLINGO_HOST}api/tr?code=${websiteCode}&path=${path}`
  );
  const data = await response.json();
  return {
    translates: data.translates as WebsiteTranslatesFull,
    mainLang: data.mainLang,
  };
};
export { debounce, getDomPath, hashString, identifyTexts,loadTranslations };
