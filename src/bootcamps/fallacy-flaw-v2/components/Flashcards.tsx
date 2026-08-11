import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mirroredSetItem } from '@/lib/cloudMirror';
import { FLAW_CATALOG, FlawCard } from '../data/flaws';
import { ANSWER_CHOICE_FLASHCARDS, AnswerChoiceFlashcard } from '../data/flawAnswerChoiceFlashcards';
import { VIDEO_ASSETS } from '../data/videoAssets';
import { VideoCard } from './VideoCard';

// Card types based on requirements
type CardType =
  | 'Name -> Definition'
  | 'Everyday Wording -> Name'
  | 'LSAT Wording -> Name'
  | 'Counter -> Name'
  | 'Trap Recognition'
  | 'Conditional Logic'
  | 'Causal Logic'
  | 'Abstract Description'
  | 'Answer Choice Phrasing'
  | 'Difference Check'
  | 'Answer Choice Drill';

type FlashcardMode = 'Focus' | 'Compare' | 'Answer Choice Drill';
type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'All';

interface FlashcardBack {
  flawName: string;
  mainAnswer: string;
  mainAnswerLabel: string;
  secondaryInfo?: string;
  secondaryInfoLabel?: string;
  quickTest: string;
  extraDetails?: { label: string; value: string }[];
}

interface FlashcardState {
  flawId: string;
  cardType: CardType;
  front: string;
  back: FlashcardBack;
  mode: FlashcardMode;
  status: 'new' | 'got_it' | 'review_again';
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

// Helper to generate fluid Trap Recognition content
const getTrapCardContent = (flaw: FlawCard) => {
  switch (flaw.id) {
    case 'necessary-vs-sufficient':
      return {
        mainAnswer: "STOP. Don't jump for this just because you see conditional language like 'if' or 'only if.'",
        secondaryInfo: "You must verify that the author actually confused a requirement with a guarantee. Did they conclude that because a requirement was met, the outcome is now certain?",
        quickTest: "Check the direction! Did they go from Necessary to Sufficient?"
      };
    case 'causal-flaw':
      return {
        mainAnswer: "Before you pick this, ask: Does the conclusion explicitly say one thing MADE another happen?",
        secondaryInfo: "The LSAT often traps you with an answer about 'causation' when the argument was only about correlation. If the conclusion is just about a trend, this isn't a causal flaw.",
        quickTest: "Is there a 'lead to', 'responsible for', or 'caused by' in the conclusion?"
      };
    case 'sampling-fallacy':
      return {
        mainAnswer: "Wait! Is the sample actually flawed, or do you just personally think it's too small?",
        secondaryInfo: "To pick this, you must identify why the group surveyed is unrepresentative of the group in the conclusion. If they surveyed doctors about medicine, that might actually be a good sample!",
        quickTest: "Is there a logical gap between the people surveyed and the people mentioned in the conclusion?"
      };
    case 'part-vs-whole':
      return {
        mainAnswer: "Check the 'Level Shift.' Are we talking about a group vs. its members, or an object vs. its pieces?",
        secondaryInfo: "This trap usually appears when an author says 'This team is expensive, so every player is expensive.' (The Whole to Part shift).",
        quickTest: "Does the property (like 'heavy' or 'expensive') actually transfer between the whole and the pieces?"
      };
    case 'unproven-vs-proven-false':
      return {
        mainAnswer: "Don't pick this just because an argument is weak. Pick it when the author says 'Since you haven't proved it, it's definitely false.'",
        secondaryInfo: "The 'Absence of Evidence' trap is very specific. The author must treat a lack of proof as a proof of the opposite.",
        quickTest: "Does the conclusion say something 'is false' or 'does not exist' solely because the evidence is missing?"
      };
    case 'ad-hominem':
      return {
        mainAnswer: "Is the author attacking the person's character or their argument?",
        secondaryInfo: "You can only pick this if the author ignores the logic and just says 'We shouldn't listen to them because they are biased/mean/a hypocrite.'",
        quickTest: "If the person's character was perfectly clean, would the argument still be flawed? If not, it's Ad Hominem."
      };
    case 'circular-reasoning':
      return {
        mainAnswer: "WARNING: This is a very rare correct answer. Only pick it if the premise and conclusion say the EXACT same thing.",
        secondaryInfo: "If the author provides ANY outside evidence—even bad evidence—it is NOT circular reasoning. It's only circular if they are just repeating themselves.",
        quickTest: "Can you cross out the premise and conclusion and find they are just twins in different clothing?"
      };
    case 'internal-contradiction':
      return {
        mainAnswer: "Wait! Are the premises actually impossible to both be true, or are they just weird?",
        secondaryInfo: "This flaw means the author has've literally self-destructed. If Premise A says 'X is true' and Premise B says 'X is false,' you've found it.",
        quickTest: "Can both premises exist in the same world? If yes, this isn't an internal contradiction."
      };
    case 'equivocation':
      return {
        mainAnswer: "Track the 'Key Word.' Does it mean the same thing in the beginning as it does at the end?",
        secondaryInfo: "The LSAT loves to shift from a literal meaning (like 'light weight') to a metaphorical one ('light color') to trick you.",
        quickTest: "Try to define the word in the premise. Does that same definition work in the conclusion?"
      };
    case 'inappropriate-appeal':
      return {
        mainAnswer: "Is this person actually an expert in the field being discussed?",
        secondaryInfo: "The trap is an 'Appeal to Authority' where a celebrity speaks on science, or a crowd's opinion is used to prove a fact.",
        quickTest: "Does the proof rely on 'who said it' rather than 'why it's true'?"
      };
    case 'sleight-of-hand':
      return {
        mainAnswer: "Look for the 'Language Gap.' Did a brand new word appear in the conclusion?",
        secondaryInfo: "The author will talk about 'quality' in the premise and 'value' in the conclusion, pretending they are the same thing.",
        quickTest: "Is there a concept in the conclusion that was never mentioned in the support?"
      };
    case 'value-assumption':
      return {
        mainAnswer: "Wait! Did the author go from 'Facts' to 'Feelings'?",
        secondaryInfo: "This involves jumping from a descriptive premise (The car is fast) to a normative conclusion (The car is the 'best'). 'Best' is a value judgment the facts can't prove.",
        quickTest: "Is the conclusion an opinion/judgment while the premises are just cold facts?"
      };
    case 'sleazy-sales-pitch':
      return {
        mainAnswer: "Is the author only telling you the good news?",
        secondaryInfo: "To pick this, you must notice that the author is ignoring potential downsides or failing to compare the option to its competitors.",
        quickTest: "Did the author recommend 'Option A' without considering the drawbacks or 'Option B'?"
      };
    case 'universal-desires-assumption':
      return {
        mainAnswer: "Are we assuming everyone wants the same thing?",
        secondaryInfo: "The trap is assuming that because something saves money or time, everyone will automatically want to do it. Some people might value other things more!",
        quickTest: "Does the argument assume a particular goal (like 'profit') is shared by absolutely everyone?"
      };
    default:
      return {
        mainAnswer: `Wait! Before picking it, verify: ${flaw.doingWrong}`,
        secondaryInfo: `Do not pick if: ${flaw.dontConfuseWith.split('.')[0]}.`,
        quickTest: `Is this ACTUALLY the error being made, or just a familiar-sounding label?`
      };
  }
};

export function Flashcards() {
  const [selectedFlawId, setSelectedFlawId] = useState<string | null>(() => localStorage.getItem('fallacyFlaw:v2:flashcards:selected'));
  const [reshuffleTrigger, setReshuffleTrigger] = useState(0);

  // Flashcard review state using basic useState for v1
  const [reviewState, setReviewState] = useState<Record<string, 'got_it' | 'review_again'>>(() => {
    try {
      return JSON.parse(localStorage.getItem('fallacyFlaw:v2:flashcards:reviews') ?? '{}');
    } catch {
      return {};
    }
  });

  // Generate all possible cards
  const allCards = useMemo(() => {
    const cards: FlashcardState[] = [];
    
    FLAW_CATALOG.forEach(flaw => {
      // 1. Name -> Definition
      cards.push({
        flawId: flaw.id,
        cardType: 'Name -> Definition',
        front: flaw.name,
        back: {
          flawName: flaw.name,
          mainAnswerLabel: 'Plain-English Definition',
          mainAnswer: flaw.everydayWording,
          secondaryInfoLabel: 'Formal Definition',
          secondaryInfo: flaw.definition,
          quickTest: flaw.id === 'equivocation' 
            ? "Does the same word mean one thing in the premise and another thing in the conclusion?" 
            : `Does the stimulus actually match the specific logic of ${flaw.name}?`
        },
        mode: 'Focus',
        status: 'new'
      });

      // 2. Everyday -> Name
      cards.push({
        flawId: flaw.id,
        cardType: 'Everyday Wording -> Name',
        front: flaw.everydayWording,
        back: {
          flawName: flaw.name,
          mainAnswerLabel: 'The Flaw',
          mainAnswer: flaw.name,
          secondaryInfoLabel: 'Mechanism',
          secondaryInfo: `The argument depends on ${flaw.doingWrong.toLowerCase()}`,
          quickTest: `Track the logic. Does it rely on ${flaw.everydayWording.toLowerCase()}?`
        },
        mode: 'Focus',
        status: 'new'
      });

      // 3. LSAT Wording -> Name
      cards.push({
        flawId: flaw.id,
        cardType: 'LSAT Wording -> Name',
        front: flaw.abstractWording,
        back: {
          flawName: flaw.name,
          mainAnswerLabel: 'The Flaw',
          mainAnswer: flaw.name,
          secondaryInfoLabel: 'Plain-English Translation',
          secondaryInfo: flaw.everydayWording,
          quickTest: `Find the specific part of the stimulus being described by the abstract words.`
        },
        mode: 'Focus',
        status: 'new'
      });

      // 4. Trap Recognition
      const trapContent = getTrapCardContent(flaw);
      cards.push({
        flawId: flaw.id,
        cardType: 'Trap Recognition',
        front: `An answer choice says the argument "${flaw.name.toLowerCase()}."`,
        back: {
          flawName: flaw.name,
          mainAnswerLabel: 'The Verification Test',
          mainAnswer: trapContent.mainAnswer,
          secondaryInfoLabel: 'The Context',
          secondaryInfo: trapContent.secondaryInfo,
          quickTest: trapContent.quickTest
        },
        mode: 'Focus',
        status: 'new'
      });

      // 5. Answer Choice Drills (Variety)
      const relatedDrills = ANSWER_CHOICE_FLASHCARDS.filter(d => d.flawName === flaw.name);
      relatedDrills.forEach(drill => {
        cards.push({
          flawId: flaw.id,
          cardType: 'Answer Choice Drill',
          front: drill.front,
          back: {
            flawName: flaw.name,
            mainAnswerLabel: 'Plain English',
            mainAnswer: drill.plainEnglish,
            secondaryInfoLabel: 'What to Check',
            secondaryInfo: drill.whatToCheck,
            quickTest: drill.trapWarning
          },
          mode: 'Answer Choice Drill',
          status: 'new'
        });
      });
    });

    return cards;
  }, []);

  // Filter and Shuffle logic
  const filteredCards = useMemo(() => {
    let filtered = allCards;
    if (selectedFlawId && selectedFlawId !== 'All') {
      filtered = allCards.filter(card => card.flawId === selectedFlawId);
    }
    
    // Always shuffle for variety
    return [...filtered].sort(() => Math.random() - 0.5);
  }, [allCards, selectedFlawId, reshuffleTrigger]);

  const [currentIndex, setCurrentIndex] = useState(() => Number(localStorage.getItem('fallacyFlaw:v2:flashcards:index') ?? 0) || 0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (selectedFlawId) localStorage.setItem('fallacyFlaw:v2:flashcards:selected', selectedFlawId);
    else localStorage.removeItem('fallacyFlaw:v2:flashcards:selected');
  }, [selectedFlawId]);

  useEffect(() => {
    localStorage.setItem('fallacyFlaw:v2:flashcards:index', String(currentIndex));
  }, [currentIndex]);

  useEffect(() => {
    mirroredSetItem('fallacyFlaw:v2:flashcards:reviews', JSON.stringify(reviewState));
  }, [reviewState]);

  useEffect(() => {
    if (currentIndex >= filteredCards.length) setCurrentIndex(0);
  }, [currentIndex, filteredCards.length]);

  const handleNext = () => {
    if (currentIndex < filteredCards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    } else {
      // End of deck
      setSelectedFlawId(null);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  const handleSetStatus = (status: 'got_it' | 'review_again') => {
    const currentCard = filteredCards[currentIndex];
    if (!currentCard) return;
    const cardKey = `${currentCard.flawId}-${currentCard.cardType}-${currentCard.front.substring(0, 20)}`;
    setReviewState(prev => ({ ...prev, [cardKey]: status }));
    handleNext();
  };

  const currentCard = filteredCards[currentIndex];
  const cardKey = currentCard ? `${currentCard.flawId}-${currentCard.cardType}-${currentCard.front.substring(0, 20)}` : '';
  const currentStatus = reviewState[cardKey];

  const getCardLabels = (type: CardType) => {
    switch (type) {
      case 'Name -> Definition': return { label: 'Flaw Name', task: 'Explain this flaw in plain English.', backLabel: 'Definition' };
      case 'Everyday Wording -> Name': return { label: 'Everyday Move', task: 'Name the fallacy.', backLabel: 'Answer' };
      case 'LSAT Wording -> Name': return { label: 'LSAT Answer Language', task: 'Name the flaw and translate it.', backLabel: 'Answer' };
      case 'Trap Recognition': return { label: 'Trap Recognition', task: 'What must you verify first?', backLabel: 'Verification Test' };
      case 'Answer Choice Drill': return { label: 'Answer Choice Drill', task: 'Name the flaw described.', backLabel: 'Flaw Name' };
      default: return { label: 'Flashcard', task: 'Recall the answer.', backLabel: 'Answer' };
    }
  };

  if (!selectedFlawId) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar pt-6 pb-16 w-full max-w-4xl mx-auto px-4 lg:px-0">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-serif tracking-tighter mb-4">Fallacy Flashcards</h2>
          <p className="text-lg font-light text-[#1a1a1a]/70 leading-relaxed max-w-2xl">
            Choose a fallacy to master from every angle, or mix them all for a complete review.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button 
            onClick={() => { setSelectedFlawId('All'); setReshuffleTrigger(p => p + 1); }}
            className="p-8 bg-[#1a1a1a] text-[#f5f2ed] rounded-sm hover:shadow-xl transition-all text-left flex flex-col justify-between h-48 group"
          >
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-50">Mastery</span>
            <span className="text-2xl font-serif italic group-hover:pl-2 transition-all">Mix Everything</span>
          </button>
          
          {FLAW_CATALOG.map(flaw => (
            <button 
              key={flaw.id}
              onClick={() => { setSelectedFlawId(flaw.id); setReshuffleTrigger(p => p + 1); }}
              className="p-8 bg-white border border-[#1a1a1a]/10 rounded-sm hover:border-[#1a1a1a]/30 hover:shadow-lg transition-all text-left flex flex-col justify-between h-48 group"
            >
              <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-[#1a1a1a]/30">Fallacy</span>
              <span className="text-xl font-serif text-[#1a1a1a] group-hover:pl-2 transition-all">{flaw.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar pt-6 pb-16 w-full max-w-4xl mx-auto px-4 lg:px-0">
      {/* Simple Header */}
      <div className="flex justify-between items-end mb-8 border-b border-[#1a1a1a]/10 pb-6">
        <div>
          <button 
            onClick={() => setSelectedFlawId(null)}
            className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/40 hover:text-[#1a1a1a] mb-2 block"
          >
            ← Back to List
          </button>
          <h2 className="text-2xl font-serif italic tracking-tight">
            {selectedFlawId === 'All' ? 'Master Mix' : FLAW_CATALOG.find(f => f.id === selectedFlawId)?.name}
          </h2>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/30 block">Session</span>
          <span className="text-[11px] font-bold text-[#1a1a1a]/80">Varied Review</span>
        </div>
      </div>

      <div className="w-full flex flex-col items-center justify-center min-h-[460px] relative">
        <div className="w-full max-w-2xl flex flex-col items-center">
          
          <div 
            className="w-full aspect-[4/3] md:aspect-[3/2] cursor-pointer perspective-1000 relative group"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div 
              className="w-full h-full duration-500 preserve-3d"
              style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-white border border-[#1a1a1a]/10 shadow-sm flex flex-col justify-center items-center text-center p-8 md:p-16">
                <div className="space-y-6 w-full">
                  <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-[#1a1a1a]/30 block mb-2 font-mono">
                    {getCardLabels(currentCard.cardType).label}
                  </span>
                  <p className={`font-serif leading-relaxed text-[#1a1a1a] ${currentCard.cardType === 'Answer Choice Drill' ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl'}`}>
                    {currentCard.front}
                  </p>
                  
                  <div className="pt-10 border-t border-[#1a1a1a]/5">
                    <p className="text-xs italic text-[#1a1a1a]/50">
                      {getCardLabels(currentCard.cardType).task}
                    </p>
                  </div>
                </div>
                
                <div className="absolute bottom-8 w-full flex justify-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#1a1a1a]/40 bg-[#1a1a1a]/5 px-5 py-2 rounded-full group-hover:bg-[#1a1a1a] group-hover:text-white transition-all">
                    Click to Reveal
                  </p>
                </div>
              </div>

              {/* Back */}
              <div 
                className="absolute inset-0 backface-hidden bg-[#1a1a1a] text-[#f5f2ed] border border-[#1a1a1a] shadow-xl flex flex-col justify-center items-center text-center px-8 md:px-16"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <div className="space-y-8 w-full max-h-full overflow-y-auto pt-6 pb-12 custom-scrollbar">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-white/30 block mb-2">The Fallacy</span>
                    <h4 className="text-3xl font-serif italic text-white tracking-tight">
                      {currentCard.back.flawName}
                    </h4>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-[0.3em] text-white/30 block mb-2">
                        {currentCard.back.mainAnswerLabel}
                      </span>
                      <p className="text-xl text-white/95 leading-relaxed font-serif italic">
                        {currentCard.back.mainAnswer}
                      </p>
                    </div>

                    {currentCard.back.secondaryInfo && (
                       <div>
                         <span className="text-[9px] uppercase font-bold tracking-[0.3em] text-white/30 block mb-2">
                           {currentCard.back.secondaryInfoLabel}
                         </span>
                         <p className="text-base text-white/70 leading-relaxed font-light italic">
                           {currentCard.back.secondaryInfo}
                         </p>
                       </div>
                    )}
                  </div>

                  <div className="pt-8 border-t border-white/10">
                    <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-white/30 block mb-3 font-mono">
                      Pro Tip / Warning
                    </span>
                    <p className="text-sm text-white/60 italic font-serif leading-relaxed max-w-sm mx-auto">
                      {currentCard.back.quickTest}
                    </p>
                  </div>
                </div>

                <div className={`absolute bottom-6 w-full flex justify-center transition-opacity duration-300 ${currentStatus ? 'opacity-100' : 'opacity-0'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-[0.2em] px-3 py-1 rounded-sm ${currentStatus === 'got_it' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {currentStatus === 'got_it' ? '✓ Got It' : '↺ Review Again'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full flex justify-between items-center mt-10">
            <button 
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="text-[11px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 hover:text-[#1a1a1a] disabled:opacity-0 transition-all"
            >
              ← Previous
            </button>
            
            <div className={`flex gap-4 transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
              <button
                onClick={(e) => { e.stopPropagation(); handleSetStatus('review_again'); }}
                className="px-8 py-3 bg-white border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/30 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] transition-all rounded-sm shadow-sm"
              >
                Again
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleSetStatus('got_it'); }}
                className="px-8 py-3 bg-[#1a1a1a] text-white hover:bg-black text-[10px] font-bold uppercase tracking-[0.2em] transition-all rounded-sm shadow-lg"
              >
                Got It
              </button>
            </div>

            <button 
              onClick={handleNext}
              className={`text-[11px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-all ${!isFlipped ? 'opacity-0' : 'opacity-100'}`}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
