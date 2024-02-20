// utils
type AnyFunction = (...args: any[]) => any;

function debounce<T extends AnyFunction>(func: T, delay: number) {
    let timeoutId: NodeJS.Timeout;

    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
        const context = this;

        clearTimeout(timeoutId);

        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    } as T;
}

// Function to get the DOM path of a node
function getDomPath(el: Node): string {
    const stack: string[] = [];
    let currentNode: Node | null = el;

    while (currentNode?.parentNode) {
        const parentNode: Node | null = currentNode.parentNode;
        const siblingCount: number = Array.from(parentNode.childNodes).filter(sib => sib.nodeName === currentNode?.nodeName).length;
        let siblingIndex: number = 0;

        if (siblingCount > 1) {
            // @ts-ignore
            siblingIndex = Array.from(parentNode.childNodes).indexOf(currentNode as Node) - Array.from(parentNode.childNodes).indexOf(currentNode?.nodeName === '#text' ? (currentNode as Text).previousSibling : currentNode);
        }

        if (parentNode.nodeType === 1) {
            const idAttribute: string | null = (parentNode as HTMLElement).getAttribute('id');
            let segment: string = (parentNode.nodeName || '').toLowerCase();

            if (idAttribute && idAttribute !== '') {
                segment += `#${idAttribute}`;
            } else if (siblingCount > 1) {
                segment += `:nth-child(${siblingIndex + 1})`;
            }

            stack.unshift(segment);
        }

        currentNode = currentNode.parentNode;
    }

    return stack.slice(1).join(' > ').replace(/:nth-child\(1\)/, '') || '';
}

// Function to generate a hash for a string
function hashString(str: string): string {
    let hash: number = 0;

    if (str.length === 0) {
        return hash.toString();
    }

    for (let i = 0; i < str.length; i++) {
        const char: number = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16);
}

export {
    debounce,
    getDomPath,
    hashString
}