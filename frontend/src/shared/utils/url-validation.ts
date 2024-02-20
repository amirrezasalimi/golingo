export const isUrlValid = (url: string) => {
    // with http or https and has valid domain suffix in the end 
    const regex = /^(http:\/\/localhost(:\d+)?|https:\/\/localhost(:\d+)?|http[s]?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d+)?(\/[^\s]*)?)$/;
    return regex.test(url);
}