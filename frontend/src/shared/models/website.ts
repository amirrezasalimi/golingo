export interface WebsiteTextItem {
  wrapperId: string;
  text: string;
  disabled?: boolean;
  position: string;
}
export interface WebsiteTranslates {
  [key: string]: {
    texts: WebsiteTextItem[];
  };
}
export interface WebsiteTranslatesLangItem {
  name: string;
  native: string;
  texts: WebsiteTextItem[];
}
export interface WebsiteTranslatesFull {
  [key: string]: WebsiteTranslatesLangItem;
}
