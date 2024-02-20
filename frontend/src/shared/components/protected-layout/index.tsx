"use client";
import { LINKS } from "@/shared/constants/links";
import useAuth from "@/shared/hooks/auth";
import { CircularProgress } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ProtectedLayout = ({ children }: {
    children: React.ReactNode
}) => {
    const { status, isLogin } = useAuth();
    const router = useRouter();
    useEffect(() => {
        if (status == "success" && !isLogin) {
            router.push(LINKS.AUTH)
        }
    }, [status, isLogin]);
    return <>

        {
            status == "pending" &&
            <div className="flex justify-center items-center h-screen">
                <CircularProgress size="lg" />
            </div>
        }
        {
            status == "success" && isLogin &&
            <>
                {children}
            </>
        }

    </>
}

export default ProtectedLayout;