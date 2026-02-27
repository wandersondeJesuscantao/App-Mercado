import React, { useState, useRef, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Camera, 
  ShoppingCart, 
  Receipt, 
  Lightbulb, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Search, 
  Home, 
  User,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  X,
  Loader2,
  ScanLine,
  History,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  CheckCircle2,
  Info,
  ArrowRight,
  Share2,
  Eraser
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Product, AIResponse, ShoppingSession } from './types';
import { analyzeProductImage, getAIAssistance } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'list' | 'tips' | 'market' | 'history' | 'finances'>('home');
  const [items, setItems] = useState<Product[]>([]);
  const [savedLists, setSavedLists] = useState<ShoppingSession[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const totalCost = items.reduce((acc, item) => acc + item.price, 0);
  const totalSpentAllTime = savedLists.reduce((acc, list) => acc + list.total, 0);
  
  const chartData = [...savedLists]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(list => ({
      name: new Date(list.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      total: list.total,
      fullDate: new Date(list.timestamp).toLocaleDateString('pt-BR')
    }));

  const averageSpend = savedLists.length > 0 ? totalSpentAllTime / savedLists.length : 0;
  const lastListTotal = savedLists.length > 0 ? savedLists[savedLists.length - 1].total : 0;
  const secondLastListTotal = savedLists.length > 1 ? savedLists[savedLists.length - 2].total : 0;
  const spendDiff = lastListTotal - secondLastListTotal;
  const isUp = spendDiff > 0;

  useEffect(() => {
    fetchSavedLists();
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const fetchSavedLists = async () => {
    try {
      const response = await fetch('/api/lists');
      if (response.ok) {
        const data = await response.json();
        setSavedLists(data);
      }
    } catch (error) {
      console.error("Failed to fetch lists:", error);
    }
  };

  const saveCurrentList = async () => {
    if (items.length === 0) return;
    
    setIsSaving(true);
    const newList: ShoppingSession = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Compra ${new Date().toLocaleDateString('pt-BR')}`,
      items,
      total: totalCost,
      timestamp: Date.now(),
    };

    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newList),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          setItems([]);
          setSaveSuccess(false);
          fetchSavedLists();
          setActiveTab('history');
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to save list:", error);
      alert("Erro ao salvar lista.");
    } finally {
      setIsSaving(false);
    }
  };

  const shareViaWhatsApp = () => {
    if (items.length === 0) return;
    
    const message = `🛒 *Minha Lista de Compras - Suas Compras de Mercado*\n\n` +
      items.map(item => `• ${item.name}: R$ ${item.price.toFixed(2)}`).join('\n') +
      `\n\n💰 *Total Estimado: R$ ${totalCost.toFixed(2)}*`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const clearCurrentList = () => {
    if (window.confirm("Tem certeza que deseja limpar toda a lista atual?")) {
      setItems([]);
    }
  };

  const deleteSavedList = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta lista?")) return;
    
    try {
      const response = await fetch(`/api/lists/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchSavedLists();
      }
    } catch (error) {
      console.error("Failed to delete list:", error);
    }
  };

  const loadSavedList = (list: ShoppingSession) => {
    setItems(list.items);
    setActiveTab('list');
  };

  const finishOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const onboardingSteps = [
    {
      title: "Bem-vinda ao seu Assistente!",
      description: "Organize suas compras de mercado com o poder da Inteligência Artificial.",
      icon: <Sparkles className="w-12 h-12 text-emerald-500" />
    },
    {
      title: "Escanear e Analisar",
      description: "Use a câmera para capturar produtos. Nossa IA identifica o item e diz se o preço está bom ou caro.",
      icon: <Camera className="w-12 h-12 text-blue-500" />
    },
    {
      title: "Controle Financeiro",
      description: "Salve suas listas para acompanhar seus gastos ao longo do tempo com gráficos detalhados.",
      icon: <Wallet className="w-12 h-12 text-amber-500" />
    },
    {
      title: "Dicas e Receitas",
      description: "Converse com nossa IA para receber sugestões de receitas baseadas na sua lista atual.",
      icon: <Lightbulb className="w-12 h-12 text-purple-500" />
    }
  ];

  const startCamera = () => {
    setIsScanning(true);
  };

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initCamera = async () => {
      if (isScanning && videoRef.current) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Ensure it plays
            try {
              await videoRef.current.play();
            } catch (playErr) {
              console.error("Auto-play failed:", playErr);
            }
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          alert("Não foi possível acessar a câmera. Verifique se deu permissão no navegador.");
          setIsScanning(false);
        }
      }
    };

    if (isScanning) {
      initCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning]);

  const stopCamera = () => {
    setIsScanning(false);
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    
    setIsAnalyzing(true);
    stopCamera();

    const result = await analyzeProductImage(base64Image);
    
    if (result) {
      const newProduct: Product = {
        id: Math.random().toString(36).substr(2, 9),
        name: result.productName,
        price: result.price,
        category: result.category,
        analysis: result.analysis,
        timestamp: Date.now(),
      };
      setItems(prev => [...prev, newProduct]);
      setActiveTab('list');
    } else {
      alert("Não foi possível identificar o produto. Tente novamente.");
    }
    setIsAnalyzing(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    setAiChat(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    const context = `Lista de compras atual: ${items.map(i => `${i.name} (R$ ${i.price})`).join(', ')}. Total: R$ ${totalCost.toFixed(2)}`;
    const response = await getAIAssistance(userMessage, context);
    
    setAiChat(prev => [...prev, { role: 'assistant', content: response || "Erro ao responder." }]);
    setIsChatLoading(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-zinc-50 overflow-hidden relative">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-zinc-200 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Faça suas Comprar de Mercado
          </h1>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Gestão Inteligente</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHelp(true)}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500"
            title="Como usar"
          >
            <Info className="w-5 h-5" />
          </button>
          <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <span className="text-xs font-bold text-emerald-700">R$ {totalCost.toFixed(2)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-1">Olá, Dona de Casa!</h2>
                  <p className="text-emerald-100 text-sm mb-4">Economize tempo e dinheiro hoje.</p>
                  <button 
                    onClick={() => setActiveTab('scan')}
                    className="bg-white text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Escanear Produto
                  </button>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-20">
                  <ShoppingCart className="w-32 h-32" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => setActiveTab('finances')}
                  className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-sm">Finanças</h3>
                  <p className="text-xs text-zinc-500">Total: R$ {totalSpentAllTime.toFixed(2)}</p>
                </div>
                <div 
                  onClick={() => setActiveTab('tips')}
                  className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center mb-3">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="font-bold text-sm">Dicas & Receitas</h3>
                  <p className="text-xs text-zinc-500">Ideias rápidas para o dia.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-zinc-800">Listas Salvas</h3>
                  <button onClick={() => setActiveTab('list')} className="text-xs font-bold text-emerald-600">Ver atual</button>
                </div>
                {savedLists.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-100 rounded-2xl border-2 border-dashed border-zinc-200">
                    <p className="text-sm text-zinc-400">Nenhuma lista salva ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedLists.map(list => (
                      <div key={list.id} className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center justify-between group">
                        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => loadSavedList(list)}>
                          <div className="w-10 h-10 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400">
                            <Receipt className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{list.name}</p>
                            <p className="text-xs text-zinc-500">{list.items.length} itens • R$ {list.total.toFixed(2)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteSavedList(list.id); }}
                          className="p-2 text-zinc-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'scan' && (
            <motion.div 
              key="scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50 flex flex-col"
            >
              <div className="p-6 flex justify-between items-center">
                <button onClick={() => { stopCamera(); setActiveTab('home'); }} className="text-white">
                  <X className="w-6 h-6" />
                </button>
                <span className="text-white text-sm font-bold">Escanear Produto</span>
                <div className="w-6" />
              </div>

              <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {!isScanning && !isAnalyzing && (
                  <button 
                    onClick={startCamera}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-full font-bold shadow-xl"
                  >
                    Ativar Câmera
                  </button>
                )}
                
                {isScanning && (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                      <div className="w-64 h-64 border-2 border-emerald-400 rounded-3xl relative">
                        <motion.div 
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                        />
                      </div>
                    </div>
                    <div className="absolute bottom-12 left-0 right-0 flex justify-center">
                      <button 
                        onClick={captureImage}
                        className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <div className="w-14 h-14 bg-emerald-600 rounded-full" />
                      </button>
                    </div>
                  </>
                )}

                {isAnalyzing && (
                  <div className="flex flex-col items-center gap-4 text-white">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-400" />
                    <p className="font-bold animate-pulse">IA Analisando Preço...</p>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </motion.div>
          )}

          {activeTab === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Sua Compra</h2>
                <button onClick={clearCurrentList} className="text-xs font-bold text-rose-500 flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors">
                  <Eraser className="w-3 h-3" /> Limpar Tudo
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
                    <ShoppingCart className="w-10 h-10 text-zinc-300" />
                  </div>
                  <p className="text-zinc-500 font-medium">Lista vazia. Comece a escanear!</p>
                  <button 
                    onClick={() => setActiveTab('scan')}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold"
                  >
                    Escanear Agora
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          item.analysis === 'barato' ? "bg-emerald-50 text-emerald-600" : 
                          item.analysis === 'caro' ? "bg-rose-50 text-rose-600" : "bg-zinc-50 text-zinc-600"
                        )}>
                          {item.analysis === 'barato' ? <TrendingDown className="w-6 h-6" /> : 
                           item.analysis === 'caro' ? <TrendingUp className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-bold">{item.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                              {item.category}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                              item.analysis === 'barato' ? "text-emerald-600 bg-emerald-50" : 
                              item.analysis === 'caro' ? "text-rose-600 bg-rose-50" : "text-zinc-600 bg-zinc-50"
                            )}>
                              {item.analysis}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">R$ {item.price.toFixed(2)}</p>
                        <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="bg-zinc-900 rounded-2xl p-6 text-white mt-8">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-zinc-400 font-medium">Total Estimado</span>
                      <span className="text-2xl font-bold">R$ {totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={saveCurrentList}
                        disabled={isSaving || saveSuccess}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                          saveSuccess ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500 hover:bg-emerald-600 text-white",
                          (isSaving || saveSuccess) && "opacity-80"
                        )}
                      >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                         saveSuccess ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {saveSuccess ? "Lista Salva!" : "Salvar Lista"}
                      </button>
                      <button 
                        onClick={shareViaWhatsApp}
                        className="bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700 transition-colors"
                        title="Compartilhar no WhatsApp"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'finances' && (
            <motion.div 
              key="finances"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-6 space-y-6"
            >
              <h2 className="text-2xl font-bold">Suas Finanças</h2>

              <div className="bg-zinc-900 rounded-3xl p-6 text-white shadow-xl">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Gasto Total Acumulado</p>
                <h3 className="text-4xl font-bold mb-4">R$ {totalSpentAllTime.toFixed(2)}</h3>
                
                <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
                  <div className="flex-1">
                    <p className="text-zinc-500 text-[10px] uppercase font-bold">Média por Compra</p>
                    <p className="text-lg font-bold">R$ {averageSpend.toFixed(2)}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-zinc-500 text-[10px] uppercase font-bold">Última Compra</p>
                    <div className="flex items-center gap-1">
                      <p className="text-lg font-bold">R$ {lastListTotal.toFixed(2)}</p>
                      {savedLists.length > 1 && (
                        <span className={cn(
                          "text-[10px] font-bold flex items-center",
                          isUp ? "text-rose-400" : "text-emerald-400"
                        )}>
                          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs((spendDiff / secondLastListTotal) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-zinc-800 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                    Comparativo de Gastos
                  </h4>
                </div>
                
                {savedLists.length < 2 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-zinc-200" />
                    </div>
                    <p className="text-xs text-zinc-400">Salve pelo menos 2 listas para ver o comparativo.</p>
                  </div>
                ) : (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#A1A1AA' }}
                        />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-zinc-900 text-white p-2 rounded-lg text-[10px] shadow-xl border border-zinc-800">
                                  <p className="font-bold">{payload[0].payload.fullDate}</p>
                                  <p className="text-emerald-400">R$ {Number(payload[0].value).toFixed(2)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index === chartData.length - 1 ? '#10b981' : '#e4e4e7'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-zinc-800">Resumo por Categoria</h4>
                <div className="space-y-2">
                  {/* Simple category breakdown from all saved items */}
                  {Array.from(new Set(savedLists.flatMap(l => l.items).map(i => i.category))).slice(0, 4).map(cat => {
                    const catTotal = savedLists.flatMap(l => l.items)
                      .filter(i => i.category === cat)
                      .reduce((acc, i) => acc + i.price, 0);
                    const percentage = (catTotal / totalSpentAllTime) * 100;
                    
                    return (
                      <div key={cat} className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-zinc-700 capitalize">{cat}</span>
                            <span className="text-xs font-bold text-zinc-400">{percentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-sm font-bold">R$ {catTotal.toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <h2 className="text-2xl font-bold">Histórico de Compras</h2>
              
              {savedLists.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
                    <History className="w-10 h-10 text-zinc-300" />
                  </div>
                  <p className="text-zinc-500 font-medium">Nenhuma lista salva ainda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedLists.map(list => (
                    <div key={list.id} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="cursor-pointer flex-1" onClick={() => loadSavedList(list)}>
                          <h4 className="font-bold text-zinc-900">{list.name}</h4>
                          <div className="flex items-center gap-1 text-zinc-400 text-xs mt-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(list.timestamp).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <button onClick={() => deleteSavedList(list.id)} className="text-rose-400 hover:text-rose-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-zinc-50">
                        <span className="text-xs text-zinc-500 font-medium">{list.items.length} itens</span>
                        <span className="font-bold text-emerald-600">R$ {list.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'tips' && (
            <motion.div 
              key="tips"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col h-full bg-white"
            >
              <div className="p-6 border-b border-zinc-100">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Lightbulb className="w-6 h-6 text-amber-500" />
                  Assistente IA
                </h2>
                <p className="text-sm text-zinc-500">Dicas de economia, receitas e organização.</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {aiChat.length === 0 && (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400 text-center italic">Como posso te ajudar hoje?</p>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        "Sugira uma receita com os itens da minha lista",
                        "Como economizar no mercado este mês?",
                        "Dicas para organizar a despensa",
                        "Qual o melhor dia para comprar verduras?"
                      ].map((suggestion, idx) => (
                        <button 
                          key={idx}
                          onClick={() => { setChatInput(suggestion); }}
                          className="text-left p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-sm hover:bg-zinc-100 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {aiChat.map((msg, idx) => (
                  <div key={idx} className={cn(
                    "max-w-[85%] p-4 rounded-2xl",
                    msg.role === 'user' ? "bg-emerald-600 text-white ml-auto rounded-tr-none" : "bg-zinc-100 text-zinc-800 mr-auto rounded-tl-none"
                  )}>
                    <div className="markdown-body">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                ))}
                
                {isChatLoading && (
                  <div className="bg-zinc-100 p-4 rounded-2xl mr-auto rounded-tl-none flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    <span className="text-xs text-zinc-400 font-medium">SmartShop está pensando...</span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-zinc-100 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Pergunte algo..."
                  className="flex-1 bg-zinc-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="bg-emerald-600 text-white p-2 rounded-xl disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'market' && (
            <motion.div 
              key="market"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Mercado Online</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar em toda internet..."
                    className="bg-zinc-100 border-none rounded-full pl-9 pr-4 py-2 text-xs w-40 outline-none"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">IA Comparadora</h4>
                  <p className="text-xs text-amber-700">Estamos monitorando os melhores preços em 15 lojas parceiras para você.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Arroz Tio João 5kg', price: 29.90, img: 'https://picsum.photos/seed/rice/200/200', store: 'Carrefour' },
                  { name: 'Feijão Carioca 1kg', price: 7.45, img: 'https://picsum.photos/seed/beans/200/200', store: 'Extra' },
                  { name: 'Óleo de Soja 900ml', price: 6.80, img: 'https://picsum.photos/seed/oil/200/200', store: 'Assaí' },
                  { name: 'Leite Integral 1L', price: 4.99, img: 'https://picsum.photos/seed/milk/200/200', store: 'Pão de Açúcar' },
                ].map((product, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm group">
                    <div className="h-32 bg-zinc-100 relative overflow-hidden">
                      <img 
                        src={product.img} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm">
                        {product.store}
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-xs font-bold truncate mb-1">{product.name}</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-emerald-600">R$ {product.price.toFixed(2)}</span>
                        <button className="bg-zinc-900 text-white p-1.5 rounded-lg">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-zinc-200 px-2 py-2 grid grid-cols-5 items-end z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <NavButton 
          active={activeTab === 'home'} 
          onClick={() => setActiveTab('home')} 
          icon={<Home className="w-5 h-5" />} 
          label="Início" 
        />
        <NavButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')} 
          icon={<History className="w-5 h-5" />} 
          label="Histórico" 
        />
        <div className="flex justify-center pb-2">
          <button 
            onClick={() => setActiveTab('scan')}
            className="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200 active:scale-90 transition-transform -mt-8 border-4 border-white"
          >
            <ScanLine className="w-7 h-7" />
          </button>
        </div>
        <NavButton 
          active={activeTab === 'list'} 
          onClick={() => setActiveTab('list')} 
          icon={<Receipt className="w-5 h-5" />} 
          label="Compra" 
        />
        <NavButton 
          active={activeTab === 'tips'} 
          onClick={() => setActiveTab('tips')} 
          icon={<Lightbulb className="w-5 h-5" />} 
          label="Dicas" 
        />
      </nav>

      {/* Onboarding Overlay */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[32px] p-6 w-full max-w-md shadow-2xl relative max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900">Como Usar o App</h3>
                <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <div className="space-y-6">
                <section className="space-y-3">
                  <h4 className="font-bold text-emerald-600 flex items-center gap-2">
                    <Home className="w-4 h-4" /> Navegação Principal
                  </h4>
                  <ul className="space-y-2 text-sm text-zinc-600">
                    <li className="flex gap-2"><strong>Início:</strong> Visão geral dos seus gastos e atalhos rápidos.</li>
                    <li className="flex gap-2"><strong>Histórico:</strong> Veja suas listas de compras passadas e exclua o que não precisa mais.</li>
                    <li className="flex gap-2"><strong>Compra:</strong> Sua lista atual. Aqui você finaliza e salva suas compras.</li>
                    <li className="flex gap-2"><strong>Dicas:</strong> Converse com nossa IA para receitas e dicas de economia.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h4 className="font-bold text-blue-600 flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Escaneando Produtos
                  </h4>
                  <p className="text-sm text-zinc-600">
                    Toque no botão central verde <strong>(Escanear)</strong> para abrir a câmera. Aponte para um produto e a IA dirá o nome, preço médio e se o valor está bom ou caro.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="font-bold text-amber-600 flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Controle de Gastos
                  </h4>
                  <p className="text-sm text-zinc-600">
                    Na aba <strong>Início</strong>, clique em <strong>Finanças</strong> para ver gráficos detalhados de quanto você está gastando por categoria e ao longo do tempo.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="font-bold text-purple-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Salvando Listas
                  </h4>
                  <p className="text-sm text-zinc-600">
                    Após adicionar itens, vá na aba <strong>Compra</strong> e clique em <strong>Finalizar e Salvar Lista</strong>. Isso moverá os itens para o seu histórico e atualizará suas finanças.
                  </p>
                </section>
              </div>

              <button 
                onClick={() => setShowHelp(false)}
                className="w-full mt-8 bg-zinc-900 text-white py-3 rounded-2xl font-bold hover:bg-zinc-800 transition-colors"
              >
                Entendi!
              </button>
            </motion.div>
          </motion.div>
        )}

        {showOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-zinc-100">
                <motion.div 
                  className="h-full bg-emerald-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((onboardingStep + 1) / onboardingSteps.length) * 100}%` }}
                />
              </div>

              <div className="flex flex-col items-center text-center space-y-6 pt-4">
                <div className="p-4 bg-zinc-50 rounded-3xl">
                  {onboardingSteps[onboardingStep].icon}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900">{onboardingSteps[onboardingStep].title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {onboardingSteps[onboardingStep].description}
                  </p>
                </div>

                <div className="flex w-full gap-3 pt-4">
                  {onboardingStep > 0 && (
                    <button 
                      onClick={() => setOnboardingStep(prev => prev - 1)}
                      className="flex-1 py-3 rounded-2xl font-bold text-zinc-400 hover:bg-zinc-50 transition-colors"
                    >
                      Voltar
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (onboardingStep < onboardingSteps.length - 1) {
                        setOnboardingStep(prev => prev + 1);
                      } else {
                        finishOnboarding();
                      }
                    }}
                    className="flex-1 bg-zinc-900 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
                  >
                    {onboardingStep === onboardingSteps.length - 1 ? "Começar" : "Próximo"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-colors py-1",
        active ? "text-emerald-600" : "text-zinc-400"
      )}
    >
      <div className="flex items-center justify-center h-6">
        {icon}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-tight truncate w-full px-1 text-center">{label}</span>
    </button>
  );
}
