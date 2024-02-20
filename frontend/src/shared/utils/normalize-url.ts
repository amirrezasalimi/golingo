export const normalizeUrl = (url: string) => {
    // remove https, http, www
    return url.replace(/(https:\/\/|http:\/\/|www.)/g, "");
}