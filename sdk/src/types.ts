export interface ClientOptions {
    apiKey?: string;
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
}

export type Role = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
    role: Role;
    content: string;
    name?: string;
}

export interface ChatCompletionCreateParamsBase {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stop?: string | string[];
}

export interface ChatCompletionCreateParamsNonStreaming extends ChatCompletionCreateParamsBase {
    stream?: false;
}

export interface ChatCompletionCreateParamsStreaming extends ChatCompletionCreateParamsBase {
    stream: true;
}

export type ChatCompletionCreateParams =
    | ChatCompletionCreateParamsNonStreaming
    | ChatCompletionCreateParamsStreaming;

export interface ChatCompletionChoice {
    index: number;
    message: ChatMessage;
    finish_reason: string | null;
}

export interface ChatCompletionUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface ChatCompletion {
    id: string;
    object: "chat.completion";
    created: number;
    model: string;
    choices: ChatCompletionChoice[];
    usage?: ChatCompletionUsage;
}

export interface ChatCompletionChunkDelta {
    role?: Role;
    content?: string;
}

export interface ChatCompletionChunkChoice {
    index: number;
    delta: ChatCompletionChunkDelta;
    finish_reason: string | null;
}

export interface ChatCompletionChunk {
    id: string;
    object: "chat.completion.chunk";
    created: number;
    model: string;
    choices: ChatCompletionChunkChoice[];
}

export class InfrgateError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly body: unknown
    ) {
        super(message);
        this.name = "InfrgateError";
    }
}