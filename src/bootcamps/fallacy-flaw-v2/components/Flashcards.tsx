import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FLAW_CATALOG, FlawCard, FlawGroup } from '../data/flaws';

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
  | 'Difference Check';

type FlashcardMode = 'Focus' | 'Compare';

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
  group: FlawGroup;
  mode: FlashcardMode;
  status: 'new' | 'got_it' | 'review_again';
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
  const [activeMode, setActiveMode] = useState<FlashcardMode>('Focus');
  const [activeGroupFilter, setActiveGroupFilter] = useState<FlawGroup | 'All'>('All');
  const [activeFlawFilter, setActiveFlawFilter] = useState<string>('All');
  const [activeTypeFilter, setActiveTypeFilter] = useState<CardType | 'All'>('All');
  const [reshuffleTrigger, setReshuffleTrigger] = useState(0);

  // Flashcard review state using basic useState for v1 (could be persisted to localStorage)
  const [reviewState, setReviewState] = useState<Record<string, 'got_it' | 'review_again'>>({});

  // Helper to shuffle with anti-repeat logic
  const shuffleDeck = (cards: FlashcardState[]) => {
    if (cards.length <= 1) return cards;
    
    // Initial shuffle
    let shuffled = [...cards].sort(() => Math.random() - 0.5);
    
    // Anti-repeat pass
    const result: FlashcardState[] = [];
    const remaining = [...shuffled];
    
    while (remaining.length > 0) {
      const lastFlawId = result.length > 0 ? result[result.length - 1].flawId : null;
      
      // Find the first card that doesn't match the last flaw ID
      let foundIndex = remaining.findIndex(c => c.flawId !== lastFlawId);
      
      // If none found (rare, only if one flaw remains), just take the next one
      if (foundIndex === -1) foundIndex = 0;
      
      result.push(remaining.splice(foundIndex, 1)[0]);
    }
    
    return result;
  };

  // Generate all possible cards
  const allCards = useMemo(() => {
    const focusCards: FlashcardState[] = [];
    const compareCards: FlashcardState[] = [];
    
    FLAW_CATALOG.forEach(flaw => {
      // 1. Name -> Definition
      focusCards.push({
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
        group: flaw.group,
        mode: 'Focus',
        status: 'new'
      });

      // 2. Everyday -> Name
      focusCards.push({
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
        group: flaw.group,
        mode: 'Focus',
        status: 'new'
      });

      // 3. LSAT Wording -> Name
      focusCards.push({
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
        group: flaw.group,
        mode: 'Focus',
        status: 'new'
      });

      // 4. Counter -> Name
      focusCards.push({
        flawId: flaw.id,
        cardType: 'Counter -> Name',
        front: flaw.counterQuestion,
        back: {
          flawName: flaw.name,
          mainAnswerLabel: 'The Flaw',
          mainAnswer: flaw.name,
          secondaryInfoLabel: 'Why it works',
          secondaryInfo: `This question exposes whether the argument depends on ${flaw.doingWrong.toLowerCase()}`,
          quickTest: `If the answer to this question is 'yes', but the author assumed 'no', you've found the flaw.`
        },
        group: flaw.group,
        mode: 'Focus',
        status: 'new'
      });

      // 5. Trap Recognition
      const trapContent = getTrapCardContent(flaw);
      focusCards.push({
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
        group: flaw.group,
        mode: 'Focus',
        status: 'new'
      });

      // 6. Specialized Focus Cards
      if (flaw.id === 'necessary-vs-sufficient') {
        focusCards.push({
          flawId: flaw.id,
          cardType: 'Conditional Logic',
          front: "“If A, then B.” Which side is sufficient? Which side is necessary?",
          back: {
            flawName: flaw.name,
            mainAnswerLabel: 'The Rule',
            mainAnswer: "A is sufficient for B.\nB is necessary for A.\n\nIf A happens, B is guaranteed. But B happening does NOT prove A happened.",
            quickTest: "Check the direction! Sufficient → Necessary."
          },
          group: flaw.group,
          mode: 'Focus',
          status: 'new'
        });
      } else if (flaw.id === 'causal-flaw') {
        focusCards.push({
          flawId: flaw.id,
          cardType: 'Causal Logic',
          front: "What are the three ways to attack a correlation-to-causation jump?",
          back: {
            flawName: flaw.name,
            mainAnswerLabel: 'Attack Vectors',
            mainAnswer: "1. Alternate Explanation (Something else caused it)\n2. Reverse Causation (B caused A)\n3. Third Factor (C caused both A and B)",
            quickTest: "Correlation DOES NOT equal causation."
          },
          group: flaw.group,
          mode: 'Focus',
          status: 'new'
        });
      } else {
        focusCards.push({
          flawId: flaw.id,
          cardType: 'Abstract Description',
          front: `How does the LSAT typically describe "${flaw.name}"?`,
          back: {
            flawName: flaw.name,
            mainAnswerLabel: 'Formal Description',
            mainAnswer: flaw.abstractWording,
            secondaryInfoLabel: 'Plain English',
            secondaryInfo: flaw.everydayWording,
            quickTest: "Visualize how this abstraction fits on a real-world example."
          },
          group: flaw.group,
          mode: 'Focus',
          status: 'new'
        });
      }

      // Comparison Mode Cards
      const vsFlawMatch = flaw.dontConfuseWith.match(/^([^.]+)/);
      const vsFlaw = vsFlawMatch ? vsFlawMatch[1] : 'Similar Flaws';
      compareCards.push({
        flawId: flaw.id,
        cardType: 'Difference Check',
        front: `${flaw.name} vs. ${vsFlaw}`,
        back: {
          flawName: flaw.name,
          mainAnswerLabel: 'The Distinction',
          mainAnswer: flaw.dontConfuseWith,
          quickTest: "Look at the mechanism of the error. Is it about word-meaning (Equivocation) or concept-pretending (Sleight of Hand)?"
        },
        group: flaw.group,
        mode: 'Compare',
        status: 'new'
      });
    });

    return [...focusCards, ...compareCards];
  }, []);

  // Filter and Shuffle logic
  const filteredCards = useMemo(() => {
    const filtered = allCards.filter(card => {
      if (card.mode !== activeMode) return false;
      if (activeGroupFilter !== 'All' && card.group !== activeGroupFilter) return false;
      if (activeFlawFilter !== 'All' && card.flawId !== activeFlawFilter) return false;
      if (activeTypeFilter !== 'All' && card.cardType !== activeTypeFilter) return false;
      return true;
    });

    // If focused on a single flaw, return in original set order
    if (activeFlawFilter !== 'All') return filtered;

    // Otherwise, apply smart shuffle
    return shuffleDeck(filtered);
  }, [allCards, activeMode, activeGroupFilter, activeFlawFilter, activeTypeFilter, reshuffleTrigger]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // If filters change, reset to first card
  React.useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [activeGroupFilter, activeFlawFilter, activeTypeFilter, activeMode]);

  const handleReshuffle = () => {
    setReshuffleTrigger(prev => prev + 1);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleNext = () => {
    if (currentIndex < filteredCards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
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
    
    // Create a unique key for this exact flashcard
    const cardKey = `${currentCard.flawId}-${currentCard.cardType}`;
    
    setReviewState(prev => ({
      ...prev,
      [cardKey]: status
    }));
    
    handleNext();
  };

  const currentCard = filteredCards[currentIndex];
  // Check its status
  const cardKey = currentCard ? `${currentCard.flawId}-${currentCard.cardType}` : '';
  const currentStatus = reviewState[cardKey];

  const getCardLabels = (type: CardType) => {
    switch (type) {
      case 'Name -> Definition':
        return { 
          label: 'Flaw Name', 
          task: 'Before revealing, explain this flaw in plain English.',
          backLabel: 'Definition'
        };
      case 'Everyday Wording -> Name':
        return { 
          label: 'Plain-English Move', 
          task: 'Before revealing, name the flaw.',
          backLabel: 'Answer'
        };
      case 'LSAT Wording -> Name':
        return { 
          label: 'LSAT Answer Language', 
          task: 'Before revealing, name the flaw and translate this into plain English.',
          backLabel: 'Answer'
        };
      case 'Counter -> Name':
        return { 
          label: 'Counter Question', 
          task: 'Before revealing, name the flaw this question exposes.',
          backLabel: 'Answer'
        };
      case 'Trap Recognition':
        return { 
          label: 'Trap Recognition', 
          task: 'Before revealing, what must you verify before choosing that answer?',
          backLabel: 'Verification Test'
        };
      case 'Conditional Logic':
        return { 
          label: 'Conditional Logic', 
          task: 'Before revealing, identify the sufficient condition and the necessary condition.',
          backLabel: 'The Rule'
        };
      case 'Causal Logic':
        return { 
          label: 'Causal Logic', 
          task: 'Before revealing, name the three ways to attack a causal jump.',
          backLabel: 'Attack Vectors'
        };
      case 'Abstract Description':
        return { 
          label: 'LSAT Abstract Description', 
          task: 'Before revealing, name the flaw and translate this to plain English.',
          backLabel: 'Flaw Definition'
        };
      case 'Answer Choice Phrasing':
        return { 
          label: 'Answer Choice Language', 
          task: 'Before revealing, recall a common LSAT phrasing for this flaw.',
          backLabel: 'Example Phrasing'
        };
      case 'Difference Check':
        return { 
          label: 'Difference Check', 
          task: 'Before revealing, explain the key distinction between these two.',
          backLabel: 'The Distinction'
        };
      default:
        return { label: 'Card', task: 'Recall the answer.', backLabel: 'Answer' };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar pt-6 pb-16 w-full max-w-4xl mx-auto px-4 lg:px-0">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-serif tracking-tighter mb-3">Flashcards Master Review</h2>
        <p className="text-[15px] font-light text-[#1a1a1a]/80 leading-relaxed max-w-2xl">
          Train the same flaw from different angles so you can recognize it even when the answer choice sounds abstract.
        </p>
      </div>

      {/* Workspace Container */}
      <div className="flex flex-col w-full bg-[#faf9f7] border border-[#1a1a1a]/10 shadow-sm">
        
        {/* Mode & Filter / Status Row */}
        <div className="flex flex-col border-b border-[#1a1a1a]/10">
          {/* Mode Switcher */}
          <div className="flex bg-white px-8 pt-4 border-b border-[#1a1a1a]/5">
            <button
              onClick={() => { setActiveMode('Focus'); setActiveTypeFilter('All'); }}
              className={`pb-3 px-1 text-[11px] font-bold uppercase tracking-widest transition-all ${activeMode === 'Focus' ? 'border-b-2 border-[#1a1a1a] text-[#1a1a1a]' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/50'}`}
            >
              Flaw Focus Mode
            </button>
            <button
              onClick={() => { setActiveMode('Compare'); setActiveTypeFilter('All'); }}
              className={`ml-10 pb-3 px-1 text-[11px] font-bold uppercase tracking-widest transition-all ${activeMode === 'Compare' ? 'border-b-2 border-[#1a1a1a] text-[#1a1a1a]' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/50'}`}
            >
              Difference Checks
            </button>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 md:px-8 bg-white gap-6 md:gap-0">
            {/* Left side: Filters */}
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/40">Group</label>
                <select
                  value={activeGroupFilter}
                  onChange={(e) => setActiveGroupFilter(e.target.value as FlawGroup | 'All')}
                  className="bg-transparent border-b border-[#1a1a1a]/20 pb-1 text-[#1a1a1a] focus:outline-none cursor-pointer text-sm font-medium pr-4"
                >
                  <option value="All">All Groups</option>
                  <option value="Group 1">Group 1</option>
                  <option value="Group 2">Group 2</option>
                  <option value="Practical LSAT Tricks">Practical Tricks</option>
                </select>
              </div>

              {activeMode === 'Focus' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/40">Flaw</label>
                  <select
                    value={activeFlawFilter}
                    onChange={(e) => setActiveFlawFilter(e.target.value)}
                    className="bg-transparent border-b border-[#1a1a1a]/20 pb-1 text-[#1a1a1a] focus:outline-none cursor-pointer text-sm font-medium max-w-[180px] truncate pr-4"
                  >
                    <option value="All">All Flaws</option>
                    {FLAW_CATALOG.filter(f => activeGroupFilter === 'All' || f.group === activeGroupFilter).map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/40">Type</label>
                <select
                  value={activeTypeFilter}
                  onChange={(e) => setActiveTypeFilter(e.target.value as CardType | 'All')}
                  className="bg-transparent border-b border-[#1a1a1a]/20 pb-1 text-[#1a1a1a] focus:outline-none cursor-pointer text-sm font-medium pr-4"
                >
                  <option value="All">All Types</option>
                  {activeMode === 'Focus' ? (
                    <>
                      <option value="Name -> Definition">Name → Definition</option>
                      <option value="Everyday Wording -> Name">Everyday → Name</option>
                      <option value="Counter -> Name">Counter → Name</option>
                      <option value="LSAT Wording -> Name">LSAT Answer Language → Name</option>
                      <option value="Trap Recognition">Trap Recognition</option>
                      <option value="Conditional Logic">Conditional Logic</option>
                      <option value="Causal Logic">Causal Logic</option>
                      <option value="Abstract Description">Abstract Description</option>
                    </>
                  ) : (
                    <option value="Difference Check">Difference Check</option>
                  )}
                </select>
              </div>
            </div>

              {/* Right side: Status */}
            <div className="flex flex-col md:items-end w-full md:w-auto shrink-0 pt-2 md:pt-0 gap-2">
              <div className="flex items-center gap-3">
                {activeFlawFilter === 'All' && filteredCards.length > 0 && (
                  <button 
                    onClick={handleReshuffle}
                    className="text-[9px] uppercase tracking-widest font-bold text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors border border-[#1a1a1a]/10 px-2 py-1 rounded-sm bg-white"
                  >
                    ↺ Reshuffle Deck
                  </button>
                )}
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/60 text-right">
                  {activeFlawFilter === 'All' ? 'Mixed Review' : 'Focused Review'}
                </span>
              </div>
              
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/80 text-right">
                Card {filteredCards.length > 0 ? currentIndex + 1 : 0} <span className="font-normal text-[#1a1a1a]/40 mx-1">of</span> {filteredCards.length}
              </span>
              
              {filteredCards.length > 0 && (
                <div className="w-full md:w-32 h-[3px] bg-[#1a1a1a]/5 mt-1 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#1a1a1a]/40 transition-all duration-300" 
                    style={{ width: `${((currentIndex + 1) / filteredCards.length) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full flex flex-col items-center justify-center min-h-[460px] p-6 md:p-12 relative overflow-hidden">
          {filteredCards.length === 0 ? (
            <div className="text-center">
              <p className="text-[#1a1a1a]/60 font-light">No cards match this filter.</p>
              <p className="text-[#1a1a1a]/40 text-sm mt-1">Try another group, flaw, or card type.</p>
            </div>
          ) : (
            <div className="w-full max-w-2xl flex flex-col items-center">
              
              {/* Flashcard */}
              <div 
                className="w-full aspect-[4/3] md:aspect-[3/2] cursor-pointer perspective-1000 relative group"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div 
                  className="w-full h-full duration-500 preserve-3d"
                  style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                >
                  {/* Front */}
                  <div className="absolute inset-0 backface-hidden bg-white border border-[#1a1a1a]/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-center items-center text-center p-8 md:p-14 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                    <div className="space-y-6">
                      <p className="font-serif text-2xl md:text-3xl leading-relaxed text-[#1a1a1a]">
                        {currentCard.front}
                      </p>
                      
                      <div className="pt-8 border-t border-[#1a1a1a]/5">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/40 block mb-2">Task:</span>
                        <p className="text-sm italic text-[#1a1a1a]/70 max-w-sm mx-auto">
                          {getCardLabels(currentCard.cardType).task}
                        </p>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-6 w-full flex justify-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 bg-[#1a1a1a]/5 px-4 py-2 rounded-full group-hover:bg-[#1a1a1a] group-hover:text-white transition-all">
                        Reveal Answer
                      </p>
                    </div>
                  </div>

                  {/* Back */}
                  <div 
                    className="absolute inset-0 backface-hidden bg-[#1a1a1a] text-[#f5f2ed] border border-[#1a1a1a] shadow-lg flex flex-col justify-center items-center text-center p-8 md:p-14"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    <div className="space-y-6 max-h-full overflow-y-auto py-8">
                       <div className="space-y-6">
                        <div className="border-b border-white/10 pb-4">
                          <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/40 block mb-1">The Fallacy</span>
                          <h4 className="text-3xl font-serif tracking-tighter italic text-white">
                            {currentCard.back.flawName}
                          </h4>
                        </div>
                        
                        <div className="space-y-6 px-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 block mb-1">
                              {currentCard.back.mainAnswerLabel}
                            </span>
                            <p className="text-xl text-white/90 leading-relaxed font-serif">
                              {currentCard.back.mainAnswer}
                            </p>
                          </div>

                          {currentCard.back.secondaryInfo && (
                             <div>
                               <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 block mb-1">
                                 {currentCard.back.secondaryInfoLabel}
                               </span>
                               <p className="text-base text-white/80 leading-relaxed font-light italic">
                                 {currentCard.back.secondaryInfo}
                               </p>
                             </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-8 border-t border-white/10 max-w-[320px] mx-auto">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block mb-2 font-mono tracking-[0.3em]">Quick Test</span>
                        <p className="text-sm text-white/70 italic font-serif leading-relaxed">
                          {currentCard.back.quickTest}
                        </p>
                      </div>
                    </div>

                    <div className="absolute bottom-6 w-full flex flex-col items-center gap-4">
                      {currentStatus && (
                        <span className={`text-[10px] uppercase font-bold tracking-[0.1em] px-3 py-1 rounded-sm ${currentStatus === 'got_it' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                          {currentStatus === 'got_it' ? '✓ Got It' : '↺ Review Again'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="w-full flex justify-between items-center mt-10">
                <button 
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-5 py-2.5 border border-[#1a1a1a]/15 text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors bg-transparent rounded-sm"
                >
                  ← Prev
                </button>
                
                <div className={`flex gap-3 transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                  <button
                    onClick={() => handleSetStatus('review_again')}
                    className="px-6 py-2.5 bg-white border border-[#1a1a1a]/20 hover:border-[#1a1a1a]/50 text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a] transition-colors rounded-sm shadow-sm"
                  >
                    Review Again
                  </button>
                  <button
                    onClick={() => handleSetStatus('got_it')}
                    className="px-6 py-2.5 bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/80 text-[11px] font-bold uppercase tracking-wider transition-colors rounded-sm shadow-sm"
                  >
                    Got It
                  </button>
                </div>

                <button 
                  onClick={handleNext}
                  disabled={currentIndex === filteredCards.length - 1}
                  className="px-5 py-2.5 border border-[#1a1a1a]/15 text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors bg-transparent rounded-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
