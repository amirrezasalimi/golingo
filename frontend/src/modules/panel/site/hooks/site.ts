import { trpc } from "@/shared/utils/trpc";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import langs from "@/shared/data/langs.json";

const useSite = () => {
    const params = useParams();
    const id = params.id as string;
    const data = trpc.getWebsite.useQuery({
        id
    });
    const checkVerify = trpc.verifyWebsite.useQuery({
        id
    })
    const pagesQuery = trpc.getSitePages.useQuery({
        id
    });

    const pages = pagesQuery.data ?? []

    const deletePage = trpc.deletePage.useMutation({
        onSuccess(data, variables, context) {
            pagesQuery.refetch();
            selectPage("/");
            toast.success("Page deleted successfully");
        },
    });
    const addPageAction = trpc.addWebsitePage.useMutation();

    const addPage = (pagePath: string): Promise<boolean> => {
        return new Promise<boolean>((resolve, reject) => {
            if (pagePath === "") {
                toast.error("Page path is empty");
                reject(new Error("Page path is empty"));
                return;
            }
            addPageAction.mutateAsync({
                path: pagePath,
                id
            }).then((res) => {
                pagesQuery.refetch();
                if (res) {
                    toast.success("Page added successfully");
                    resolve(true);
                } else {
                    toast.error("Page is already added");
                    reject(new Error("Page is already added"));
                }
            }).catch((error) => {
                reject(error);
            });
        });
    }

    let mainLang = data?.data?.primary_lang;
    if (!mainLang || mainLang == "") mainLang = "en";
    // move main to top order
    let languages = useMemo(
        () => {
            if (!mainLang) return langs;
            let _langs = { ...langs };
            delete (_langs as any)[mainLang];
            return {
                // @ts-ignore
                [mainLang]: langs[mainLang],
                ..._langs
            }
        },
        [mainLang]
    )

    const updateWebsite = trpc.updateWebsiteData.useMutation({
        onSuccess(_, variables, context) {
            data.refetch();
            toast.success("updated successfully");
        },
    });
    const changeMainLang = (lang: string) => {
        updateWebsite.mutateAsync({
            id,
            data: {
                primary_lang: lang
            }
        });
    }
    const currentChangeLang = updateWebsite.variables?.data.primary_lang;

    const [currentUpdatingLang, setCurrentUpdatingLang] = useState<string | null>();
    const toggleLang = (lang: string, on: boolean) => {
        const allLangs = (data.data?.languages ?? []) as string[];
        const index = allLangs.indexOf(lang);
        if (index === -1) {
            allLangs.push(lang);
        } else {
            allLangs.splice(index, 1);
        }
        setCurrentUpdatingLang(lang);
        updateWebsite.mutateAsync({
            id,
            data: {
                languages: allLangs
            }
        }).finally(() => {
            setCurrentUpdatingLang(null);
        })
    }
    const isLangActive = (lang: string) => {
        const allLangs = (data.data?.languages ?? []) as string[];
        return allLangs.indexOf(lang) !== -1;
    }
    // page
    const updatePage = trpc.updatePageData.useMutation({
        onSuccess(_, variables, context) {
            pagesQuery.refetch();
            toast.success("updated successfully");
        },
    });

    const [currentLangView, setCurrentLangView] = useState<string | null>();
    useEffect(() => {
        if (!data.data?.languages) {
            setCurrentLangView("en");
            return
        }
        setCurrentLangView(mainLang);

    }, [data.data?.languages])
    const toggleLangView = (lang: string) => {
        setCurrentLangView(lang);
    }

    const [selectedPage, setSelectedPage] = useState<string | null>("/");
    const selectPage = (page: string) => {
        setSelectedPage(page);
    }

    const translatePage = trpc.translateContent.useMutation({
        onSuccess(_, variables, context) {
            pagesQuery.refetch();
            toast.success("translated successfully");
        },
    });
    return {
        mainLang,
        languages,
        addPageLoading: addPageAction.isPending,
        deletePage,
        pages,
        data,
        checkVerify,
        currentChangeLang,
        updateWebsite,
        addPage,
        changeMainLang,
        toggleLang,
        currentUpdatingLang,
        isLangActive,
        updatePage,
        currentLangView,
        toggleLangView,
        selectPage,
        selectedPage,
        translatePage

    }
}

export default useSite;