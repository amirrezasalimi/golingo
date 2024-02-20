import { RateLimiterMemory } from "rate-limiter-flexible";

const limiters: Record<string, RateLimiterMemory> = {};

export default function limiter(key: string, opts: { points: number, duration: number }, fingerprint: string) {
    if (!limiters[key]) {
        limiters[key] = new RateLimiterMemory(opts);
    }
    return limiters[key].consume(fingerprint)

}