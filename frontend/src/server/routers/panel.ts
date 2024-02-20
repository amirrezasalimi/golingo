import { router, userProcedure } from "@/app/api/trpc/trpc-router";
import { pb } from "../pb";
import { z } from "zod";
import { FileSystemCache } from "file-system-cache";
import { verifySiteScript } from "../services/site-verify";
import * as cheerio from "cheerio";
import { WebsitePagesRecord, WebsitePagesResponse, WebsitesResponse } from "@/shared/models/entities/pocketbase-types";
import { ClientResponseError } from "pocketbase";
import limiter from "@/shared/utils/limiter";
import { WebsiteTextItem, WebsiteTranslates } from "@/shared/models/website";
import { aiTranslateTexts } from "../services/ai-translate";


export const panelRouter = router({
  checkUser: userProcedure.query(async ({ ctx }) => {
    const doesAlreadyGetFreeTextsCredit = ctx.user.receivedFreeWordsCredit;
    // if not
    if (!doesAlreadyGetFreeTextsCredit) {
      // add free texts
      await pb.collection("users")
        .update(ctx.user.id, {
          wordsCredit: 3000,
          receivedFreeWordsCredit: true,
        })
    }
  }),
  getWebsites: userProcedure.query(async ({ ctx }) => {
    return await pb.collection("websites").getFullList({
      filter: `user.id = "${ctx.user.id}"`
    });
  }),
  getWebsite: userProcedure.input(z.object({
    id: z.string()
  })).query(async ({ ctx, input }) => {
    try {
      const res = await pb.collection("websites").getOne(input.id)

      if (res.user !== ctx.user.id) {
        throw new Error("You don't have permission to access this website");
      }
      return res as WebsitesResponse<{}, []>
    } catch (e) {
      console.log(e);
      return null
    }
  }),

  // temporary verify id
  getWebsiteTempVerifyKey: userProcedure.input(z.object({
    url: z.string()
  }))
    .mutation(async ({ ctx, input }): Promise<string> => {
      // check if exist
      try {
        const website = await pb.collection("websites").getFirstListItem(`url = "${input.url}"`);
        if (website) {
          throw new Error("Website already exist");
        }
      } catch (e) {
      }
      // if url is not empty
      if (input.url == "") {
        throw new Error("Url is empty");
      }
      // generate verify key
      const cacher = new FileSystemCache({
        ns: "website/temp/verify-key",
      });
      const cacheKey = `${ctx.user.id}-${input.url}`;
      const cacheVerifyKey = await cacher.get(cacheKey);
      if (cacheVerifyKey) {
        return cacheVerifyKey;
      } else {
        const verifyKey = Math.random().toString(36).substring(7);
        // 1 hour
        await cacher.set(cacheKey, verifyKey, 1000 * 60 * 60);
        return verifyKey;
      }

    }),
  verifyWebsiteTempVerifyKey: userProcedure.input(z.object({
    // lang: z.string(),
    url: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const cacher = new FileSystemCache({
      ns: "website/temp/verify-key",
    });
    const cacheKey = `${ctx.user.id}-${input.url}`;
    const cacheVerifyKey = await cacher.get(cacheKey);

    if (!cacheVerifyKey) {
      throw new Error("Verify key not found , please generate new one");
    }

    // if website exist
    try {
      const checkWebsite = await pb.collection("websites").getFirstListItem(`url = "${input.url}"`);
      throw new Error("Website already exist");
    }
    catch (e) {
    }

    // crawl website
    const isScriptExist = await verifySiteScript(input.url, cacheVerifyKey);

    if (!isScriptExist) {
      throw new Error("Script not found");
    }

    // 

    // save website
    const website = await pb.collection("websites").create({
      url: input.url,
      user: ctx.user.id,
      verified: true,
      unique_code: cacheVerifyKey,
      // primary_lang: input.lang,
    });
    if (!website) {
      throw new Error("Error creating website");
    } else {
      // add / page
      await pb.collection("website_pages").create({
        website: website.id,
        path: "/",
        translates: {}
      } as WebsitePagesRecord);
    }
    return website;
  }),
  verifyWebsite: userProcedure.input(z.object({
    id: z.string(),
  })).query(async ({ ctx, input }) => {
    const website = await pb.collection("websites").getOne(input.id);
    if (website.user !== ctx.user.id) {
      throw new Error("You don't have permission to access this website");
    }
    const isScriptExist = await verifySiteScript(website.url, website.unique_code);
    try {
      await pb.collection("websites").update(input.id, {
        verified: isScriptExist
      })
    } catch (e) {
      throw Error("Error updating verified status");
    }
    return isScriptExist;
  }),
  fetchAllWebsitePages: userProcedure.input(z.object({
    id: z.string(),
  })).query(async ({ ctx, input }) => {
    // has permission
    const website = await pb.collection("websites").getOne(input.id);
    if (!website) {
      throw new Error("Website not found");
    }
    if (website.user !== ctx.user.id) {
      throw new Error("You don't have permission to access this website");
    }
    const html = await fetch(website.url).then(res => res.text());
    // we have to find all a links and those who started with relative path and with website.url with cheerio
    const links = cheerio.load(html)('a').map((i, el) => {
      const href = el.attribs['href'];
      // and links that started with website.url
      if (href.startsWith(website.url)) {
        return href.replace(website.url, '');
      }
      if (href.startsWith('/')) {
        // remove / from end if its exist , clean code
        if (href.endsWith('/')) {
          return href.slice(0, -1);
        }
        return href;
      }
    }).filter((i, el) => el !== undefined).get();
    // remove duplicates, clean
    const uniqueLinks = Array.from(new Set(links));

    const allPages = await pb.collection("website_pages").getFullList({
      filter: `website.id = "${input.id}"`
    });

    const newPages = uniqueLinks.filter((link) => {
      return !allPages.find((page) => page.path === link);
    });
    // create new pages
    const createdPages = await Promise.all(newPages.map(async (path) => {
      return await pb.collection("website_pages").create({
        website: website.id,
        path: path,
      });
    }));
    return createdPages;
  }),
  addWebsitePage: userProcedure.input(z.object({
    id: z.string(),
    path: z.string(),
  })).mutation(async ({ ctx, input }) => {
    // limiter
    try {
      await limiter("addWebsitePage", {
        points: 5,
        duration: 1,
      }, `${ctx.user.id}-${input.id}`);
    }
    catch (e) {
      throw new Error("Too many requests");
    }
    // has permission
    const website = await pb.collection("websites").getOne(input.id);
    if (!website) {
      throw new Error("Website not found");
    }
    if (website.user !== ctx.user.id) {
      throw new Error("You don't have permission to access this website");
    }
    // check if page already exist
    try {
      const pageExist = await pb.collection("website_pages").getFirstListItem(`website = "${website.id}" && path = "${input.path}"`);

      if (pageExist) {
        console.log(pageExist);
        throw new Error("Already exist");
      }
    } catch (e) {
      if (e instanceof ClientResponseError) {
      } else {
        throw e;
      }
    }
    // fetch and see if page is not 404
    const url = website.url + input.path;
    const res = await fetch(url);
    if (res.status == 404) {
      throw new Error("Page not found");
    }
    // check verify exist
    const isScriptExist = await verifySiteScript(website.url, website.unique_code);
    if (!isScriptExist) {
      throw new Error("Script not found");
    }
    const page = await pb.collection("website_pages").create({
      website: website.id,
      path: input.path,
    } as WebsitePagesRecord);
    return page;
  }),
  getSitePages: userProcedure.input(z.object({
    id: z.string(),
  })).query(async ({ ctx, input }) => {
    // has permission
    const website = await pb.collection("websites").getOne(input.id);
    if (!website) {
      throw new Error("Website not found");
    }
    if (website.user !== ctx.user.id) {
      throw new Error("You don't have permission to access this website");
    }
    const pages = await pb.collection("website_pages").getFullList({
      filter: `website.id = "${input.id}"`
    }) as WebsitePagesResponse<WebsiteTranslates>[];
    return pages;
  }),
  deletePage: userProcedure.input(z.object({
    id: z.string(),
  })).mutation(async ({ ctx, input }) => {
    // has permission
    const page = await pb.collection("website_pages").getOne(input.id);
    if (!page) {
      throw new Error("Page not found");
    }

    const website = await pb.collection("websites").getOne(page.website);
    if (!website) {
      throw new Error("Website not found");
    }
    if (website.user !== ctx.user.id) {
      throw new Error("You don't have permission to access this website");
    }
    // cant remove / page
    if (page.path == "/") {
      throw new Error("Can't remove / page");
    }
    return await pb.collection("website_pages").delete(input.id);
  }),

  updateWebsiteData: userProcedure.input(z.object({
    id: z.string(),
    data: z.object({
      primary_lang: z.string().optional(),
      langs: z.string().optional(),
      languages: z.array(z.string()).optional(),
    })
  })).mutation(async ({ ctx, input }) => {
    // has permission
    const website = await pb.collection("websites").getOne(input.id);
    if (!website) {
      throw new Error("Website not found");
    }
    if (website.user !== ctx.user.id) {
      throw new Error("You don't have permission to access this website");
    }
    return await pb.collection("websites").update(input.id, input.data);
  }),
  updatePageData: userProcedure.input(z.object({
    id: z.string(),
    data: z.object({
      translates: z.any() as z.ZodType<WebsiteTranslates, any, any>,
    })
  })).mutation(async ({ ctx, input }) => {
    // has permission
    const page = await pb.collection("website_pages").getOne(input.id);
    if (!page) {
      throw new Error("Page not found");
    }
    const website = await pb.collection("websites").getOne(page.website);
    if (!website) {
      throw new Error("Website not found");
    }
    if (website.user !== ctx.user.id) {
      throw new Error("You don't have permission to access this website");
    }

    if (input.data.translates) {
      console.log("input.data.translates", JSON.stringify(input.data.translates, null, 2));
      
    }
    // // remove duplicates from translates
    // if (input.data.translates) {
    //   const newTranslates = {} as WebsiteTranslates;
    //   for (const lang in input.data.translates) {
    //     const texts = input.data.translates[lang].texts.filter((t, index, self) =>
    //       index === self.findIndex((t2) => (
    //         t2.wrapperId === t.wrapperId
    //       ))
    //     );
    //     newTranslates[lang] = {
    //       texts: texts,
    //     };
    //   }
    //   input.data.translates = newTranslates;
    // }

    return await pb.collection("website_pages").update(input.id, input.data);
  }),

  // translate
  // Translate content
  translateContent: userProcedure.input(z.object({
    id: z.string(),
    lang: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const page = await pb.collection("website_pages").getOne(input.id) as WebsitePagesRecord<WebsiteTranslates>;
    if (!page || !page.website) {
      throw new Error("Page not found");
    }

    const website = await pb.collection("websites").getOne(page.website);
    if (!website) {
      throw new Error("Website not found");
    }

    if (website.user !== ctx.user.id) {
      throw new Error("You don't have permission to access this website");
    }

    const wordsCredit = ctx.user.wordsCredit;


    const mainLang = website.primary_lang;
    const content = page.translates?.[mainLang] ?? {
      texts: []
    };
    const lang = input.lang;

    const main_data = content.texts.map((c) => ({
      id: c.wrapperId,
      text: c.text,
    }));

    const toLang = page.translates?.[lang];
    const untranslated = main_data.filter((t) =>
      !(toLang?.texts?.find((t2) => t2.wrapperId === t.id))
    );

    if (untranslated.length) {
      if (wordsCredit <= 0) {
        throw new Error("You don't have enough words credit");
      }
      // if credit not enough
      if (untranslated.length > wordsCredit) {
        throw new Error("You don't have enough words credit");
      }

      // remove duplicates
      const uniqueUntranslated = untranslated.filter((t, index, self) =>
        index === self.findIndex((t2) => (
          t2.id === t.id
        ))
      );
      let translated = await aiTranslateTexts(uniqueUntranslated, mainLang, lang);
      // remove duplicates
      translated = translated.filter((t, index, self) =>
        index === self.findIndex((t2) => (
          t2.id === t.id
        ))
      );

      // remove empty texts
      const filteredTranslated = translated.filter((t) => t.text !== "");
      const newTranslates = {
        ...page.translates,
        [lang]: {
          texts: filteredTranslated.map((t) => ({
            wrapperId: t.id,
            text: t.text,
            position: content.texts.find((c) => c.wrapperId === t.id)?.position ?? "",
            disabled: content.texts.find((c) => c.wrapperId === t.id)?.disabled ?? false,
          } as WebsiteTextItem)),
        }
      } as WebsiteTranslates;

      console.log("newTranslates", JSON.stringify(newTranslates, null, 2));
      
      const wordsUsed = untranslated.map((t) => t.text).join(" ").split(" ").length;
      let remainingCredit = wordsCredit - wordsUsed;
      if (remainingCredit < 0) remainingCredit = 0;
      // update words credit
      try {
        await pb.collection("users").update(website.user, {
          wordsCredit: remainingCredit,
        });
      } catch (e) {
        console.log(e);
      }

      await pb.collection("website_pages").update(input.id, {
        translates: newTranslates,
      });
    } else {
      // throw new Error("Nothing to translate");
    }
  }),
});