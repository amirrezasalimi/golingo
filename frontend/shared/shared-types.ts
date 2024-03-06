import { WebsiteTranslatesLangItem } from "@/shared/models/website";
/* 
 this file is shared types between panel frontend and embeded script.ts
*/
export type DevMethodsPromises = {
  identifyLinks: () => void;
  identifyTexts: () => void;
  overrideTexts: (lang: string) => void;
  syncTranslations: (data: {
    mainLang: string;
    currentLang: string;
    translations: WebsiteTranslatesLangItem;
  }) => void;
};

export type PanelMethodsPromises = {
  syncTexts: (texts: TextItem[]) => void;
  syncLinks: (links: string[]) => void;
  pathChanged: (path: string) => void;
  pageLoaded: () => void;
};

export interface TextItem {
  wrapperId: string;
  text: string;
  position: string;
}
