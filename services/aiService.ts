import { GoogleGenAI } from "@google/genai";
import { products } from './productData';

// 声明全局库 (由 index.html 引入)
declare const XLSX: any;
declare const mammoth: any;

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// 获取 API Key 的辅助函数
const getApiKey = (): string => {
  // 1. 优先从 LocalStorage 读取 (用户手动配置)
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('custom_api_key');
    if (localKey && localKey.trim() !== '') {
      return localKey.trim();
    }
  }

  // 2. 尝试从 Vite 环境变量读取
  if ((import.meta as any).env && (import.meta as any).env.VITE_GEMINI_API_KEY) {
    return (import.meta as any).env.VITE_GEMINI_API_KEY;
  }

  // 3. 尝试从 process.env 读取 (兼容非浏览器环境或构建时注入)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }

  return '';
};

// 获取 Base URL 的辅助函数
const getBaseUrl = (): string | undefined => {
  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('custom_base_url');
    if (localUrl && localUrl.trim() !== '') {
      return localUrl.trim();
    }
  }
  return (import.meta as any).env?.VITE_GEMINI_BASE_URL;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
};

const parseExcelToText = async (file: File): Promise<string> => {
    try {
        const data = await readFileAsArrayBuffer(file);
        const workbook = XLSX.read(data, { type: 'array' });
        let text = '';
        workbook.SheetNames.forEach((sheetName: string) => {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            if (csv.trim()) text += `[Excel工作表: ${sheetName}]\n${csv}\n\n`;
        });
        return text || "Excel 文件为空";
    } catch (e) {
        console.error("Excel parse error", e);
        return `无法解析 Excel 文件: ${file.name}`;
    }
};

const parseWordToText = async (file: File): Promise<string> => {
    try {
        const data = await readFileAsArrayBuffer(file);
        const result = await mammoth.extractRawText({ arrayBuffer: data });
        return result.value || "Word 文件为空";
    } catch (e) {
         console.error("Word parse error", e);
         return `无法解析 Word 文件: ${file.name}`;
    }
};

const processFilesForGemini = async (files: File[]) => {
    const parts: any[] = [];
    for (const file of files) {
        const lowerName = file.name.toLowerCase();
        const type = file.type;

        if (type.startsWith('image/') || type === 'application/pdf' || lowerName.endsWith('.pdf')) {
            const mimeType = (type === 'application/pdf' || lowerName.endsWith('.pdf')) ? 'application/pdf' : type;
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: await fileToBase64(file)
                }
            });
        } 
        else if (lowerName.match(/\.(xlsx|xls)$/) || type.includes('spreadsheet') || type.includes('excel')) {
            const textContent = await parseExcelToText(file);
            parts.push({ text: `\n=== 附件内容 (Excel: ${file.name}) ===\n${textContent}\n=== 结束 ===\n` });
        }
        else if (lowerName.match(/\.(docx|doc)$/) || type.includes('wordprocessing') || type.includes('msword')) {
            const textContent = await parseWordToText(file);
            parts.push({ text: `\n=== 附件内容 (Word: ${file.name}) ===\n${textContent}\n=== 结束 ===\n` });
        }
        else if (type.startsWith('text/') || lowerName.match(/\.(txt|csv|json|md)$/)) {
             const text = await file.text();
             parts.push({ text: `\n=== 附件内容 (${file.name}) ===\n${text}\n=== 结束 ===\n` });
        }
        else {
            console.warn(`Skipping unsupported file type: ${type}`);
            parts.push({ text: `[系统提示: 文件 ${file.name} 格式不支持直接分析]` });
        }
    }
    return parts;
};

const REPORT_TEMPLATE = `
请严格按照以下 Markdown 表格格式输出报告。不要修改表头，不要合并单元格，每一行都要完整填写。如果某项没有数据，请填写'/'。
"检测结果"列只能填写：合格、不合格、待复检。

| 类别 | 项目名称 | 填写内容 | 检测结果(合格/不合格/待复检) |
|---|---|---|---|
| 产品基础信息 | 产品 ID | | |
| 产品基础信息 | 产品名称 | | |
| 产品基础信息 | 生产商 | | |
| 产品基础信息 | 产地 | | |
| 原料与配料分析 | 主要原料来源 | | |
| 原料与配料分析 | 潜在过敏原 | | |
| 原料与配料分析 | 食品添加剂合规性 | | |
| 生产与包装分析 | 生产许可证号 | | |
| 生产与包装分析 | 包装材料合规性 | | |
| 生产与包装分析 | 生产日期与保质期 | | |
| 风险评估与建议 | 综合风险等级 | | |
| 风险评估与建议 | 关键风险点 | | |
| 风险评估与建议 | 改进建议 | | |
| 附加信息 | 备注(异常情况说明) | | / |
`;

const getProductContext = () => `**内部产品数据库：** \n\`\`\`json\n${JSON.stringify(products, null, 2)}\n\`\`\``;

// 初始化 AI 客户端的通用方法
const createAIClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("请求失败: 未配置 API Key。请点击右上角'API 配置'进行设置，或检查环境变量。");
    }
    
    const clientOptions: any = { apiKey };
    const baseUrl = getBaseUrl();
    if (baseUrl) {
        // 尝试通过 baseUrl 配置代理地址
        // 注意：@google/genai SDK 的不同版本对 baseUrl 的支持方式可能不同
        // 这里尝试直接传入 options，如果 SDK 支持它会生效
        clientOptions.baseUrl = baseUrl;
    }

    return new GoogleGenAI(clientOptions);
};

// 统一的分析函数
export const analyzeMealSafety = async (
    allFiles: File[], 
    modelId: string, 
    userInput: string,
    mode: 'report' | 'chat'
): Promise<string> => {
    const ai = createAIClient();
  
    // 根据模式决定 Prompt
    let systemInstruction = '';
    let userPrompt = '';

    if (mode === 'report') {
        systemInstruction = `你是一个专业的预制菜安全分析师。请基于提供的文件（图片、文档）和用户输入进行综合分析。
        **重要：你必须严格输出 Markdown 表格，格式如下：**
        ${REPORT_TEMPLATE}
        请务必确保每一列都对齐。
        ${getProductContext()}`;
        userPrompt = `请分析上传的文件。补充说明：${userInput || '无'}。请生成《预制菜安全检测 AI 分析报告》。`;
    } else {
        systemInstruction = `你是一个全能助手，也是预制菜领域的专家。请根据用户提供的图片、文档和问题进行回答。
        ${getProductContext()}`;
        userPrompt = userInput || "请分析这些文件。";
    }

    // 处理所有文件
    const fileParts = await processFilesForGemini(allFiles);

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                role: 'user',
                parts: [
                    { text: userPrompt },
                    ...fileParts
                ]
            },
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7
            }
        });

        return response.text || "API 未返回有效内容";
    } catch (error: any) {
        console.error("AI Request Failed:", error);
        throw new Error(error.message || "请求 AI 服务失败");
    }
};

export const sendChatMessage = async (
    history: ChatMessage[],
    modelId: string,
    supportingFiles: File[]
): Promise<string> => {
    const ai = createAIClient();

    const fileParts = await processFilesForGemini(supportingFiles);
    
    // Construct contents from history
    const contents = history.map((msg, index) => {
        const isLast = index === history.length - 1;
        const parts: any[] = [{ text: msg.content }];
        
        if (isLast && msg.role === 'user' && fileParts.length > 0) {
            // Attach files to the latest user message
            parts.push(...fileParts);
        }
        
        return {
            role: msg.role,
            parts: parts
        };
    });

    const systemInstruction = `你是一个全能助手，也是预制菜领域的专家。请根据用户提供的图片、文档和对话历史进行回答。
    ${getProductContext()}`;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7
            }
        });

        return response.text || "API 未返回有效内容";
    } catch (error: any) {
        console.error("Chat Request Failed:", error);
        throw new Error(error.message || "对话请求失败");
    }
};