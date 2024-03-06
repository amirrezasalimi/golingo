import { OpenAI } from "openai";
import langs from "@/shared/data/langs.json";

const ai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_GPT_KEY,
  baseURL: process.env.NEXT_PUBLIC_GPT_HOST,
});
export const aiTranslateTexts = async (
  data: {
    id: string;
    text: string;
  }[],
  from: string,
  to: string
) => {
  const fromLangNative = langs[from as keyof typeof langs]?.native;
  const toLangNative = langs[to as keyof typeof langs]?.native;

  let newData: {
    id: string;
    text: string;
  }[] = [];
  const texts = data.map((d) => d.text);
  const chunkSize = 10;
  for (let i = 0; i < texts.length; i += chunkSize) {
    try {
      const chunk = texts.slice(i, i + chunkSize);
      const response = await ai.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: `translate following json from '${fromLangNative}' to '${toLangNative}', and respond in exact json format, no extra talk:\n${JSON.stringify(
              chunk
            )}`,
          },
        ],
      });
      console.log("response", response);

      if (response.choices[0].message.content) {
        const translated = JSON.parse(response.choices[0].message.content);
        for (let j = 0; j < chunk.length; j++) {
          newData.push({
            id: data[i + j].id,
            text: translated[j],
          });
        }
      }
    } catch (error) {
      console.error("Translation failed:", error);
    }
  }
  console.log("newData", newData);

  return newData;
};
