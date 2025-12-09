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
      colorClass: 'bg-red-50 text-red-800 border-red-200',
      iconColor: 'text-red-500 bg-white'
    };
  }
  if (fullText.includes('待复检') || fullText.includes('疑似')) {
     return {
      status: 'warning',
      title: '建议复检',
      message: '分析发现部分指标存疑，建议进行进一步专业检测或复核。',
      colorClass: 'bg-amber-50 text-amber-800 border-amber-200',
      iconColor: 'text-amber-500 bg-white'
    };
  }
  if (fullText.includes('合格')) {
     return {
      status: 'success',
      title: '检测合格',
      message: '基于当前信息分析，该产品各项指标符合安全标准。',
      colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconColor: 'text-emerald-500 bg-white'
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
    const element = reportRef.current;
    
    html2canvas(element, { 
      scale: 2, 
      useCORS: true, 
      backgroundColor: '#ffffff'
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
      titleComponent = <h1 key="title" className="text-4xl font-bold text-center tracking-tight mb-10 text-slate-900">{trimmedLine.replace(/#/g, '').trim()}</h1>;
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

    // 清新蓝白表格样式
    tableContent = (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="min-w-full text-base border-collapse text-slate-700">
            <thead className="bg-[#F1F5F9]">
                <tr>
                {headerContent.map((header, i) => (
                    <th key={i} className={`px-6 py-4 font-bold text-slate-800 border-b border-slate-300 text-lg ${i===0 ? 'text-left' : 'text-center'}`}>
                    {header}
                    </th>
                ))}
                </tr>
            </thead>
            <tbody className="bg-white">
                {groupedRows.map((group, groupIndex) => (
                <React.Fragment key={groupIndex}>
                    {group.rows.map((row, rowIndex) => (
                    <tr key={`${groupIndex}-${rowIndex}`} className="hover:bg-blue-50/50 transition-colors border-b border-slate-100 last:border-0">
                        {rowIndex === 0 && (
                        <td 
                            rowSpan={group.rows.length} 
                            className="px-6 py-4 font-bold text-slate-800 border-r border-slate-200 bg-slate-50 align-middle w-40"
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
                                     content = <span className="inline-block bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-bold text-base">不合格</span>;
                                 } else if (cell.includes('待复检')) {
                                     content = <span className="inline-block bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold text-base">待复检</span>;
                                 } else if (cell.includes('合格')) {
                                     content = <span className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold text-base">合格</span>;
                                 }
                             }

                             return (
                                <td key={cellIndex} className={`px-6 py-4 border-r border-slate-100 last:border-0 break-words ${isResultColumn ? 'text-center' : 'text-left'}`}>
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
         <div className="prose prose-lg prose-slate max-w-none whitespace-pre-wrap">
             {result}
         </div>
      );
  }

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Action Bar */}
      <div className="bg-slate-50/80 px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-xl font-bold text-slate-800">AI 分析报告</h3>
        <div className="flex gap-4 w-full sm:w-auto">
          <button 
            onClick={handleDownloadPdf} 
            disabled={isDownloading} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl transition-all text-base shadow-sm"
          >
            {isDownloading ? (
               <span className="animate-pulse">生成中...</span>
            ) : (
                <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                下载 PDF
                </>
            )}
          </button>
          <button 
            onClick={handleShareLink} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 font-bold py-2.5 px-5 rounded-xl hover:bg-blue-100 transition-all text-base shadow-sm"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
             </svg>
             分享报告
          </button>
        </div>
      </div>

      <div ref={reportRef} className="p-10 min-h-[600px] text-slate-800 bg-white">
        
        {/* Title */}
        {titleComponent || <h1 className="text-4xl font-bold text-center mb-10 text-slate-900">预制菜安全检测 AI 分析报告</h1>}

        {/* Safety Status Banner */}
        {safetyStatus && (
            <div className={`mb-10 p-6 rounded-2xl border ${safetyStatus.colorClass} flex items-start gap-5 print:hidden shadow-sm`}>
                <div className={`mt-1.5 p-2.5 rounded-full shadow-sm ${safetyStatus.iconColor} flex-shrink-0`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-xl font-bold">{safetyStatus.title}</h4>
                    <p className="text-base mt-2 opacity-90 leading-relaxed font-medium">{safetyStatus.message}</p>
                </div>
            </div>
        )}

        <div className="mb-8 flex justify-center text-base text-slate-400 font-medium">
             生成日期: {new Date().toLocaleString('zh-CN')}
        </div>

        {tableContent}

        <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-400 gap-3">
            <span className="font-semibold">Powered by Gemini 2.5 AI Agent</span>
            <span>本报告由 AI 自动生成，结果仅供参考，不作为法律依据</span>
        </div>
      </div>
    </div>
  );
};