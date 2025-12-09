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
    localStorage.setItem('custom_api_key', apiKey.trim());
    localStorage.setItem('custom_base_url', baseUrl.trim());
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
      window.location.reload(); 
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="bg-slate-50 border-b border-slate-100 px-8 py-5 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-xl">⚙️ API 连接配置</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-base font-bold text-slate-700 mb-3">API Key (必填)</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 text-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
            />
            <p className="text-sm text-slate-400 mt-2 font-medium">您的密钥仅保存在本地浏览器中。</p>
          </div>

          <div>
            <label className="block text-base font-bold text-slate-700 mb-3">Base URL (可选)</label>
            <input 
              type="text" 
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="例如: https://api.openai-proxy.org/google/v1beta"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 text-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
            />
            <p className="text-sm text-slate-400 mt-2 font-medium">
              中转服务地址，通常需要包含 <code>/v1beta</code> 后缀。
            </p>
          </div>

          {showSuccess && (
            <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-5 py-4 rounded-xl text-base font-bold flex items-center shadow-sm">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              配置已保存，系统正在刷新...
            </div>
          )}

          <button 
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] text-lg"
          >
            保存并应用
          </button>
        </div>
      </div>
    </div>
  );
};