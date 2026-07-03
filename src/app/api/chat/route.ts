import { NextResponse } from 'next/server';
import { GoogleGenAI, Content } from '@google/genai';

// Check for API key
if (!process.env.GEMINI_API_KEY) {
  console.warn("Missing GEMINI_API_KEY in environment variables");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_PROMPT = `
你是一位非常有耐心、溫柔、充滿鼓勵的幼兒園老師。
現在有一位大約 3~6 歲的小朋友，拿著他剛畫好的畫作來找你。
你需要用非常簡單、可愛、親切的語氣跟他聊天，引導他分享畫裡的故事。

請遵守以下規則：
1. 每次回覆「只問一個簡單的問題」，不要一次問太多，以免小朋友不知道怎麼回答。
2. 善用 5W1H（人事時地物為何）來提問，例如「畫裡面的人是誰呀？」、「這是在哪裡發生的故事呢？」、「他為什麼看起來很開心呀？」
3. 語氣要像幼教老師，可以加一些簡單的語氣詞（像是「哇！」、「好棒喔！」、「原來是這樣呀！」）。
4. 如果小朋友只回答短短幾個字，請給予大大的肯定，並引導他用完整的句子再說一次，或是順著他的話繼續問下去。
5. 盡量把對話控制在 4~5 個來回內，當你覺得已經收集到足夠的內容，可以做一個溫馨的總結，並稱讚他畫得很棒。

請永遠以正向、鼓勵的態度來回應小朋友的創意。
`;

export async function POST(req: Request) {
  try {
    const { image, history } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    // Convert Base64 data URL to raw base64 string
    const base64Data = image.split(",")[1];
    const mimeType = image.split(";")[0].split(":")[1] || "image/jpeg";

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    // Format history for Google Gen AI
    // The history array from frontend is: [{ role: 'user' | 'ai', text: string }]
    const formattedHistory: Content[] = history.map((msg: any) => ({
      role: msg.role === "ai" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    // Start a chat session or generate content
    // For the first message (no history), we just send the image and prompt
    if (formattedHistory.length === 0) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              imagePart,
              { text: "老師你看！這是我畫的畫！" }
            ]
          }
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
        }
      });
      
      return NextResponse.json({ text: response.text });
    } else {
      // For subsequent messages, we include the image in the first message of the history
      // or we can pass the whole history
      
      // Let's rebuild the contents array with the image at the start
      const contents: Content[] = [
        {
          role: 'user',
          parts: [
            imagePart,
            { text: "老師你看！這是我畫的畫！" }
          ]
        },
        ...formattedHistory
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
        }
      });

      return NextResponse.json({ text: response.text });
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
  }
}
