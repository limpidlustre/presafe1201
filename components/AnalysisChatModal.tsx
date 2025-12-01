import React, { useState, useEffect, useRef } from 'react';
import { models } from '../constants';
import { sendChatMessage, ChatMessage } from '../services/aiService';

interface AnalysisChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModelId: string;
  // 新增 Props 用于同步主页状态
  additionalInfo: string;
  setAdditionalInfo: (info: string) => void;
  supportingFiles: File[];
  setSupportingFiles: (files: File[]) => void;
}

export const AnalysisChatModal: React.FC<AnalysisChatModalProps> = ({ 
  isOpen, 
  onClose, 
  currentModelId,
  additionalInfo,
  setAdditionalInfo,
  supportingFiles,
  setSupportingFiles
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: '您好！我是您的全能 AI 智能助手。请在上方配置分析所需的补充信息和文档，或者直接与我对话。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(true); // 默认展开上下文配置
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendChatMessage(newHistory, currentModelId, supportingFiles);
      setMessages(prev => [...prev, { role: 'model', content: responseText }]);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || '未知错误';
      setMessages(prev => [...prev, { role: 'model', content: `[系统提示] 对话出错: ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 处理文档上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSupportingFiles([...supportingFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...supportingFiles];
    newFiles.splice(index, 1);
    setSupportingFiles(newFiles);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <span className="text-2xl">🤖</span> 
                智能助手 & 分析配置
             </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </header>

        {/* 1. 上下文配置区域 (Collapsible) */}
        <div className={`bg-slate-50 border-b border-slate-200 transition-all duration-300 ease-in-out flex flex-col ${isContextExpanded ? 'max-h-[40vh]' : 'max-h-12'}`}>
           <button 
             onClick={() => setIsContextExpanded(!isContextExpanded)}
             className="w-full px-5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-100 transition-colors shrink-0"
           >
             <span>📑 分析上下文 (补充信息 & 文档)</span>
             <svg className={`w-4 h-4 transition-transform ${isContextExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
           </button>

           <div className={`px-5 pb-5 overflow-y-auto ${isContextExpanded ? 'block' : 'hidden'}`}>
             <div className="space-y-4">
               {/* 补充信息文本框 */}
               <div>
                 <textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="在此输入关于产品的额外信息（如购买地点、保质期疑虑等），这些信息将被用于生成检测报告..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                 />
               </div>

               {/* 文档上传区域 */}
               <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600">辅助文档 (PDF, Word, Excel)</span>
                    <label className="cursor-pointer bg-white border border-slate-300 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 px-3 py-1 rounded-md text-xs transition-all flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      添加文件
                      <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                  
                  {supportingFiles.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {supportingFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded p-2 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                            <span className="truncate" title={file.name}>{file.name}</span>
                          </div>
                          <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 ml-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-xs text-slate-400 bg-slate-50/50">
                      拖拽文件到此处或点击上方按钮添加
                    </div>
                  )}
               </div>
             </div>
           </div>
        </div>

        {/* 2. 聊天区域 */}
        <div className="flex-1 flex flex-col min-h-0 bg-white relative">
           <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-slate-100/50 to-transparent z-10 pointer-events-none"></div>
           
           <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isUser 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-slate-100 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-slate-100 rounded-2xl rounded-bl-none px-4 py-3">
                   <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                  </div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
           </div>

           {/* Input Area */}
           <div className="p-4 border-t border-slate-100 bg-white">
             <div className="flex gap-2">
               <input
                 type="text"
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={handleKeyDown}
                 placeholder="输入消息..."
                 className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
               />
               <button
                 onClick={handleSend}
                 disabled={isLoading || !input.trim()}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl disabled:opacity-50 transition-colors shadow-md shadow-indigo-200"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
               </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};