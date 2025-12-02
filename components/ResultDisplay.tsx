import React, { useRef, useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import pako from 'pako';

interface ResultDisplayProps {
  result: string;
}

// Helper to parse a markdown table row into cells
const parseTableRow = (row: string): string[] => {
  if (!row.trim().startsWith('|')) return [];
  const cells = row.split('|');
  if (cells.length < 2) return [];
  return cells.slice(1, -1).map(s => s.trim());
};

const analyzeSafetyStatus = (fullText: string) => {
  if (fullText.includes('不合格') || fullText.includes('阳性') || fullText.includes('高风险')) {
    return {
      status: 'danger',
      title: '检测不合格 / 存在风险',
      message: '分析显示该产品存在安全风险或不合格项，建议立即封存并排查。',
      colorClass: 'bg-red-500/10 text-red-200 border-red-500/30',
      iconColor: 'text-red-400'
    };
  }
  if (fullText.includes('待复检') || fullText.includes('疑似')) {
     return {
      status: 'warning',
      title: '建议复检',
      message: '分析发现部分指标存疑，建议进行进一步专业检测或复核。',
      colorClass: 'bg-amber-500/10 text-amber-200 border-amber-500/30',
      iconColor: 'text-amber-400'
    };
  }
  if (fullText.includes('合格')) {
     return {
      status: 'success',
      title: '检测合格',
      message: '基于当前信息分析，该产品各项指标符合安全标准。',
      colorClass: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
      iconColor: 'text-emerald-400'
    };
  }
  return null;
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleDownloadPdf = () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    // 为了PDF效果，临时将文字颜色改为黑色
    const element = reportRef.current;
    const originalColor = element.style.color;
    element.style.color = '#000000';
    element.classList.add('pdf-mode'); // 可以在这里添加特定于PDF的样式类

    html2canvas(element, { 
      scale: 2, 
      useCORS: true, 
      backgroundColor: '#ffffff' // PDF 背景设为白
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height],
        hotfixes: ['px_scaling'],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('AI-analysis-report.pdf');
    }).finally(() => {
        element.style.color = originalColor;
        element.classList.remove('pdf-mode');
        setIsDownloading(false);
    });
  };

  const handleShareLink = async () => {
    try {
      const compressed = pako.deflate(result);
      const binaryString = Array.from(compressed, (byte: number) => String.fromCharCode(byte)).join('');
      const base64 = btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const url = `${window.location.origin}${window.location.pathname}?report=${base64}`;
      await navigator.clipboard.writeText(url);
      alert('分享链接已复制到剪贴板！');
    } catch (e) {
      console.error("Failed to create share link", e);
      alert('复制链接失败，请稍后重试。');
    }
  };

  const safetyStatus = useMemo(() => analyzeSafetyStatus(result), [result]);
  
  const lines = result.trim().split('\n');
  let titleComponent = null;
  const tableLines: string[] = [];

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('#')) {
      titleComponent = <h1 key="title" className="text-2xl sm:text-3xl font-bold text-center tracking-tight mb-6">{trimmedLine.replace(/#/g, '').trim()}</h1>;
    } else if (trimmedLine.startsWith('|')) {
      tableLines.push(trimmedLine);
    }
  });
  
  const headerRowIndex = tableLines.findIndex(line => !line.includes('---') && line.includes('|'));
  const separatorRowIndex = tableLines.findIndex(line => line.includes('---'));
  const isTable = headerRowIndex !== -1 && separatorRowIndex !== -1;
  
  let tableContent = null;

  if (isTable) {
    const headerContent = parseTableRow(tableLines[headerRowIndex]);
    const bodyRowsRaw = tableLines.slice(separatorRowIndex + 1);
    
    const groupedRows: { category: string; rows: string[][] }[] = [];
    let currentGroup: { category: string; rows: string[][] } | null = null;

    bodyRowsRaw.forEach(rowStr => {
      const cells = parseTableRow(rowStr);
      if (cells.length < 2) return;

      const categoryRaw = cells[0].trim();
      if (categoryRaw && (!currentGroup || categoryRaw !== currentGroup.category)) {
        if (currentGroup) groupedRows.push(currentGroup);
        currentGroup = { category: categoryRaw, rows: [cells] };
      } else {
        if (currentGroup) currentGroup.rows.push(cells);
      }
    });
    if (currentGroup) groupedRows.push(currentGroup);

    // 表格样式针对屏幕显示 (暗色主题适配)
    tableContent = (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="min-w-full text-xs sm:text-sm border-collapse text-slate-300">
            <thead className="bg-[#1A1D2D]">
                <tr>
                {headerContent.map((header, i) => (
                    <th key={i} className={`px-4 py-3 font-bold text-slate-100 border border-slate-700 ${i===0 ? 'text-left' : 'text-center'}`}>
                    {header}
                    </th>
                ))}
                </tr>
            </thead>
            <tbody className="bg-[#0B0C15]">
                {groupedRows.map((group, groupIndex) => (
                <React.Fragment key={groupIndex}>
                    {group.rows.map((row, rowIndex) => (
                    <tr key={`${groupIndex}-${rowIndex}`} className="hover:bg-[#1A1D2D] transition-colors">
                        {rowIndex === 0 && (
                        <td 
                            rowSpan={group.rows.length} 
                            className="px-4 py-3 font-bold text-slate-200 border border-slate-700 bg-[#131522] align-middle w-32"
                        >
                            {group.category}
                        </td>
                        )}
                        {row.slice(1).map((cell, cellIndex) => {
                             const actualColIndex = cellIndex + 1;
                             let content: React.ReactNode = cell;
                             const isResultColumn = actualColIndex === 3;

                             if (isResultColumn) {
                                 if (cell.includes('不合格')) {
                                     content = <span className="inline-block bg-red-900/50 text-red-200 px-2 py-1 rounded font-bold border border-red-700">不合格</span>;
                                 } else if (cell.includes('待复检')) {
                                     content = <span className="inline-block bg-amber-900/50 text-amber-200 px-2 py-1 rounded font-bold border border-amber-700">待复检</span>;
                                 } else if (cell.includes('合格')) {
                                     content = <span className="inline-block bg-emerald-900/50 text-emerald-200 px-2 py-1 rounded font-bold border border-emerald-700">合格</span>;
                                 }
                             }

                             return (
                                <td key={cellIndex} className={`px-4 py-3 border border-slate-700 break-words ${isResultColumn ? 'text-center' : 'text-left'}`}>
                                    {content}
                                </td>
                             );
                        })}
                    </tr>
                    ))}
                </React.Fragment>
                ))}
            </tbody>
            </table>
        </div>
    );
  } else {
      tableContent = (
         <div className="prose prose-invert max-w-none whitespace-pre-wrap">
             {result}
         </div>
      );
  }

  return (
    <div className="bg-[#131522]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
      {/* Action Bar */}
      <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-lg font-bold text-slate-200">AI 分析报告</h3>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={handleDownloadPdf} 
            disabled={isDownloading} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#1A1D2D] hover:bg-[#252A40] border border-white/10 text-slate-200 font-medium py-2 px-4 rounded-lg transition-all text-sm shadow-sm"
          >
            {isDownloading ? (
               <span className="animate-pulse">生成中...</span>
            ) : (
                <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                下载 PDF
                </>
            )}
          </button>
          <button 
            onClick={handleShareLink} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600/20 border border-blue-500/50 text-blue-200 font-medium py-2 px-4 rounded-lg hover:bg-blue-600/40 transition-all text-sm shadow-sm"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
             </svg>
             分享报告
          </button>
        </div>
      </div>

      <div ref={reportRef} className="p-8 min-h-[600px] text-slate-200">
        
        {/* Title */}
        {titleComponent || <h1 className="text-3xl font-bold text-center mb-6 text-white">预制菜安全检测 AI 分析报告</h1>}

        {/* Safety Status Banner */}
        {safetyStatus && (
            <div className={`mb-8 p-4 rounded-xl border ${safetyStatus.colorClass} flex items-start gap-4 print:hidden`}>
                <div className={`mt-1 p-2 rounded-full shadow-sm bg-white/10 ${safetyStatus.iconColor} flex-shrink-0`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-lg font-bold">{safetyStatus.title}</h4>
                    <p className="text-sm mt-1 opacity-90 leading-relaxed">{safetyStatus.message}</p>
                </div>
            </div>
        )}

        <div className="mb-6 flex justify-center text-sm text-slate-500">
             生成日期: {new Date().toLocaleString('zh-CN')}
        </div>

        {tableContent}

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
            <span>Powered by Gemini 2.5 AI Agent</span>
            <span>本报告由 AI 自动生成，结果仅供参考，不作为法律依据</span>
        </div>
      </div>
    </div>
  );
};