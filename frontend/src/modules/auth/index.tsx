import Auth from "@/shared/components/auth";
import Logo from "@/shared/components/logo";

const AuthPage = () => {

    return <div className="w-screen h-screen">
        <div className="absolute left-4 top-4">
            <Logo />
        </div>
        <div className="w-full h-full flex flex-col justify-center items-center">
            <Auth />
        </div>
    </div>
}

export default AuthPage;