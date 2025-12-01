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
  
  // 核心变更：补充信息和辅助文件现在由 App 管理，但在 ChatModal 中编辑
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
      // 传入 supportingFiles
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
    <div className="bg-cyan-600 p-2 rounded-lg shadow-md">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
        {/* Navbar */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HeaderIcon />
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  预制菜安全检测智能体
                </h1>
                <p className="text-xs text-slate-500 font-medium">AI Food Safety Detection Agent</p>
              </div>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-md transition-all text-sm font-semibold border border-transparent hover:border-slate-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  API 配置
                </button>
                <button 
                  onClick={() => setIsHistoryOpen(true)} 
                  className="flex items-center text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 px-3 py-2 rounded-md transition-all text-sm font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  历史记录
                </button>
            </div>
          </div>
        </nav>

        <main className="flex-grow w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          
          {/* Hero / Intro */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-800 mb-3">
                智能食品安全分析
              </h2>
              <p className="text-slate-600 leading-relaxed">
                上传预制菜的实物图片，并配置相关检测文档（PDF/Word/Excel），我们的 AI 智能体将深度分析潜在风险点，为您提供专业的安全评估报告。
              </p>
            </div>
          </section>

          {/* Analysis Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                  上传图片 (实物/包装)
                </h3>
                <FileUpload files={files} setFiles={setFiles} />
              </section>
            </div>

            <div className="lg:col-span-2 space-y-6">
               <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                  配置分析参数
                </h3>
                
                <div className="space-y-5">
                  <div>
                    <label htmlFor="model-select" className="block text-sm font-semibold text-slate-700 mb-2">选择分析模型</label>
                    <div className="relative">
                      <select
                        id="model-select"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      >
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.provider === 'google' ? '(Gemini)' : '(OpenAI/DS)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* 新的合并区域：补充信息与文档 */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">补充信息与辅助文档</label>
                    <div 
                      onClick={() => setIsChatOpen(true)}
                      className="group cursor-pointer bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 border-dashed rounded-xl p-4 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-indigo-600 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                          配置上下文 & 智能助手
                        </span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                           点击编辑
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-500 line-clamp-2 min-h-[1.5em]">
                        {additionalInfo || "暂无文字补充信息..."}
                      </div>
                      
                      {supportingFiles.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {supportingFiles.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600">
                              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                              {f.name}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {supportingFiles.length === 0 && (
                        <div className="mt-2 text-xs text-slate-400">
                          暂无文档 (支持 PDF, Word, Excel)
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading || files.length === 0}
                    className="w-full mt-4 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold py-4 px-6 rounded-xl hover:from-cyan-700 hover:to-teal-700 shadow-lg shadow-cyan-500/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none flex items-center justify-center gap-2"
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
                        <span>开始检测</span>
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
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-fade-in" role="alert">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-bold">分析中断</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {analysisResult && (
            <div className="animate-fade-in-up">
              <ResultDisplay result={analysisResult} />
            </div>
          )}
        </main>

        <footer className="mt-12 bg-white border-t border-slate-200 py-8">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <p className="text-sm text-slate-500">
              © 2024 预制菜安全检测智能体. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
      
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 z-40 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-xl shadow-indigo-500/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      <HistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectReport={handleSelectReportFromHistory}
      />

      {/* 传递上下文和文档状态到 Chat Modal */}
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