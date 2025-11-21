
import React, { useState, useEffect, useRef } from 'react';
import { Gift, Users, Calendar, Check, Sparkles, Plus, Trash2, RefreshCw, Clock, UserPlus, BarChart3, Lock, KeyRound, X, LogIn, User, Eye, EyeOff, ThumbsUp, AlertCircle, Edit2, Briefcase, ToggleLeft, ToggleRight, Shield, Hourglass } from 'lucide-react';
import { Button, Input, Label, Card, Badge } from './components/UI';
import { Participant, AppState, Poll, Group } from './types';
import { generateId, performDraw, getDaysUntil } from './services/utils';
import { generateGiftIdeas } from './services/geminiService';

// --- HELPER COMPONENTS ---

const CountDown = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) {
        setTimeLeft("Data nieustalona");
        return;
    }
    const updateTimer = () => {
        const now = new Date().getTime();
        const target = new Date(targetDate).getTime();
        const distance = target - now;

        if (distance < 0) {
          setTimeLeft("To już dziś!");
          return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        setTimeLeft(`${days} dni, ${hours} godz.`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000 * 60); // Update every minute is enough for UI

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2 rounded-full text-sm text-amber-400 border border-amber-500/30 shadow-lg font-bold tracking-wide">
       <Clock size={16} /> <span>{timeLeft}</span>
    </div>
  );
};

// --- SUB-VIEWS ---

// 1. Admin Setup/Dashboard Logic
const AdminPanel = ({ 
  state, 
  updateGroup,
  createGroup,
  toggleGroupActive,
  deleteGroup,
  removeParticipant,
  updateParticipantGroups,
  addPoll,
  removePoll,
  forceDraw,
  onReset,
  onLogout
}: {
  state: AppState;
  updateGroup: (id: string, key: keyof Group, value: any) => void;
  createGroup: (name: string) => void;
  toggleGroupActive: (id: string) => void;
  deleteGroup: (id: string) => void;
  removeParticipant: (id: string) => void;
  updateParticipantGroups: (userId: string, groupId: string, isAdding: boolean) => void;
  addPoll: (groupId: string, q: string, opts: string[]) => void;
  removePoll: (id: string) => void;
  forceDraw: (groupId: string) => void;
  onReset: () => void;
  onLogout: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'people' | 'polls'>('groups');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(state.groups[0]?.id || "");
  const [newGroupName, setNewGroupName] = useState("");

  // Ensure selectedGroup is valid and exists
  useEffect(() => {
      const groupExists = state.groups.find(g => g.id === selectedGroupId);
      
      // If no group selected OR the selected group no longer exists, default to the first one available
      if ((!selectedGroupId || !groupExists) && state.groups.length > 0) {
          setSelectedGroupId(state.groups[0].id);
      } else if (state.groups.length === 0) {
          setSelectedGroupId("");
      }
  }, [state.groups, selectedGroupId]);

  // Helper to get ready count safely
  const getGroupStats = (gid: string) => {
      const parts = state.participants.filter(p => p.groupIds.includes(gid));
      const ready = parts.filter(p => p.readyGroups.includes(gid)).length;
      return { total: parts.length, ready };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.4)] border border-indigo-400/30">
                <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl md:text-4xl text-amber-400 festive-font drop-shadow-lg">Panel Administratora</h1>
                <p className="text-slate-300 text-sm">Zarządzanie wydarzeniami i użytkownikami</p>
            </div>
        </div>
        <Button onClick={onLogout} variant="glass" className="text-xs">Wyloguj</Button>
      </header>

      <div className="flex gap-2 bg-slate-900/40 p-1 rounded-xl backdrop-blur-sm border border-white/10">
         <button onClick={() => setActiveTab('groups')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'groups' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            Grupy / Wydarzenia
         </button>
         <button onClick={() => setActiveTab('people')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'people' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            Uczestnicy
         </button>
         <button onClick={() => setActiveTab('polls')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'polls' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            Ankiety
         </button>
      </div>

      {activeTab === 'groups' && (
        <div className="space-y-6">
             {/* Create Group */}
            <Card>
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Plus className="text-amber-400"/> Nowa Grupa</h3>
                <div className="flex gap-2">
                    <Input placeholder="Nazwa wydarzenia (np. Wigilia w Pracy)" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                    <Button onClick={() => { createGroup(newGroupName); setNewGroupName(""); }} disabled={!newGroupName}>Stwórz</Button>
                </div>
            </Card>

            {/* List Groups */}
            <div className="grid grid-cols-1 gap-6">
                {state.groups.map(group => {
                    // Calculate per-group stats
                    const stats = getGroupStats(group.id);
                    const daysUntil = getDaysUntil(group.exchangeDate);
                    // Force draw logic: Everyone ready AND less than 3 weeks (21 days)
                    const canForceDraw = !group.isDrawComplete && stats.total > 1 && stats.ready === stats.total && daysUntil !== null && daysUntil <= 21;

                    return (
                    <Card key={group.id} className={`relative ${!group.isActive ? 'opacity-75 grayscale' : ''}`}>
                        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                            <button onClick={() => toggleGroupActive(group.id)} className="text-xs bg-slate-800 p-2 rounded hover:text-white transition-colors" title={group.isActive ? "Dezaktywuj" : "Aktywuj"}>
                                {group.isActive ? <ToggleRight className="text-emerald-400" size={24}/> : <ToggleLeft className="text-slate-500" size={24}/>}
                            </button>
                            <button 
                                type="button"
                                onClick={(e) => { 
                                    e.preventDefault();
                                    e.stopPropagation(); 
                                    deleteGroup(group.id); 
                                }} 
                                className="text-slate-500 hover:text-red-500 p-2 bg-slate-900/50 rounded-lg cursor-pointer"
                                title="Usuń grupę"
                            >
                                <Trash2 size={20}/>
                            </button>
                        </div>
                        
                        <div className="mb-6">
                            <Label>Nazwa Wydarzenia</Label>
                            <Input 
                                value={group.name} 
                                onChange={(e) => updateGroup(group.id, 'name', e.target.value)} 
                                className="text-xl font-bold text-amber-400 border-slate-600/50"
                            />
                             {!group.isActive && <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400 mt-2 inline-block">Nieaktywna</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label>Data Finału</Label>
                                <Input type="date" value={group.exchangeDate} onChange={(e) => updateGroup(group.id, 'exchangeDate', e.target.value)} />
                            </div>
                            <div>
                                <Label>Budżet</Label>
                                <Input type="number" value={group.budget} onChange={(e) => updateGroup(group.id, 'budget', e.target.value)} />
                            </div>
                            <div>
                                <Label>Waluta</Label>
                                <Input value={group.currency} onChange={(e) => updateGroup(group.id, 'currency', e.target.value)} />
                            </div>
                        </div>
                        
                        <div className="mt-6 flex items-center justify-between bg-slate-900/30 p-4 rounded-lg">
                            <div className="text-sm text-slate-400">
                                {group.isDrawComplete 
                                    ? <span className="text-emerald-400 font-bold flex items-center gap-1"><Check size={14}/> Losowanie Zakończone</span>
                                    : <span>Oczekiwanie na uczestników... (Gotowi: {stats.ready}/{stats.total})</span>
                                }
                            </div>
                            {!group.isDrawComplete && (
                                <Button 
                                    onClick={() => forceDraw(group.id)} 
                                    disabled={!canForceDraw} 
                                    variant="danger" 
                                    className={`text-xs px-3 py-2 ${!canForceDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={!canForceDraw ? "Wymaga pełnej gotowości i < 3 tygodni do finału" : "Wymuś losowanie"}
                                >
                                    <RefreshCw size={14} className="mr-1"/> Wymuś Losowanie
                                </Button>
                            )}
                        </div>
                    </Card>
                )})}
            </div>

             <div className="pt-6 border-t border-white/10 text-center">
                <Button onClick={onReset} className="bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900 text-xs">
                    <RefreshCw size={16} /> Resetuj Całą Aplikację
                </Button>
            </div>
        </div>
      )}

      {activeTab === 'people' && (
        <div className="space-y-6">
            <div className="flex items-center justify-end mb-4">
                <span className="text-sm text-slate-400 mr-2">Wyświetl uczestników grupy:</span>
                <select 
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                    {state.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </div>

            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Users className="text-amber-400" /> Uczestnicy ({state.participants.filter(p => p.groupIds.includes(selectedGroupId)).length})</h2>
                </div>
                
                <div className="space-y-3">
                {state.participants.filter(p => p.groupIds.includes(selectedGroupId)).map((p, idx) => {
                    const isReady = p.readyGroups.includes(selectedGroupId);
                    return (
                    <div key={p.id} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-800/40 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors gap-4">
                        <div className="flex items-center gap-3 w-full md:w-1/3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isReady ? 'bg-emerald-900 text-emerald-400 border border-emerald-500/50' : 'bg-slate-700 text-slate-300'}`}>
                                {isReady ? <Check size={16}/> : (idx + 1)}
                            </div>
                            <div>
                                <span className="font-bold text-white block">{p.name}</span>
                                <div className="flex items-center gap-4 mt-1">
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <Lock size={10} />
                                        <span className="font-mono tracking-widest">******</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-amber-500/80">
                                        <Gift size={10} />
                                        <span>Życzeń: {p.wishlistItems?.length || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {isReady ? (
                                <Badge color="green">Gotowy do losowania</Badge>
                            ) : (
                                <Badge color="red">Niegotowy</Badge>
                            )}
                        </div>

                        {/* Group Assignment Toggles */}
                        <div className="flex flex-wrap gap-2 w-full md:w-1/2 justify-end">
                             <button onClick={() => removeParticipant(p.id)} className="p-2 text-slate-500 hover:text-red-400 bg-slate-900/50 rounded-lg border border-slate-700" title="Usuń"><Trash2 size={16} /></button>
                        </div>
                    </div>
                )})}
                {state.participants.filter(p => p.groupIds.includes(selectedGroupId)).length === 0 && (<p className="text-center text-slate-500 py-8 italic">Brak uczestników w tej grupie.</p>)}
                </div>
            </Card>
        </div>
      )}

      {activeTab === 'polls' && (
          <div className="space-y-6">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Zarządzaj Ankietami</h3>
                <select 
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                    <option value="">-- Wybierz Grupę --</option>
                    {state.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </div>

            {selectedGroupId && (
                <PollsSection 
                    polls={state.polls.filter(p => p.groupId === selectedGroupId)} 
                    groupId={selectedGroupId}
                    addPoll={addPoll} 
                    removePoll={removePoll} 
                    votePoll={() => {}} // Admin cannot vote
                    isAdmin={true}
                    currentUserId=""
                />
            )}
          </div>
      )}
    </div>
  );
};

// 2. Polls Section (Shared)
const PollsSection = ({ 
    polls, 
    groupId,
    addPoll, 
    removePoll,
    votePoll,
    isAdmin = false,
    currentUserId
  }: { 
    polls: Poll[], 
    groupId?: string,
    addPoll?: (gid: string, q: string, opts: string[]) => void,
    removePoll?: (id: string) => void,
    votePoll: (pollId: string, optionId: string) => void,
    isAdmin?: boolean,
    currentUserId: string
  }) => {
    const [newQuestion, setNewQuestion] = useState("");
    const [newOptions, setNewOptions] = useState("");
  
    const handleAdd = () => {
      if (!addPoll || !newQuestion || !newOptions || !groupId) return;
      const opts = newOptions.split(',').map(s => s.trim()).filter(s => s);
      addPoll(groupId, newQuestion, opts);
      setNewQuestion("");
      setNewOptions("");
    };
  
    return (
      <div className="space-y-6">
         {isAdmin && addPoll && (
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700">
                <h3 className="text-sm font-bold mb-4 text-amber-400 flex items-center gap-2">
                <BarChart3 size={16} /> Stwórz Ankietę dla tej grupy
                </h3>
                <div className="space-y-3">
                <div>
                    <Label>Pytanie</Label>
                    <Input placeholder="Np. Jaki ustalamy budżet?" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
                </div>
                <div>
                    <Label>Opcje (oddzielone przecinkami)</Label>
                    <Input placeholder="50 zł, 100 zł, 200 zł" value={newOptions} onChange={(e) => setNewOptions(e.target.value)} />
                </div>
                <Button variant="secondary" onClick={handleAdd} disabled={!newQuestion} fullWidth>Dodaj Ankietę</Button>
                </div>
            </div>
         )}
  
         <div className="space-y-4">
            {!isAdmin && (
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <BarChart3 className="text-amber-400" /> Głosowanie
                </h3>
            )}
            {polls.length === 0 && <p className="text-slate-500 italic">Brak aktywnych ankiet.</p>}
            {polls.map(poll => {
                // Calculate counts based on userSelections
                const counts: Record<string, number> = {};
                poll.options.forEach(o => counts[o.id] = 0);
                Object.values(poll.userSelections).forEach(optId => {
                    if(counts[optId] !== undefined) counts[optId]++;
                });

                const totalVotes = Object.values(poll.userSelections).length;
                const maxVotes = Math.max(...Object.values(counts), 1);
                const myVote = poll.userSelections[currentUserId];

                return (
               <Card key={poll.id} className="relative">
                  {isAdmin && removePoll && (
                      <button onClick={() => removePoll(poll.id)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                  )}
                  <h4 className="font-bold text-lg mb-4 text-white">{poll.question}</h4>
                  <div className="space-y-2">
                     {poll.options.map(opt => {
                         const voteCount = counts[opt.id] || 0;
                         const isSelected = myVote === opt.id;
                         
                         return (
                        <div key={opt.id} className="flex items-center gap-2 group">
                           <div 
                                className={`flex-grow relative h-10 bg-slate-900/50 rounded-lg overflow-hidden border cursor-pointer transition-colors ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-slate-700/50'}`} 
                                onClick={() => !isAdmin && votePoll(poll.id, opt.id)}
                            >
                              <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-900/50 to-emerald-600/30 transition-all duration-500" style={{ width: `${(voteCount / (maxVotes * 1.2)) * 100}%` }} />
                              <div className="absolute inset-0 flex items-center justify-between px-3">
                                 <span className="text-sm font-medium z-10 text-slate-200 flex items-center gap-2">
                                     {opt.text}
                                     {isSelected && <Check size={14} className="text-emerald-400"/>}
                                 </span>
                                 <span className="text-xs bg-slate-900/80 px-2 py-1 rounded-full z-10 text-emerald-400">{voteCount} gł.</span>
                              </div>
                           </div>
                           {!isAdmin && (
                               <button 
                                    onClick={() => votePoll(poll.id, opt.id)} 
                                    className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-emerald-600/20 text-emerald-400'}`} 
                                    title="Głosuj"
                                >
                                   {isSelected ? <Check size={16}/> : <Plus size={16} />}
                                </button>
                           )}
                        </div>
                     )})}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-right">Łącznie głosów: {totalVotes}</p>
               </Card>
            )})}
         </div>
      </div>
    );
};

// 3. Registration View
const RegisterView = ({ onRegister, onCancel }: { onRegister: (name: string, pass: string, items: string[]) => void, onCancel: () => void }) => {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [currentItem, setCurrentItem] = useState("");
    const [items, setItems] = useState<string[]>([]);

    const handleAddItem = () => {
        if (!currentItem.trim()) return;
        setItems([...items, currentItem.trim()]);
        setCurrentItem("");
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        if(!name || !password) return;
        onRegister(name, password, items);
    };

    return (
        <div className="max-w-md mx-auto mt-10 animate-fade-in pb-20">
            <Card className="border-amber-500/30 bg-slate-900/60 backdrop-blur-md shadow-2xl">
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-white">Dołącz do KtoKogo</h3>
                    <p className="text-slate-400 text-sm">Zostaniesz dodany do domyślnej grupy.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label>Twoje Imię (Unikalne)</Label>
                        <Input placeholder="Np. Ania" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    
                    <div>
                        <Label>Hasło (Zapamiętaj je!)</Label>
                        <Input type="password" placeholder="******" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>

                    <div className="border-t border-white/10 pt-4">
                        <Label>Wstępna lista życzeń</Label>
                        <div className="flex gap-2 mb-3">
                            <Input 
                                placeholder="Dodaj życzenie..." 
                                value={currentItem} 
                                onChange={e => setCurrentItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                            />
                            <Button onClick={handleAddItem} variant="secondary" className="shrink-0"><Plus size={20}/></Button>
                        </div>

                        <div className="space-y-2 min-h-[100px] bg-slate-950/30 rounded-lg p-3 border border-slate-800 mb-4">
                            {items.length === 0 && <p className="text-slate-600 text-center italic text-sm py-4">Brak pozycji.</p>}
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded-md border border-slate-700">
                                    <span className="text-slate-200 text-sm">• {item}</span>
                                    <button onClick={() => handleRemoveItem(idx)} className="text-slate-500 hover:text-red-400"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button onClick={handleSubmit} variant="primary" fullWidth disabled={!name || !password} className="shadow-red-900/50">
                        Zarejestruj się
                    </Button>
                    <button onClick={onCancel} className="w-full text-center text-slate-500 text-sm hover:text-slate-300 py-2">Anuluj</button>
                </div>
            </Card>
        </div>
    );
};

// 4. User Dashboard (Logged In)
const UserDashboard = ({ 
    participant, 
    allParticipants, 
    allGroups, 
    polls, 
    updateWishlist, 
    onVoteReady, 
    onPollVote, 
    onReveal, 
    onLogout 
}: { 
    participant: Participant;
    allParticipants: Participant[];
    allGroups: Group[];
    polls: Poll[];
    updateWishlist: (items: string[]) => void;
    onVoteReady: (groupId: string) => void;
    onPollVote: (pollId: string, optionId: string) => void;
    onReveal: (groupId: string) => void;
    onLogout: () => void;
}) => {
    // State for Wishlist editing
    const [isEditingWishlist, setIsEditingWishlist] = useState(false);
    const [wishlistBuffer, setWishlistBuffer] = useState<string[]>(participant.wishlistItems || []);
    const [newItem, setNewItem] = useState("");
    const [giftIdeas, setGiftIdeas] = useState<string>("");
    const [loadingIdeas, setLoadingIdeas] = useState(false);

    // Group selection logic
    const myGroups = allGroups.filter(g => participant.groupIds.includes(g.id) && g.isActive);
    const [activeGroupId, setActiveGroupId] = useState<string>(myGroups[0]?.id || "");

    // Ensure valid active group
    useEffect(() => {
        if (!activeGroupId && myGroups.length > 0) {
            setActiveGroupId(myGroups[0].id);
        } else if (activeGroupId && !myGroups.find(g => g.id === activeGroupId)) {
            setActiveGroupId(myGroups[0]?.id || "");
        }
    }, [myGroups, activeGroupId]);

    // Derived data for current view
    const currentGroup = myGroups.find(g => g.id === activeGroupId);
    const isDrawComplete = currentGroup?.isDrawComplete || false;
    const isReady = participant.readyGroups.includes(activeGroupId);
    const isRevealed = participant.revealedGroups.includes(activeGroupId);
    
    // Get participants in this group
    const groupMembers = allParticipants.filter(p => p.groupIds.includes(activeGroupId));
    const assignedToId = participant.assignments[activeGroupId];
    const targetParticipant = assignedToId ? allParticipants.find(p => p.id === assignedToId) : null;
    const groupPolls = polls.filter(p => p.groupId === activeGroupId);
    const readyMembersCount = groupMembers.filter(p => p.readyGroups.includes(activeGroupId)).length;
    const daysUntil = currentGroup ? getDaysUntil(currentGroup.exchangeDate) : null;

    // Logic for "Time until draw possible" bar
    // Draw is possible at (EventDate - 14 days)
    // If daysUntilEvent is 20, then daysUntilUnlock is 6.
    // Visual range: We need a scale. Let's say the bar represents a 30-day window leading up to the unlock.
    // If daysUntilUnlock > 30, bar is 0%.
    const daysUntilUnlock = daysUntil !== null ? daysUntil - 14 : null;
    const unlockProgress = daysUntilUnlock !== null 
        ? Math.min(100, Math.max(0, 100 - ((daysUntilUnlock / 30) * 100)))
        : 0;
    const isUnlockTimeReached = daysUntilUnlock !== null && daysUntilUnlock <= 0;

    // Wishlist Handlers
    const handleSaveWishlist = () => {
        updateWishlist(wishlistBuffer);
        setIsEditingWishlist(false);
    };
    const addItemToBuffer = () => {
        if(newItem.trim()) { setWishlistBuffer([...wishlistBuffer, newItem.trim()]); setNewItem(""); }
    };

    const handleRevealClick = () => {
        onReveal(activeGroupId);
    };

    const fetchGiftIdeas = async () => {
        if(!targetParticipant || !currentGroup) return;
        setLoadingIdeas(true);
        const wishlistStr = targetParticipant.wishlistItems ? targetParticipant.wishlistItems.join(", ") : "";
        const ideas = await generateGiftIdeas(targetParticipant.name, currentGroup.budget, currentGroup.currency, wishlistStr);
        setGiftIdeas(ideas);
        setLoadingIdeas(false);
    };

    if (myGroups.length === 0) {
        return (
            <div className="text-center pt-20">
                <h2 className="text-2xl font-bold text-amber-400 mb-4">Brak aktywnych grup</h2>
                <p className="text-slate-300 mb-6">Nie jesteś przypisany do żadnego aktywnego wydarzenia.</p>
                <Button onClick={onLogout}>Wyloguj</Button>
            </div>
        );
    }

    if (!currentGroup) return <div className="text-center p-10">Ładowanie...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-20">
            
            {/* Header & Group Switcher */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl festive-font text-amber-400 drop-shadow-md">{currentGroup.name}</h1>
                    {myGroups.length > 1 && (
                        <div className="flex gap-2 mt-2 justify-center md:justify-start overflow-x-auto">
                            {myGroups.map(g => (
                                <button 
                                    key={g.id}
                                    onClick={() => setActiveGroupId(g.id)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${activeGroupId === g.id ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <Button onClick={onLogout} variant="glass" className="text-xs px-3 py-1 self-end md:self-auto">Wyloguj {participant.name}</Button>
            </div>

            {/* Stats Bar (Always Visible) */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="text-center bg-slate-900/50" noPadding>
                    <div className="p-4">
                        <span className="block text-2xl font-bold text-white">{currentGroup.budget} <span className="text-sm font-normal text-slate-400">{currentGroup.currency}</span></span>
                        <span className="text-xs uppercase text-amber-500 font-bold tracking-wider">Budżet</span>
                    </div>
                </Card>
                <Card className="text-center bg-slate-900/50 flex flex-col justify-center items-center" noPadding>
                    <div className="p-4 w-full">
                         <CountDown targetDate={currentGroup.exchangeDate} />
                         <span className="text-xs uppercase text-amber-500 font-bold tracking-wider mt-1 block">Do Finału</span>
                    </div>
                </Card>
            </div>

             {/* Draw Unlock Progress */}
             {daysUntilUnlock !== null && !currentGroup.isDrawComplete && (
                <Card className="bg-slate-900/30" noPadding>
                    <div className="p-4">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs uppercase text-slate-400 font-bold tracking-wider flex items-center gap-2">
                                <Hourglass size={12}/> Czas do otwarcia losowania
                            </span>
                            <span className="text-xs text-amber-400 font-mono">
                                {isUnlockTimeReached ? "ODBLOKOWANE" : `${Math.ceil(daysUntilUnlock)} dni`}
                            </span>
                        </div>
                        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <div 
                                className={`h-full transition-all duration-1000 ${isUnlockTimeReached ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`}
                                style={{ width: `${isUnlockTimeReached ? 100 : unlockProgress}%` }}
                            />
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
                            <span>30 dni przed</span>
                            <span>2 tyg. przed finałem</span>
                        </div>
                    </div>
                </Card>
            )}

            {!isDrawComplete ? (
                <div className="space-y-6">
                    
                    {/* Draw Status Card */}
                    <Card className="text-center py-8 border-amber-500/30">
                        <h3 className="text-2xl font-bold text-white mb-4">Strefa Oczekiwania</h3>
                        
                        <div className="mb-6 text-sm text-slate-300 max-w-md mx-auto space-y-2">
                           <p>Losowanie uruchomi się automatycznie, gdy wszyscy będą gotowi <br/> <span className="text-amber-400 font-bold">ORAZ</span> pasek czasu do otwarcia losowania się zapełni.</p>
                           {!isUnlockTimeReached && (
                               <Badge color="yellow">Oczekiwanie na termin ({Math.ceil(daysUntilUnlock!)} dni)</Badge>
                           )}
                        </div>
                        
                        {isReady ? (
                            <div className="bg-emerald-900/30 border border-emerald-500/50 p-4 rounded-xl inline-flex items-center gap-3 animate-pulse">
                                <ThumbsUp className="text-emerald-400" />
                                <div className="text-left">
                                    <p className="text-emerald-400 font-bold">Jesteś gotowy!</p>
                                    <p className="text-emerald-200/60 text-xs">Czekamy na {groupMembers.length - readyMembersCount} osób.</p>
                                </div>
                            </div>
                        ) : (
                            <Button onClick={() => onVoteReady(activeGroupId)} variant="gold" className="px-8 py-4 text-lg shadow-[0_0_30px_rgba(251,191,36,0.3)]">
                                <Sparkles className="mr-2" /> Zgłaszam Gotowość
                            </Button>
                        )}
                    </Card>

                     {/* User Wishlist Editor */}
                     <Card>
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-bold text-white flex items-center gap-2"><Gift className="text-amber-400" size={18}/> Twoja Lista Życzeń</h3>
                             {!isEditingWishlist && <button onClick={() => setIsEditingWishlist(true)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"><Edit2 size={12}/> Edytuj</button>}
                        </div>
                        
                        {isEditingWishlist ? (
                            <div className="space-y-3 bg-slate-900/50 p-4 rounded-lg">
                                <div className="flex gap-2">
                                    <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Nowe życzenie..." onKeyDown={e => e.key === 'Enter' && addItemToBuffer()} />
                                    <Button onClick={addItemToBuffer} variant="secondary"><Plus size={18}/></Button>
                                </div>
                                <div className="space-y-2">
                                    {wishlistBuffer.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-800 px-3 py-2 rounded border border-slate-700">
                                            <span>{item}</span>
                                            <button onClick={() => setWishlistBuffer(wishlistBuffer.filter((_, i) => i !== idx))} className="text-red-400"><X size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button onClick={handleSaveWishlist} fullWidth variant="primary">Zapisz</Button>
                                    <Button onClick={() => { setIsEditingWishlist(false); setWishlistBuffer(participant.wishlistItems || [])}} fullWidth variant="glass">Anuluj</Button>
                                </div>
                            </div>
                        ) : (
                            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                                {(participant.wishlistItems || []).length > 0 ? participant.wishlistItems!.map((it, i) => <li key={i}>{it}</li>) : <li className="italic text-slate-500">Lista pusta...</li>}
                            </ul>
                        )}
                     </Card>

                    {/* Participants Status */}
                    <div className="bg-slate-800/40 rounded-xl p-6 border border-white/5">
                        <h4 className="font-bold text-slate-400 mb-4 uppercase text-xs tracking-wider flex items-center justify-between">
                            <span>Uczestnicy ({groupMembers.length})</span>
                            <span>Gotowi: {readyMembersCount}/{groupMembers.length}</span>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {groupMembers.map(p => {
                                const pReady = p.readyGroups.includes(activeGroupId);
                                return (
                                    <div key={p.id} className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-2 ${pReady ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-red-900/20 border-red-500/30 text-red-300'}`}>
                                        <div className={`w-2 h-2 rounded-full ${pReady ? 'bg-emerald-400' : 'bg-red-500'}`} />
                                        <span className="truncate font-medium">{p.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <PollsSection polls={groupPolls} votePoll={onPollVote} isAdmin={false} currentUserId={participant.id} />
                </div>
            ) : (
                // POST DRAW VIEW
                <div className="space-y-8 animate-slide-up">
                    {!isRevealed ? (
                         <Card className="text-center py-16 relative overflow-hidden border-red-500/30">
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-red-500/20 blur-3xl rounded-full pointer-events-none" />
                             <Gift className="w-24 h-24 text-red-500 mx-auto mb-6 animate-bounce" />
                             <h3 className="text-3xl font-bold text-white mb-2">Twój prezent czeka!</h3>
                             <p className="text-slate-300 mb-8">Losowanie zakończone dla grupy {currentGroup.name}.</p>
                             <Button onClick={handleRevealClick} variant="gold" className="px-10 py-4 text-xl shadow-xl">
                                 Odkryj tajemnicę
                             </Button>
                         </Card>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h2 className="text-sm text-amber-400 uppercase tracking-widest mb-2 font-bold">Wylosowałeś osobę:</h2>
                                <div className="glass-card p-8 relative overflow-hidden transform hover:scale-105 transition-transform duration-500">
                                    <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 to-transparent" />
                                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 festive-font drop-shadow-lg relative z-10">
                                        {targetParticipant?.name}
                                    </h1>
                                </div>
                            </div>

                            <Card className="border-emerald-500/30 bg-emerald-900/10 animate-fade-in">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-400 uppercase tracking-wide text-sm">
                                    <Sparkles size={16} /> List życzeń {targetParticipant?.name}
                                </h3>
                                {targetParticipant?.wishlistItems && targetParticipant.wishlistItems.length > 0 ? (
                                    <div className="bg-slate-900/30 rounded-xl p-4 border border-emerald-500/20">
                                        <ul className="space-y-2">
                                            {targetParticipant.wishlistItems.map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-3 group cursor-pointer">
                                                    <input type="checkbox" id={`wish-${idx}`} className="mt-1.5 w-4 h-4 rounded border-slate-500 text-emerald-500 bg-slate-800" />
                                                    <label htmlFor={`wish-${idx}`} className="text-slate-200 text-lg group-hover:text-emerald-300 transition-colors select-none peer-checked:line-through peer-checked:text-slate-500">
                                                        {item}
                                                    </label>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <p className="text-slate-400 italic">Brak konkretnych życzeń.</p>
                                )}
                            </Card>

                            <Card className="relative overflow-hidden border-amber-500/20 animate-fade-in">
                                <div className="relative z-10">
                                    <h3 className="text-lg font-bold mb-4 text-amber-400 flex items-center gap-2 uppercase tracking-wide text-sm"><Sparkles size={16} /> Propozycja Prezentu</h3>
                                    
                                    {!giftIdeas && (
                                        <Button onClick={fetchGiftIdeas} disabled={loadingIdeas} fullWidth variant="secondary">
                                            {loadingIdeas ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Sparkles className="mr-2" size={18} />}
                                            {loadingIdeas ? "Generuję propozycje..." : `Zaproponuj prezent dla: ${targetParticipant?.name}`}
                                        </Button>
                                    )}

                                    {giftIdeas && (
                                        <div className="bg-slate-950/80 p-6 rounded-xl border border-slate-700 shadow-inner animate-fade-in">
                                            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-line text-slate-300 leading-relaxed">{giftIdeas}</div>
                                            <button onClick={() => setGiftIdeas("")} className="text-xs text-slate-500 mt-4 hover:text-slate-300 underline">Generuj ponownie</button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                            
                            <PollsSection polls={groupPolls} votePoll={onPollVote} isAdmin={false} currentUserId={participant.id} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

// 5. Main Login / Role Selection (Unchanged mostly, just styling)
const MainLogin = ({ 
    onAdminClick, 
    onRegisterClick, 
    onUserLogin 
}: { 
    onAdminClick: () => void, 
    onRegisterClick: () => void,
    onUserLogin: (name: string, pass: string) => void 
}) => {
    const [name, setName] = useState("");
    const [pass, setPass] = useState("");
    const [error, setError] = useState("");

    const handleLogin = () => {
        if (!name || !pass) { setError("Podaj imię i hasło"); return; }
        onUserLogin(name, pass);
    };

    useEffect(() => { if (error) setError(""); }, [name, pass]);

    return (
        <div className="max-w-md mx-auto mt-12 animate-fade-in pb-20">
             <div className="text-center mb-10">
                <h1 className="text-6xl festive-font text-amber-400 drop-shadow-lg mb-2">KtoKogo</h1>
                <p className="text-slate-300">Zaloguj się, aby wziąć udział w losowaniu.</p>
            </div>

            <Card className="border-slate-600 bg-slate-900/80 shadow-2xl">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-amber-400 mb-2 uppercase tracking-widest text-xs font-bold">
                        <LogIn size={14} /> Logowanie Uczestnika
                    </div>
                    
                    <div>
                        <Input placeholder="Twoje Imię" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                        <Input type="password" placeholder="Hasło" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                    </div>
                    
                    {error && (
                        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm animate-pulse">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                    
                    <Button onClick={handleLogin} fullWidth variant="primary" className="mt-2 shadow-red-900/40">
                        Wejdź
                    </Button>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-700"></span></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">Lub</span></div>
                    </div>

                    <Button onClick={onRegisterClick} fullWidth variant="secondary">
                        <UserPlus size={16} /> Zarejestruj się (Nowa osoba)
                    </Button>
                </div>
            </Card>

            <div className="mt-12 text-center">
                <button onClick={onAdminClick} className="text-slate-600 hover:text-slate-400 text-xs flex items-center gap-2 mx-auto transition-colors">
                    <Lock size={12} /> Panel Administratora
                </button>
            </div>
        </div>
    );
};

const AdminAuth = ({ hasPassword, onLogin, onSetPassword, onCancel }: { hasPassword: boolean; onLogin: (pw: string) => void; onSetPassword: (pw: string) => void; onCancel: () => void; }) => {
    const [input, setInput] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = () => {
        if (!input) { setError("Wpisz hasło"); return; }
        if (hasPassword) onLogin(input);
        else onSetPassword(input);
    };

    return (
        <div className="max-w-md mx-auto mt-20 animate-fade-in pb-20">
            <Card className="border-red-500/30 bg-slate-900/80">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600">
                        <KeyRound className="text-amber-400" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white festive-font">{hasPassword ? "Logowanie Admina" : "Ustaw Hasło Admina"}</h2>
                </div>
                <div className="space-y-4">
                    <Input type="password" value={input} onChange={(e) => { setInput(e.target.value); setError(""); }} placeholder="******" autoFocus />
                    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                    <Button onClick={handleSubmit} fullWidth variant="gold">{hasPassword ? "Zaloguj" : "Ustaw"}</Button>
                    <button onClick={onCancel} className="w-full text-center text-slate-500 text-sm py-2">Anuluj</button>
                </div>
            </Card>
        </div>
    );
};

// --- MAIN APP ---

export default function App() {
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'USER_DASHBOARD' | 'ADMIN_AUTH' | 'ADMIN_PANEL'>('LOGIN');
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  
  // Migration Logic for backward compatibility or clean slate
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('mikolajkiState_v4_groups');
    if (saved) return JSON.parse(saved);
    
    // Default state with one initial group
    const defaultGroup: Group = {
        id: generateId(),
        name: "Mikołajki 2024",
        budget: "50",
        currency: "PLN",
        exchangeDate: "",
        isActive: true,
        isDrawComplete: false
    };
    return {
      participants: [],
      groups: [defaultGroup],
      polls: [],
    };
  });

  useEffect(() => {
    localStorage.setItem('mikolajkiState_v4_groups', JSON.stringify(appState));
    if (currentUser) {
        const updated = appState.participants.find(p => p.id === currentUser.id);
        if (updated) setCurrentUser(updated);
    }
  }, [appState]);

  // --- ACTIONS ---

  const updateGroup = (id: string, key: keyof Group, value: any) => {
      setAppState(prev => ({
          ...prev,
          groups: prev.groups.map(g => g.id === id ? { ...g, [key]: value } : g)
      }));
  };

  const createGroup = (name: string) => {
      const newGroup: Group = {
          id: generateId(),
          name,
          budget: "100",
          currency: "PLN",
          exchangeDate: "",
          isActive: true,
          isDrawComplete: false
      };
      setAppState(prev => ({ ...prev, groups: [...prev.groups, newGroup] }));
  };

  const deleteGroup = (id: string) => {
      if (confirm("Usunąć grupę? Użytkownicy pozostaną, ale stracą przypisanie.")) {
          setAppState(prev => {
              // Safe filtering
              const newGroups = prev.groups ? prev.groups.filter(g => g.id !== id) : [];
              const newPolls = prev.polls ? prev.polls.filter(p => p.groupId !== id) : [];
              const newParticipants = prev.participants ? prev.participants.map(p => ({
                  ...p,
                  groupIds: p.groupIds.filter(gid => gid !== id)
              })) : [];

              return {
                  ...prev,
                  groups: newGroups,
                  polls: newPolls,
                  participants: newParticipants
              };
          });
      }
  };

  const toggleGroupActive = (id: string) => {
      setAppState(prev => ({
          ...prev,
          groups: prev.groups.map(g => g.id === id ? { ...g, isActive: !g.isActive } : g)
      }));
  };

  const handleRegister = (name: string, pass: string, wishlistItems: string[]) => {
      const nameExists = appState.participants.some(p => p.name.toLowerCase() === name.toLowerCase());
      if (nameExists) {
          alert("Takie imię już istnieje! Wybierz inne.");
          return;
      }
      
      // Assign to the first active group by default
      const defaultGroup = appState.groups[0];
      
      const newUser: Participant = {
          id: generateId(),
          name,
          password: pass,
          wishlistItems,
          groupIds: defaultGroup ? [defaultGroup.id] : [],
          assignments: {},
          status: 'approved', 
          isReady: false, // deprecated
          readyGroups: [],
          revealedGroups: [],
      };

      setAppState(prev => ({ ...prev, participants: [...prev.participants, newUser] }));
      setCurrentUser(newUser);
      setView('USER_DASHBOARD');
  };

  const handleUserLogin = (name: string, pass: string) => {
      const user = appState.participants.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (!user) { alert("Nie znaleziono użytkownika."); return; }
      if (user.password !== pass) { alert("Błędne hasło!"); return; }
      setCurrentUser(user);
      setView('USER_DASHBOARD');
  };

  const updateWishlist = (items: string[]) => {
      if(!currentUser) return;
      setAppState(prev => ({
          ...prev,
          participants: prev.participants.map(p => p.id === currentUser.id ? { ...p, wishlistItems: items } : p)
      }));
  };

  const performGroupDraw = (groupId: string, participants: Participant[]) => {
      const groupMembers = participants.filter(p => p.groupIds.includes(groupId));
      const memberIds = groupMembers.map(m => m.id);
      
      if (memberIds.length < 2) return participants;

      const assignments = performDraw(memberIds); // Returns { giverId: receiverId }

      // Merge assignments
      return participants.map(p => {
          if (assignments[p.id]) {
              return {
                  ...p,
                  assignments: {
                      ...p.assignments,
                      [groupId]: assignments[p.id]
                  }
              };
          }
          return p;
      });
  };

  const handleVoteReady = (groupId: string) => {
      if (!currentUser) return;

      setAppState(prev => {
          // 1. Mark user as ready for this group
          const updatedParticipants = prev.participants.map(p => {
              if (p.id === currentUser.id) {
                  // Add group ID to readyGroups if not present
                  const newReadyGroups = p.readyGroups.includes(groupId) ? p.readyGroups : [...p.readyGroups, groupId];
                  return { ...p, readyGroups: newReadyGroups };
              }
              return p;
          });

          // 2. Check Draw Condition
          const groupMembers = updatedParticipants.filter(p => p.groupIds.includes(groupId));
          const allReady = groupMembers.length > 1 && groupMembers.every(p => p.readyGroups.includes(groupId));
          
          const group = prev.groups.find(g => g.id === groupId);
          const daysUntil = group ? getDaysUntil(group.exchangeDate) : null;
          
          // AUTO DRAW RULE: All Ready AND <= 14 days left
          if (group && !group.isDrawComplete && allReady && daysUntil !== null && daysUntil <= 14) {
               const drawnParticipants = performGroupDraw(groupId, updatedParticipants);
               return {
                   ...prev,
                   participants: drawnParticipants,
                   groups: prev.groups.map(g => g.id === groupId ? { ...g, isDrawComplete: true } : g)
               };
          }

          return { ...prev, participants: updatedParticipants };
      });
  };

  const handleForceDraw = (groupId: string) => {
      if (confirm("Czy na pewno wymusić losowanie? Upewnij się, że wszyscy są gotowi.")) {
        setAppState(prev => {
            const updatedParticipants = performGroupDraw(groupId, prev.participants);
            return {
                ...prev,
                participants: updatedParticipants,
                groups: prev.groups.map(g => g.id === groupId ? { ...g, isDrawComplete: true } : g)
            };
        });
      }
  };

  const handleReveal = (groupId: string) => {
      if (!currentUser) return;
      setAppState(prev => ({
          ...prev,
          participants: prev.participants.map(p => p.id === currentUser.id ? { 
              ...p, 
              revealedGroups: [...p.revealedGroups, groupId] 
          } : p)
      }));
  };

  const removeParticipant = (id: string) => {
      if (confirm("Usunąć osobę?")) {
        setAppState(prev => ({ ...prev, participants: prev.participants.filter(p => p.id !== id) }));
      }
  };

  const updateParticipantGroups = (userId: string, groupId: string, isAdding: boolean) => {
      setAppState(prev => ({
          ...prev,
          participants: prev.participants.map(p => {
              if (p.id !== userId) return p;
              const newGroups = isAdding 
                ? [...p.groupIds, groupId] 
                : p.groupIds.filter(g => g !== groupId);
              return { ...p, groupIds: newGroups };
          })
      }));
  };

  const addPoll = (groupId: string, q: string, opts: string[]) => {
      const newPoll: Poll = {
          id: generateId(),
          groupId,
          question: q,
          options: opts.map(o => ({ id: generateId(), text: o })),
          userSelections: {}
      };
      setAppState(prev => ({ ...prev, polls: [...prev.polls, newPoll] }));
  };

  const removePoll = (id: string) => {
      setAppState(prev => ({ ...prev, polls: prev.polls.filter(p => p.id !== id) }));
  };

  const handlePollVote = (pollId: string, optionId: string) => {
      if (!currentUser) return;
      setAppState(prev => ({
          ...prev,
          polls: prev.polls.map(p => {
              if (p.id !== pollId) return p;
              return {
                  ...p,
                  userSelections: { ...p.userSelections, [currentUser.id]: optionId }
              };
          })
      }));
  };

  const handleAdminLogin = (inputPass: string) => {
      if (inputPass === appState.adminPassword) {
          setView('ADMIN_PANEL');
      } else {
          alert("Nieprawidłowe hasło");
      }
  };

  const handleSetAdminPassword = (inputPass: string) => {
      setAppState(prev => ({ ...prev, adminPassword: inputPass }));
      setView('ADMIN_PANEL');
  };

  const handleResetApp = () => {
      if (confirm("To usunie WSZYSTKIE dane. Kontynuować?")) {
          localStorage.removeItem('mikolajkiState_v4_groups');
          window.location.reload();
      }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-6xl">
            {view === 'LOGIN' && (
                <MainLogin 
                    onAdminClick={() => setView('ADMIN_AUTH')}
                    onRegisterClick={() => setView('REGISTER')}
                    onUserLogin={handleUserLogin}
                />
            )}

            {view === 'REGISTER' && (
                <RegisterView 
                    onRegister={handleRegister}
                    onCancel={() => setView('LOGIN')}
                />
            )}

            {view === 'ADMIN_AUTH' && (
                <AdminAuth 
                    hasPassword={!!appState.adminPassword}
                    onLogin={handleAdminLogin}
                    onSetPassword={handleSetAdminPassword}
                    onCancel={() => setView('LOGIN')}
                />
            )}

            {view === 'ADMIN_PANEL' && (
                <AdminPanel 
                    state={appState}
                    createGroup={createGroup}
                    updateGroup={updateGroup}
                    toggleGroupActive={toggleGroupActive}
                    deleteGroup={deleteGroup}
                    removeParticipant={removeParticipant}
                    updateParticipantGroups={updateParticipantGroups}
                    addPoll={addPoll}
                    removePoll={removePoll}
                    forceDraw={handleForceDraw}
                    onReset={handleResetApp}
                    onLogout={() => setView('LOGIN')}
                />
            )}

            {view === 'USER_DASHBOARD' && currentUser && (
                <UserDashboard 
                    participant={currentUser}
                    allParticipants={appState.participants}
                    allGroups={appState.groups}
                    polls={appState.polls}
                    updateWishlist={updateWishlist}
                    onVoteReady={handleVoteReady}
                    onPollVote={handlePollVote}
                    onReveal={handleReveal}
                    onLogout={() => { setCurrentUser(null); setView('LOGIN'); }}
                />
            )}
        </div>
    </div>
  );
}
