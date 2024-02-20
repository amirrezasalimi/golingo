export async function verifySiteScript(url: string, unique_code: string) {
    try {
        // todo: check with better method
        const content = await fetch(url).then(res => res.text())
        return content.includes(unique_code);
    } catch (e) {
        return false;
    }
}