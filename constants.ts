
export enum ModelProvider {
    GOOGLE = 'google',
    OPENAI = 'openai', // 通用 OpenAI 协议（DeepSeek, 阿里 Qwen, 豆包等都属于此类）
}

export interface ModelConfig {
    id: string;
    name: string;
    provider: ModelProvider;
    // 新增：指定使用哪套环境变量 (例如 'DEEPSEEK' 或 'QWEN')
    // 如果不填，默认使用通用的 VITE_LLM_...
    envKey?: string; 
}

export const models: ModelConfig[] = [
    // --- Google Gemini 系列 (共用 VITE_GEMINI_API_KEY) ---
    { 
        id: 'gemini-2.5-flash', 
        name: '极速检测引擎 (Lite)', // 原 Gemini 2.5 Flash
        provider: ModelProvider.GOOGLE 
    },
    { 
        id: 'gemini-2.5-pro', 
        name: '专家分析引擎 (Pro)', // 原 Gemini 2.5 Pro
        provider: ModelProvider.GOOGLE 
    },


    // --- DeepSeek (使用 VITE_DEEPSEEK_...) ---
    { 
        id: 'deepseek-chat', 
        name: '通用推理引擎 (V3)', // 原 DeepSeek V3
        provider: ModelProvider.OPENAI,
        envKey: 'DEEPSEEK' 
    },

    // --- 阿里通义千问 (使用 VITE_QWEN_...) ---
    { 
        id: 'qwen-plus', 
        name: '综合研判引擎 (Plus)', // 原 Qwen Plus
        provider: ModelProvider.OPENAI,
        envKey: 'QWEN' 
    },
];

// 兼容旧代码类型引用
export type Model = string;
