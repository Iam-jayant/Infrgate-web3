import { ClientOptions } from "./types.js";
import { Chat } from "./resources/chat.js";

export * from "./types.js";

export class Infrgate {
    public readonly apiKey: string;
    public readonly baseURL: string;
    public readonly timeout: number;
    public readonly chat: Chat;

    constructor(options: ClientOptions = {}) {
        this.apiKey = options.apiKey || process.env.INFRGATE_API_KEY || "";
        this.baseURL = (options.baseURL || process.env.INFRGATE_BASE_URL || "https://infrgate.onrender.com/v1").replace(/\/+$/, "");
        this.timeout = options.timeout || 60000;

        this.chat = new Chat(this);
    }

    public async request(path: string, init: RequestInit): Promise<Response> {
        const url = `${this.baseURL}${path.startsWith("/") ? path : `/${path}`}`;
        const headers = new Headers(init.headers);

        if (this.apiKey) {
            headers.set("Authorization", `Bearer ${this.apiKey}`);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            return await fetch(url, {
                ...init,
                headers,
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

export default Infrgate;