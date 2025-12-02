import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultDisplay } from './components/ResultDisplay';
import { SettingsModal } from './components/SettingsModal';
import { models } from './constants';
import { analyzeMealSafety } from './services/aiService';

const App: React.FC = () => {
  // 统一文件状态
  const [files, setFiles] = useState<File[]>([]);
  const [model, setModel] = useState<string>(models[0].id);
  
  // 统一文本输入状态
  const [inputText, setInputText] = useState('');
  
  const [result, setResult] = useState<string>('');
  const [resultMode, setResultMode] = useState<'report' | 'chat'>('report');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleAction = useCallback(async (mode: 'report' | 'chat') => {
    if (files.length === 0 && !inputText.trim()) {
      setError('请至少上传文件或输入内容。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult('');
    setResultMode(mode);

    try {
      const response = await analyzeMealSafety(files, model, inputText, mode);
      setResult(response);
    } catch (err) {
      if (err instanceof Error) {
        setError(`请求失败: ${err.message}`);
      } else {
        setError('发生未知错误，请重试。');
      }
    } finally {
      setIsLoading(false);
    }
  }, [files, model, inputText]);

  const HeaderIcon = () => (
    <div className="bg-gradient-to-tr from-purple-600 to-blue-600 p-2 rounded-lg shadow-[0_0_15px_rgba(124,58,237,0.5)]">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-[#0B0C15] font-sans text-slate-200 flex flex-col overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200">
        
        {/* 背景光效 */}
        <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px]"></div>
            <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-indigo-900/10 rounded-full blur-[80px]"></div>
        </div>

        {/* Navbar */}
        <nav className="bg-[#131522]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <HeaderIcon />
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-wide">
                预制菜安全检测智能体
              </h1>
            </div>
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-all text-sm font-medium border border-white/5 hover:border-white/20 backdrop-blur-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              API 配置
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="relative z-10 flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          
          {/* 1. 智能体介绍 & 监管平台入口 (Hero Section) */}
          <section className="text-center space-y-8 py-4">
            <div className="space-y-4">
              <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 tracking-tight drop-shadow-sm">
                智能食品安全分析
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-base leading-relaxed">
                上传预制菜实物图片、检测报告或相关文档，AI 智能体将为您进行全方位的风险评估与合规性检测。
              </p>
            </div>

            {/* 监管平台链接 (Style: Cyberpunk/Tech Pills) */}
            <div className="flex flex-wrap justify-center items-center gap-6">
                <a 
                  href="https://sdsl.amr.shandong.gov.cn/login" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-[#1A1D2D]/80 hover:bg-[#252A40] border border-blue-500/30 hover:border-blue-400 rounded-full text-base font-bold text-blue-100 hover:text-white transition-all shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] group backdrop-blur-md"
                >
                  <span className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)] group-hover:animate-pulse"></span>
                  山东省食用农产品和食品信息化追溯平台
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>

                {/* 新增的装饰性按钮 */}
                <div 
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-indigo-500/30 rounded-full text-base font-bold text-indigo-200 cursor-default shadow-[0_0_15px_rgba(99,102,241,0.1)] backdrop-blur-md select-none"
                >
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  云端数据统计
                </div>

                <a 
                  href="http://117.73.254.122:8099/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-[#1A1D2D]/80 hover:bg-[#252A40] border border-cyan-500/30 hover:border-cyan-400 rounded-full text-base font-bold text-cyan-100 hover:text-white transition-all shadow-[0_0_10px_rgba(34,211,238,0.1)] hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] group backdrop-blur-md"
                >
                  <span className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] group-hover:animate-pulse"></span>
                  山东冷链食品疫情防控管理系统
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>
          </section>

          {/* 2. 主操作区 (Two Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Unified File Upload (35%) */}
            <div className="lg:col-span-4 min-h-[500px] h-full">
               <FileUpload files={files} setFiles={setFiles} />
            </div>

            {/* Right Column: Controls & Output (65%) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Control Panel Card - Glassmorphism Dark */}
              <div className="bg-[#131522]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                
                {/* 装饰光效 */}
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[80px] pointer-events-none"></div>

                {/* Top: Model Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">大模型选择</label>
                  <div className="relative">
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-[#0B0C15] border border-white/10 rounded-xl py-3.5 px-5 text-slate-200 font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none appearance-none transition-all hover:bg-[#1A1D2D]"
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                {/* Middle: Text Input */}
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">文本输入 / 对话内容</label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="在此输入产品信息、补充说明，或直接向 AI 提问..."
                    className="w-full h-40 bg-[#0B0C15] border border-white/10 rounded-xl p-5 text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none transition-all hover:bg-[#1A1D2D]"
                  />
                </div>

                {/* Bottom: Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  {/* Generate Report Button - Golden Gradient */}
                  <button
                    onClick={() => handleAction('report')}
                    disabled={isLoading}
                    className="flex-1 relative overflow-hidden group/btn bg-gradient-to-r from-yellow-700 to-yellow-500 hover:from-yellow-600 hover:to-yellow-400 text-white font-bold py-4 rounded-xl shadow-[0_4px_20px_rgba(234,179,8,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none border border-yellow-400/20"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading && resultMode === 'report' ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-5 h-5 text-yellow-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        )}
                        <span>生成检测报告 (模板)</span>
                    </div>
                    {/* Shine Effect */}
                    <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 transition-all duration-1000 group-hover/btn:left-[100%]"></div>
                  </button>

                  {/* Chat Button - Blue Outline/Gradient */}
                  <button
                    onClick={() => handleAction('chat')}
                    disabled={isLoading}
                    className="flex-1 relative overflow-hidden group/btn bg-[#0f172a] hover:bg-[#1e293b] border border-blue-500/50 text-blue-100 font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <div className="absolute inset-0 bg-blue-600/5 group-hover/btn:bg-blue-600/10 transition-colors"></div>
                    <div className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading && resultMode === 'chat' ? (
                        <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        )}
                        <span>自由咨询 / 问答</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Result Area */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-red-300 flex items-start gap-3 animate-fade-in backdrop-blur-md">
                  <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}

              {result && (
                <div className="animate-fade-in-up">
                  {resultMode === 'report' ? (
                    <ResultDisplay result={result} />
                  ) : (
                    <div className="bg-[#131522]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                      <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                        <span className="text-2xl">🤖</span> AI 智能回复
                      </h3>
                      <div className="prose prose-invert prose-slate max-w-none whitespace-pre-wrap leading-relaxed">
                        {result}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </main>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default App;