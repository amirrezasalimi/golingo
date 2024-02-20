import { pb } from "@/server/pb";
import { WebsitePagesResponse } from "@/shared/models/entities/pocketbase-types";
import { WebsiteTranslates, WebsiteTranslatesFull } from "@/shared/models/website";
import { NextApiRequest, NextApiResponse } from "next";
import langs from "@/shared/data/langs.json"
export async function GET(req: NextApiRequest, res: NextApiResponse) {
    const { searchParams } = new URL(req.url ?? "");
    const code = searchParams.get("code");
    const path = searchParams.get("path") ?? "/";
    if (!code) {
        return Response.json({
            error: "code is required",
            data: req.query,
        }, {
            status: 400
        });
    }
    // todo: cache results
    try {
        const website = await pb.collection("websites").getFirstListItem(`unique_code = '${code}'`);
        try {
            const translations = (
                await pb.collection("website_pages").getFirstListItem(`website = '${website.id}' && path = '${path}'`)
            ) as WebsitePagesResponse<WebsiteTranslates>;
            const translates = (translations.translates ?? {}) as WebsiteTranslatesFull;

            // add lang native and name to the translates
            for (const lang in translates) {
                const langData = langs[lang as keyof typeof langs];
                if (langData) {
                    translates[lang].native = langData.native;
                    translates[lang].name = langData.int;
                }
            }
            // remove the main lang
            const mainLang = website.primary_lang;
            if (mainLang && translates[mainLang]) {
                // delete translates[mainLang];
            }
            return Response.json({
                mainLang,
                translates
            });
        } catch (error) {
            return Response.json({
                error: "path is not valid",
            }, {
                status: 400
            });
        }
    } catch (error) {

        return Response.json({
            error: "code is not valid",
        }, {
            status: 400
        });
    }
}