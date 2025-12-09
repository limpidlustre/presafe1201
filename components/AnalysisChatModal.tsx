import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, ChatMessage } from '../services/aiService';

interface AnalysisChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModelId: string;
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
  const [isContextExpanded, setIsContextExpanded] = useState(true);
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
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-2.5 bg-blue-50 rounded-full text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
             </div>
             <h2 className="font-bold text-slate-800 text-xl">
                智能助手 & 分析配置
             </h2>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </header>

        {/* 1. Context Config Area */}
        <div className={`bg-slate-50 border-b border-slate-200 transition-all duration-300 ease-in-out flex flex-col ${isContextExpanded ? 'max-h-[40vh]' : 'max-h-14'}`}>
           <button 
             onClick={() => setIsContextExpanded(!isContextExpanded)}
             className="w-full px-8 py-4 flex items-center justify-between text-sm font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-100 transition-colors shrink-0"
           >
             <span>📑 分析上下文 (补充信息 & 文档)</span>
             <svg className={`w-5 h-5 transition-transform ${isContextExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
           </button>

           <div className={`px-8 pb-8 overflow-y-auto ${isContextExpanded ? 'block' : 'hidden'}`}>
             <div className="space-y-5">
               <div>
                 <textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="输入关于产品的额外信息..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-5 text-base focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none h-24 transition-all placeholder-slate-400"
                 />
               </div>

               <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-500">辅助文档</span>
                    <label className="cursor-pointer bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 font-medium shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      添加文件
                      <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                  
                  {supportingFiles.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {supportingFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3 text-sm shadow-sm">
                          <div className="flex items-center gap-3 truncate">
                            <span className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-sm">📄</span>
                            <span className="truncate font-medium text-slate-700" title={file.name}>{file.name}</span>
                          </div>
                          <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 p-1.5">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400 bg-white">
                      暂无文档
                    </div>
                  )}
               </div>
             </div>
           </div>
        </div>

        {/* 2. Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-white relative">
           <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-6 py-4 text-base leading-relaxed shadow-sm ${
                      isUser 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-6 py-4 shadow-sm">
                   <div className="flex gap-2">
                    <span className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce"></span>
                    <span className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce delay-150"></span>
                  </div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
           </div>

           {/* Input Area */}
           <div className="p-6 border-t border-slate-100 bg-white">
             <div className="flex gap-4">
               <input
                 type="text"
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={handleKeyDown}
                 placeholder="输入消息..."
                 className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder-slate-400 text-slate-700 text-lg"
               />
               <button
                 onClick={handleSend}
                 disabled={isLoading || !input.trim()}
                 className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
               </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};