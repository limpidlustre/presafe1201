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

  // 修改：使用图片Logo，尺寸稍大
  const HeaderIcon = () => (
    <img 
      src="/logo.png" 
      alt="Logo" 
      className="h-20 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
    />
  );

  return (
    <>
      <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col overflow-x-hidden relative">
        
        {/* 亮丽的背景光效 */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-[100px] mix-blend-multiply"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-100/60 rounded-full blur-[100px] mix-blend-multiply"></div>
            <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] bg-indigo-50/80 rounded-full blur-[80px]"></div>
        </div>

        {/* Navbar */}
        <nav className="bg-white/70 backdrop-blur-xl border-b border-blue-100 sticky top-0 z-40 transition-all duration-300">
          <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between py-2">
            
            {/* Left: Icon (独立在最左侧) */}
            <div className="flex items-center z-20">
              <HeaderIcon />
            </div>

            {/* Center: Title (绝对定位居中) */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full text-center pointer-events-none">
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight pointer-events-auto inline-block whitespace-nowrap">
                预制菜<span className="text-blue-600">安全检测</span>智能体
              </h1>
            </div>
            
            {/* Right: Config Button */}
            <div className="flex items-center z-20">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="group flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-full transition-all text-base font-bold border border-slate-200 hover:border-blue-200 shadow-sm hover:shadow-md"
              >
                <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                API 配置
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="relative z-10 flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
          
          {/* 1. 智能体介绍 & 监管平台入口 (Hero Section) */}
          <section className="text-center space-y-10 py-4">
            <div className="space-y-5">
              <h2 className="text-5xl sm:text-6xl font-black text-slate-800 tracking-tight drop-shadow-sm leading-tight">
                智能识别，<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">守护舌尖安全</span>
              </h2>
              <p className="text-slate-500 max-w-3xl mx-auto text-xl leading-relaxed font-medium">
                AI 驱动的预制菜全链路风险评估系统，一键上传，即刻分析。
              </p>
            </div>

            {/* 监管平台链接 & 云端统计 */}
            <div className="flex flex-wrap justify-center items-center gap-6">
                <a 
                  href="https://sdsl.amr.shandong.gov.cn/login" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-full text-lg font-bold text-slate-700 hover:text-blue-700 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 group"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                     <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  山东省食用农产品和食品信息化追溯平台
                </a>

                {/* 云端数据统计按钮 (展示用) */}
                <div 
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-lg font-bold shadow-lg shadow-blue-500/30 cursor-default select-none ring-4 ring-blue-100"
                >
                  <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  云端数据统计
                </div>

                <a 
                  href="http://117.73.254.122:8099/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 rounded-full text-lg font-bold text-slate-700 hover:text-cyan-700 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 group"
                >
                  <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                     <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  山东冷链食品疫情防控管理系统
                </a>
            </div>
          </section>

          {/* 2. 主操作区 (Two Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            
            {/* Left Column: Unified File Upload (35%) */}
            <div className="lg:col-span-4 min-h-[550px] h-full">
               <FileUpload files={files} setFiles={setFiles} />
            </div>

            {/* Right Column: Controls & Output (65%) */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              
              {/* Control Panel Card - Glassmorphism Light */}
              <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-10 space-y-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
                
                {/* 装饰背景 */}
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110 duration-700"></div>

                {/* Top: Model Selector */}
                <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase mb-3 tracking-wider ml-1">大模型选择</label>
                  <div className="relative">
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-300 rounded-2xl py-5 px-6 text-lg text-slate-700 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none appearance-none transition-all cursor-pointer shadow-sm"
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none text-blue-500">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                {/* Middle: Text Input */}
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-500 uppercase mb-3 tracking-wider ml-1">文本输入 / 对话内容</label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="在此输入产品信息、补充说明，或直接向 AI 提问..."
                    className="w-full h-52 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-6 text-lg text-slate-700 placeholder-slate-400 font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none transition-all shadow-inner leading-relaxed"
                  />
                </div>

                {/* Bottom: Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-6 pt-2">
                  {/* Generate Report Button - Bright Gradient */}
                  <button
                    onClick={() => handleAction('report')}
                    disabled={isLoading}
                    className="flex-1 relative overflow-hidden group/btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-5 rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none text-xl"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                        {isLoading && resultMode === 'report' ? (
                        <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        )}
                        <span>生成检测报告 (模板)</span>
                    </div>
                  </button>

                  {/* Chat Button - Light Outline */}
                  <button
                    onClick={() => handleAction('chat')}
                    disabled={isLoading}
                    className="flex-1 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold py-5 rounded-2xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xl"
                  >
                        {isLoading && resultMode === 'chat' ? (
                        <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        )}
                        <span>自由咨询 / 问答</span>
                  </button>
                </div>
              </div>

              {/* Result Area */}
              {error && (
                <div className="bg-red-50 border border-red-100 p-6 rounded-2xl text-red-600 flex items-start gap-4 animate-fade-in shadow-sm">
                  <div className="p-1.5 bg-red-100 rounded-full shrink-0">
                     <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="mt-0.5 font-bold text-lg">{error}</div>
                </div>
              )}

              {result && (
                <div className="animate-fade-in-up">
                  {resultMode === 'report' ? (
                    <ResultDisplay result={result} />
                  ) : (
                    <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[2rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3 border-b border-slate-100 pb-5">
                        <span className="text-3xl">🤖</span> AI 智能回复
                      </h3>
                      <div className="prose prose-lg prose-slate max-w-none whitespace-pre-wrap leading-relaxed text-slate-700 text-lg">
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