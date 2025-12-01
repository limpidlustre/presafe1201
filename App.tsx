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
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg shadow-md shadow-indigo-500/20">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
        
        {/* Navbar */}
        <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HeaderIcon />
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">预制菜安全检测智能体</h1>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
              title="API 配置"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </nav>

        {/* Main Content: Two Columns */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6 grid grid-cols-1 lg:grid-cols-12 items-start">
          
          {/* Left Column: Unified File Upload (35%) */}
          <div className="lg:col-span-4 h-[500px] lg:h-[calc(100vh-140px)] sticky top-24">
             <FileUpload files={files} setFiles={setFiles} />
          </div>

          {/* Right Column: Controls & Output (65%) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Control Panel Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
              
              {/* Top: Model Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">大模型选择</label>
                <div className="relative">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Middle: Text Input */}
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">文本输入 / 对话内容</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="在此输入产品信息、补充说明，或直接向 AI 提问..."
                  className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                />
              </div>

              {/* Bottom: Action Buttons */}
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => handleAction('report')}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && resultMode === 'report' ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : '📄 生成检测报告 (模板)'}
                </button>
                <button
                  onClick={() => handleAction('chat')}
                  disabled={isLoading}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && resultMode === 'chat' ? (
                    <svg className="animate-spin h-5 w-5 text-indigo-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : '💬 自由咨询 / 问答'}
                </button>
              </div>
            </div>

            {/* Result Area */}
            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-600 flex items-start gap-3 animate-fade-in">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}

            {result && (
              <div className="animate-fade-in-up">
                {resultMode === 'report' ? (
                  <ResultDisplay result={result} />
                ) : (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="text-2xl">🤖</span> AI 回复
                    </h3>
                    <div className="prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed text-slate-700">
                      {result}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default App;