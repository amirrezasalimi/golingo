"use client";
import { TrpcProvider } from "@/shared/utils/trpc-provider";
import { NextUIProvider } from "@nextui-org/react";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Props {
    children: React.ReactNode;
}
const GeneralLayout = ({
    children
}: Props) => {
    return (
        <>
            <NextUIProvider>
                <TrpcProvider>{children}</TrpcProvider>
            </NextUIProvider>
            <ToastContainer />
        </>
    )
}

export default GeneralLayout;