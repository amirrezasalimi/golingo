"use client";
import CodeBox from "@/shared/components/code-box";
import useSite from "./hooks/site";
import { normalizeUrl } from "@/shared/utils/normalize-url";
import { Button, Card, CardBody, Checkbox, CircularProgress, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Tab, Tabs } from "@nextui-org/react";
import { Check, Monitor01, Phone, Phone01, Plus, RefreshCw01, Settings01 } from "@untitled-ui/icons-react";
import getScriptCode from "@/shared/utils/get-code";
import { toast } from "react-toastify";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import useWordsCredit from "@/shared/hooks/credit";


const Site = () => {
    const credit = useWordsCredit();
    const site = useSite();
    const [pagePath, setPagePath] = useState<string>("");

    // replace 
    const url = normalizeUrl(site.data.data?.url ?? "");
    const isVerified = site.checkVerify.data;

    const code = getScriptCode(site.data.data?.unique_code || "");

    const reVerify = () => {
        site.checkVerify.refetch().then((res) => {
            if (res.data) {
                toast.success("Website Verified successfully")
            } else {
                toast.error("Code is not found in your website")
            }
        })
    }

    const [langModalOpen, setLangModalOpen] = useState<boolean>(false);
    const [langFilter, setLangFilter] = useState<string>("");



    const allLanguages = site.languages;
    const userSelectedLangs = useMemo(() => {
        return site.data.data?.languages?.filter(lang => lang != site.mainLang) ?? []
    }, [site.data.data])

    const selectedLangs = [
        site.mainLang,
        ...(userSelectedLangs ?? [])
    ] ?? [];

    let fullUrl = (site.data.data?.url ?? "")
    // replace last slash
    if (fullUrl.endsWith("/")) {
        fullUrl = fullUrl.slice(0, fullUrl.length - 1)
    }
    const selectedPagewithoutSlash = useMemo(() => {
        if (!site.selectedPage || site.selectedPage == "/") return "";
        return site.selectedPage.startsWith("/") ? site.selectedPage.slice(1, site.selectedPage.length) : site.selectedPage;
    }, [site.selectedPage])
    const currentUrl = `${fullUrl}/${selectedPagewithoutSlash === "/" ? "" : selectedPagewithoutSlash}?golingoDev=1`
    const cleanFullUrl = `${fullUrl}/${selectedPagewithoutSlash === "/" ? "" : selectedPagewithoutSlash}`
    const [selectedDevice, setSelectedDevice] = useState<"mobile" | "desktop">("desktop");

    const currentPage = site.pages.find(page => page.path === site.selectedPage);

    const isPageReady = site.currentLangView && currentPage;
    const syncTexts = useCallback((data: {
        wrapperId: string,
        position: string,
        text: string
    }[]) => {
        // TODO: fix main language replacement , double check
        if (site.mainLang !== site.currentLangView) {
            return;
        }
        const oldTranslates = currentPage?.translates ?? {};
        
        // check if content is changed
        const isChanged = data.some((item) => {
            const oldText = oldTranslates[site.mainLang]?.texts?.find((text) => text.wrapperId === item.wrapperId && text.position === item.position)?.text;
            return oldText !== item.text;
        })
        if (!isChanged) {
            // toast.warning("No changes found")
            return;
        }
        toast.success(`${data.length} texts loaded from this page.`)
        site.updatePage.mutateAsync({
            id: currentPage?.id ?? "",
            data: {
                translates: {
                    ...oldTranslates,
                    [site.mainLang]: {
                        ...oldTranslates[site.mainLang],
                        texts: data
                    }
                } as object
            }
        })
    }, [site.currentLangView, currentPage])

    const [currentPageLoaded, setCurrentPageLoaded] = useState<boolean>(false);

    const postMessage = (type: string, data: any = {}) => {
        const iframe = document.querySelector("iframe");
        if (iframe) {
            iframe.contentWindow?.postMessage({
                type,
                data
            }, "*");
        }
    }

    // event listeners
    useEffect(() => {

        const onMessage = (e: MessageEvent) => {
            const from = e.data.from;
            if (from === "golingo") {
                const type = e.data.type as "syncTexts" | "syncInternalLinks";
                const data = e.data.data;
                switch (type) {
                    case "syncTexts":
                        console.log(`GoLingo syncTexts: `, data);
                        
                        syncTexts(data);
                        break;
                    case "syncInternalLinks":
                        const links = (data as string[])
                            // remove pages that already exist in db
                            .filter((link) => {
                                return !site.pages.some((page) => page.path === link)
                            })
                        setAutoPageItems(
                            links.map((link) => ({
                                path: link,
                                enabled: true,
                            }))
                        );
                        break;
                }
            }
        }
        window.addEventListener("message", onMessage, false);
        return () => {
            window.removeEventListener("message", onMessage);
        }
    }, [currentPage, site.pages]);

    const onPageLoad = () => {
        setCurrentPageLoaded(true);
    }
    const isTranslating = site.translatePage.isPending;
    const selectPage = (page: any) => {
        if (isTranslating) {
            toast.warning("Please wait until translation is done")
            return;
        }
        setCurrentPageLoaded(false);
        site.selectPage(page.path);
    }
    const currentTexts = useMemo(() => {
        return (currentPage?.translates?.[site.mainLang as string] ?? {
            texts: []
        })?.texts ?? [];
    }, [currentPage, site.currentLangView])
    const translatedTexts = useMemo(() => {
        return (currentPage?.translates?.[site.currentLangView as string] ?? {
            texts: []
        })?.texts ?? [];
    }, [currentPage, site.currentLangView])

    const currentLangFull = site.languages?.[site.currentLangView as keyof typeof site.languages]?.native ?? "";

    const translate = () => {
        site.translatePage.mutateAsync({
            id: currentPage?.id ?? "",
            lang: site.currentLangView as string
        }).then(() => {
            credit.refresh();
            toast.success(`Page translated to ${currentLangFull} successfully`)
        })
    }

    const toggleLangView = (lang: string) => {
        site.toggleLangView(lang);
    }
    useEffect(() => {
        postMessage("sync-translations", {
            currentLang: site.currentLangView,
            mainLang: site.mainLang,
            translates: currentPage?.translates ?? {}
        });
    }, [currentPage, site.currentLangView])

    const clearCurrentTranslations = () => {
        const oldTranslates = currentPage?.translates ?? {};
        site.updatePage.mutateAsync({
            id: currentPage?.id ?? "",
            data: {
                translates: {
                    ...oldTranslates,
                    [site.currentLangView as string]: {
                        texts: []
                    }
                }
            }
        }).then(() => {
            // toast.success(`Translations cleared successfully`)
            postMessage("sync-translations", {
                currentLang: site.currentLangView,
                mainLang: site.mainLang,
                translates: currentPage?.translates ?? {}
            });
            // switch to main lang
            site.toggleLangView(site.mainLang);
        })
    }

    const [autoPageItems, setAutoPageItems] = useState<{
        path: string
        enabled: boolean
    }[]>([]);
    const [autoPageModalIsOpen, setAutoPageModalIsOpen] = useState<boolean>(false);

    const openAutoLinkModal = () => {
        postMessage("requestInternalLinks");
        // check if page is loaded
        if (!currentPageLoaded) {
            toast.warning("Please wait until page is loaded")
            return;
        }
        // its only work on main page 
        if (currentPage?.path !== "/") {
            toast.warning("please switch to main page")
            return;
        }
        // open modal
        setAutoPageModalIsOpen(true);
    }
    const autoPageModalAddAction = async () => {
        postMessage("sync-internal-links");
        // if its not on loading already 
        if (site.addPageLoading) return;
        // add current selected pages
        let addedPages = 0;
        const selectedPages = autoPageItems.filter((item) => item.enabled).map((item) => item.path);
        for (let page of selectedPages) {
            // fetch page , if its retun 404 , dont add it
            try {
                const res = await fetch(`${fullUrl}/${page}`);
                if (res.status === 404) continue;
            } catch (e) {
                toast.warn(`Error while fetching page (${page})`)
                continue;
            }

            await site.addPage(page).then(() => {
                // remove from items
                setAutoPageItems((prev) => prev.filter((item) => item.path !== page))
                addedPages++;
            })
        }
        // close modal
        setAutoPageModalIsOpen(false);
        toast.success(`${addedPages} of ${selectedPages.length} pages added successfully`)
    }

    const startAutoTranslate = () => {

    }

    const isAutoTranslating = isTranslating;

    const autoPageItemsUnique = useMemo(() => {
        return autoPageItems.filter((item, i) =>
            site.pages.every((page) => page.path !== item.path)
        )
    }, [autoPageItems, site.pages])
    return <>
        <Modal
            size="lg"
            isOpen={autoPageModalIsOpen} onClose={
                () => setAutoPageModalIsOpen(false)
            }>

            <ModalContent className="w-[60vw]">
                <ModalHeader>
                    Auto Detect Pages
                </ModalHeader>
                <ModalBody className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 items-center">
                        {
                            autoPageItemsUnique.length > 0 ?
                                <>
                                    <div>
                                        this is all links we found in your website, you can enable or disable them
                                    </div>
                                    <div className="w-full flex flex-col gap-2 items-center">
                                        {
                                            autoPageItemsUnique.map((item, i) => {
                                                return <div
                                                    key={item.path}
                                                    className="flex w-full justify-between items-center gap-2 p-2 rounded-md bg-gray-200">
                                                    <span>
                                                        {item.path}
                                                    </span>
                                                    <Checkbox
                                                        isSelected={item.enabled}
                                                        onValueChange={(checked) => {
                                                            const newItems = [...autoPageItems];
                                                            newItems[i].enabled = checked;
                                                            setAutoPageItems(newItems);
                                                        }}
                                                    />
                                                </div>
                                            })
                                        }

                                    </div>
                                    <Button
                                        isLoading={site.addPageLoading}
                                        disabled={site.addPageLoading}
                                        onClick={autoPageModalAddAction} className="mt-4">
                                        Add
                                    </Button>
                                </>
                                :
                                <div className="flex justify-center items-center w-full h-[200px]">
                                    no links found
                                </div>
                        }
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
        <Modal
            size="lg"
            isOpen={langModalOpen} onClose={
                () => setLangModalOpen(false)
            }>

            <ModalContent className="w-[60vw]">
                <ModalHeader>
                    Languages
                </ModalHeader>
                <ModalBody className="flex flex-col gap-4">
                    <div>
                        <Input
                            value={langFilter}
                            onChange={(e) => setLangFilter(e.target.value)}
                            size="sm" className="mt-2" placeholder="Search" />
                    </div>
                    <div className="w-full flex flex-col h-[60vh] overflow-scroll gap-2 py-2">
                        {
                            Object.keys(allLanguages)
                                .filter((lang) => {
                                    const data = allLanguages[lang as keyof typeof allLanguages];
                                    return data.native.toLowerCase().includes(langFilter.toLowerCase()) || lang.toLowerCase().includes(langFilter.toLowerCase())
                                })
                                .map((lang, i) => {
                                    return <div key={i} className="group flex justify-between items-center rounded-md px-2 py-2 gap-2 border border-gray-300">
                                        <div className="flex gap-2 items-center">
                                            <span className="bg-gray-200 rounded-md px-1">
                                                {lang}
                                            </span>
                                            <span>
                                                {
                                                    allLanguages[lang as keyof typeof allLanguages].native
                                                }
                                            </span>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            {
                                                lang == site.mainLang ?
                                                    <span className="text-purple-500">
                                                        Main
                                                    </span> :
                                                    <div className="group-hover:opacity-100 opacity-0 cursor-none group-hover:cursor-default">
                                                        <Button
                                                            disabled={isTranslating}
                                                            isLoading={site.updateWebsite.isPending && site.currentChangeLang === lang}
                                                            onClick={() => site.changeMainLang(lang)}
                                                            size="sm">
                                                            set as Main
                                                        </Button>
                                                    </div>
                                            }
                                            {
                                                lang !== site.mainLang &&
                                                <Checkbox
                                                    disabled={site.currentUpdatingLang === lang}
                                                    isSelected={
                                                        site.isLangActive(lang)
                                                    }
                                                    onValueChange={(checked) => site.toggleLang(lang, checked)}
                                                />
                                            }
                                        </div>
                                    </div>
                                })
                        }
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
        <div className="flex flex-col items-start w-full">
            <div className="flex justify-between items-center gap-2">
                <h1 className="text-2xl font-bold">
                    {site.data.isLoading ?
                        <CircularProgress size="sm" /> :
                        url
                    }
                </h1>
                {
                    // verify
                    site.data.isFetched &&
                    (
                        site.checkVerify.isLoading ?
                            <CircularProgress size="sm" /> :
                            <>
                                {
                                    !isVerified ?
                                        <span className="text-red-500">
                                            Not Verified
                                        </span> :
                                        <Check
                                            className="text-green-500"
                                        />
                                }
                            </>
                    )
                }
            </div>
            {
                site.data.isFetched &&
                <>
                    {/* verify site */}
                    {
                        site.checkVerify.isFetched &&
                        site.checkVerify.data === false &&
                        <Card className="mt-8 w-full">
                            <CardBody className="w-full max-w-[600px]">
                                <span className="mt-4">
                                    put this code in your head tag of your website:
                                </span>
                                <CodeBox className="mt-2" code={code} />
                                <Button
                                    isLoading={site.checkVerify.isPending}
                                    disabled={site.checkVerify.isPending}
                                    onClick={reVerify}
                                    className="mt-4 w-[120px]" variant="flat">
                                    Verify
                                </Button>
                            </CardBody>
                        </Card>
                    }

                    {
                        isVerified &&
                        <Card className="mt-8 flex flex-col w-full">
                            <CardBody className="flex flex-col w-full gap-4">
                                {/* pages */}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3">
                                        <span>
                                            Pages
                                        </span>
                                        <RefreshCw01
                                            onClick={
                                                openAutoLinkModal
                                            }
                                            className="cursor-pointer"
                                            fontSize={16}
                                        />
                                    </div>
                                    {/* <div className="text-sm text-gray-500">
                                csr (client side rendering) websites will not work on auto fetching, add your pages manually
                            </div> */}
                                    <div className="flex gap-2 items-center max-w-[400px]">
                                        <Input
                                            value={pagePath}
                                            onChange={(e) => setPagePath(e.target.value)}
                                            size="sm" className="mt-2" placeholder="/contact" />
                                        <Button
                                            isLoading={site.addPageLoading}
                                            disabled={site.addPageLoading}
                                            onClick={
                                                () => site.addPage(pagePath).then(() => setPagePath(""))
                                            } className="mt-2" >Add</Button>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        {
                                            site.pages?.map((page) => {
                                                return <div
                                                    onClick={
                                                        () => selectPage(page)
                                                    }
                                                    key={page.id} className={
                                                        clsx(
                                                            "flex justify-between items-center gap-1 min-w-[40px]",
                                                            "border border-gray-200 rounded-lg px-2 py-1 cursor-pointer",
                                                            page.path == site.selectedPage ? "bg-primary-500 text-white" : ""
                                                        )
                                                    }>
                                                    <span>
                                                        {page.path}
                                                    </span>
                                                    {
                                                        page.path !== "/" &&
                                                        <Button
                                                            size="sm"
                                                            isIconOnly
                                                            variant="light"
                                                            isLoading={site.deletePage.isPending && site.deletePage.variables?.id === page.id}
                                                            disabled={site.deletePage.isPending && site.deletePage.variables?.id === page.id}
                                                            onClick={() => site.deletePage.mutateAsync({ id: page.id })} >
                                                            <Plus className="rotate-45 text-red-500" />
                                                        </Button>
                                                    }
                                                </div>
                                            })
                                        }
                                    </div>
                                </div>

                                {/* languages */}
                                <div className="flex items-center gap-2">
                                    <span>
                                        Languages
                                    </span>
                                    <Button
                                        size="sm"
                                        isIconOnly
                                        variant="light"
                                        onClick={() => setLangModalOpen(true)} >
                                        <Settings01 />
                                    </Button>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {
                                        selectedLangs.map((lang, i) => {
                                            return <Button
                                                key={i}
                                                color={
                                                    site.currentLangView === lang ?
                                                        "primary" :
                                                        "default"
                                                }
                                                onClick={
                                                    () => toggleLangView(lang)
                                                }
                                            >
                                                {site.languages[lang as keyof typeof site.languages
                                                ].native}
                                                {
                                                    lang == site.mainLang &&
                                                    <span>
                                                        (Main)
                                                    </span>
                                                }
                                            </Button>
                                        })
                                    }
                                </div>
                                {/* <div>
                            <Button
                                variant="bordered"
                                color="primary"
                                disabled={
                                    !currentPageLoaded || isAutoTranslating
                                }
                                isLoading={
                                    isAutoTranslating
                                }
                                onClick={
                                    startAutoTranslate
                                }
                            >
                                Auto Translate All
                            </Button>
                        </div> */}
                                {/* info */}
                                <div className="mt-4">
                                    <div className="flex flex-col gap-2 p-3 bg-gray-100 rounded-md">
                                        <span>
                                            Current Page: {site.selectedPage}
                                        </span>
                                        <div className="flex flex-col gap-2">
                                            <div>
                                                Status: {currentPageLoaded ? "Loaded" : "Loading"}
                                            </div>
                                            <div>
                                                Main Language: {site.languages[site.mainLang as keyof typeof site.languages].native}
                                            </div>
                                            <div>
                                                To Language: {currentLangFull}
                                            </div>
                                            <div>
                                                {/* detected texts */}
                                                Detected Texts: {currentTexts.length}
                                            </div>

                                            {
                                                site.mainLang !== site.currentLangView &&
                                                <>
                                                    <div>
                                                        {/* translated texts */}
                                                        Translated Texts: {translatedTexts.length}
                                                    </div>
                                                    <div className="flex w-[200px] flex-col gap-2">
                                                        <Button
                                                            disabled={!currentPageLoaded}
                                                            isLoading={site.translatePage.isPending}
                                                            onClick={
                                                                translate
                                                            }
                                                        >
                                                            Translate To {currentLangFull}
                                                        </Button>
                                                        {/* clear */}
                                                        <Button
                                                            disabled={!currentPageLoaded}
                                                            isLoading={site.updatePage.isPending}
                                                            onClick={
                                                                clearCurrentTranslations
                                                            }
                                                        >
                                                            Clear Translations
                                                        </Button>
                                                    </div>
                                                </>
                                            }

                                        </div>
                                    </div>
                                </div>
                                {/* preview */}
                                <div className="mt-4">
                                    <div className="flex flex-col border-2 rounded-2xl border-[#EEEEEE]">
                                        {/* bar */}
                                        <div className="px-4 py-1 w-full flex justify-between items-center border-b border-[#EEEEEE]" >
                                            <div className="flex w-2/12 items-center gap-1">
                                                <div className="w-[12px] h-[12px] rounded-full bg-[#EE6B60]" />
                                                <div className="w-[12px] h-[12px] rounded-full bg-[#F5BD4F]" />
                                                <div className="w-[12px] h-[12px] rounded-full bg-[#61C454]" />
                                            </div>
                                            <div className="w-5/12 p my-1 p-2 rounded-md bg-gray-300/30 text-center">
                                                <span>
                                                    {cleanFullUrl}
                                                </span>
                                            </div>
                                            <div className="flex justify-end w-2/12 gap-2">
                                                <Tabs
                                                    selectedKey={selectedDevice}
                                                    onSelectionChange={(value) => setSelectedDevice(value as any)}
                                                    color="primary" variant="light">
                                                    <Tab
                                                        key="desktop"
                                                        title={
                                                            <div className="flex items-center space-x-2">
                                                                <Monitor01 />
                                                            </div>
                                                        }
                                                    />
                                                    <Tab
                                                        key="mobile"
                                                        title={
                                                            <div className="flex items-center space-x-2">
                                                                <Phone01 />
                                                            </div>
                                                        }
                                                    />

                                                </Tabs>
                                            </div>
                                        </div>
                                        <div className="flex  justify-center w-full h-full relative">
                                            {
                                                isPageReady &&
                                                <iframe
                                                    style={{
                                                        width: selectedDevice === "desktop" ? "100%" : "375px",
                                                        height: selectedDevice === "desktop" ? "1080px" : "667px"

                                                    }}
                                                    src={currentUrl}
                                                    onLoad={onPageLoad}

                                                    allowFullScreen={false}
                                                />
                                            }
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    }
                </>
            }
        </div>
    </>
}

export default Site;