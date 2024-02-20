'use client';

import { Copy02 } from "@untitled-ui/icons-react";
import clsx from "clsx";
import { toast } from "react-toastify";
interface Props {
    code: string;
    className?: string;
}
const CodeBox = ({ code, className }: Props) => {

    const copy = () => {
        navigator.clipboard.writeText(code);
        toast.success("Copied to clipboard");
    }
    return <div className={clsx("relative overflow-hidden rounded-md mt-4 p-4 bg-gray-100", className)}>
        <pre className="relative rounded-m overflow-auto">
            <code>
                {code}
            </code>
        </pre>
        <div onClick={copy}
            className="absolute flex justify-center items-center  top-0 right-0 h-full w-[42px] cursor-pointer bg-gray-100  active:bg-gray-200" >
            <Copy02
                fontSize={24} />
        </div>
    </div>

}

export default CodeBox;