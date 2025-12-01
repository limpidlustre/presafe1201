import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('custom_api_key') || '');
      setBaseUrl(localStorage.getItem('custom_base_url') || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    // 简单的校验提醒
    if (apiKey.startsWith('sk-') && !baseUrl) {
        if (!confirm('检测到您使用了 sk- 开头的 Key（通常是中转 Key），但未填写 Base URL。\n\n如果不填写 Base URL，请求将直接发往 Google 官方，可能会失败。\n\n是否继续保存？')) {
            return;
        }
    }

    localStorage.setItem('custom_api_key', apiKey.trim());
    localStorage.setItem('custom_base_url', baseUrl.trim());
    
    // 强制刷新页面以应用新配置
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
      window.location.reload(); 
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-lg">⚙️ API 连接配置</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
             提示：在 Vercel 环境下，请在此处手动填写配置以覆盖默认设置。
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">API Key (必填)</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            />
            <p className="text-xs text-slate-400 mt-1">通常以 sk- 开头（如果是中转）或 AIza 开头（如果是 Google 原生）。</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Base URL (中转必填)</label>
            <input 
              type="text" 
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai-proxy.org/google"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            />
            <p className="text-xs text-slate-400 mt-1">
              请填写您的中转接口地址。系统会自动追加 <code>/v1beta</code>。<br/>
              <span className="text-red-500">注意：如果不填写，将默认请求 Google 官方地址。</span>
            </p>
          </div>

          {showSuccess && (
            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              配置已保存，系统正在刷新...
            </div>
          )}

          <button 
            onClick={handleSave}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-[0.98]"
          >
            保存并应用
          </button>
        </div>
      </div>
    </div>
  );
};