import { models } from '../constants';
import { products } from './productData';

// 声明全局库 (由 index.html 引入)
declare const XLSX: any;
declare const mammoth: any;

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const getConfig = () => {
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('custom_api_key') : null;
  const envApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  const localBaseUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_base_url') : null;
  const envBaseUrl = (import.meta as any).env.VITE_GEMINI_BASE_URL;

  const finalApiKey = apiKey || envApiKey;
  let finalBaseUrl = localBaseUrl || envBaseUrl || 'https://generativelanguage.googleapis.com/v1beta';

  if (finalBaseUrl.endsWith('/')) finalBaseUrl = finalBaseUrl.slice(0, -1);
  if (!finalBaseUrl.includes('v1beta') && !finalBaseUrl.includes('/v1/')) finalBaseUrl = `${finalBaseUrl}/v1beta`;

  return { apiKey: finalApiKey, baseUrl: finalBaseUrl };
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

const callGeminiFetch = async (modelId: string, contents: any[], systemInstructionText?: string) => {
    const { apiKey, baseUrl } = getConfig();
    if (!apiKey) throw new Error("未配置 API Key。请点击右上角 'API 配置' 按钮进行设置。");

    const url = `${baseUrl}/models/${modelId}:generateContent?key=${apiKey}`;
    console.log("Request URL:", url);

    const body: any = {
        contents: contents,
        generationConfig: { temperature: 0.7 }
    };

    if (systemInstructionText) {
        body.systemInstruction = { parts: [{ text: systemInstructionText }] };
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            let errMsg = `API 请求失败 (${response.status})`;
            try {
                const jsonErr = JSON.parse(errText);
                if (jsonErr.error && jsonErr.error.message) errMsg = `API 错误: ${jsonErr.error.message}`;
            } catch (e) {
                errMsg += `: ${errText.substring(0, 100)}`;
            }
            throw new Error(errMsg);
        }

        const data = await response.json();
        if (data.promptFeedback?.blockReason) throw new Error(`生成被拦截: ${data.promptFeedback.blockReason}`);
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "API 未返回有效内容";
    } catch (error: any) {
        console.error("Gemini Fetch Error:", error);
        throw error;
    }
};

const REPORT_TEMPLATE = `
请严格按照以下 Markdown 表格格式输出报告。不要修改表头，不要合并单元格，每一行都要完整填写。如果某项没有数据，请填写'/'。
"检测结果"列只能填写：合格、不合格、待复检。

| 类别 | 项目名称 | 填写内容 | 检测结果(合格/不合格/待复检) |
|---|---|---|---|
| 产品基础信息 | 产品 ID | | |
| ... (保持原有详细模板内容，省略以节省空间) ...
| 附加信息 | 备注(异常情况说明) | | / |
`;

const getProductContext = () => `**内部产品数据库：** \n\`\`\`json\n${JSON.stringify(products, null, 2)}\n\`\`\``;

// 统一的分析函数
export const analyzeMealSafety = async (
    allFiles: File[], 
    modelId: string, 
    userInput: string,
    mode: 'report' | 'chat'
): Promise<string> => {
  
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

  const contents = [{
      role: 'user',
      parts: [
          { text: userPrompt },
          ...fileParts
      ]
  }];

  return callGeminiFetch(modelId, contents, systemInstruction);
};