
import React, { useState, useCallback, useEffect } from 'react';
import pako from 'pako';
import { FileUpload } from './components/FileUpload';
import { ResultDisplay } from './components/ResultDisplay';
import { HistoryModal } from './components/HistoryModal';
import { AnalysisChatModal } from './components/AnalysisChatModal'; 
import { models } from './constants';
import { analyzeMealSafety } from './services/aiService';
import { addReportToHistory, ReportHistoryItem } from './utils/history';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  // 修改 1: 默认选中配置列表中的第一个模型 (ID 字符串)
  const [model, setModel] = useState<string>(models[0].id);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); 

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reportData = urlParams.get('report');
    if (reportData) {
      try {
        // URL-safe base64 decoding
        const base64 = reportData.replace(/-/g, '+').replace(/_/g, '/');
        const compressed = atob(base64);
        const charData = compressed.split('').map(x => x.charCodeAt(0));
        const binData = new Uint8Array(charData);
        const decompressed = pako.inflate(binData, { to: 'string' });
        setAnalysisResult(decompressed);
        // Clean the URL
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
      // 调用分析服务 (传入 string 类型的 model ID)
      const result = await analyzeMealSafety(files, model, additionalInfo);
      setAnalysisResult(result);
      
      const newReport: ReportHistoryItem = {
        id: Date.now(),
        title: result.split('\n')[1]?.replace('#', '').trim() || '分析报告',
        date: new Date().toLocaleString('zh-CN'),
        content: result,
        model: model, // 保存模型 ID
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
  }, [files, model, additionalInfo]);

  const handleSelectReportFromHistory = (reportContent: string) => {
    setAnalysisResult(reportContent);
    setIsHistoryOpen(false);
    // Reset inputs for clarity
    setFiles([]);
    setAdditionalInfo('');
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
  
  const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  
  const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  const ExternalLinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
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
                onClick={() => setIsChatOpen(true)} 
                className="flex items-center text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-2 rounded-md transition-all text-sm font-semibold"
                >
                <ChartIcon />
                检测数据统计分析
                </button>
                <button 
                onClick={() => setIsHistoryOpen(true)} 
                className="flex items-center text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 px-3 py-2 rounded-md transition-all text-sm font-semibold"
                >
                <HistoryIcon />
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
                上传预制菜的实物图片、包装信息或检测报告，我们的 AI 智能体将深度分析产品生产信息、供应链溯源及潜在风险点，为您提供专业的安全评估报告。
              </p>
            </div>

            {/* Official Links */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
               <a 
                  href="https://sdsl.amr.shandong.gov.cn/login" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-cyan-400 hover:bg-cyan-50/50 hover:shadow-sm transition-all duration-200"
                >
                  <span className="flex items-center font-semibold text-slate-700 group-hover:text-cyan-800">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 mr-3"></span>
                    山东省食品信息化追溯平台
                  </span>
                  <ExternalLinkIcon />
                </a>
                <a 
                  href="http://117.73.254.122:8099" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-cyan-400 hover:bg-cyan-50/50 hover:shadow-sm transition-all duration-200"
                >
                  <span className="flex items-center font-semibold text-slate-700 group-hover:text-cyan-800">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 mr-3"></span>
                    山东冷链食品疫情防控系统
                  </span>
                  <ExternalLinkIcon />
                </a>
            </div>
          </section>

          {/* Analysis Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                  上传图片
                </h3>
                <FileUpload files={files} setFiles={setFiles} />
                <p className="text-xs text-slate-400 mt-3">
                  * 为了获得最准确的分析，请确保图片清晰，包含产品标签或检测报告文字。
                </p>
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
                      {/* 修改 2: 更新下拉菜单逻辑以支持多厂商显示 */}
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
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="additional-info" className="block text-sm font-semibold text-slate-700 mb-2">补充信息 (可选)</label>
                    <textarea
                      id="additional-info"
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      placeholder="请输入产品名称、购买地点、或者您特别担心的风险点..."
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
                    />
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
            <p className="text-xs text-slate-400 mt-2 max-w-2xl mx-auto leading-relaxed">
              免责声明：本工具仅供参考。AI 分析结果基于您提供的图片和信息生成，可能存在误差。
              本报告不具备法律效力，不能替代官方检测机构的正式检验报告。对于高风险食品安全问题，请务必咨询专业机构或相关部门。
            </p>
          </div>
        </footer>
      </div>
      
      {/* Floating Chat Button - High Visibility */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full p-5 shadow-2xl shadow-indigo-500/50 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group ring-4 ring-white/30"
        aria-label="打开检测数据统计分析"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap group-hover:ml-3 font-bold text-lg">
          检测数据统计分析
        </span>
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
      />
    </>
  );
};

export default App;
