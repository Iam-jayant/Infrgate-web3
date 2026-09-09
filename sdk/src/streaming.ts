import { ChatCompletionChunk } from "./types.js";

export async function* parseServerSentEvents(
    response: Response
): AsyncIterable<ChatCompletionChunk> {
    if (!response.body) {
        throw new Error("Response body is null, cannot stream chunks.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(":")) continue;

                if (trimmed.startsWith("data: ")) {
                    const payload = trimmed.slice(6).trim();
                    if (payload === "[DONE]") {
                        return;
                    }

                    try {
                        const parsed = JSON.parse(payload) as ChatCompletionChunk;
                        yield parsed;
                    } catch {
                        // Ignore malformed heartbeats/chunks
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}