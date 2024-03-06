// T is schema of methods that you want to use, extract c
type IncomingMessage<T, D = any, R = any> = {
  uid: string;
  functionName: keyof T;
  args: D;
  isResponse?: boolean;
  isError?: boolean;
  response?: R;
  timeout?: boolean;
};
export type getInstanceReturn<
  T extends Record<string, (...args: any[]) => any>,
  L extends Record<string, (...args: any[]) => any>
> = {
  send: (
    name: keyof T,
    data?: Parameters<T[keyof T]>
  ) => Promise<ReturnType<T[keyof T]>>;
  listen: (
    callback: (
      message: Omit<IncomingMessage<L>, "isResponse" | "response" | "timeout">
    ) => Promise<ReturnType<L[keyof L]>>,
    options?: {
      timeout?: number;
      origin?: string;
    }
  ) => Unsubscribe;
};
type Unsubscribe = () => void;
class AsyncTalk {
  private static messageResponseHandlers: {
    uid: string;
    functionName: string;
    callback: (message: any) => void;
  }[] = [];
  private static listenMessages<
    T,
    // @ts-ignore
    MessageData = Parameters<T[keyof T]>,
    // @ts-ignore
    MessageResponse = ReturnType<T[keyof T]>
  >(
    win: Window,
    callback: (
      message: Omit<IncomingMessage<T, MessageData>, "isResponse" | "response">
    ) => Promise<MessageResponse>,
    options?: {
      timeout?: number;
      origin?: string;
    }
  ): Unsubscribe {
    const onMessage = async (event: MessageEvent) => {
      const message = event.data as IncomingMessage<T>;
      console.log("## GoLingo: message", message, event);

      if (message && message.uid && message.functionName) {
        const origin = options?.origin || "*";
        if (!message.isResponse) {
          if (typeof message?.timeout != "undefined") return;
          const timeoutTimer = setTimeout(() => {
            win.postMessage(
              {
                uid: message.uid,
                functionName: message.functionName,
                timeout: true,
              } as IncomingMessage<T>,
              origin
            );
          }, options?.timeout || 2000);

          try {
            const res = await callback(message);
            console.log("## GoLingo: res", message, res);

            win.postMessage(
              {
                uid: message.uid,
                functionName: message.functionName,
                response: res,
                isResponse: true,
              } as IncomingMessage<T>,
              origin
            );
          } catch (e) {
            win.postMessage(
              {
                uid: message.uid,
                functionName: message.functionName,
                response: e,
                isResponse: true,
              } as IncomingMessage<T>,
              origin
            );
          }
          clearTimeout(timeoutTimer);
        } else {
          const queue = this.messageResponseHandlers.find(
            (q) => q.uid === message.uid
          );
          if (queue) {
            queue.callback(message.response);
            console.log("## GoLingo: message.response", message.response);

            this.messageResponseHandlers = this.messageResponseHandlers.filter(
              (q) => q.uid !== message.uid
            );
          }
        }
      }
    };

    window.addEventListener("message", onMessage);
    const unsubscribe = () => {
      window.removeEventListener("message", onMessage);
    };
    return unsubscribe;
  }
  private static async sendMessage(
    win: Window,
    name: string,
    args: any = null,
    callback: (message: any) => void
  ) {
    const uid = Math.random().toString(36).substring(7);
    win.postMessage({ uid, functionName: name, args }, "*");

    this.messageResponseHandlers.push({
      uid,
      functionName: name,
      callback,
    });
  }

  private static async send<T>(
    win: Window,
    name: T,
    args: any = null
  ): Promise<any> {
    return new Promise((resolve) => {
      AsyncTalk.sendMessage(win, name as any, args, (message) => {
        resolve(message);
      });
    });
  }
  public static getInstance<
    T extends Record<string, (...args: any[]) => any>,
    L extends Record<string, (...args: any[]) => any>
  >(target: Window): getInstanceReturn<T, L> {
    return {
      send: (name, data) => {
        return AsyncTalk.send(target, name, data);
      },
      listen: (
        callback,
        options?: {
          timeout?: number;
          origin?: string;
        }
      ) => {
        return AsyncTalk.listenMessages(target, callback, options);
      },
    };
  }
}

type ParentMethods = {
  test: (name: string) => boolean;
  multiply: (a: number, b: number) => number;
};
// test
const test = async () => {
  const instance = await AsyncTalk.getInstance<ParentMethods, ParentMethods>(
    window
  );
  const unsubscribe = instance.listen(
    async (message) => {
      const { functionName, args } = message;
      switch (functionName) {
        case "test":
          return 1;
        case "multiply":
          const [a, b] = args as Parameters<ParentMethods["multiply"]>;
          return true;
      }
    },
    {
      timeout: 1000,
    }
  );
  unsubscribe();

  const dd = instance.send("test");
};
export default AsyncTalk;
