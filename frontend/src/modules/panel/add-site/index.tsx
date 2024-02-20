"use client";
import CodeBox from "@/shared/components/code-box";
import { LINKS } from "@/shared/constants/links";
import getScriptCode from "@/shared/utils/get-code";
import makeUrl from "@/shared/utils/make-url";
import { trpc } from "@/shared/utils/trpc";
import { isUrlValid } from "@/shared/utils/url-validation";
import { Button, Card, CardBody, Input, Textarea, useInput } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

const AddSite = () => {
    const [url, setUrl] = useState<string>("")

    const makeCode = trpc.getWebsiteTempVerifyKey.useMutation();
    const code = getScriptCode(makeCode.data || "");


    const isUrl = isUrlValid(url);

    const router = useRouter();
    const addWebsite = trpc.verifyWebsiteTempVerifyKey.useMutation();

    const websites=trpc.getWebsites.useQuery();
    const add = () => {
        if (addWebsite.isPending) return;
        addWebsite.mutateAsync({
            url,
        }).then((res) => {
            if (res) {
                router.push(makeUrl(
                    LINKS.PANEL.SITE,
                    {
                        id: res.id
                    }
                ))
                toast.success("Website Added successfully")
                websites.refetch();
            }
        }).catch((err) => {
            toast.error(err.message)
        })
    }
    return (
        <div className="w-full flex flex-col" >
            <span className="text-2xl text-gray-600">
                Add New Website
            </span>
            <Card className="w-full mt-4">
                <CardBody className="flex flex-col w-[800px]">
                    <span>
                        Enter your Website URL with http or https
                    </span>
                    <Input value={url} className="mt-4" placeholder="https://example.com"
                        errorMessage={isUrl ? "" : "Invalid URL"}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    {
                        !makeCode.data &&
                        <Button
                            isLoading={makeCode.isPending}
                            disabled={makeCode.isPending || !isUrl}
                            onClick={() => {
                                makeCode.mutate({ url });
                            }}
                            className="mt-4 w-[120px]" variant="flat">
                            Generate Code
                        </Button>
                    }
                    {
                        makeCode.isSuccess && <>
                            <span className="mt-4">
                                Now put this code in your head tag of your website:
                            </span>
                            <CodeBox className="mt-2" code={code} />
                            <Button
                                isLoading={addWebsite.isPending}
                                disabled={addWebsite.isPending}
                                onClick={add}
                                className="mt-4 w-[120px]" variant="flat">
                                Add Website
                            </Button>
                        </>
                    }
                </CardBody>
            </Card>
        </div>
    );
}

export default AddSite;