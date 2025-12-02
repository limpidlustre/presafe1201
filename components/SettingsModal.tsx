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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#1A1D2D] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 animate-fade-in-up">
        <div className="bg-white/5 border-b border-white/5 px-6 py-4 flex justify-between items-center">
          <h3 className="font-bold text-slate-200 text-lg">⚙️ API 连接配置</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-2">API Key (必填)</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-[#0B0C15] border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-600"
            />
            <p className="text-xs text-slate-500 mt-1">您的密钥仅保存在本地浏览器中。</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-2">Base URL (可选)</label>
            <input 
              type="text" 
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="例如: https://api.openai-proxy.org/google/v1beta"
              className="w-full bg-[#0B0C15] border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-600"
            />
            <p className="text-xs text-slate-500 mt-1">
              中转服务地址，通常需要包含 <code>/v1beta</code> 后缀。
            </p>
          </div>

          {showSuccess && (
            <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg text-sm font-medium flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              配置已保存，系统正在刷新...
            </div>
          )}

          <button 
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-[0.98]"
          >
            保存并应用
          </button>
        </div>
      </div>
    </div>
  );
};