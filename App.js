import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  Calendar, 
  User, 
  Tags, 
  DollarSign, 
  PiggyBank, 
  Send, 
  CheckCircle, 
  AlertCircle,
  BarChart,
  Edit,
  RefreshCw,
  History,
  ShoppingCart,
  FileText,
  X,
  Trash,
  Landmark,
  PieChart as PieChartIcon
} from 'lucide-react';

// --- 滾輪式年月選擇器 ---
const MonthYearPicker = ({ value, onChange, availableYears }) => {
  const [year, month] = value.split('-');
  let years = availableYears && availableYears.length > 0 
    ? [...availableYears] 
    : [new Date().getFullYear().toString()];
  if (!years.includes(year)) {
    years.push(year);
    years.sort();
  }
  const months = Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0'));
  return (
    <div className="flex items-center justify-center gap-0.5 bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm shrink-0">
      <select value={year} onChange={(e) => onChange(`${e.target.value}-${month}`)} className="bg-transparent font-bold text-slate-700 outline-none appearance-none cursor-pointer text-center text-sm pl-1 pr-0.5">
        {years.map(y => <option key={y} value={y}>{y}年</option>)}
      </select>
      <span className="text-slate-300 font-light text-sm">/</span>
      <select value={month} onChange={(e) => onChange(`${year}-${e.target.value}`)} className="bg-transparent font-bold text-slate-700 outline-none appearance-none cursor-pointer text-center text-sm pl-0.5 pr-1">
        {months.map(m => <option key={m} value={m}>{m}月</option>)}
      </select>
    </div>
  );
};

// --- SVG 圓餅圖組件 (智慧防撞 & 內嵌中心文字) ---
const PieChart = ({ data }) => {
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, name: '', value: 0, percent: '' });
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-center py-10 text-slate-400">該期間無支出資料</div>;

  const handleMouseMove = (e, slice, displayPercent) => {
    setTooltip({ show: true, x: e.clientX, y: e.clientY, name: slice.name, value: slice.value, percent: displayPercent });
  };
  const handleMouseLeave = () => setTooltip(prev => ({ ...prev, show: false }));

  let cumulativeAngle = -Math.PI / 2;
  const slicesData = data.map((slice) => {
    const angle = (slice.value / total) * Math.PI * 2;
    const percentNum = (slice.value / total) * 100;
    const percent = Math.round(percentNum);
    const displayPercent = percent === 0 && slice.value > 0 ? '<1%' : `${percent}%`;
    const isSmallSlice = percentNum <= 8; 
    const midAngle = cumulativeAngle + angle / 2;
    const isRight = Math.cos(midAngle) >= 0;
    const x1 = Math.cos(cumulativeAngle);
    const y1 = Math.sin(cumulativeAngle);
    cumulativeAngle += angle;
    const x2 = Math.cos(cumulativeAngle);
    const y2 = Math.sin(cumulativeAngle);
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    const pathData = `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    const textXInside = 0.76 * Math.cos(midAngle);
    const textYInside = 0.76 * Math.sin(midAngle);
    const startX = 0.95 * Math.cos(midAngle);
    const startY = 0.95 * Math.sin(midAngle);
    const elbowRadius = 1.1; 
    const elbowX = elbowRadius * Math.cos(midAngle);
    const elbowY = elbowRadius * Math.sin(midAngle);
    return { ...slice, angle, percentNum, displayPercent, isSmallSlice, isRight, pathData, textXInside, textYInside, startX, startY, elbowX, elbowY };
  });

  const SPACING = 0.16; 
  const resolveCollisions = (slices) => {
    if (slices.length <= 1) return;
    for(let iter = 0; iter < 10; iter++) {
        for (let i = 1; i < slices.length; i++) {
            const diff = slices[i].elbowY - slices[i-1].elbowY;
            if (diff < SPACING) {
                const adjust = (SPACING - diff) / 2;
                slices[i-1].elbowY -= adjust;
                slices[i].elbowY += adjust;
            }
        }
    }
  };
  const rightSlices = slicesData.filter(s => s.isSmallSlice && s.isRight).sort((a, b) => a.elbowY - b.elbowY);
  const leftSlices = slicesData.filter(s => s.isSmallSlice && !s.isRight).sort((a, b) => a.elbowY - b.elbowY);
  resolveCollisions(rightSlices);
  resolveCollisions(leftSlices);

  return (
    <div className="flex flex-col items-center w-full pt-1 pb-1">
      <div className="w-full max-w-[480px] relative shrink-0 flex justify-center">
        <svg viewBox="-2.0 -1.2 4.0 2.4" className="w-full h-auto drop-shadow-md overflow-visible" style={{ maxHeight: '260px' }} onMouseLeave={handleMouseLeave}>
          {slicesData.map((slice, i) => {
            if (slice.value === total) {
                return (
                  <g key={i} onMouseMove={(e) => handleMouseMove(e, slice, slice.displayPercent)}>
                    <circle cx="0" cy="0" r="1" fill={slice.color} className="transition-all duration-300 hover:opacity-80 cursor-pointer" />
                    <text textAnchor="middle" fill="white" fontSize="0.14" fontWeight="bold" className="pointer-events-none">
                      <tspan x="0" y="-0.1">{slice.name}</tspan>
                      <tspan x="0" y="0.1">{slice.displayPercent}</tspan>
                    </text>
                  </g>
                );
            }
            const lineExt = slice.isRight ? 0.12 : -0.12;
            const endX = slice.elbowX + lineExt;
            const textXOutside = endX + (slice.isRight ? 0.04 : -0.04);
            return (
              <g key={i}>
                <path d={slice.pathData} fill={slice.color} stroke="#ffffff" strokeWidth="0.02" className="transition-all duration-300 hover:opacity-80 cursor-pointer" onMouseMove={(e) => handleMouseMove(e, slice, slice.displayPercent)} />
                {!slice.isSmallSlice && (
                  <text textAnchor="middle" fill="white" fontSize="0.11" fontWeight="bold" className="pointer-events-none drop-shadow-sm">
                    <tspan x={slice.textXInside} y={slice.textYInside - 0.05}>{slice.name}</tspan>
                    <tspan x={slice.textXInside} y={slice.textYInside + 0.08}>{slice.displayPercent}</tspan>
                  </text>
                )}
                {slice.isSmallSlice && (
                  <g className="pointer-events-none">
                     <polyline points={`${slice.startX},${slice.startY} ${slice.elbowX},${slice.elbowY} ${endX},${slice.elbowY}`} fill="none" stroke={slice.color} strokeWidth="0.015" />
                     <text x={textXOutside} y={slice.elbowY} textAnchor={slice.isRight ? "start" : "end"} dominantBaseline="central" fill={slice.color} fontSize="0.11" fontWeight="bold">
                       {slice.name} {slice.displayPercent}
                     </text>
                  </g>
                )}
              </g>
            );
          })}
          <circle cx="0" cy="0" r="0.52" fill="#ffffff" className="pointer-events-none" />
          <text textAnchor="middle" dominantBaseline="central" className="pointer-events-none">
            <tspan x="0" y="-0.08" fill="#94a3b8" fontSize="0.11" fontWeight="600">總支出</tspan>
            <tspan x="0" y="0.16" fill="#1e293b" fontSize="0.22" fontWeight="bold">${total.toLocaleString()}</tspan>
          </text>
        </svg>
      </div>
      {tooltip.show && (
        <div className="fixed z-[100] pointer-events-none bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl transform -translate-x-1/2 -translate-y-[130%] animate-in fade-in zoom-in duration-200" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="flex flex-col items-center">
            <span className="font-bold">{tooltip.name} ({tooltip.percent})</span>
            <span className="text-emerald-400 font-bold mt-0.5">${tooltip.value.toLocaleString()}</span>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const getToday = () => new Date().toISOString().split('T')[0];
  const getCurrentMonth = () => new Date().toISOString().slice(0, 7); 
  const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8Pl_vJN-8U7uitudmdrU9ow4vhXE6E3AD21ylZfQ0Cbub991GdzNo1uen4RGngerK/exec';

  const [activeTab, setActiveTab] = useState('input');
  const [transactionMode, setTransactionMode] = useState('expense'); 
  const [incomeMode, setIncomeMode] = useState('monthly_fee'); 
  const [scriptUrl, setScriptUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [expenseData, setExpenseData] = useState({ date: getToday(), spender: '', item: '', category: '', amount: '', note: '' });
  const [incomeData, setIncomeData] = useState({ month: getCurrentMonth(), monthlyFee: 15000, adjDate: getToday(), adjType: 'add', adjAmount: '', adjNote: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [formError, setFormError] = useState('');
  const [records, setRecords] = useState([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [analysisStartMonth, setAnalysisStartMonth] = useState(getCurrentMonth());
  const [analysisEndMonth, setAnalysisEndMonth] = useState(getCurrentMonth());
  const [listFilter, setListFilter] = useState('全部收支');

  const spenders = ['咻咻', '伶伶'];
  const categories = [
    { id: 'food', label: '餐食', icon: '🍔', color: '#F59E0B' },
    { id: 'home', label: '生活採買', icon: '🛒', color: '#10B981' },
    { id: 'bills', label: '居住與繳費', icon: '📄', color: '#64748B' },
    { id: 'transport', label: '交通', icon: '🚌', color: '#3B82F6' },
    { id: 'entertainment', label: '娛樂', icon: '🎬', color: '#EC4899' },
    { id: 'others', label: '其他', icon: '✨', color: '#94A3B8' }
  ];
  const listFilterOptions = ['全部收支', '餐食', '生活採買', '居住與繳費', '交通', '娛樂', '其他', '月費', '系統調整'];

  const getCategoryColor = (label) => {
    const cat = categories.find(c => c.label === label);
    if (cat) return cat.color;
    if (label === '家庭生活') return '#10B981';
    if (label === '家庭繳費') return '#64748B';
    return '#cbd5e1';
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('googleScriptUrl');
    if (savedUrl) setScriptUrl(savedUrl);
    else {
      setScriptUrl(DEFAULT_SCRIPT_URL);
      localStorage.setItem('googleScriptUrl', DEFAULT_SCRIPT_URL);
    }
  }, []);

  useEffect(() => {
    if (scriptUrl && scriptUrl.includes('script.google.com')) fetchRecords();
  }, [scriptUrl]);

  const fetchRecords = async () => {
    if (!scriptUrl) return;
    setIsLoadingRecords(true);
    setSyncError('');
    try {
      const response = await fetch(`${scriptUrl}?action=getRecords`);
      const result = await response.json();
      if (result.status === 'success') {
        const mapped = result.data.map(r => {
          let exp = Number(r.expenseAmount) || 0;
          let inc = Number(r.incomeAmount) || 0;
          let amt = inc > 0 ? inc : -exp;
          return { ...r, parsedAmount: amt };
        });
        mapped.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return new Date(a.timestamp) - new Date(b.timestamp);
        });
        let runningBalance = 0;
        const withBalance = mapped.map(r => {
          runningBalance += r.parsedAmount;
          return { ...r, computedBalance: runningBalance };
        });
        setRecords(withBalance.reverse());
      }
    } catch (e) { setSyncError('連線失敗'); }
    setIsLoadingRecords(false);
  };

  const currentBalance = records.length > 0 ? records[0].computedBalance : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!expenseData.spender && transactionMode === 'expense') { setFormError('請選擇填表人'); return; }
    setIsSubmitting(true);
    setFormError('');
    try {
      let payload;
      if (transactionMode === 'expense') {
        payload = { action: 'addRecord', date: expenseData.date, spender: expenseData.spender, item: expenseData.item, category: expenseData.category, expenseAmount: Number(expenseData.amount), incomeAmount: "", note: expenseData.note };
      } else if (incomeMode === 'monthly_fee') {
        const firstDay = `${incomeData.month}-01`;
        const feeItem = `${incomeData.month} 月費`;
        await fetch(scriptUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'addRecord', date: firstDay, spender: '咻咻', item: feeItem, category: '', expenseAmount: "", incomeAmount: Number(incomeData.monthlyFee), note: '' }) });
        payload = { action: 'addRecord', date: firstDay, spender: '伶伶', item: feeItem, category: '', expenseAmount: "", incomeAmount: Number(incomeData.monthlyFee), note: '' };
      } else {
        const amt = Number(incomeData.adjAmount);
        payload = { action: 'addRecord', date: incomeData.adjDate, spender: '銀行', item: incomeData.adjItem, category: '系統調整', expenseAmount: incomeData.adjType === 'sub' ? amt : "", incomeAmount: incomeData.adjType === 'add' ? amt : "", note: incomeData.adjNote };
      }
      await fetch(scriptUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
      setSubmitStatus('success');
      setExpenseData({ ...expenseData, item: '', amount: '', note: '' });
      fetchRecords();
      setTimeout(() => setSubmitStatus(null), 3000);
    } catch (err) { setFormError('儲存失敗'); }
    setIsSubmitting(false);
  };

  const currentMonthRecords = records.filter(r => r.date && r.date.startsWith(selectedMonth));
  let xiuxiuPaid = 0, linglingPaid = 0, totalExp = 0, xiuxiuFee = 0, linglingFee = 0;
  currentMonthRecords.forEach(r => {
    const amt = r.parsedAmount;
    if (amt > 0 && r.item.includes('月費')) {
      if (r.spender === '咻咻') xiuxiuFee += amt;
      else if (r.spender === '伶伶') linglingFee += amt;
    } else if (amt < 0 && r.category !== '系統調整') {
      const abs = Math.abs(amt);
      totalExp += abs;
      if (r.spender === '咻咻') xiuxiuPaid += abs;
      else if (r.spender === '伶伶') linglingPaid += abs;
    }
  });

  const baseRecords = records.filter(r => r.date >= analysisStartMonth + '-01' && r.date <= analysisEndMonth + '-31');
  const catSums = {};
  baseRecords.forEach(r => {
    if (r.parsedAmount < 0 && r.category !== '系統調整') catSums[r.category] = (catSums[r.category] || 0) + Math.abs(r.parsedAmount);
  });
  const pieData = Object.entries(catSums).map(([name, value]) => ({ name, value, color: getCategoryColor(name) })).sort((a,b) => b.value - a.value);
  const availableYears = useMemo(() => {
    const s = new Set([new Date().getFullYear().toString()]);
    records.forEach(r => r.date && s.add(r.date.substring(0,4)));
    return Array.from(s).sort();
  }, [records]);
  const filtered = baseRecords.filter(r => listFilter === '全部收支' ? true : (listFilter === '月費' ? r.item.includes('月費') : r.category === listFilter));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex justify-center pb-20">
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col min-h-screen relative">
        <header className="bg-blue-600 text-white p-4 sticky top-0 z-20 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2"><Wallet size={24} /><h1 className="text-xl font-bold tracking-tight">咻伶伶小財庫</h1></div>
          <button onClick={() => setShowSettings(!showSettings)} className="text-[10px] font-bold bg-blue-700/50 hover:bg-blue-700 px-3 py-1.5 rounded-full transition-colors border border-blue-400/30">⚙️ 設定網址</button>
        </header>

        {showSettings && (
          <div className="p-4 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-top duration-300">
            <label className="text-xs font-bold text-slate-600">Google Script API 網址</label>
            <input type="text" value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)} className="w-full p-2.5 mt-1 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://script.google.com/..." />
            <button onClick={() => { localStorage.setItem('googleScriptUrl', scriptUrl); setShowSettings(false); }} className="w-full mt-3 bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm shadow-md">儲存並關閉</button>
          </div>
        )}

        {activeTab === 'input' ? (
          <main className="p-5 space-y-5 flex-1 overflow-y-auto">
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
              <button onClick={() => setTransactionMode('expense')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${transactionMode === 'expense' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>支出記帳</button>
              <button onClick={() => setTransactionMode('income')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${transactionMode === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>收入調整</button>
            </div>
            
            {transactionMode === 'expense' ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <section><label className="text-sm font-bold text-slate-700 flex gap-2 items-center mb-1.5"><Calendar size={16} className="text-blue-500"/>消費日期</label><input type="date" value={expenseData.date} onChange={e => setExpenseData({...expenseData, date: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"/></section>
                <section><label className="text-sm font-bold text-slate-700 flex gap-2 items-center mb-1.5"><User size={16} className="text-blue-500"/>填表人</label><div className="grid grid-cols-2 gap-2">{spenders.map(s => <button key={s} onClick={()=>setExpenseData({...expenseData, spender: s})} className={`py-3 rounded-xl border font-bold transition-all ${expenseData.spender === s ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-[1.02]' : 'bg-white text-slate-500 border-slate-200'}`}>{s}</button>)}</div></section>
                <section><label className="text-sm font-bold text-slate-700 flex gap-2 items-center mb-1.5"><ShoppingCart size={16} className="text-blue-500"/>支出項目</label><input type="text" value={expenseData.item} onChange={e => setExpenseData({...expenseData, item: e.target.value})} placeholder="例如：晚餐便當、家樂福採買" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"/></section>
                <section><label className="text-sm font-bold text-slate-700 flex gap-2 items-center mb-1.5"><Tags size={16} className="text-blue-500"/>支出類型</label><div className="grid grid-cols-3 gap-2">{categories.map(c => <button key={c.id} onClick={()=>setExpenseData({...expenseData, category: c.label})} className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${expenseData.category === c.label ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}><span className="text-xl">{c.icon}</span><span className="text-[10px] font-bold">{c.label}</span></button>)}</div></section>
                <div className="grid grid-cols-2 gap-4">
                  <section><label className="text-sm font-bold text-red-500 mb-1.5 block">支出金額</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span><input type="number" value={expenseData.amount} onChange={e => setExpenseData({...expenseData, amount: e.target.value})} className="w-full p-3 pl-8 bg-slate-50 rounded-xl border border-slate-200 text-xl font-black outline-none focus:ring-2 focus:ring-red-500"/></div></section>
                  <section><label className="text-sm font-bold text-slate-400 mb-1.5 block">目前帳戶餘額</label><div className="p-3 bg-slate-100 rounded-xl text-xl font-bold text-slate-500 border border-slate-200 truncate">${currentBalance.toLocaleString()}</div></section>
                </div>
                <section><label className="text-sm font-bold text-slate-500 flex gap-2 items-center mb-1.5"><FileText size={16}/>備註說明 (選填)</label><input type="text" value={expenseData.note} onChange={e => setExpenseData({...expenseData, note: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400 text-sm" placeholder="..."/></section>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl"><button onClick={()=>setIncomeMode('monthly_fee')} className={`flex-1 p-3 rounded-lg text-sm font-bold transition-all ${incomeMode === 'monthly_fee' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>月費入帳</button><button onClick={()=>setIncomeMode('bank_adj')} className={`flex-1 p-3 rounded-lg text-sm font-bold transition-all ${incomeMode === 'bank_adj' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}>銀行調整</button></div>
                {incomeMode === 'monthly_fee' ? (
                  <div className="space-y-4 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 shadow-sm">
                    <label className="text-sm font-bold text-emerald-800 block">入帳月份</label><MonthYearPicker value={incomeData.month} onChange={v => setIncomeData({...incomeData, month:v})} availableYears={availableYears}/>
                    <label className="text-sm font-bold text-emerald-800 block mt-2">單人預計匯入金額</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span><input type="number" value={incomeData.monthlyFee} onChange={e => setIncomeData({...incomeData, monthlyFee: e.target.value})} className="w-full p-4 pl-8 rounded-xl border border-emerald-200 font-black text-2xl outline-none focus:ring-2 focus:ring-emerald-500"/></div>
                    <p className="text-[10px] text-emerald-600 italic font-medium">※ 系統將自動為「咻咻」與「伶伶」各建立一筆該月 1 日的收入紀錄。</p>
                  </div>
                ) : (
                  <div className="space-y-4 p-5 bg-purple-50/50 rounded-2xl border border-purple-100 shadow-sm">
                    <input type="date" value={incomeData.adjDate} onChange={e=>setIncomeData({...incomeData, adjDate: e.target.value})} className="w-full p-3 rounded-xl border border-purple-200 outline-none focus:ring-2 focus:ring-purple-500"/>
                    <input type="text" placeholder="調整項目 (如：利息、手續費)" value={incomeData.adjItem} onChange={e=>setIncomeData({...incomeData, adjItem: e.target.value})} className="w-full p-3 rounded-xl border border-purple-200 outline-none focus:ring-2 focus:ring-purple-500"/>
                    <div className="flex gap-2">
                      <select value={incomeData.adjType} onChange={e=>setIncomeData({...incomeData, adjType: e.target.value})} className="p-3 border border-purple-200 rounded-xl bg-white font-bold text-purple-700 outline-none"><option value="add">➕ 增加</option><option value="sub">➖ 減少</option></select>
                      <input type="number" placeholder="金額" value={incomeData.adjAmount} onChange={e=>setIncomeData({...incomeData, adjAmount: e.target.value})} className="flex-1 p-3 border border-purple-200 rounded-xl font-black text-xl outline-none focus:ring-2 focus:ring-purple-500"/>
                    </div>
                  </div>
                )}
              </div>
            )}
            {formError && <div className="p-3 bg-red-50 text-red-500 text-xs font-bold rounded-lg flex items-center gap-2"><AlertCircle size={14}/>{formError}</div>}
            <button onClick={handleSubmit} disabled={isSubmitting || isLoadingRecords} className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 ${isSubmitting || isLoadingRecords ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'}`}>{isSubmitting ? <><RefreshCw size={20} className="animate-spin"/> 處理中...</> : <><Send size={20}/> 確認儲存至 Google Sheet</>}</button>
          </main>
        ) : (
          <main className="p-5 space-y-6 flex-1 bg-slate-50 overflow-y-auto custom-scrollbar">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
              <div className="flex justify-between items-center"><label className="font-bold text-slate-600 text-sm">統計月份</label><MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} availableYears={availableYears}/></div>
              <div className="flex justify-between items-end"><div><p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-0.5">Monthly Total Expense</p><p className="text-3xl font-black text-slate-800 tracking-tighter">${totalExp.toLocaleString()}</p></div><div className="text-right"><p className="text-[10px] text-emerald-500 font-bold flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 帳戶餘額</p><p className="text-xl font-black text-emerald-600 tracking-tight">${currentBalance.toLocaleString()}</p></div></div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100"><p className="text-xs font-black text-blue-700 mb-1 flex items-center gap-1">👦🏻 咻咻</p><p className="text-[9px] text-slate-400 font-medium">代墊: ${xiuxiuPaid.toLocaleString()}</p><p className={`text-xs font-black mt-1.5 ${xiuxiuFee-xiuxiuPaid > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{xiuxiuFee-xiuxiuPaid > 0 ? `應補: $${(xiuxiuFee-xiuxiuPaid).toLocaleString()}` : '✅ 已達標'}</p></div>
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100"><p className="text-xs font-black text-purple-700 mb-1 flex items-center gap-1">👧🏻 伶伶</p><p className="text-[9px] text-slate-400 font-medium">代墊: ${linglingPaid.toLocaleString()}</p><p className={`text-xs font-black mt-1.5 ${linglingFee-linglingPaid > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{linglingFee-linglingPaid > 0 ? `應補: $${(linglingFee-linglingPaid).toLocaleString()}` : '✅ 已達標'}</p></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm"><PieChartIcon size={16} className="text-blue-500"/>支出比例分析</h3>
              <div className="flex gap-2 items-center justify-center mb-6 bg-slate-50 p-2 rounded-xl border border-slate-200/50"><MonthYearPicker value={analysisStartMonth} onChange={setAnalysisStartMonth} availableYears={availableYears}/><span className="text-slate-300 font-bold">~</span><MonthYearPicker value={analysisEndMonth} onChange={setAnalysisEndMonth} availableYears={availableYears}/></div>
              <PieChart data={pieData} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1"><h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><History size={16} className="text-blue-500"/>收支交易明細</h3><select value={listFilter} onChange={e=>setListFilter(e.target.value)} className="text-[10px] font-bold p-1.5 border border-slate-200 rounded-lg bg-white shadow-sm outline-none focus:ring-1 focus:ring-blue-500">{listFilterOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
              {isLoadingRecords ? (
                <div className="flex flex-col items-center py-10 text-slate-400 gap-2"><RefreshCw size={24} className="animate-spin"/><p className="text-xs font-medium">讀取 Google Sheet 中...</p></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 text-xs font-medium">該月份尚無符合的明細紀錄</div>
              ) : (
                <div className="space-y-2.5">
                  {filtered.map((r, i) => (
                    <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:border-blue-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shadow-inner ${r.spender === '咻咻' ? 'bg-blue-400' : r.spender === '伶伶' ? 'bg-purple-400' : 'bg-slate-400'}`}>{r.spender ? r.spender[0] : '?'}</div>
                        <div className="min-w-0 flex flex-col">
                          <p className="font-bold text-slate-800 text-sm truncate leading-tight">{r.item}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">{r.category || (r.parsedAmount > 0 ? '收入入帳' : '一般支出')} · {r.date}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-black text-sm tracking-tight ${r.parsedAmount > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>{r.parsedAmount > 0 ? '+' : '-'}${Math.abs(r.parsedAmount).toLocaleString()}</p>
                        <p className="text-[9px] text-slate-300 font-bold mt-0.5">餘: ${r.computedBalance?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        )}

        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-200 flex h-16 items-center z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
          <button onClick={() => setActiveTab('input')} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'input' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}><Edit size={20}/><span className="text-[10px] font-black">開始記帳</span></button>
          <button onClick={() => setActiveTab('report')} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'report' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}><BarChart size={20}/><span className="text-[10px] font-black">分析明細</span></button>
        </nav>
        
        {submitStatus === 'success' && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl z-[60] flex items-center gap-2 font-bold animate-in fade-in slide-in-from-top-4">
            <CheckCircle size={18}/> 成功儲存至雲端！
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
