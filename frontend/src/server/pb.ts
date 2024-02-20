import Pocketbase, { BaseAuthStore } from 'pocketbase';
import { POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD, POCKETBASE_HOST } from '@/shared/constants/constants';
import { TypedPocketBase } from '@/shared/models/entities/pocketbase-types';
import { FileSystemCache } from "file-system-cache";
const cacher = new FileSystemCache({
    ns: "pocketbase/auth",
    ttl: 1000 * 60 * 60 * 24 * 1, // 1 day
});
const autoAuth = async () => {
    return new Promise<string>(async (resolve, reject) => {
        const cacheKey = "auth/cookie";
        const cachedToken = await cacher.get(cacheKey);
        
        if (cachedToken) {
            pb.authStore.save(cachedToken, null);
            return resolve(cachedToken);
        } else {
            await new Promise((resolve, reject) => {
                return pb.admins
                    .authWithPassword(
                        POCKETBASE_ADMIN_EMAIL as string,
                        POCKETBASE_ADMIN_PASSWORD as string
                    )
                    .then(async (res) => {
                        await cacher.set(
                            cacheKey,
                            res.token,
                            1000 * 60 * 60 * 24 * 10
                        ); // 10 day
                    })
                    .catch((e) => {
                        reject(e);
                    })
                    .finally(() => {
                        resolve(pb.authStore.token);
                    });
            });
        }
    });
}
class CustomAuthStore extends BaseAuthStore {
    constructor() {
        super();
    }
    get token(): string {
        return cacher.getSync("auth/cookie");
    }
    save(token: string, model: any) {
        super.save(token, model);
    }

    clear() {
        super.clear();
    }
}
autoAuth().then(() => {
    // console.log(`auto auth success`);
})
const pb = new Pocketbase(POCKETBASE_HOST, new CustomAuthStore()) as TypedPocketBase;
pb.autoCancellation(false)
pb.beforeSend = async (url, options) => {
    return { url, options };
}

export { pb }