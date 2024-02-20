const makeUrl = (path: string, query: Record<string, any>) => {
    // replace {id} and [id] 
    Object.keys(query).forEach((key) => {
        path = path.replace(`{${key}}`, query[key]);
        path = path.replace(`[${key}]`, query[key]);
    })
    return path;
}

export default makeUrl;