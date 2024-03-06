import {
  WebsiteTranslatesFull,
  WebsiteTranslatesLangItem,
} from "@/shared/models/website";
import { debounce, identifyTexts, loadTranslations } from "./utils";
import { reactive } from "@arrow-js/core";
import {
  DevMethodsPromises,
  PanelMethodsPromises,
  TextItem,
} from "../shared/shared-types";
import AsyncTalk from "../shared/async-talk";

class GoLingo {
  constructor() {}
  code: string | null = null;

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

  data = reactive({
    currentLang: null as string | null,
    mainLang: null as string | null,
    translates: {} as WebsiteTranslatesFull,
    devMode: false,
    selectedTextItem: null as TextItem | null,
    initialized: false,
    currentOvrerideLang: null as string | null,
    oldTranslatedPath: null as string | null,
    oldTranslatedLang: null as string | null,
  });
  async init({ code }: { code: string }) {
    if (!code) {
      console.error("## GoLingo Error: code is required");
      return;
    }
    if (this.data.initialized) {
      console.info("## GoLingo Error: already initialized");
      return;
    }
    this.code = code;
    // check dev mode
    const urlParams = new URLSearchParams(window.location.search);
    const isDevMode = urlParams.get("golingoDev") ? true : false;
    this.data.devMode = isDevMode;

    if (isDevMode) {
      this.addStyle();
      this.listenDevMethods();
    } else {
      this.productionModeListeners();
    }

    this.observeDOMChanges();
    //
    this.data.initialized = true;
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
  private productionModeListeners() {
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
      // this.translatedTo = null;
      console.log("Route changed");
    };
    // Add event listeners for popstate and hashchange events
    window.addEventListener("popstate", handleRouteChange);
    window.addEventListener("hashchange", handleRouteChange);
  }
  private listenDevMethods() {
    const asyncTalk = AsyncTalk.getInstance<
      PanelMethodsPromises,
      DevMethodsPromises
    >(window.parent);
    const unsubscribe = asyncTalk.listen(async (request) => {
      const { uid, functionName, args } = request;
      console.log("## GoLingo: devMethod", request);

      switch (functionName) {
        case "identifyTexts":
          await this.identifyTexts();
          return this.data.identifiedTexts;
        case "overrideTexts":
          const lang = args as unknown as string;
          if (lang) {
            this.data.currentOvrerideLang = lang;
            this.data.currentLang = lang;
            const path = this.getPath();
            const texts = this.data.translates[path][lang].texts;

            console.log(
              `## GoLingo: dev | overrideTexts `,
              lang,
              JSON.parse(JSON.stringify(this.data.translates, null, 2))
            );

            this.overrideTexts(texts);
          }
          break;
        case "syncTranslations":
          const syncTranslationsArgs = args as unknown as {
            currentLang: string;
            mainLang: string;
            translations: WebsiteTranslatesLangItem;
          };
          console.log(`## GoLingo: dev`, syncTranslationsArgs);

          if (syncTranslationsArgs) {
            const { mainLang, translations } = syncTranslationsArgs;
            const path = this.getPath();
            this.data.mainLang = mainLang;
            this.data.translates[path] = translations;
          }
          break;
      }
    });
    // on page unload
    window.addEventListener("beforeunload", () => {
      unsubscribe();
    });
  }

  private async identifyTexts() {
    this.data.identifiedTexts = identifyTexts(document.body, this.ignoredTags);
    return this.data.identifiedTexts;
  }
  private overrideTexts(texts: TextItem[]) {
    if (!this.data.currentLang) {
      return;
    }
    texts.forEach((text) => {
      const elements = document.querySelectorAll(`#${text.wrapperId}`);

      elements.forEach((wrapper) => {
        // check element is not ignored
        if (
          wrapper &&
          this.ignoredTags.includes(wrapper.tagName.toLowerCase())
        ) {
          return;
        }

        if (wrapper && text.text != wrapper.textContent) {
          /*         console.log(
          "## GoLingo: overrideTexts",
          text.text,
          "with ",
          wrapper.textContent,
          text.text == wrapper.textContent
        ); */
          wrapper.textContent = text.text;
        }
      });
    });
  }
  private syncTextsWithPanel() {
    if (this.data.mainLang == this.data.currentLang) {
      const texts = this.data.identifiedTexts;
      this.postDev("syncTexts", texts);
    }
  }
  private syncInternalLinksWithPanel() {
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
    this.postDev("syncLinks", uniqueInternalLinks);
  }
  private async observeDOMChangesHandler() {
    console.log("## GoLingo: observeDOMChangesHandler");

    await this.identifyTexts();
    if (this.data.devMode) {
      this.syncInternalLinksWithPanel();
      this.syncTextsWithPanel();
    }
  }

  private observeDOMChangesDebounced = debounce(
    this.observeDOMChangesHandler,
    300
  );
  private observeDOMChanges(): void {
    const observer: MutationObserver = new MutationObserver(
      (mutationsList, observer) => {
        this.observeDOMChangesDebounced();
      }
    );
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private getPath() {
    return window.location.pathname;
  }
  private async postDev(method: keyof PanelMethodsPromises, data: any) {
    const asyncPostMessage = AsyncTalk.getInstance<
      PanelMethodsPromises,
      DevMethodsPromises
    >(window.parent);
    await asyncPostMessage.send(method, data);
  }

  // lang
  private getLocalLang() {
    const lang = navigator.language.split("-");
    const code = lang[0].toLocaleLowerCase();
    const countryCode = lang[1].toLocaleLowerCase();
    return [code, countryCode];
  }
  goLingoLangStorageKey = "golingoSelectedLang";
  // store
  private getStorageSelectedLang() {
    return localStorage.getItem(this.goLingoLangStorageKey);
  }
  private setStorageSelectedLang(code: string) {
    localStorage.setItem(this.goLingoLangStorageKey, code);
  }
  private detectCurrentLang() {
    const path = this.getPath();
    let lang = this.getStorageSelectedLang();
    if (!this.data.translates?.[path]?.[lang as string]) {
      lang = this.getLocalLang()[0];
    }
    this.setCurrentLang(lang as string);
  }
  private setCurrentLang(lang?: string) {
    if (!lang) {
      return;
    }
    this.setStorageSelectedLang(lang);
    this.data.currentLang = lang;
  }
  private async loadTranslatesData() {
    const path = this.getPath();
    const code = this.code;
    if (code) {
      const data = await loadTranslations(code, path);
      this.data.translates[path] = data;
    }
  }
  // translate
  async startTranslate() {
    return;
    this.detectCurrentLang();
    const path = this.getPath();
    if (this.data.oldTranslatedPath !== path) {
      this.data.oldTranslatedLang = null;
    }
    const translates = this.data.translates;
    const currentLang = this.data.currentLang;
    if (Object.keys(translates?.[path] ?? {}).length == 0) {
      await this.loadTranslatesData();
    }

    if (
      translates?.[path]?.[currentLang as string] &&
      this.data.oldTranslatedLang !== currentLang &&
      currentLang
    ) {
      // @ts-ignore
      const texts = translates?.[path]?.[currentLang]?.texts ?? [];
      this.overrideTexts(texts);
      this.data.oldTranslatedLang = currentLang;
      this.data.oldTranslatedPath = path;
    }
  }
}

const golingo = new GoLingo();
// @ts-ignore
window["golingo"] = golingo;
