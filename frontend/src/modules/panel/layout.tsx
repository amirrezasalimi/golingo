"use client";
import ProtectedLayout from "@/shared/components/protected-layout";
import "./layout.css";
import Sidebar from "./components/sidebar";
import Avatar from "@/shared/components/avatar";
import useAuth from "@/shared/hooks/auth";
import Link from "next/link";
import { LINKS } from "@/shared/constants/links";

const PanelLayout = ({ children }: {
    children: React.ReactNode
}) => {
    const { user } = useAuth();
    return <ProtectedLayout>
        <div className="w-full h-screen flex">
            {/* sidebar */}
            <div className="w-[300px] p-4 h-screen bg-white border-r border-gray-300/10">
                <Sidebar />
            </div>
            {/* content */}
            <div className="w-full h-full flex flex-col justify-start items-start overflow-y-auto" >
                <div className="container mx-auto p-4 flex justify-between items-center bg-white border-b border-gray-200/5">
                    <div />
                    <div>
                        <Link href={LINKS.AUTH} >
                            <Avatar
                                name={user?.username}
                                src={user?.avatar}
                            />
                        </Link>
                    </div>
                </div>
                <div className="container mx-auto w-full h-full flex justify-start items-start p-8">
                    {children}
                </div>
            </div>
        </div>
    </ProtectedLayout>
}

export default PanelLayout