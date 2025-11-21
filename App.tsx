import React, { useState, useEffect } from 'react';
import { Gift, Users, Calendar, Copy, Check, Sparkles, Share2, Plus, Trash2, RefreshCw, Clock, ThumbsUp, ThumbsDown, UserPlus, BarChart3, Lock, Unlock } from 'lucide-react';
import Snowfall from './components/Snowfall';
import { Button, Input, Label, Card, Badge } from './components/UI';
import { Participant, AppState, UserShareData, Poll, PollOption } from './types';
import { generateId, performDraw, encodeShareData, decodeShareData } from './services/utils';
import { generateGiftIdeas, generateGroupInvite } from './services/geminiService';

// --- HELPER COMPONENTS ---

const CountDown = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const distance = target - now;

      if (distance < 0) {
        setTimeLeft("To już dziś!");
        clearInterval(interval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      setTimeLeft(`${days} dni, ${hours} godz.`);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) return null;

  return (
    <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1 rounded-full text-sm text-amber-400 border border-amber-500/30">
       <Clock size={14} /> <span>{timeLeft}</span>
    </div>
  );
};

// --- VIEW COMPONENTS ---

const PollsSection = ({ 
  polls, 
  addPoll, 
  removePoll,
  votePoll 
}: { 
  polls: Poll[], 
  addPoll: (q: string, opts: string[]) => void,
  removePoll: (id: string) => void,
  votePoll: (pollId: string, optionId: string) => void
}) => {
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState("");

  const handleAdd = () => {
    if (!newQuestion || !newOptions) return;
    const opts = newOptions.split(',').map(s => s.trim()).filter(s => s);
    addPoll(newQuestion, opts);
    setNewQuestion("");
    setNewOptions("");
  };

  return (
    <div className="space-y-6">
       <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold mb-4 text-amber-400 flex items-center gap-2">
             <BarChart3 size={20} /> Stwórz Ankietę
          </h3>
          <div className="space-y-3">
             <div>
                <Label>Pytanie</Label>
                <Input 
                   placeholder="Np. Jaki ustalamy budżet?" 
                   value={newQuestion}
                   onChange={(e) => setNewQuestion(e.target.value)}
                />
             </div>
             <div>
                <Label>Opcje (oddzielone przecinkami)</Label>
                <Input 
                   placeholder="50 zł, 100 zł, 200 zł" 
                   value={newOptions}
                   onChange={(e) => setNewOptions(e.target.value)}
                />
             </div>
             <Button variant="secondary" onClick={handleAdd} disabled={!newQuestion} fullWidth>
                Dodaj Ankietę
             </Button>
          </div>
       </div>

       <div className="space-y-4">
          {polls.map(poll => (
             <Card key={poll.id} className="relative">
                <button 
                  onClick={() => removePoll(poll.id)}
                  className="absolute top-2 right-2 text-slate-500 hover:text-red-400"
                >
                   <Trash2 size={16} />
                </button>
                <h4 className="font-bold text-lg mb-4">{poll.question}</h4>
                <div className="space-y-2">
                   {poll.options.map(opt => (
                      <div key={opt.id} className="flex items-center gap-2 group">
                         <div className="flex-grow relative h-10 bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700/50">
                            <div 
                              className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-900/50 to-emerald-600/30 transition-all duration-500"
                              style={{ width: `${(opt.votes / (Math.max(...poll.options.map(o => o.votes), 1) * 1.2)) * 100}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-3">
                               <span className="text-sm font-medium z-10">{opt.text}</span>
                               <span className="text-xs bg-slate-900 px-2 py-1 rounded-full z-10">{opt.votes} gł.</span>
                            </div>
                         </div>
                         <button 
                           onClick={() => votePoll(poll.id, opt.id)}
                           className="p-2 bg-slate-800 hover:bg-emerald-600/20 rounded-lg text-emerald-400 transition-colors"
                           title="Dodaj głos (manualnie)"
                         >
                            <Plus size={16} />
                         </button>
                      </div>
                   ))}
                </div>
             </Card>
          ))}
       </div>
    </div>
  );
};

// 1. Setup View (Admin)
const SetupView = ({ 
  state, 
  updateSettings, 
  addParticipant, 
  removeParticipant, 
  updateParticipant, 
  updateStatus,
  addPoll,
  removePoll,
  votePoll,
  onStartDraw 
}: {
  state: AppState;
  updateSettings: (key: string, value: string) => void;
  addParticipant: (name?: string, wishlist?: string) => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (id: string, field: string, value: string) => void;
  updateStatus: (id: string, status: 'approved' | 'pending') => void;
  addPoll: (q: string, opts: string[]) => void;
  removePoll: (id: string) => void;
  votePoll: (pid: string, oid: string) => void;
  onStartDraw: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'people' | 'polls'>('people');
  const [inviteText, setInviteText] = useState("");
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const approvedParticipants = state.participants.filter(p => p.status === 'approved');
  const pendingParticipants = state.participants.filter(p => p.status === 'pending');

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    const text = await generateGroupInvite(
        state.settings.groupName, 
        state.settings.exchangeDate, 
        state.settings.budget, 
        state.settings.currency
    );
    setInviteText(text);
    setGeneratingInvite(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-red-600 to-red-900 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.4)] border border-red-400/30">
                <Gift className="w-10 h-10 text-white" />
            </div>
            <div>
                <h1 className="text-4xl md:text-5xl text-amber-400 festive-font drop-shadow-lg">Mikołajki</h1>
                <p className="text-slate-300 text-sm">Panel Administratora</p>
            </div>
        </div>
        {state.settings.exchangeDate && <CountDown targetDate={state.settings.exchangeDate} />}
      </header>

      <div className="flex gap-2 bg-slate-900/40 p-1 rounded-xl backdrop-blur-sm border border-white/10">
         <button 
            onClick={() => setActiveTab('people')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'people' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
         >
            Uczestnicy
            {pendingParticipants.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{pendingParticipants.length}</span>
            )}
         </button>
         <button 
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
         >
            Ustawienia
         </button>
         <button 
            onClick={() => setActiveTab('polls')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'polls' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
         >
            Ankiety
         </button>
      </div>

      {activeTab === 'settings' && (
        <Card>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="text-amber-400" /> Konfiguracja Wydarzenia
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label>Nazwa Grupy</Label>
                <Input 
                placeholder="np. Wigilia Firmowa 2024" 
                value={state.settings.groupName}
                onChange={(e) => updateSettings('groupName', e.target.value)}
                />
            </div>
            <div>
                <Label>Data Finału</Label>
                <Input 
                type="date" 
                value={state.settings.exchangeDate}
                onChange={(e) => updateSettings('exchangeDate', e.target.value)}
                />
            </div>
            <div>
                <Label>Budżet</Label>
                <Input 
                type="number" 
                placeholder="np. 50" 
                value={state.settings.budget}
                onChange={(e) => updateSettings('budget', e.target.value)}
                />
            </div>
            <div>
                <Label>Waluta</Label>
                <Input 
                placeholder="np. PLN" 
                value={state.settings.currency}
                onChange={(e) => updateSettings('currency', e.target.value)}
                />
            </div>
            <div className="md:col-span-2">
                <Label>Twoje Imię (Admin)</Label>
                <Input 
                placeholder="Organizator" 
                value={state.settings.adminName}
                onChange={(e) => updateSettings('adminName', e.target.value)}
                />
            </div>
            </div>
        </Card>
      )}

      {activeTab === 'people' && (
        <div className="space-y-6">
            {/* Pending Requests */}
            {pendingParticipants.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-amber-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                        <UserPlus size={16} /> Oczekujące Zgłoszenia
                    </h3>
                    {pendingParticipants.map(p => (
                        <div key={p.id} className="flex flex-col md:flex-row gap-3 items-center bg-amber-900/20 border border-amber-500/30 p-4 rounded-xl">
                            <div className="flex-grow text-center md:text-left">
                                <span className="font-bold block text-amber-100">{p.name || "Nieznany"}</span>
                                <span className="text-xs text-amber-400/70 italic">{p.wishlist || "Brak listy życzeń"}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => updateStatus(p.id, 'approved')} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs">
                                    <Check size={14} /> Akceptuj
                                </Button>
                                <Button onClick={() => removeParticipant(p.id)} className="px-3 py-2 bg-red-900/50 hover:bg-red-800 text-xs border border-red-500/30">
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Card>
                <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="text-amber-400" /> Uczestnicy ({approvedParticipants.length})
                </h2>
                <Button variant="glass" onClick={() => addParticipant()} className="text-sm py-2">
                    <Plus size={16} /> Dodaj Ręcznie
                </Button>
                </div>

                <div className="space-y-3">
                {approvedParticipants.length === 0 && (
                    <p className="text-center text-slate-500 py-8 italic">Nikogo tu jeszcze nie ma. Dodaj uczestników!</p>
                )}
                {approvedParticipants.map((p, idx) => (
                    <div key={p.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-slate-800/40 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                    <div className="bg-slate-700/50 w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-400 shrink-0 border border-slate-600">
                        {idx + 1}
                    </div>
                    <div className="flex-grow w-full md:w-auto space-y-2 md:space-y-0 md:flex md:gap-2">
                        <Input 
                            placeholder="Imię i Nazwisko" 
                            value={p.name}
                            onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                            className="bg-transparent border-transparent focus:bg-slate-900/50 focus:border-amber-400/50"
                        />
                        <Input 
                            placeholder="List życzeń (dla AI)" 
                            value={p.wishlist || ''}
                            onChange={(e) => updateParticipant(p.id, 'wishlist', e.target.value)}
                            className="bg-transparent border-transparent text-slate-400 focus:text-white focus:bg-slate-900/50 focus:border-amber-400/50 text-sm"
                        />
                    </div>
                    <button 
                        onClick={() => removeParticipant(p.id)}
                        className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Usuń"
                    >
                        <Trash2 size={18} />
                    </button>
                    </div>
                ))}
                </div>
            </Card>
        </div>
      )}

      {activeTab === 'polls' && (
          <PollsSection 
            polls={state.polls} 
            addPoll={addPoll} 
            removePoll={removePoll}
            votePoll={votePoll}
          />
      )}
      
      <div className="sticky bottom-4 z-20">
          <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
             <div className="text-sm text-slate-300 hidden md:block">
                Gotowy? Wylosuj pary, gdy wszyscy uczestnicy będą na liście.
             </div>
             <Button 
                variant="gold" 
                fullWidth 
                onClick={onStartDraw}
                disabled={approvedParticipants.length < 2 || !state.settings.groupName}
                className="md:w-auto px-12 py-4 text-lg shadow-[0_0_20px_rgba(251,191,36,0.3)]"
            >
                <Sparkles className="animate-pulse" /> Rozpocznij Losowanie!
            </Button>
          </div>
      </div>

       {/* Helper Functions Area */}
       {activeTab === 'settings' && state.settings.groupName && (
             <div className="text-center mt-8 border-t border-white/10 pt-8">
                <button 
                    onClick={handleGenerateInvite} 
                    className="text-amber-400 hover:text-amber-300 text-sm underline decoration-dashed underline-offset-4 flex items-center gap-2 mx-auto"
                    disabled={generatingInvite}
                >
                    <Sparkles size={14} />
                    {generatingInvite ? "AI pisze wiersz..." : "Niech AI napisze zaproszenie dla grupy"}
                </button>
                {inviteText && (
                    <div className="mt-4 p-6 bg-slate-800/80 rounded-2xl border border-amber-500/30 text-left whitespace-pre-line italic text-slate-300 relative shadow-inner max-w-2xl mx-auto">
                        "{inviteText}"
                        <button 
                            onClick={() => navigator.clipboard.writeText(inviteText)}
                            className="absolute top-2 right-2 p-2 bg-slate-700/50 rounded hover:bg-slate-600 text-white"
                            title="Skopiuj"
                        >
                            <Copy size={14} />
                        </button>
                    </div>
                )}
             </div>
          )}
    </div>
  );
};

// 2. Admin Dashboard (After Draw)
const AdminDashboard = ({ state, onReset }: { state: AppState; onReset: () => void }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const generateLink = (participant: Participant) => {
    const shareData: UserShareData = {
      recipientName: participant.assignedToName || "Unknown",
      recipientWishlist: state.participants.find(p => p.id === participant.assignedToId)?.wishlist,
      groupName: state.settings.groupName,
      budget: state.settings.budget,
      currency: state.settings.currency,
      exchangeDate: state.settings.exchangeDate,
      adminName: state.settings.adminName
    };
    
    const hash = encodeShareData(shareData);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    return url;
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="text-center space-y-4">
        <div className="inline-block p-4 rounded-full bg-emerald-900/30 border border-emerald-500/30 mb-4">
            <Check className="w-12 h-12 text-emerald-400" />
        </div>
        <h1 className="text-4xl text-amber-400 festive-font">Losowanie Zakończone!</h1>
        <p className="text-xl text-slate-200">
          Sekretny Mikołaj został przydzielony. <br/>
          <span className="text-red-300 text-sm font-bold">Wyślij każdemu jego prywatny link.</span>
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3">
        {state.participants.filter(p => p.status === 'approved').map((p) => (
            <div key={p.id} className="glass p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-bold text-slate-200 border border-slate-600 shadow-inner">
                        {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white">{p.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                           <Lock size={10} /> 
                           <span>Prezent dla: <span className="blur-sm select-none">Ukryte</span></span>
                        </div>
                    </div>
                </div>
                <Button 
                    variant={copiedId === p.id ? "secondary" : "primary"} 
                    onClick={() => copyToClipboard(generateLink(p), p.id)}
                    className="shrink-0 text-sm py-2"
                >
                    {copiedId === p.id ? <Check size={16} /> : <Share2 size={16} />}
                    {copiedId === p.id ? "Skopiowano" : "Kopiuj Link"}
                </Button>
            </div>
        ))}
      </div>

      <div className="text-center pt-12">
         <button 
            onClick={onReset}
            className="text-slate-500 hover:text-red-400 flex items-center gap-2 mx-auto transition-colors text-sm border border-transparent hover:border-red-900/30 px-4 py-2 rounded-lg"
         >
            <RefreshCw size={14} /> Zresetuj losowanie
         </button>
      </div>
    </div>
  );
};

// 3. User Reveal View (From Link)
const UserReveal = ({ data }: { data: UserShareData }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [giftIdeas, setGiftIdeas] = useState<string>("");
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [aiInput, setAiInput] = useState("");

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const fetchGiftIdeas = async () => {
    setLoadingIdeas(true);
    const promptInterests = aiInput || data.recipientWishlist || "";
    const ideas = await generateGiftIdeas(
      data.recipientName, 
      data.budget, 
      data.currency, 
      promptInterests
    );
    setGiftIdeas(ideas);
    setLoadingIdeas(false);
  };

  if (!isRevealed) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center space-y-10 relative">
        {/* Decorative background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/20 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="animate-bounce relative z-10">
            <Gift className="w-40 h-40 text-red-500 drop-shadow-[0_0_35px_rgba(239,68,68,0.6)]" />
        </div>
        
        <div className="relative z-10">
            <h1 className="text-6xl festive-font text-amber-400 mb-6 drop-shadow-sm">Ho Ho Ho!</h1>
            <p className="text-xl text-slate-200 max-w-md mx-auto leading-relaxed">
                Witaj w grupie <strong>{data.groupName}</strong>.
                <br/>Twój prezent czeka na odkrycie!
            </p>
        </div>

        <Button onClick={handleReveal} variant="gold" className="text-xl px-16 py-6 rounded-full shadow-[0_0_50px_rgba(251,191,36,0.4)] hover:shadow-[0_0_70px_rgba(251,191,36,0.6)] transition-shadow relative z-10 border-4 border-amber-300">
            <span className="mr-2">🎄</span> Sprawdź kogo masz <span className="ml-2">🎄</span>
        </Button>
        
        <div className="mt-12 glass px-6 py-4 rounded-xl text-sm text-slate-400 grid grid-cols-2 gap-x-8 gap-y-2">
            <span className="text-right font-bold text-slate-300">Admin:</span> <span>{data.adminName}</span>
            <span className="text-right font-bold text-slate-300">Budżet:</span> <span>{data.budget} {data.currency}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8 animate-fade-in">
      <div className="text-center mb-8">
          <h2 className="text-sm text-amber-400 uppercase tracking-widest mb-2 font-bold">Twój cel to...</h2>
          <div className="glass-card p-10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-2 festive-font drop-shadow-lg relative z-10">{data.recipientName}</h1>
          </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center bg-slate-900/50" noPadding>
            <div className="p-6">
                <span className="block text-3xl font-bold text-white mb-1">{data.budget} <span className="text-sm font-normal text-slate-400">{data.currency}</span></span>
                <span className="text-xs uppercase text-amber-500 font-bold tracking-wider">Budżet</span>
            </div>
        </Card>
        <Card className="text-center bg-slate-900/50" noPadding>
            <div className="p-6">
                <span className="block text-3xl font-bold text-white mb-1">{new Date(data.exchangeDate).getDate() || "--"} <span className="text-sm font-normal text-slate-400">{new Date(data.exchangeDate).toLocaleString('default', { month: 'short' }) || ""}</span></span>
                <span className="text-xs uppercase text-amber-500 font-bold tracking-wider">Data</span>
            </div>
        </Card>
      </div>

      {data.recipientWishlist && (
        <Card className="border-emerald-500/30 bg-emerald-900/10">
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-400 uppercase tracking-wide text-sm">
                <Sparkles size={16} />
                List do Mikołaja
             </h3>
             <p className="text-xl italic text-slate-200 font-serif">"{data.recipientWishlist}"</p>
        </Card>
      )}

      <Card className="relative overflow-hidden border-amber-500/20">
        <div className="relative z-10">
            <h3 className="text-lg font-bold mb-4 text-amber-400 flex items-center gap-2 uppercase tracking-wide text-sm">
                <Sparkles size={16} /> Pomocnik Mikołaja (AI)
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
                <Input 
                    placeholder={data.recipientWishlist ? "Co jeszcze wiesz o tej osobie?" : "Wpisz zainteresowania..."}
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    className="bg-slate-950/50"
                />
                <Button onClick={fetchGiftIdeas} disabled={loadingIdeas} className="whitespace-nowrap" variant="secondary">
                    {loadingIdeas ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    {loadingIdeas ? "Myślę..." : "Generuj Pomysły"}
                </Button>
            </div>

            {giftIdeas && (
                <div className="bg-slate-950/80 p-6 rounded-xl border border-slate-700 animate-fade-in shadow-inner">
                    <div className="prose prose-invert prose-sm max-w-none whitespace-pre-line text-slate-300 leading-relaxed">
                        {giftIdeas}
                    </div>
                </div>
            )}
        </div>
      </Card>
    </div>
  );
};

// 4. Public Landing / Registration Generator
const PublicLanding = ({ onJoinRequest }: { onJoinRequest: () => void }) => {
    const [name, setName] = useState("");
    const [wishlist, setWishlist] = useState("");
    const [generatedCode, setGeneratedCode] = useState("");

    const handleGenerate = () => {
        if(!name) return;
        const req = { n: name, w: wishlist };
        // Simple base64 encoding of the request
        const code = btoa(unescape(encodeURIComponent(JSON.stringify(req))));
        setGeneratedCode(code);
    };

    return (
        <div className="max-w-2xl mx-auto py-12 space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-6xl festive-font text-amber-400">Mikołajki</h1>
                <p className="text-xl text-slate-300">Dołącz do zabawy lub zorganizuj własną!</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="hover:border-amber-500/50 transition-colors cursor-pointer h-full flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 text-amber-400">
                            <Gift size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Organizator</h3>
                        <p className="text-slate-400 text-sm">Chcę stworzyć nową grupę, dodać ludzi i zarządzać losowaniem.</p>
                    </div>
                    <Button onClick={onJoinRequest} variant="primary" className="mt-6">
                        Stwórz Grupę
                    </Button>
                </Card>

                <Card className="h-full flex flex-col justify-between">
                    <div>
                         <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-400">
                            <UserPlus size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Uczestnik</h3>
                        <p className="text-slate-400 text-sm mb-4">Organizator prosił o zgłoszenie? Wygeneruj kod zgłoszenia i wyślij mu go.</p>
                        
                        {!generatedCode ? (
                            <div className="space-y-3">
                                <Input placeholder="Twoje Imię" value={name} onChange={e => setName(e.target.value)} />
                                <Input placeholder="Co byś chciał? (opcjonalnie)" value={wishlist} onChange={e => setWishlist(e.target.value)} />
                                <Button onClick={handleGenerate} variant="secondary" fullWidth disabled={!name}>
                                    Generuj Zgłoszenie
                                </Button>
                            </div>
                        ) : (
                            <div className="bg-slate-950 p-4 rounded-lg border border-emerald-500/30">
                                <p className="text-xs text-emerald-400 mb-2 uppercase font-bold">Wyślij to Organizatorowi:</p>
                                <div className="break-all font-mono text-xs text-slate-400 bg-black/30 p-2 rounded mb-2 select-all">
                                    CANDIDATE::{generatedCode}
                                </div>
                                <Button onClick={() => {
                                    navigator.clipboard.writeText(`Cześć, tu moje zgłoszenie do Mikołajek: CANDIDATE::${generatedCode}`);
                                    alert("Skopiowano do schowka! Wyślij to teraz organizatorowi.");
                                }} variant="glass" fullWidth className="text-xs">
                                    <Copy size={14} /> Kopiuj wiadomość
                                </Button>
                                <button onClick={() => setGeneratedCode("")} className="text-xs text-slate-500 mt-2 underline">Wróć</button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  // State for Admin Flow
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('mikolajkiState_v2');
    return saved ? JSON.parse(saved) : {
      participants: [
        { id: generateId(), name: '', wishlist: '', status: 'approved' }, 
        { id: generateId(), name: '', wishlist: '', status: 'approved' }
      ],
      polls: [],
      settings: {
        groupName: '',
        budget: '50',
        exchangeDate: '',
        currency: 'PLN',
        adminName: ''
      },
      isDrawComplete: false
    };
  });

  // State for User Link Flow or Public Landing
  const [shareData, setShareData] = useState<UserShareData | null>(null);
  const [viewMode, setViewMode] = useState<'landing' | 'admin'>('landing');

  useEffect(() => {
    // Check for hash in URL to determine if we are in "User View" mode
    const hash = window.location.hash.substring(1);
    if (hash) {
      const decoded = decodeShareData(hash);
      if (decoded) {
        setShareData(decoded);
        return;
      }
    }
    
    // If no hash, check if we have previous admin state to decide landing vs admin
    const saved = localStorage.getItem('mikolajkiState_v2');
    if (saved) {
        setViewMode('admin');
    }
  }, []);

  // Persist admin state
  useEffect(() => {
    if (!shareData && viewMode === 'admin') {
        localStorage.setItem('mikolajkiState_v2', JSON.stringify(appState));
    }
  }, [appState, shareData, viewMode]);

  const updateSettings = (key: string, value: string) => {
    setAppState(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  };

  // Parse potential candidate code from chat paste
  const handlePotentialPaste = (text: string) => {
      if (text.includes("CANDIDATE::")) {
          try {
              const code = text.split("CANDIDATE::")[1].trim();
              const json = JSON.parse(decodeURIComponent(escape(atob(code))));
              if (json.n) {
                  addParticipant(json.n, json.w);
                  return true;
              }
          } catch(e) { console.error(e); }
      }
      return false;
  };

  const addParticipant = (name: string = '', wishlist: string = '') => {
    // If adding via code/manual with name, default to pending if it's a "Request", but for simplicity in this UI we add as Pending if name provided
    const status = name ? 'pending' : 'approved';
    setAppState(prev => ({
      ...prev,
      participants: [...prev.participants, { id: generateId(), name, wishlist, status }]
    }));
  };

  const removeParticipant = (id: string) => {
    setAppState(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.id !== id)
    }));
  };

  const updateParticipant = (id: string, field: string, value: string) => {
    // Check if user pasted a candidate code into the name field
    if (field === 'name' && handlePotentialPaste(value)) {
        // If paste handled, clear this input (it was hijacking)
        return;
    }
    
    setAppState(prev => ({
      ...prev,
      participants: prev.participants.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const updateStatus = (id: string, status: 'approved' | 'pending') => {
      setAppState(prev => ({
          ...prev,
          participants: prev.participants.map(p => p.id === id ? { ...p, status } : p)
      }));
  };

  // Polls Logic
  const addPoll = (question: string, optionTexts: string[]) => {
      const newPoll: Poll = {
          id: generateId(),
          question,
          options: optionTexts.map(text => ({ id: generateId(), text, votes: 0 }))
      };
      setAppState(prev => ({ ...prev, polls: [...prev.polls, newPoll] }));
  };

  const removePoll = (id: string) => {
      setAppState(prev => ({ ...prev, polls: prev.polls.filter(p => p.id !== id) }));
  };

  const votePoll = (pollId: string, optionId: string) => {
      setAppState(prev => ({
          ...prev,
          polls: prev.polls.map(poll => {
              if (poll.id !== pollId) return poll;
              return {
                  ...poll,
                  options: poll.options.map(opt => {
                      if (opt.id !== optionId) return opt;
                      return { ...opt, votes: opt.votes + 1 };
                  })
              };
          })
      }));
  };

  const handleDraw = () => {
    // Filter out empty names and only take APPROVED participants
    const validParticipants = appState.participants.filter(p => p.name.trim() !== '' && p.status === 'approved');
    if (validParticipants.length < 2) {
        alert("Potrzeba przynajmniej 2 zatwierdzonych osób do losowania!");
        return;
    }

    const assigned = performDraw(validParticipants);
    
    // Merge back: Replace the valid ones with assigned ones, keep the invalid/pending untouched (though logically draw shouldn't happen if pending exist usually)
    // Simpler: Replace whole participant list with new state, assuming we only care about the draw now.
    // But to keep pending people visible (maybe for next round), we map over original list.
    
    const newParticipants = appState.participants.map(p => {
        const assignedMatch = assigned.find(a => a.id === p.id);
        return assignedMatch || p;
    });

    setAppState(prev => ({
      ...prev,
      participants: newParticipants,
      isDrawComplete: true
    }));
  };

  const handleReset = () => {
    if (confirm("Czy na pewno chcesz zresetować całe losowanie?")) {
        setAppState({
            participants: [
                { id: generateId(), name: '', wishlist: '', status: 'approved' }, 
                { id: generateId(), name: '', wishlist: '', status: 'approved' }
            ],
            polls: [],
            settings: { ...appState.settings }, 
            isDrawComplete: false
        });
        window.location.hash = '';
    }
  };

  return (
    <div className="min-h-screen relative">
      <Snowfall />
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        {shareData ? (
          // User View (Decoded from Link)
          <UserReveal data={shareData} />
        ) : (
          // Admin / Landing Flow
          <>
            {viewMode === 'landing' ? (
                <PublicLanding onJoinRequest={() => setViewMode('admin')} />
            ) : (
                !appState.isDrawComplete ? (
                <SetupView 
                    state={appState} 
                    updateSettings={updateSettings}
                    addParticipant={addParticipant}
                    removeParticipant={removeParticipant}
                    updateParticipant={updateParticipant}
                    updateStatus={updateStatus}
                    addPoll={addPoll}
                    removePoll={removePoll}
                    votePoll={votePoll}
                    onStartDraw={handleDraw}
                />
                ) : (
                <AdminDashboard state={appState} onReset={handleReset} />
                )
            )}
          </>
        )}
      </main>

      {/* Footer for both views */}
      <footer className="fixed bottom-0 w-full py-4 text-center text-slate-400 text-xs pointer-events-none z-0 bg-gradient-to-t from-slate-900/90 to-transparent backdrop-blur-[2px]">
        <p className="font-light opacity-70">Mikołajki {new Date().getFullYear()} • Magia Świąt z AI</p>
      </footer>
    </div>
  );
}