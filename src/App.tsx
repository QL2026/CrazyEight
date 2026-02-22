/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  User, 
  Cpu, 
  Layers, 
  ChevronRight,
  Info
} from 'lucide-react';
import { Card, Suit, Rank, GameStatus, PlayerType } from './types';
import { 
  createDeck, 
  shuffle, 
  canPlayCard, 
  getSuitColor, 
  getSuitSymbol 
} from './utils/gameLogic';

const CARD_WIDTH = 100;
const CARD_HEIGHT = 140;

export default function App() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [aiHand, setAiHand] = useState<Card[]>([]);
  const [currentTurn, setCurrentTurn] = useState<PlayerType>('player');
  const [status, setStatus] = useState<GameStatus>(GameStatus.HOME);
  const [activeSuit, setActiveSuit] = useState<Suit | null>(null);
  const [winner, setWinner] = useState<PlayerType | null>(null);
  const [message, setMessage] = useState<string>("欢迎来到 Qianyi 疯狂8点！");
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [wins, setWins] = useState(() => {
    const saved = localStorage.getItem('crazy-eights-wins');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Initialize game
  const initGame = useCallback(() => {
    const fullDeck = shuffle(createDeck());
    const pHand = fullDeck.splice(0, 8);
    const aHand = fullDeck.splice(0, 8);
    
    // Find a non-8 card for the discard pile
    let firstDiscardIndex = 0;
    while (fullDeck[firstDiscardIndex].rank === Rank.EIGHT) {
      firstDiscardIndex++;
    }
    const firstDiscard = fullDeck.splice(firstDiscardIndex, 1)[0];

    setPlayerHand(pHand);
    setAiHand(aHand);
    setDiscardPile([firstDiscard]);
    setDeck(fullDeck);
    setCurrentTurn('player');
    setStatus(GameStatus.PLAYING);
    setActiveSuit(null);
    setWinner(null);
    setMessage("轮到你了！请匹配花色或点数。");
  }, []);

  // Removed useEffect that auto-starts the game

  const topCard = discardPile[discardPile.length - 1];

  const checkWin = (hand: Card[], player: PlayerType) => {
    if (hand.length === 0) {
      setWinner(player);
      setStatus(GameStatus.GAME_OVER);
      setMessage(player === 'player' ? "你赢了！🎉" : "AI 赢了！🤖");
      
      if (player === 'player') {
        const newWins = wins + 1;
        setWins(newWins);
        localStorage.setItem('crazy-eights-wins', newWins.toString());
      }
      return true;
    }
    return false;
  };

  const handleDrawCard = () => {
    if (currentTurn !== 'player' || status !== GameStatus.PLAYING) return;

    if (deck.length === 0) {
      // If deck is empty, reshuffle discard pile (except top card)
      if (discardPile.length > 1) {
        const newDeck = shuffle(discardPile.slice(0, -1));
        setDeck(newDeck);
        setDiscardPile([topCard]);
        setMessage("正在重新洗牌...");
        return;
      } else {
        setMessage("没有牌可以摸了！跳过回合。");
        setCurrentTurn('ai');
        return;
      }
    }

    const newDeck = [...deck];
    const drawnCard = newDeck.pop()!;
    const newHand = [...playerHand, drawnCard];
    
    setDeck(newDeck);
    setPlayerHand(newHand);
    const suitNames: Record<Suit, string> = {
      [Suit.HEARTS]: '红心',
      [Suit.DIAMONDS]: '方块',
      [Suit.CLUBS]: '梅花',
      [Suit.SPADES]: '黑桃'
    };
    setMessage(`你摸到了 ${suitNames[drawnCard.suit]} ${drawnCard.rank}`);

    // Check if drawn card is playable
    if (!canPlayCard(drawnCard, topCard, activeSuit)) {
      // If not playable, turn ends
      setTimeout(() => {
        setCurrentTurn('ai');
      }, 1000);
    }
  };

  const handlePlayCard = (card: Card) => {
    if (currentTurn !== 'player' || status !== GameStatus.PLAYING) return;

    if (canPlayCard(card, topCard, activeSuit)) {
      const newHand = playerHand.filter(c => c.id !== card.id);
      setPlayerHand(newHand);
      setDiscardPile([...discardPile, card]);
      setActiveSuit(null);

      if (checkWin(newHand, 'player')) return;

      if (card.rank === Rank.EIGHT) {
        setStatus(GameStatus.SUIT_SELECTION);
        setShowSuitPicker(true);
        setMessage("请选择一个新的花色！");
      } else {
        setCurrentTurn('ai');
        setMessage("AI 正在思考...");
      }
    } else {
      setMessage("无效的出牌！请匹配花色或点数。");
    }
  };

  const handleSuitSelect = (suit: Suit) => {
    const suitNames: Record<Suit, string> = {
      [Suit.HEARTS]: '红心',
      [Suit.DIAMONDS]: '方块',
      [Suit.CLUBS]: '梅花',
      [Suit.SPADES]: '黑桃'
    };
    setActiveSuit(suit);
    setStatus(GameStatus.PLAYING);
    setShowSuitPicker(false);
    setCurrentTurn('ai');
    setMessage(`花色已更改为 ${suitNames[suit]}。轮到 AI 了。`);
  };

  // AI Logic
  useEffect(() => {
    if (currentTurn === 'ai' && status === GameStatus.PLAYING && !winner) {
      const timer = setTimeout(() => {
        const playableCards = aiHand.filter(c => canPlayCard(c, topCard, activeSuit));

        if (playableCards.length > 0) {
          // AI Strategy: Play non-8s first, then 8s
          const nonEights = playableCards.filter(c => c.rank !== Rank.EIGHT);
          const cardToPlay = nonEights.length > 0 
            ? nonEights[Math.floor(Math.random() * nonEights.length)]
            : playableCards[0];

          const newHand = aiHand.filter(c => c.id !== cardToPlay.id);
          setAiHand(newHand);
          setDiscardPile([...discardPile, cardToPlay]);
          setActiveSuit(null);

          if (checkWin(newHand, 'ai')) return;

          if (cardToPlay.rank === Rank.EIGHT) {
            // AI picks its most frequent suit
            const suitCounts: Record<string, number> = {};
            newHand.forEach(c => {
              suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
            });
            const bestSuit = (Object.keys(suitCounts).sort((a, b) => suitCounts[b] - suitCounts[a])[0] as Suit) || Suit.HEARTS;
            const suitNames: Record<Suit, string> = {
              [Suit.HEARTS]: '红心',
              [Suit.DIAMONDS]: '方块',
              [Suit.CLUBS]: '梅花',
              [Suit.SPADES]: '黑桃'
            };
            setActiveSuit(bestSuit);
            setMessage(`AI 出了一个 8 并选择了 ${suitNames[bestSuit]}！`);
          } else {
            const suitNames: Record<Suit, string> = {
              [Suit.HEARTS]: '红心',
              [Suit.DIAMONDS]: '方块',
              [Suit.CLUBS]: '梅花',
              [Suit.SPADES]: '黑桃'
            };
            setMessage(`AI 出了 ${suitNames[cardToPlay.suit]} ${cardToPlay.rank}。`);
          }
          setCurrentTurn('player');
        } else {
          // AI needs to draw
          if (deck.length > 0) {
            const newDeck = [...deck];
            const drawnCard = newDeck.pop()!;
            const newHand = [...aiHand, drawnCard];
            setDeck(newDeck);
            setAiHand(newHand);
            setMessage("AI 摸了一张牌。");
            
            // If drawn card is playable, AI plays it immediately
            if (canPlayCard(drawnCard, topCard, activeSuit)) {
              // Recursive-like call or just wait
              // For simplicity, let's just end AI turn if it draws
              // But real Crazy Eights often allows playing the drawn card
              // Let's just end AI turn to keep it simple and fair
              setCurrentTurn('player');
            } else {
              setCurrentTurn('player');
            }
          } else {
            // Deck empty, skip AI turn
            setMessage("AI 无牌可出且摸牌堆已空。AI 跳过回合。");
            setCurrentTurn('player');
          }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, aiHand, discardPile, deck, status, activeSuit, winner, topCard]);

  return (
    <div className="min-h-screen bg-emerald-900 text-white font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      <AnimatePresence mode="wait">
        {status === GameStatus.HOME ? (
          <motion.div
            key="home-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-6 relative"
          >
            {/* Background Decorative Cards */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] left-[-10%] w-[40%] aspect-square border-2 border-white/10 rounded-full"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square border-2 border-white/10 rounded-full"
              />
            </div>

            {/* Logo/Title Section */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-center z-10"
            >
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-emerald-500 mx-auto rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-8 rotate-12">
                <Layers className="text-white w-12 h-12 sm:w-16 sm:h-16" />
              </div>
              <h1 className="text-5xl sm:text-7xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-transparent">
                Qianyi 疯狂8点
              </h1>
              <p className="text-emerald-200/60 text-lg sm:text-xl font-medium tracking-wide max-w-md mx-auto mb-12">
                经典纸牌游戏，智慧与运气的对决。
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col gap-4 w-full max-w-xs z-10"
            >
              <button
                onClick={initGame}
                className="group relative py-4 bg-white text-emerald-900 font-bold rounded-2xl shadow-xl hover:bg-emerald-50 transition-all active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-emerald-400/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                <span className="relative flex items-center justify-center gap-2 text-lg">
                  开始游戏 <ChevronRight className="w-5 h-5" />
                </span>
              </button>
              
              <button
                onClick={() => setShowInstructions(true)}
                className="py-4 bg-emerald-800/50 text-emerald-100 font-bold rounded-2xl border border-white/10 hover:bg-emerald-800/80 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Info className="w-5 h-5" /> 游戏规则
              </button>

              <div className="mt-4 flex items-center justify-center gap-6 text-emerald-200/40">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-emerald-200">{wins}</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold">累计胜场</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-emerald-200">AI</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold">对手等级</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="game-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col"
          >
            {/* Header */}
            <header className="p-4 bg-black/20 backdrop-blur-md border-b border-white/10 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setStatus(GameStatus.HOME)}
                  className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
                >
                  <Layers className="text-white w-6 h-6" />
                </button>
                <div>
                  <h1 className="font-bold text-lg tracking-tight">Qianyi 疯狂8点</h1>
                  <p className="text-xs text-emerald-200/60 uppercase tracking-widest font-semibold">标准版</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={initGame}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                  title="重新开始"
                >
                  <RotateCcw className="w-5 h-5 group-active:rotate-180 transition-transform duration-500" />
                </button>
                <div className="h-8 w-px bg-white/10" />
                <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full border border-white/5">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium">胜场: {wins}</span>
                </div>
              </div>
            </header>

            {/* Main Table */}
            <main className="flex-1 flex flex-col justify-between p-4 overflow-hidden relative">
              {/* AI Hand (Top) */}
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/10">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">AI 对手</span>
                  <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px]">{aiHand.length} 张牌</span>
                </div>
                <div className="flex -space-x-8 sm:-space-x-12 max-w-full overflow-x-auto px-8 py-2 no-scrollbar">
                  {aiHand.map((card, idx) => (
                    <motion.div
                      key={card.id}
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="w-14 h-20 sm:w-20 sm:h-28 bg-white rounded-lg shadow-xl border border-slate-200 flex-shrink-0"
                      style={{ 
                        zIndex: idx,
                        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
                      }}
                    >
                      <div className="w-full h-full rounded-lg border-2 border-emerald-600/20 flex items-center justify-center">
                        <div className="w-6 h-10 sm:w-10 sm:h-16 border-2 border-emerald-600/10 rounded flex items-center justify-center">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-emerald-600/10 rounded-full" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Center Area (Deck & Discard) */}
              <div className="flex-1 flex items-center justify-center gap-6 sm:gap-16 my-4">
                {/* Draw Pile */}
                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDrawCard}
                    disabled={currentTurn !== 'player' || status !== GameStatus.PLAYING}
                    className={`relative w-20 h-28 sm:w-28 sm:h-40 rounded-xl shadow-2xl border-2 border-white/20 overflow-hidden transition-opacity ${currentTurn !== 'player' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ background: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)' }}
                  >
                    <div className="absolute inset-2 border border-white/10 rounded-lg flex flex-col items-center justify-center gap-1">
                      <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-white/20" />
                      <span className="text-[10px] sm:text-xs font-bold text-white/40 uppercase tracking-widest">{deck.length}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                  </motion.button>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/40">摸牌</span>
                </div>

                {/* Discard Pile */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-20 h-28 sm:w-28 sm:h-40">
                    <AnimatePresence mode="popLayout">
                      {discardPile.slice(-2).map((card, idx) => (
                        <motion.div
                          key={card.id}
                          initial={{ scale: 0.8, opacity: 0, rotate: -10, x: 50 }}
                          animate={{ scale: 1, opacity: 1, rotate: idx === 1 ? 0 : -5, x: 0 }}
                          exit={{ scale: 1.2, opacity: 0 }}
                          className="absolute inset-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 sm:p-2 flex flex-col justify-between"
                          style={{ zIndex: idx }}
                        >
                          <div className={`flex flex-col items-start ${getSuitColor(card.suit)}`}>
                            <span className="text-sm sm:text-lg font-bold leading-none">{card.rank}</span>
                            <span className="text-xs sm:text-sm">{getSuitSymbol(card.suit)}</span>
                          </div>
                          <div className={`flex justify-center items-center text-3xl sm:text-4xl ${getSuitColor(card.suit)}`}>
                            {getSuitSymbol(card.suit)}
                          </div>
                          <div className={`flex flex-col items-end rotate-180 ${getSuitColor(card.suit)}`}>
                            <span className="text-sm sm:text-lg font-bold leading-none">{card.rank}</span>
                            <span className="text-xs sm:text-sm">{getSuitSymbol(card.suit)}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/40">弃牌堆</span>
                    {activeSuit && (
                      <div className={`px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-bold uppercase flex items-center gap-1 ${getSuitColor(activeSuit)}`}>
                        {getSuitSymbol(activeSuit)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Player Hand (Bottom) */}
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/10">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">你的手牌</span>
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px]">{playerHand.length} 张牌</span>
                </div>
                
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-4 max-w-5xl max-h-[30vh] overflow-y-auto no-scrollbar py-2">
                  {playerHand.map((card) => {
                    const playable = canPlayCard(card, topCard, activeSuit) && currentTurn === 'player' && status === GameStatus.PLAYING;
                    return (
                      <motion.button
                        key={card.id}
                        whileHover={playable ? { y: -15, scale: 1.05 } : {}}
                        whileTap={playable ? { scale: 0.95 } : {}}
                        onClick={() => handlePlayCard(card)}
                        disabled={!playable}
                        className={`w-14 h-20 sm:w-20 sm:h-28 bg-white rounded-lg shadow-lg border border-slate-200 p-1 sm:p-1.5 flex flex-col justify-between transition-all flex-shrink-0 ${!playable ? 'opacity-60 grayscale-[0.5] cursor-not-allowed' : 'cursor-pointer hover:shadow-2xl hover:border-emerald-400'}`}
                      >
                        <div className={`flex flex-col items-start ${getSuitColor(card.suit)}`}>
                          <span className="text-xs sm:text-sm font-bold leading-none">{card.rank}</span>
                          <span className="text-[10px] sm:text-xs">{getSuitSymbol(card.suit)}</span>
                        </div>
                        <div className={`flex justify-center items-center text-xl sm:text-2xl ${getSuitColor(card.suit)}`}>
                          {getSuitSymbol(card.suit)}
                        </div>
                        <div className={`flex flex-col items-end rotate-180 ${getSuitColor(card.suit)}`}>
                          <span className="text-xs sm:text-sm font-bold leading-none">{card.rank}</span>
                          <span className="text-[10px] sm:text-xs">{getSuitSymbol(card.suit)}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </main>

            {/* Footer / Message Bar */}
            <footer className="p-4 bg-black/40 backdrop-blur-md border-t border-white/10 flex justify-center items-center">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full animate-pulse ${currentTurn === 'player' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                <p className="text-sm font-medium tracking-wide text-white/80">{message}</p>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suit Picker Modal */}
      <AnimatePresence>
        {showSuitPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center"
            >
              <h2 className="text-2xl font-bold mb-2">万能 8！</h2>
              <p className="text-slate-400 text-sm mb-8">选择接下来的花色</p>
              
              <div className="grid grid-cols-2 gap-4">
                {[Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES].map((suit) => {
                  const suitNames: Record<Suit, string> = {
                    [Suit.HEARTS]: '红心',
                    [Suit.DIAMONDS]: '方块',
                    [Suit.CLUBS]: '梅花',
                    [Suit.SPADES]: '黑桃'
                  };
                  return (
                    <button
                      key={suit}
                      onClick={() => handleSuitSelect(suit)}
                      className="group flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all active:scale-95"
                    >
                      <span className={`text-4xl ${getSuitColor(suit)} group-hover:scale-110 transition-transform`}>
                        {getSuitSymbol(suit)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{suitNames[suit]}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {status === GameStatus.GAME_OVER && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-10 shadow-2xl max-w-md w-full text-center"
            >
              <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${winner === 'player' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'}`}>
                <Trophy className="w-10 h-10" />
              </div>
              <h2 className="text-4xl font-black mb-2 tracking-tight">
                {winner === 'player' ? '胜利！' : '失败'}
              </h2>
              <p className="text-slate-400 mb-10">
                {winner === 'player' 
                  ? "你展现了高超的牌技。AI 根本不是你的对手。" 
                  : "AI 这次更胜一筹。下次好运！"}
              </p>
              
              <button
                onClick={initGame}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group"
              >
                <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                再玩一局
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Overlay */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl max-w-lg w-full"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">游戏规则</h2>
                <button 
                  onClick={() => setShowInstructions(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <RotateCcw className="w-5 h-5 rotate-45" />
                </button>
              </div>
              
              <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 font-bold">1</div>
                  <p>匹配弃牌堆顶部牌的 <span className="text-white font-bold">【花色】</span> 或 <span className="text-white font-bold">【点数】</span>。</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 font-bold">2</div>
                  <p><span className="text-white font-bold">【8是万能牌！】</span> 你可以在任何时候出 8，并指定接下来的花色。</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 font-bold">3</div>
                  <p>如果你无牌可出，必须 <span className="text-white font-bold">【摸一张牌】</span>。如果摸到的牌可以出，则立即打出；否则回合结束。</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 font-bold">4</div>
                  <p>最先 <span className="text-white font-bold">【清空手牌】</span> 的玩家获胜！</p>
                </div>
              </div>

              <button
                onClick={() => setShowInstructions(false)}
                className="w-full mt-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all"
              >
                明白了！
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Toggle Button */}
      <div className="fixed bottom-20 right-4 z-10">
        <button 
          onClick={() => setShowInstructions(true)}
          className="w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 flex items-center justify-center transition-colors group"
        >
          <Info className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}
