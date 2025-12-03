import { models } from '../constants';
import { products } from './productData';

// 声明全局库 (由 index.html 引入)
declare const XLSX: any;
declare const mammoth: any;

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// --- 配置读取逻辑 (核心修复) ---
const getConfig = () => {
  // 1. 优先从 LocalStorage 读取 (用户手动配置)
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('custom_api_key') : null;
  const localBaseUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_base_url') : null;
  
  // 2. 环境变量作为备选
  const envApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  const envBaseUrl = (import.meta as any).env.VITE_GEMINI_BASE_URL;

  const apiKey = localKey || envApiKey;
  let baseUrl = localBaseUrl || envBaseUrl || 'https://generativelanguage.googleapis.com/v1beta';

  // URL 规范化处理
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  // 智能追加版本号: 如果不包含 v1beta 且不包含 /v1/ (OpenAI 格式)，则追加
  if (!baseUrl.includes('v1beta') && !baseUrl.includes('/v1/')) {
      baseUrl = `${baseUrl}/v1beta`;
  }

  return { apiKey, baseUrl };
};

// --- 文件处理工具函数 ---
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

// --- 核心 API 调用 (使用 fetch 以支持代理) ---
const callGeminiFetch = async (modelId: string, contents: any[], systemInstructionText?: string) => {
    const { apiKey, baseUrl } = getConfig();
    
    if (!apiKey) throw new Error("未配置 API Key。请点击右上角 'API 配置' 按钮进行设置。");

    // 构造 URL
    const url = `${baseUrl}/models/${modelId}:generateContent?key=${apiKey}`;
    
    // 调试信息 (帮助排查是发给 Google 还是 Proxy)
    console.log("[AI] Request URL:", url);

    const body: any = {
        contents: contents,
        generationConfig: {
            temperature: 0.7,
        }
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
                if (jsonErr.error && jsonErr.error.message) {
                    errMsg = `API 错误: ${jsonErr.error.message}`;
                }
            } catch (e) {
                errMsg += `: ${errText.substring(0, 100)}`;
            }
            // 抛出带 URL 的错误，方便用户知道请求发去了哪里
            throw new Error(`${errMsg} \n(请求地址: ${baseUrl})`);
        }

        const data = await response.json();
        
        if (data.promptFeedback?.blockReason) {
             throw new Error(`生成被拦截: ${data.promptFeedback.blockReason}`);
        }
        
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || "API 未返回有效内容";

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
| 产品基础信息 | 产品名称 | | |
| 产品基础信息 | 制造商 | | |
| 产品基础信息 | 产品标准代号 | | |
| 产品基础信息 | 食品生产许可证编号 | | |
| 产品基础信息 | 贮存条件 | | |
| 产品基础信息 | 保质期 | | |
| 产品基础信息 | 净含量 | | |
| 产品基础信息 | 固形物含量 | | |
| 产品基础信息 | 食用方法 | | |
| 产品基础信息 | 配料表(含添加剂/致敏原) | | |
| 产品基础信息 | 产地 | | |
| 产品基础信息 | 厂家生产地址 | | |
| 产品基础信息 | 厂家联系方式 | | |
| 成品生产信息 | 生产批次号 | | |
| 成品生产信息 | 生产日期 | | |
| 原材料溯源 1 | 原材料名称 | | |
| 原材料溯源 1 | 产地 / 牧场 | | |
| 原材料溯源 1 | 供应商 | | |
| 原材料溯源 1 | 供应商 SC 编号 | | |
| 原材料溯源 1 | 原材料生产日期 | | |
| 原材料溯源 1 | 原材料生产批号 | | |
| 原材料溯源 2 | 原材料名称 | | |
| 原材料溯源 2 | 产地 | | |
| 原材料溯源 2 | 供应商 | | |
| 原材料溯源 2 | 供应商 SC 编号 | | |
| 原材料溯源 2 | 原材料生产日期 | | |
| 原材料溯源 2 | 原材料生产批号 | | |
| 包装信息(内包装) | 供应商 | | |
| 包装信息(内包装) | 供应商 SC 编号 | | |
| 包装信息(内包装) | 生产日期 | | |
| 包装信息(内包装) | 生产批号 | | |
| 包装信息(外包装) | 供应商 | | |
| 包装信息(外包装) | 供应商 SC 编号 | | |
| 包装信息(外包装) | 生产日期 | | |
| 销售去向(渠道 1) | 渠道类型(例如：餐饮/电商) | | |
| 销售去向(渠道 1) | 渠道/仓储名称 | | |
| 销售去向(渠道 1) | 所在地 | | |
| 销售去向(渠道 1) | 平台 / 描述 | | |
| 销售去向(渠道 2) | 渠道类型 | | |
| 销售去向(渠道 2) | 渠道/仓储名称 | | |
| 销售去向(渠道 2) | 所在地 | | |
| 销售去向(渠道 2) | 平台 / 描述 | | |
| 安全检测项目 | 感官性状(色泽/气味/组织状态/异物) | | |
| 安全检测项目 | 微生物指标(菌落总数/大肠菌群/致病菌) | | |
| 安全检测项目 | 理化指标(水分/酸价/过氧化值) | | |
| 安全检测项目 | 添加剂残留(防腐剂/着色剂等) | | |
| 安全检测项目 | 污染物限量(铅/镉/亚硝酸盐) | | |
| 安全检测项目 | 专项检测(农残/兽残/真菌毒素) | | |
| 检测结论与预测 | 综合检测结论 | | |
| 检测结论与预测 | AI 预测可能污染环节 | | |
| 附加信息 | 检测机构 | AI 智能检测实验室 | / |
| 附加信息 | 检测人员 | AI 专家 | / |
| 附加信息 | 检测日期 | ${new Date().toLocaleDateString()} | / |
| 附加信息 | 备注(异常情况说明) | | / |
`;

const getProductContext = () => `**内部产品数据库：** \n\`\`\`json\n${JSON.stringify(products, null, 2)}\n\`\`\``;

// --- 统一的分析函数 (Export) ---
export const analyzeMealSafety = async (
    allFiles: File[], 
    modelId: string, 
    userInput: string,
    mode: 'report' | 'chat'
): Promise<string> => {
  
  let systemInstruction = '';
  let userPrompt = '';

  if (mode === 'report') {
      systemInstruction = `你是一个专业的预制菜安全分析师。请基于提供的文件（图片、文档）和用户输入进行综合分析。
      **重要：你必须严格输出 Markdown 表格，格式如下：**
      ${REPORT_TEMPLATE}
      请务必确保每一列都对齐。第一列“类别”必须按上述模板重复填写，不要留空，方便程序解析。
      ${getProductContext()}`;
      userPrompt = `请分析上传的文件。补充说明：${userInput || '无'}。请生成《预制菜安全检测 AI 分析报告》。`;
  } else {
      systemInstruction = `你是一个全能助手，也是预制菜领域的专家。请根据用户提供的图片、文档和问题进行回答。
      ${getProductContext()}`;
      userPrompt = userInput || "请分析这些文件。";
  }

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

export const sendChatMessage = async (
    history: ChatMessage[],
    modelId: string,
    supportingFiles: File[]
): Promise<string> => {
    
    // 过滤掉开头的 'model' 消息，确保以 'user' 开头
    let validHistory = history;
    if (validHistory.length > 0 && validHistory[0].role === 'model') {
        validHistory = validHistory.slice(1);
    }

    const contents = validHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));
    
    // 将文件挂载到最后一条用户消息上
    if (supportingFiles.length > 0 && contents.length > 0) {
        let lastUserMsg: any = null;
        for (let i = contents.length - 1; i >= 0; i--) {
            if (contents[i].role === 'user') {
                lastUserMsg = contents[i];
                break;
            }
        }
        if (lastUserMsg) {
             const fileParts = await processFilesForGemini(supportingFiles);
             lastUserMsg.parts.push(...fileParts);
        }
    }

    const systemInstruction = `你是一个全能助手，也是预制菜领域的专家。请根据用户提供的图片、文档和对话历史进行回答。
    ${getProductContext()}`;

    return callGeminiFetch(modelId, contents, systemInstruction);
};