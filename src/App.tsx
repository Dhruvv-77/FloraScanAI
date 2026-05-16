import React, { useState, useRef, useEffect } from 'react';
import { 
  Leaf, 
  Upload, 
  Camera, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Stethoscope, 
  Info,
  ChevronRight,
  RefreshCw,
  X,
  FileText,
  History,
  LogIn,
  LogOut,
  Trash2,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { analyzeLeafImage } from './services/geminiService';
import { 
  auth, 
  signIn, 
  signOut, 
  saveAnalysis, 
  getAnalysisHistory, 
  deleteAnalysis, 
  AnalysisHistoryItem 
} from './services/firebaseService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchHistory();
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await getAnalysisHistory();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const processImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysis(null);
    setError(null);
  };

  const startAnalysis = async () => {
    if (!image || !previewUrl) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeLeafImage(image);
      setAnalysis(result);
      
      // Save to history if user is logged in
      if (auth.currentUser) {
        const match = result.match(/MATCH_CONFIDENCE:\s*(\d+)%/)?.[1] || "0";
        const health = result.match(/HEALTH_SCORE:\s*(\d+)%/)?.[1] || "0";
        await saveAnalysis(
          previewUrl, 
          result, 
          parseInt(match), 
          parseInt(health)
        );
        fetchHistory(); // Refresh history
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteAnalysis(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Delete history error:", err);
    }
  };

  const viewHistoryItem = (item: AnalysisHistoryItem) => {
    setPreviewUrl(item.imageUrl);
    setAnalysis(item.analysisText);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setImage(null);
    setPreviewUrl(null);
    setAnalysis(null);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  return (
    <div className="min-h-screen font-sans">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-brand-100 dark:border-slate-800 py-4 px-6 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg shadow-brand-200 dark:shadow-none">
              <Leaf size={24} />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              FloraScan<span className="text-brand-600">AI</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${showHistory ? 'bg-brand-600 text-white' : 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/50'}`}
                >
                  <History size={18} />
                  <span className="hidden sm:inline">History</span>
                </button>
                <div className="flex items-center gap-2">
                  {user.photoURL && <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-brand-200 dark:border-slate-700" />}
                  <button onClick={signOut} className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors" title="Sign Out">
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={signIn}
                className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all"
              >
                <LogIn size={18} />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 md:py-12">
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-brand-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History size={20} className="text-brand-600" />
                    Your Analysis History
                  </h2>
                  <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X size={20} />
                  </button>
                </div>
                
                {isLoadingHistory ? (
                  <div className="py-12 text-center text-slate-500">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                    Loading your past scans...
                  </div>
                ) : history.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {history.map((item) => (
                      <div key={item.id} className="group relative bg-slate-50 dark:bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 hover:border-brand-200 dark:hover:border-brand-600 transition-all">
                        <img src={item.imageUrl} alt="Analysis" className="w-full h-32 object-cover" />
                        <div className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.timestamp.toLocaleDateString()}</p>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.analysisText.split('\n')[0].replace(/#|[*]/g, '').trim()}</p>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteHistory(item.id); }}
                              className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-[10px] bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-bold">M: {item.matchConfidence}%</span>
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">H: {item.healthScore}%</span>
                          </div>
                          <button 
                            onClick={() => viewHistoryItem(item)}
                            className="w-full mt-3 py-1.5 bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 text-xs font-bold rounded-lg border border-brand-100 dark:border-slate-700 hover:bg-brand-600 hover:text-white transition-all"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Search size={24} />
                    </div>
                    <p className="text-slate-500">No analyses found in your history.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          
          {/* Left Column: Upload & Actions */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <h2 className="text-xl font-display font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Camera size={20} className="text-brand-600" />
                Upload Photo
              </h2>
              
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                className={`
                  relative aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                  ${previewUrl ? 'border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/5'}
                  ${isAnalyzing ? 'pointer-events-none opacity-50' : ''}
                `}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                />
                
                {previewUrl ? (
                  <div className="absolute inset-0 p-2">
                    <img 
                      src={previewUrl} 
                      alt="Leaf preview" 
                      className="w-full h-full object-cover rounded-xl"
                    />
                    {!isAnalyzing && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 p-1.5 rounded-full shadow-lg text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="text-brand-600" size={32} />
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Drop leaf photo here</p>
                    <p className="text-sm text-slate-500 mt-1">or click to browse</p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <button
                  disabled={!image || isAnalyzing}
                  onClick={startAnalysis}
                  className={`
                    w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-md
                    ${!image || isAnalyzing 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                      : 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-brand-300 dark:hover:shadow-none'}
                  `}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="animate-spin" size={20} />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      Analyze Leaf
                    </>
                  )}
                </button>
                
                {previewUrl && !isAnalyzing && !analysis && (
                  <button 
                    onClick={reset}
                    className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </section>

            <section className="bg-brand-900 text-white p-6 rounded-3xl shadow-xl overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="font-display font-medium text-brand-200 text-sm tracking-wider uppercase mb-2">Pro Tip</h3>
                <p className="text-brand-50 leading-relaxed text-sm">
                  For the best analysis, ensure the leaf is well-lit, centered, and visible against a contrasting background.
                </p>
              </div>
              <div className="absolute -bottom-6 -right-6 opacity-10">
                <Leaf size={140} />
              </div>
            </section>
          </div>

          {/* Right Column: Analysis Results */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white dark:bg-slate-900 p-12 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-6"
                >
                  <div className="relative w-24 h-24 mx-auto">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-4 border-brand-100 dark:border-brand-900/30"
                    />
                    <motion.div 
                      animate={{ rotate: -360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-t-4 border-brand-600 dark:border-brand-400"
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <Leaf size={32} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">Identifying Species...</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Connecting to botanical expert system</p>
                  </div>
                  <div className="max-w-xs mx-auto space-y-2">
                    <div className="h-2 bg-brand-50 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ x: [-100, 300] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-1/2 h-full bg-brand-400"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 tracking-widest px-1">
                      <span>Scanning Structure</span>
                      <span>Matching Bio-Data</span>
                    </div>
                  </div>
                </motion.div>
              ) : analysis ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <header className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-2 rounded-xl">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">Analysis Complete</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Report generated successfully</p>
                      </div>
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                      <div className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Match Confidence</div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${analysis.match(/MATCH_CONFIDENCE:\s*(\d+)%/)?.[1] || 0}%` }}
                              className="h-full bg-brand-500 dark:bg-brand-400"
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{analysis.match(/MATCH_CONFIDENCE:\s*(\d+)%/)?.[1] || 0}%</span>
                        </div>
                      </div>
                      <div className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Health Score</div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${analysis.match(/HEALTH_SCORE:\s*(\d+)%/)?.[1] || 0}%` }}
                              className="h-full bg-blue-500 dark:bg-blue-400"
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{analysis.match(/HEALTH_SCORE:\s*(\d+)%/)?.[1] || 0}%</span>
                        </div>
                      </div>
                    </div>
                  </header>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
                    <div className="bg-brand-50/50 dark:bg-brand-900/20 p-4 border-b border-brand-100 dark:border-brand-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-brand-600 dark:text-brand-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400">Detailed Report</span>
                      </div>
                      <button 
                        onClick={startAnalysis}
                        className="flex items-center gap-1.5 text-xs text-brand-700 dark:text-brand-400 font-bold hover:bg-brand-100 dark:hover:bg-brand-900/40 py-1 px-3 rounded-lg transition-all"
                      >
                        <RefreshCw size={14} />
                        Re-scan
                      </button>
                    </div>
                    <div className="p-8 markdown-body">
                      <ReactMarkdown>
                        {analysis.replace(/MATCH_CONFIDENCE:\s*(\d+)%\nHEALTH_SCORE:\s*(\d+)%/, '').trim()}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-brand-600 dark:bg-brand-800 text-white p-6 rounded-3xl flex items-start gap-4">
                      <Clock className="text-brand-200 dark:text-brand-400 flex-shrink-0" size={32} />
                      <div>
                        <h4 className="font-display font-bold text-lg mb-1 leading-tight text-white">Fast Service</h4>
                        <p className="text-brand-100 dark:text-brand-200 text-sm">Analysis completed in seconds using edge AI technology.</p>
                      </div>
                    </div>
                    <div className="bg-brand-900 dark:bg-slate-800 text-white p-6 rounded-3xl flex items-start gap-4 shadow-xl dark:shadow-none">
                      <Stethoscope className="text-brand-400 flex-shrink-0" size={32} />
                      <div>
                        <h4 className="font-display font-bold text-lg mb-1 leading-tight text-white">Digital Doctor</h4>
                        <p className="text-brand-50 dark:text-slate-300 text-sm">Pathology insights based on visual markers and biological data.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-8 rounded-3xl text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
                    <AlertCircle size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-red-900 dark:text-red-400">Analysis Failed</h3>
                    <p className="text-red-700 dark:text-red-300 mt-2">{error}</p>
                  </div>
                  <button 
                    onClick={reset}
                    className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-6 py-2 rounded-xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-all shadow-sm"
                  >
                    Try Again
                  </button>
                </motion.div>
              ) : (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-6 transition-colors">
                  <div className="bg-brand-50 dark:bg-brand-900/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-brand-600 dark:text-brand-400">
                    <Leaf size={48} />
                  </div>
                  <div className="max-w-xs mx-auto">
                    <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">Ready for Scan</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Upload a photo to see identification, disease analysis, and care guides.</p>
                  </div>
                  
                  <div className="pt-6 grid grid-cols-1 gap-4 text-left">
                    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div className="mt-1 bg-white dark:bg-slate-700 p-1 rounded-lg text-brand-600 dark:text-brand-400 shadow-sm"><Info size={16}/></div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">Species Identification</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Detecting common and scientific names instantly.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div className="mt-1 bg-white dark:bg-slate-700 p-1 rounded-lg text-brand-600 dark:text-brand-400 shadow-sm"><Stethoscope size={16}/></div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">Disease Diagnosis</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Identifying pests, fungal infections, and deficiencies.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-12 text-center border-t border-brand-100 dark:border-slate-800 mt-12 bg-white/30 dark:bg-slate-900/10 backdrop-blur-sm rounded-t-[3rem] transition-colors">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Leaf className="text-brand-600" size={20} />
          <span className="font-display font-bold text-slate-900 dark:text-white transition-colors">FloraScan AI</span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
          AI-powered botanical insights for gardeners, students, and plant enthusiasts. Always cross-reference with local experts.
        </p>
        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Build v1.0.0 • 2024 Environment
        </div>
      </footer>
    </div>
  );
}
