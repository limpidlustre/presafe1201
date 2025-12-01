import { GoogleGenAI } from "@google/genai";
import { models } from '../constants';
import { products } from './productData';

// 声明全局库 (由 index.html 引入)
declare const XLSX: any;
declare const mammoth: any;

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// 图片/PDF 转 Base64 (保持原逻辑)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove data:image/png;base64, prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

// 读取文件为 ArrayBuffer (用于解析 Excel/Word)
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
};

// 解析 Excel 为 CSV 文本
const parseExcelToText = async (file: File): Promise<string> => {
    try {
        const data = await readFileAsArrayBuffer(file);
        const workbook = XLSX.read(data, { type: 'array' });
        let text = '';
        workbook.SheetNames.forEach((sheetName: string) => {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            if (csv.trim()) {
                text += `[工作表: ${sheetName}]\n${csv}\n\n`;
            }
        });
        return text || "Excel 文件为空";
    } catch (e) {
        console.error("Excel parse error", e);
        return `无法解析 Excel 文件: ${file.name}`;
    }
};

// 解析 Word 为纯文本
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

// 智能处理文件：根据类型决定转 Base64 还是转文本
const processFilesForGemini = async (files: File[]) => {
    const parts: any[] = [];
    
    for (const file of files) {
        const lowerName = file.name.toLowerCase();
        const type = file.type;

        // 1. 图片或 PDF -> 使用 inlineData (Base64)
        // 注意：Gemini 目前对 PDF 支持较好，对图片支持很好
        if (type.startsWith('image/') || type === 'application/pdf' || lowerName.endsWith('.pdf')) {
            const mimeType = type === 'application/pdf' || lowerName.endsWith('.pdf') ? 'application/pdf' : type;
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: await fileToBase64(file)
                }
            });
        } 
        // 2. Excel -> 转文本
        else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || type.includes('spreadsheet') || type.includes('excel')) {
            const textContent = await parseExcelToText(file);
            parts.push({
                text: `\n=== 附件内容 (Excel: ${file.name}) ===\n${textContent}\n=== 结束 ===\n`
            });
        }
        // 3. Word -> 转文本
        else if (lowerName.endsWith('.docx') || type.includes('wordprocessing') || type.includes('msword')) {
            const textContent = await parseWordToText(file);
             parts.push({
                text: `\n=== 附件内容 (Word: ${file.name}) ===\n${textContent}\n=== 结束 ===\n`
            });
        }
        // 4. 其他文本文件 -> 尝试直接读取
        else if (type.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.csv') || lowerName.endsWith('.json')) {
             const text = await file.text();
             parts.push({
                text: `\n=== 附件内容 (${file.name}) ===\n${text}\n=== 结束 ===\n`
            });
        }
        // 5. 不支持的格式
        else {
            console.warn(`Skipping unsupported file type: ${type}`);
            parts.push({
                text: `[系统提示: 文件 ${file.name} 格式不支持直接分析，请转换为 PDF 或 图片上传]`
            });
        }
    }
    return parts;
};

// 获取 API Key (优先读取本地设置，解决 Vercel 环境变量问题)
const getApiKey = () => {
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('custom_api_key') : null;
  return localKey || process.env.API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
};

// 构造完全符合用户 PDF 的 Markdown 表格模板
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

export const sendChatMessage = async (history: ChatMessage[], modelId: string, supportingFiles: File[] = []): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("未配置 API Key");
    
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `你是一个全能助手。如果用户上传了Excel或Word文件，其内容已转换为文本附在消息中，请阅读并分析它们。` + getProductContext();

    // 1. 过滤掉开头的 'model' 消息
    let validHistory = history;
    if (validHistory.length > 0 && validHistory[0].role === 'model') {
        validHistory = validHistory.slice(1);
    }

    // Prepare contents
    const contents = validHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));
    
    // Process and attach files to the last user message
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

    const response = await ai.models.generateContent({
        model: modelId,
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
        }
    });

    return response.text || "API 未返回有效内容";
};


export const analyzeMealSafety = async (
    files: File[], 
    modelId: string, 
    additionalInfo: string,
    supportingFiles: File[] = [] 
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("未配置 API Key，请在设置中填写。");

  const ai = new GoogleGenAI({ apiKey });
  
  const dbInstruction = `**内部产品数据库：** \n\`\`\`json\n${JSON.stringify(products, null, 2)}\n\`\`\``; 
  
  const systemInstruction = `你是一个专业的预制菜安全分析师。
  请基于图片视觉信息、补充信息和内部数据库进行综合分析。
  
  **重要：你必须严格输出 Markdown 表格，格式如下：**
  ${REPORT_TEMPLATE}
  
  请务必确保每一列都对齐。第一列“类别”必须按上述模板重复填写，不要留空，方便程序解析。
  
  ${dbInstruction}`;
  
  const userPrompt = `请分析上传的预制菜图片及文档。补充信息：${additionalInfo || '无'}。请生成《预制菜安全检测 AI 分析报告》。`;

  // Process Images (Main input)
  const imageParts = await processFilesForGemini(files);

  // Process Supporting Documents
  const docParts = await processFilesForGemini(supportingFiles);

  const response = await ai.models.generateContent({
      model: modelId,
      contents: {
          role: 'user',
          parts: [
              { text: userPrompt },
              ...imageParts,
              ...docParts
          ]
      },
      config: {
          systemInstruction: systemInstruction
      }
  });

  return response.text || "无内容";
};

// Helper for Context Prompt
const getProductContext = () => {
    return `
    请根据上下文回答用户问题。如果涉及食品安全，请保持严谨。
    `; 
};