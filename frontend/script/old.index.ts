import { WebsiteTranslatesFull } from "@/shared/models/website";
import { debounce, getDomPath, hashString } from "./utils";
import { reactive, html } from "@arrow-js/core";

const GOLINGO_HOST = "http://localhost:3001/";
interface TextItem {
  wrapper: HTMLSpanElement;
  text: string;
  node: Node;
  position: string;
}
interface TextItemDev {
  wrapperId: string;
  text: string;
  node: {
    id: string;
    tagName: string;
    className: string;
  } | null;
  position: string;
}
class GoLingo {
  constructor() {}
  code: string | null = null;
  texts: {
    wrapper: HTMLSpanElement;
    node: Node;
    position: string;
  }[] = [];
  currentLang: string | null = null;
  translatedTo: string | null = null;
  oldTranslatedPath: string | null = null;
  mainLang: string | null = null;
  translates: {
    [path: string]: WebsiteTranslatesFull;
  } = {};
  disabledItems: string[] = []; // ids of wrappers
  ignoredTags: string[] = [
    "iframe",
    "img",
    "style",
    "script",
    "meta",
    "link",
    "head",
    "html",
    "noscript",
    "audio",
    "video",
    "object",
    "canvas",
    "svg",
    "map",
    "area",
    "embed",
    "param",
    "track",
    "source",
  ];
  devMode: boolean = false;
  initialized: boolean = false;
  selectedTextItem: TextItem | null = null;

  reactiveData = reactive({
    currentLang: this.currentLang,
    translates: this.translates,
  });
  async init({ code }: { code: string }) {
    if (!code) {
      console.error("## GoLingo Error: code is required");
      return;
    }
    if (this.initialized) {
      console.info("## GoLingo Error: already initialized");
      return;
    }
    this.code = code;
    const urlParams = new URLSearchParams(window.location.search);
    const isDevMode = urlParams.get("golingoDev") ? true : false;
    this.devMode = isDevMode;
    if (isDevMode) {
      console.info("## GoLingo Dev Mode");
    }
    if (isDevMode) {
      this.addStyle();
      this.registerDevEvents();
    }
    this.observeDOMChanges();

    this.detectAllTexts();
    console.info(
      `%cGoLingo %c${this.code}`,
      "background: #2ecc71; color: #fff; padding: 2px 4px; border-radius: 3px 0 0 3px;",
      "background: #3498db; color: #fff; padding: 2px 4px; border-radius: 0 3px 3px 0;"
    );
    this.initialized = true;

    console.log(`path`, this.getPath());

    if (!isDevMode) {
      document.onreadystatechange = async () => {
        console.log("## GoLingo: document.readyState", document.readyState);
        if (document.readyState == "complete") {
          await this.startTranslate();
        }
      };
      window.onload = async () => {
        await this.startTranslate();
      };
      // Function to handle route changes
      const handleRouteChange = () => {
        this.translatedTo = null;
        console.log("Route changed");
      };

      // Add event listeners for popstate and hashchange events
      window.addEventListener("popstate", handleRouteChange);
      window.addEventListener("hashchange", handleRouteChange);
    }
  }
  getPath() {
    return window.location.pathname;
  }
  async loadData() {
    const path = this.getPath();
    console.log("## GoLingo: path", path);
    const response = await fetch(
      `${GOLINGO_HOST}api/tr?code=${this.code}&path=${path}`
    );
    const data = await response.json();
    this.mainLang = data.mainLang;
    let translates = data.translates as WebsiteTranslatesFull;
    for (let key of Object.keys(translates)) {
      // remove duplicates by wrapperId
      translates[key].texts = translates[key].texts.filter(
        (v, i, a) => a.findIndex((t) => t.wrapperId === v.wrapperId) === i
      );
    }
    this.translates[path] = translates;
    this.reactiveData.translates[path] = translates;
    this.addBasicLanguageSelector();
  }

  async startTranslate() {
    const path = this.getPath();
    if (this.oldTranslatedPath !== path) {
      this.translatedTo = null;
    }
    if (Object.keys(this.translates?.[path] ?? {}).length == 0) {
      await this.loadData();
    }
    this.findCurrentLang();
    this.detectAllTexts();
    console.log(
      "## GoLingo: startTranslate",
      this.texts,
      this.translates[path],
      this.currentLang,
      this.translatedTo
    );

    if (
      this.translates?.[path]?.[this.currentLang as string] &&
      this.translatedTo !== this.currentLang
    ) {
      this.overrideTexts();
      this.translatedTo = this.currentLang;
      this.oldTranslatedPath = path;
    }
  }

  private detectAllTexts() {
    this.texts = this.detectTexts(document.body, this.ignoredTags);
    return this.texts;
  }
  private onResize() {
    this.detectAllTexts();
    this.syncTextsDebounced();
  }
  resizeDebounced = debounce(this.onResize, 500);
  // dev
  private registerDevEvents() {
    // on resize
    window.addEventListener("resize", this.resizeDebounced);
    window.addEventListener("message", (event) => {
      // console.log("GoLingo: message", event);

      const data = event.data;
      if (data) {
        const type = data.type;
        if (type) {
          switch (type) {
            case "sync-translations":
              // console.log("GoLingo: sync-translations", data);
              const path = this.getPath();
              this.translates[path] = data.data.translates;
              console.log(` GoLingo: sync-translations`, { ...data.data });

              this.setCurrentLang(data.data.currentLang);
              this.mainLang = data.data.mainLang;
              if (
                this.mainLang &&
                this.translates?.[path]?.[this.mainLang] != null
              ) {
                this.detectAllTexts();
                this.overrideTexts();
              }
              break;
            case "requestInternalLinks":
              this.detectInternalLinks();
              break;
          }
        }
      }
    });
  }
  private addStyle(): void {
    const isStyleExists = document.getElementById("golingo-styles");
    if (isStyleExists) {
      return;
    }
    const styleTag: HTMLStyleElement = document.createElement("style");
    styleTag.id = "golingo-styles";
    styleTag.innerHTML = `
            .golingo_highlighted { background-color: #ffff3b24;border: solid 1px #ffff1d; }
            .golingo_disabled { background-color: #afafaf1c;border: solid 1px #818181; }
            .golingo_selected { background-color: #2583c240 !important;border: solid 1px #1d6cd4 !important; }
        `;
    document.head.appendChild(styleTag);
  }
  detectInternalLinks() {
    // detect all internal links of this website , relative and absolute
    const links = document.querySelectorAll("a");
    const internalLinks: string[] = [];

    links.forEach((link) => {
      let href = link.getAttribute("href") ?? "";
      // remove query params & hash
      href = href?.split("?")[0];
      href = href?.split("#")[0];
      // relative
      if (href && href.startsWith("/")) {
        internalLinks.push(href);
      }
      // absolute
      if (href && href.startsWith(window.location.origin)) {
        internalLinks.push(href);
      }
    });
    // remove duplicates
    // @ts-ignore
    const uniqueInternalLinks = [...new Set(internalLinks)];
    this.postDev("syncInternalLinks", uniqueInternalLinks);
    return internalLinks;
  }

  postDev(type: string, data: any) {
    window.parent.postMessage(
      {
        from: "golingo",
        type,
        data,
      },
      "*"
    );
    // console.log(`GoLingo: postDev`, type, data);
  }
  // textItem
  textItemToDev(textItem: TextItem): TextItemDev {
    let nodeInfo: null | any = null;
    if (textItem.node instanceof Element && textItem.node.id) {
      nodeInfo = {
        id: textItem.node.id,
        tagName: textItem.node.tagName,
        className: textItem.node.className,
      };
    }
    return {
      wrapperId: textItem.wrapper.id,
      text: textItem.wrapper.textContent || "",
      node: nodeInfo,
      position: textItem.position,
    };
  }
  toggleTextItem(wrapperId: string, disabled: boolean) {
    const disabledBefore = this.disabledItems.indexOf(wrapperId) !== -1;
    if (disabledBefore === disabled) {
      return;
    }
    if (disabled) {
      this.disabledItems.push(wrapperId);
    } else {
      this.disabledItems = this.disabledItems.filter((id) => id !== wrapperId);
    }

    document
      .getElementById(wrapperId)
      ?.classList.toggle("golingo_disabled", disabled);
  }
  // syncClicked(item:
  syncTexts = () => {
    let texts = this.texts.map((text) => {
      let nodeInfo;
      if (text.node instanceof Element && text.node.id) {
        nodeInfo = {
          id: text.node.id,
          tagName: text.node.tagName,
          className: text.node.className,
        };
      }
      return {
        wrapperId: text.wrapper.id,
        text: text.wrapper.textContent || "",
        node: nodeInfo,
        position: text.position,
      };
    });
    this.postDev("syncTexts", texts);
  };
  syncTextsDebounced = debounce(this.syncTexts, 500);
  selectTextItem(textItem: TextItem) {
    this.postDev("select-text", this.textItemToDev(textItem));
    if (this.selectedTextItem) {
      this.selectedTextItem.wrapper.classList.remove("golingo_selected");
    }
    textItem.wrapper.classList.add("golingo_selected");
    this.selectedTextItem = textItem;
  }

  detectTextsDebounced = debounce(this.detectAllTexts, 500);
  overrideTextsDebounced = debounce(this.overrideTexts, 100);
  private overrideTexts() {
    if (!this.currentLang) {
      return;
    }
    const path = this.getPath();
    const texts = this.translates?.[path]?.[this.currentLang]?.texts ?? [];
    texts.forEach((text) => {
      const wrapper = document.getElementById(text.wrapperId);
      // check element is not ignored
      if (wrapper && this.ignoredTags.includes(wrapper.tagName.toLowerCase())) {
        return;
      }

      if (wrapper && text.text != wrapper.textContent) {
        console.log(
          "## GoLingo: overrideTexts",
          text.text,
          " with ",
          wrapper.textContent,
          text.text == wrapper.textContent
        );
        wrapper.textContent = text.text;
      }
    });
  }
  private detectTexts(node: Node, excludedTags: string[]): TextItem[] {
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
        const isElExists = node.parentNode.classList.contains(
          "golingo_highlighted"
        );

        let wrapper: HTMLSpanElement;

        if (isElExists) {
          wrapper = node.parentNode as HTMLSpanElement;
        } else {
          wrapper = document.createElement("span");
          const contentHash: string = hashString(content);
          wrapper.id = `golingo_highlighted_${contentHash}`;
          wrapper.className = "golingo_highlighted";
          wrapper.textContent = content;
        }
        // Display the position in the console
        const position: string = getDomPath(node.parentNode as Node);

        if (node.parentNode && !isElExists) {
          node.parentNode.replaceChild(wrapper, node);
        }
        const textItem = {
          wrapper,
          node,
          position,
          text: content,
        };
        nodes.push(textItem);
        // if dev mode
        if (this.devMode && !isElExists) {
          wrapper.addEventListener("click", (event) => {
            event.stopPropagation();
            this.selectTextItem(textItem);
          });
        }
      }
      //
    } else if (node.nodeType === 1 && !excludedTags.includes(tagName)) {
      // Element node
      const elementNode = node as HTMLElement;
      for (let i = 0; i < elementNode.childNodes.length; i++) {
        let detectedNodes = this.detectTexts(
          elementNode.childNodes[i],
          excludedTags
        );
        nodes.push(...detectedNodes);
      }
    }
    return nodes;
  }
  private observeDOMChangesHandler() {
    console.log("## GoLingo: observeDOMChangesHandler");

    this.detectAllTexts();
    if (this.devMode) {
      this.detectInternalLinks();
      this.syncTextsDebounced();
    } else {
      this.startTranslate();
    }
  }
  observeDOMChangesDebounced = debounce(this.observeDOMChangesHandler, 500);
  private observeDOMChanges(): void {
    const observer: MutationObserver = new MutationObserver(
      (mutationsList, observer) => {
        if (this.mainLang !== this.currentLang) {
          // return;
        }
        this.observeDOMChangesDebounced();
      }
    );
    observer.observe(document.body, { childList: true, subtree: true });
  }
  private getLocalLang() {
    const lang = navigator.language.split("-");
    const code = lang[0].toLocaleLowerCase();
    const countryCode = lang[1].toLocaleLowerCase();
    return [code, countryCode];
  }

  goLingoLangStorageKey = "golingoSelectedLang";
  // storage
  private getStorageSelectedLang() {
    return localStorage.getItem(this.goLingoLangStorageKey);
  }
  private setStorageSelectedLang(code: string) {
    localStorage.setItem(this.goLingoLangStorageKey, code);
  }
  private findCurrentLang() {
    const path = this.getPath();
    let lang = this.getStorageSelectedLang();
    if (!this.translates?.[path]?.[lang as string]) {
      lang = this.getLocalLang()[0];
    }
    this.setCurrentLang(lang as string);
  }
  private setCurrentLang(lang?: string) {
    if (!lang) {
      return;
    }
    this.currentLang = lang;
    this.reactiveData.currentLang = lang;
  }

  public switchLanguage(language: string) {
    if (this.currentLang === language) {
      return;
    }
    // if not exists
    if (!this.translates?.[this.getPath()]?.[language]) {
      return;
    }
    this.setCurrentLang(language);
    this.setStorageSelectedLang(language);
    this.startTranslate();
  }

  // widgets
  public addBasicLanguageSelector() {
    const className = "golingo-lang-selector";
    let el = document.querySelector(`.${className}`);
    if (el) {
      return;
    }
    const path = this.getPath();
    let langs = this.translates[path] ? Object.keys(this.translates[path]) : [];
    // move main lang to the first
    if (this.mainLang) {
      langs = langs.filter((lang) => lang !== this.mainLang);
      langs.unshift(this.mainLang);
    }
    if (langs.length == 0) {
      return;
    }
    this.findCurrentLang();
    console.log(
      "## GoLingo: addBasicLanguageSelector",
      this.currentLang,
      langs,
      this.translates[path]
    );

    const getLangName = (lang: string) => {
      return this.translates[path][lang].name;
    };
    const wrapper = html`${() => {
      const path = this.getPath();
      const langs = Object.keys(this.reactiveData.translates[path]);

      console.log(`langs`, langs);
      return html`<div class="${className}">
        <style>
          .${className} {
            position: fixed;
            bottom: 8px;
            left: 8px;
            z-index: 9999;
            font-size: 14px;
            font-weight: bold;
            padding: 0px 12px;
            background: #f5f5f5;
            border-radius: 12px;
            box-shadow: 0px 0px 8px 0px #0000001c;
            border: 1px solid #dfdfdf;
          }
          .${className} .golingo-select-lang {
            background: transparent;
            width: 100%;
            padding: 8px 16px;
            cursor: pointer;
            outline: none;
            border: none;
          }
        </style>
        ${() => {
          return html`<select
            class="golingo-select-lang"
            @change="${(e: any) => {
              golingo.switchLanguage(e.target.value);
            }}"
          >
            ${langs.map((lang) => {
              return html`<option
                value="${lang}"
                selected="${() => lang === this.reactiveData.currentLang}"
              >
                ${getLangName(lang)}
              </option>`;
            })}
          </select>`;
        }}
      </div>`;
    }}`;
    wrapper(document.body);
  }

  // event system
  events: {
    [key: string]: Function[];
  } = {};
  emit(event: GolingoEvents, data: any) {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach((callback) => {
      callback(data);
    });
  }
  on(event: GolingoEvents, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
}
type GolingoEvents =
  | "language-change"
  | "translate"
  | "path-change"
  | "init"
  | "translates-loaded";
const golingo = new GoLingo();
// @ts-ignore
window["golingo"] = golingo;
