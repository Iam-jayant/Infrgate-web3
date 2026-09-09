import {
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionCreateParams,
    ChatCompletionCreateParamsNonStreaming,
    ChatCompletionCreateParamsStreaming,
    InfrgateError
} from "../types.js";
import { parseServerSentEvents } from "../streaming.js";

export class Chat {
    constructor(private readonly client: { request: (path: string, options: RequestInit) => Promise<Response> }) { }

    completions = {
        create: (async (params: ChatCompletionCreateParams): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>> => {
            const response = await this.client.request("/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                let errBody: unknown;
                try {
                    errBody = await response.json();
                } catch {
                    errBody = await response.text();
                }
                throw new InfrgateError(
                    `Infrgate API Error (${response.status}): ${response.statusText}`,
                    response.status,
                    errBody
                );
            }

            if (params.stream) {
                return parseServerSentEvents(response);
            }

            return (await response.json()) as ChatCompletion;
        }) as {
            (params: ChatCompletionCreateParamsStreaming): Promise<AsyncIterable<ChatCompletionChunk>>;
            (params: ChatCompletionCreateParamsNonStreaming): Promise<ChatCompletion>;
            (params: ChatCompletionCreateParams): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>>;
        }
    };
}