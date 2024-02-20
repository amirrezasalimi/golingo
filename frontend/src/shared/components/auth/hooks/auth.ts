import { useMemo, useState } from "react";
import Pocketbase from "pocketbase";
import { pb_client } from "@/shared/utils/pb";
import useAuth from "@/shared/hooks/auth";

const useAuthFlow = () => {
    const auth=useAuth();
    const [currentAuthLoading, setCurrentAuthLoading] = useState<string | null>(null);

    const open = async (name: string) => {
        setCurrentAuthLoading(name);


        const res = await pb_client.collection('users').authWithOAuth2({
            provider: 'github',
        });
        console.log(res);
        if (res.token) {
            // pb_client.authStore.save(res.token);
            auth.refresh();
        }
        setCurrentAuthLoading(null);

    }
    return {
        open,
        currentAuthLoading
    }
}

export default useAuthFlow;