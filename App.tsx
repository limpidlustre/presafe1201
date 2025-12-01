import React, { useState, useCallback, useEffect } from 'react';
import pako from 'pako';
import { FileUpload } from './components/FileUpload';
import { ResultDisplay } from './components/ResultDisplay';
import { HistoryModal } from './components/HistoryModal';
import { AnalysisChatModal } from './components/AnalysisChatModal'; 
import { SettingsModal } from './components/SettingsModal';
import { models } from './constants';
import { analyzeMealSafety } from './services/aiService';
import { addReportToHistory, ReportHistoryItem } from './utils/history';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [model, setModel] = useState<string>(models[0].id);
  
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reportData = urlParams.get('report');
    if (reportData) {
      try {
        const base64 = reportData.replace(/-/g, '+').replace(/_/g, '/');
        const compressed = atob(base64);
        const charData = compressed.split('').map(x => x.charCodeAt(0));
        const binData = new Uint8Array(charData);
        const decompressed = pako.inflate(binData, { to: 'string' });
        setAnalysisResult(decompressed);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error("Failed to decode report from URL", e);
        setError("无法加载分享的报告链接。");
      }
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (files.length === 0) {
      setError('请至少上传一张图片。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult('');

    try {
      const result = await analyzeMealSafety(files, model, additionalInfo, supportingFiles);
      setAnalysisResult(result);
      
      const newReport: ReportHistoryItem = {
        id: Date.now(),
        title: result.split('\n')[1]?.replace('#', '').trim() || '分析报告',
        date: new Date().toLocaleString('zh-CN'),
        content: result,
        model: model,
      };
      addReportToHistory(newReport);

    } catch (err) {
      if (err instanceof Error) {
        setError(`分析失败: ${err.message}`);
      } else {
        setError('发生未知错误，请重试。');
      }
    } finally {
      setIsLoading(false);
    }
  }, [files, model, additionalInfo, supportingFiles]);

  const handleSelectReportFromHistory = (reportContent: string) => {
    setAnalysisResult(reportContent);
    setIsHistoryOpen(false);
    setFiles([]);
    setAdditionalInfo('');
    setSupportingFiles([]);
    setError(null);
    setIsLoading(false);
  };

  const HeaderIcon = () => (
    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-cyan-500/20">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-slate-50 selection:bg-cyan-100 selection:text-cyan-900 font-sans text-slate-800 pb-20">
        
        {/* 背景装饰 */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/80 to-transparent"></div>
            <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] bg-cyan-200/20 rounded-full blur-3xl"></div>
            <div className="absolute top-[200px] left-[-100px] w-[300px] h-[300px] bg-indigo-200/20 rounded-full blur-3xl"></div>
        </div>

        {/* Navbar (Glassmorphism) */}
        <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-white/50 shadow-sm transition-all duration-300">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <HeaderIcon />
              <div>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                  预制菜安全检测智能体
                </h1>
                <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">AI Food Safety Agent</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white/50 hover:bg-white border border-transparent hover:border-slate-200 px-3 py-2 rounded-full transition-all text-sm font-semibold shadow-sm hover:shadow"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">API 配置</span>
                </button>
                <button 
                  onClick={() => setIsHistoryOpen(true)} 
                  className="flex items-center gap-2 text-slate-600 hover:text-cyan-700 bg-white/50 hover:bg-cyan-50 border border-transparent hover:border-cyan-100 px-3 py-2 rounded-full transition-all text-sm font-semibold shadow-sm hover:shadow"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">历史记录</span>
                </button>
            </div>
          </div>
        </nav>

        <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Hero Section */}
          <section className="text-center py-6 sm:py-10 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
              智能识别，<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">守护舌尖安全</span>
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              上传预制菜实物图片与相关文档，AI 智能体将为您进行全方位的风险评估与合规性检测。
            </p>

            {/* 监管平台链接 (Sleek Pills) */}
            <div className="flex flex-wrap justify-center gap-3 mt-6 pt-2">
                <a 
                  href="https://sdsl.amr.shandong.gov.cn/login" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white border border-slate-200 hover:border-blue-300 rounded-full text-xs sm:text-sm text-slate-600 hover:text-blue-700 transition-all shadow-sm hover:shadow-md backdrop-blur-sm group"
                >
                  <span className="w-2 h-2 bg-blue-400 rounded-full group-hover:animate-pulse"></span>
                  山东省食用农产品和食品信息化追溯平台
                  <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
                <a 
                  href="http://117.73.254.122:8099/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white border border-slate-200 hover:border-cyan-300 rounded-full text-xs sm:text-sm text-slate-600 hover:text-cyan-700 transition-all shadow-sm hover:shadow-md backdrop-blur-sm group"
                >
                  <span className="w-2 h-2 bg-cyan-400 rounded-full group-hover:animate-pulse"></span>
                  山东冷链食品疫情防控管理系统
                  <svg className="w-3 h-3 text-slate-300 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>
          </section>

          {/* Analysis Form - Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* Left Column: Upload */}
            <div className="lg:col-span-5 space-y-6">
              <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-white p-6 flex flex-col h-full transition-transform hover:-translate-y-1 duration-300">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">1</div>
                  上传素材
                </h3>
                <div className="flex-1">
                   <FileUpload files={files} setFiles={setFiles} />
                </div>
              </section>
            </div>

            {/* Right Column: Configuration */}
            <div className="lg:col-span-7 space-y-6">
               <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-white p-6 h-full flex flex-col transition-transform hover:-translate-y-1 duration-300">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">2</div>
                  分析配置
                </h3>
                
                <div className="space-y-6">
                  {/* Model Select */}
                  <div>
                    <label htmlFor="model-select" className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">选择分析模型</label>
                    <div className="relative group">
                      <select
                        id="model-select"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all cursor-pointer hover:bg-white"
                      >
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 group-hover:text-cyan-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Context & Assistant Trigger */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">补充信息与辅助文档</label>
                    <div 
                      onClick={() => setIsChatOpen(true)}
                      className="group cursor-pointer bg-gradient-to-r from-slate-50 to-white hover:from-indigo-50 hover:to-white border border-slate-200 hover:border-indigo-300 border-dashed rounded-2xl p-5 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-indigo-600 flex items-center gap-2">
                          <span className="bg-indigo-100 p-1.5 rounded-lg">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                          </span>
                          配置上下文 & 智能助手
                        </span>
                        <span className="text-[10px] font-bold bg-white border border-indigo-100 text-indigo-400 px-2 py-1 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                           点击编辑
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-500 line-clamp-2 min-h-[1.5em] pl-1">
                        {additionalInfo || <span className="opacity-50 italic">暂无文字补充信息...</span>}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-slate-100/50 flex flex-wrap gap-2">
                        {supportingFiles.length > 0 ? (
                          supportingFiles.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600 shadow-sm">
                              <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                              <span className="truncate max-w-[100px]">{f.name}</span>
                            </span>
                          ))
                        ) : (
                           <div className="flex items-center gap-2 text-xs text-slate-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                              <span>暂无附件 (支持 PDF, Word, Excel)</span>
                           </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading || files.length === 0}
                    className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-cyan-500/30 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none flex items-center justify-center gap-2 text-lg"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>智能分析中...</span>
                      </>
                    ) : (
                      <>
                        <span>开始智能检测</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </section>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 animate-fade-in text-red-700">
               <svg className="h-6 w-6 text-red-500 shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-bold">分析中断</p>
                  <p className="text-sm mt-1 opacity-90">{error}</p>
                </div>
            </div>
          )}

          {analysisResult && (
            <div className="animate-fade-in-up">
              <ResultDisplay result={analysisResult} />
            </div>
          )}
        </main>

        <footer className="mt-16 border-t border-slate-200/60 py-8">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <p className="text-sm text-slate-400">
              © 2024 预制菜安全检测智能体. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
      
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 z-40 bg-slate-900 hover:bg-slate-800 text-white rounded-full p-4 shadow-2xl shadow-slate-900/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
      >
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      <HistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectReport={handleSelectReportFromHistory}
      />

      <AnalysisChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentModelId={model}
        additionalInfo={additionalInfo}
        setAdditionalInfo={setAdditionalInfo}
        supportingFiles={supportingFiles}
        setSupportingFiles={setSupportingFiles}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};

export default App;