"use client";
import Logo from "@/shared/components/logo";
import { LINKS } from "@/shared/constants/links";
import useWordsCredit from "@/shared/hooks/credit";
import makeUrl from "@/shared/utils/make-url";
import { normalizeUrl } from "@/shared/utils/normalize-url";
import { trpc } from "@/shared/utils/trpc";
import { Button, CircularProgress, Tooltip } from "@nextui-org/react";
import { Plus } from "@untitled-ui/icons-react";
import clsx from "clsx";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const Sidebar = () => {
    const websites = trpc.getWebsites.useQuery();
    const router = useRouter();
    const choose = (id: string) => {
        router.push(
            makeUrl(LINKS.PANEL.SITE, {
                id
            })
        )
    }
    const params = useParams();
    const currentSite = params?.id;
    const credit = useWordsCredit();
    return <>
        <div className="size-full flex flex-col justify-between">


            <div>
                <Logo />
                <div
                    className="w-full h-px bg-gray-100 my-4"
                />
                <span className="text-gray-500/50 text-lg font-light">
                    WEBSITES
                </span>
                <div className="w-full flex flex-col justify-start items-start gap-2 my-4">
                    {
                        websites.isSuccess && websites.data.map((website) => (
                            <div
                                onClick={() => choose(website.id)}
                                key={website.id} className={
                                    clsx(
                                        currentSite == website.id && "bg-gray-100",
                                        "w-full px-3 py-2 flex justify-between items-center rounded-md cursor-pointer hover:bg-gray-100 transition-all",
                                    )
                                } >
                                <span className="text-gray-500 text-lg font-light">
                                    {
                                        normalizeUrl(website.url)
                                    }
                                </span>
                            </div>
                        ))
                    }
                </div>
                {
                    websites.isLoading && <div className="w-full my-8 flex justify-center items-center" >
                        <CircularProgress size="sm" />
                    </div>
                }
                {
                    websites.isSuccess && websites.data.length == 0 &&
                    <div className="w-full my-8 flex justify-center items-center text-gray-500" >
                        Empty
                    </div>
                }
                {/* add site button */}
                <Link href={LINKS.PANEL.ADD_SITE}>
                    <Button color="primary" className="w-full h-12 flex justify-center items-center"
                        variant="solid"
                    >
                        <Plus />
                        <span className="text-md">
                            Add Site
                        </span>
                    </Button>
                </Link>
            </div>

            <Tooltip content={
                <div className="w-48 text-sm text-center">
                    remaining word credit, each word translation cost 1
                </div>
            }>
                <div className="w-full flex gap-2  justify-center items-center" >
                    <span className="text-sm">{credit.wordsCredits} Texts</span>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="24" fill="white" />
                        <path d="M11.2827 3.4533C11.5131 2.98636 11.6284 2.75289 11.7848 2.6783C11.9209 2.6134 12.0791 2.6134 12.2152 2.6783C12.3717 2.75289 12.4869 2.98636 12.7174 3.4533L14.9041 7.88327C14.9721 8.02112 15.0061 8.09004 15.0558 8.14356C15.0999 8.19094 15.1527 8.22933 15.2113 8.25661C15.2776 8.28741 15.3536 8.29852 15.5057 8.32076L20.397 9.03569C20.9121 9.11098 21.1696 9.14862 21.2888 9.27442C21.3925 9.38388 21.4412 9.53428 21.4215 9.68376C21.3988 9.85556 21.2124 10.0372 20.8395 10.4004L17.3014 13.8464C17.1912 13.9538 17.136 14.0075 17.1004 14.0714C17.0689 14.128 17.0487 14.1902 17.0409 14.2545C17.0321 14.3271 17.0451 14.403 17.0711 14.5547L17.906 19.4221C17.994 19.9355 18.038 20.1922 17.9553 20.3445C17.8833 20.477 17.7554 20.57 17.6071 20.5975C17.4366 20.6291 17.2061 20.5078 16.7451 20.2654L12.3724 17.9658C12.2361 17.8942 12.168 17.8583 12.0962 17.8443C12.0327 17.8318 11.9673 17.8318 11.9038 17.8443C11.832 17.8583 11.7639 17.8942 11.6277 17.9658L7.25492 20.2654C6.79392 20.5078 6.56341 20.6291 6.39297 20.5975C6.24468 20.57 6.11672 20.477 6.04474 20.3445C5.962 20.1922 6.00603 19.9355 6.09407 19.4221L6.92889 14.5547C6.95491 14.403 6.96793 14.3271 6.95912 14.2545C6.95132 14.1902 6.93111 14.128 6.89961 14.0714C6.86402 14.0075 6.80888 13.9538 6.69859 13.8464L3.16056 10.4004C2.78766 10.0372 2.60121 9.85556 2.57853 9.68376C2.55879 9.53428 2.60755 9.38388 2.71125 9.27442C2.83044 9.14862 3.08797 9.11098 3.60304 9.03569L8.49431 8.32076C8.64642 8.29852 8.72248 8.28741 8.78872 8.25661C8.84736 8.22933 8.90016 8.19094 8.94419 8.14356C8.99391 8.09004 9.02793 8.02112 9.09597 7.88327L11.2827 3.4533Z" fill="#FFE352" stroke="#FFD913" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </div>
            </Tooltip>
        </div>
    </>
}

export default Sidebar;