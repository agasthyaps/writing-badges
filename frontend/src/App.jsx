import React, { useState, useEffect, useRef } from 'react';
import { Award, ArrowRight, Loader2, RefreshCw, X } from 'lucide-react';

const ExpandableBadgeCriteria = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div 
        className={`
          text-sm font-bold text-emerald-500 text-center
          transition-all duration-300 ease-in-out
          ${isExpanded ? 'opacity-0' : 'opacity-100'}
        `}
      >
        criteria discovered!
      </div>
      
      <div 
        className={`
          absolute top-0 left-0 right-0
          text-sm text-gray-600 text-center
          bg-white px-2 py-1 rounded-md shadow-sm
          transition-all duration-300 ease-in-out
          z-50
          ${isExpanded 
            ? 'opacity-100 transform scale-100' 
            : 'opacity-0 transform scale-95 pointer-events-none'
          }
        `}
      >
        {text}
      </div>
    </div>
  );
};

let initializationPromise = null;

const WritingApp = () => {
  const [writingType, setWritingType] = useState(null);
  const [submission, setSubmission] = useState('');
  const [badges, setBadges] = useState([]);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hints, setHints] = useState([]);
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [animatingBadges, setAnimatingBadges] = useState(new Set());
  const [showHintNotification, setShowHintNotification] = useState(false);
  const [showNoBadgesToast, setShowNoBadgesToast] = useState(false);
  const [noBadgeAttempts, setNoBadgeAttempts] = useState(0);
  const [showClueToast, setShowClueToast] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [discoveredCriteria, setDiscoveredCriteria] = useState(new Set());

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Helper function to get first sentence
  const getFirstSentence = (text) => {
    // Match for sentence endings: period, exclamation, or question mark followed by space or end of string
    const match = text.match(/^[^.!?]+[.!?](?:\s|$)/);
    return match ? match[0].trim() : text;
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // If there's no existing initialization promise, create one
        if (!initializationPromise) {
          initializationPromise = (async () => {
            // Get writing type
            const typeResponse = await fetch(`${API_URL}/writing-type`);
            const typeData = await typeResponse.json();
            
            // Get badges
            const badgesResponse = await fetch(`${API_URL}/generate-badges?writing_type_id=${typeData.writingType.id}`);
            const badgesData = await badgesResponse.json();
            
            return {
              writingType: typeData.writingType,
              badges: badgesData.badges.map(badge => ({
                ...badge,
                earned: false,
                hasGrantedHint: false
              }))
            };
          })();
        }

        // Both renders will use the same promise
        const data = await initializationPromise;
        setWritingType(data.writingType);
        setBadges(data.badges);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
    
    // Cleanup function to reset the promise when component unmounts
    return () => {
      initializationPromise = null;
    };
  }, []);

  const handleBadgeEarned = (badgeId) => {
    setAnimatingBadges(prev => new Set([...prev, badgeId]));
    setTimeout(() => {
      setAnimatingBadges(prev => {
        const newSet = new Set(prev);
        newSet.delete(badgeId);
        return newSet;
      });
    }, 1000);
  };

  const requestHint = async () => {
    if (hints.length >= 2 || isRequestingHint) return;
    
    setIsRequestingHint(true);
    try {
      setHints(prev => [...prev, { text: '', isUsed: false }]);
      setShowHintNotification(true);
      setTimeout(() => setShowHintNotification(false), 2000);
    } catch (error) {
      console.error('Failed to get hint:', error);
    } finally {
      setIsRequestingHint(false);
    }
  };

  const handlePlayAgain = () => {
    window.location.reload();
  };

  const useHint = async (index) => {
    if (!hints[index] || hints[index].isUsed) return;

    try {
      const unearnedBadges = badges.filter(badge => !badge.earned);
      const randomBadge = unearnedBadges[Math.floor(Math.random() * unearnedBadges.length)];
      
      const response = await fetch(`${API_URL}/get-hint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission: submission,
          writingType: writingType,
          badges: [randomBadge]
        })
      });

      const data = await response.json();
      const newLine = data.hint;
      
      // Simply append the hint to the submission
      setSubmission(prev => {
        const needsNewline = prev.trim().length > 0 && !prev.endsWith('\n');
        return `${prev}${needsNewline ? '\n' : ''}${newLine}`;
      });
      
      setHints(prev => prev.map((hint, i) => 
        i === index ? { ...hint, text: newLine, isUsed: true } : hint
      ));

    } catch (error) {
      console.error('Failed to get hint:', error);
      alert('Failed to get hint. Please try again.');
    }
  };

  const evaluateSubmission = async (text) => {
  try {
    const response = await fetch(`${API_URL}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submission: text,
        writingType: writingType,
        badges: badges.map(({ id, name, criteria }, index) => ({ 
          id, 
          name, 
          criteria,
          badge_number: index + 1
        }))
      })
    });

    const data = await response.json();
    
    // Map our existing badges to include the new scores
    return badges.map((badge, index) => ({
      ...badge,
      earned: parseInt(data[`badge_${index + 1}`].earned)
    }));
  } catch (error) {
    console.error('Evaluation failed:', error);
    alert('Failed to evaluate submission. Please try again.');
    return badges;
  }
  };

  const handleSubmit = async () => {
    if (!submission.trim()) {
      alert('Please write something before submitting!');
      return;
    }
    
    setIsEvaluating(true);
    setAttemptCount(prev => prev + 1);
    
    const evaluatedBadges = await evaluateSubmission(submission);

    // Check for newly fully-earned badges (score of 2) for discovered criteria
    const previouslyEarned = new Set(badges.map(b => b.earned === 2 ? b.id : null));
    const newlyEarned = evaluatedBadges.filter(badge => 
      badge.earned === 2 && !previouslyEarned.has(badge.id)
    );

    // Animate all badges that were earned in this submission
    evaluatedBadges.filter(badge => badge.earned === 2)
    .forEach(badge => handleBadgeEarned(badge.id));
    
    if (newlyEarned.length > 0) {
      setDiscoveredCriteria(prev => {
        const newSet = new Set(prev);
        newlyEarned.forEach(badge => newSet.add(badge.id));
        return newSet;
      });
      if (hints.length < 2) {
        requestHint();
      }
    }
    
    setBadges(evaluatedBadges);
    
    // Update winning condition to check for all badges being fully earned (2)
    if (evaluatedBadges.every(badge => badge.earned === 2)) {
      setIsCelebrating(true);
      setNoBadgeAttempts(0);
    } else if (newlyEarned.length === 0) {
      // Increment counter when no new badges earned
      const newAttemptCount = noBadgeAttempts + 1;
      setNoBadgeAttempts(newAttemptCount);
      
      if (newAttemptCount >= 3) {
        // Get random unearned badge clue
        const unearnedBadges = evaluatedBadges.filter(badge => !badge.earned);
        if (unearnedBadges.length > 0) {
          const randomBadge = unearnedBadges[Math.floor(Math.random() * unearnedBadges.length)];
          setShowClueToast(true);
          setTimeout(() => setShowClueToast(false), 5000); // Show for 5 seconds
        }
        setNoBadgeAttempts(0); // Reset counter after showing clue
      } else {
        // Show regular "keep going" toast
        setShowNoBadgesToast(true);
        setTimeout(() => setShowNoBadgesToast(false), 3000);
      }
    } else {
      // Reset counter if any new badges earned
      setNoBadgeAttempts(0);
    }
    
    setIsEvaluating(false);
  };

  return (
    <div className="fixed inset-0 bg-white text-black [color-scheme:light]">
      {showInstructions && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white text-black p-8 rounded-lg max-w-md w-full mx-4 relative">
            <h2 className="text-2xl font-bold text-black mb-6 text-center">how to <span className="text-emerald-500">play</span></h2>
            
            <div className="space-y-4 mb-8 text-center">
              <p><span className="italic">try to figure out what the <span className="text-emerald-500 font-bold">mystery badges</span> mean to earn them all!</span></p>
              <p>1. Write something that you think will earn a badge <span className="font-bold">based on the information you have</span>.</p>
              <p>2. <span className="font-bold">Submit as many times as you want</span> to try earning <span className="text-emerald-500 font-bold">mystery badges</span> and <span className="text-emerald-500 font-bold">discovering their criteria</span>.</p>
              <p>3. Earning badges gets you <span className="font-bold">help!</span></p>
              <h2 className="text-2xl"><span className="">Complete the challenge by writing something that earns<span className="text-emerald-500 font-bold"> all three badges at once!</span></span></h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-3 w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
                <Loader2 className="h-4 w-4 animate-spin" />
                setting up the game...
              </div>
            ) : (
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-gray-800"
              >
                Got it!
              </button>
            )}
          </div>
        </div>
      )}

      {/* Only show loader without instructions if instructions are dismissed */}
      {isLoading && !showInstructions && (
        <div className="h-screen w-screen bg-white flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Main Content */}
      <div className="h-full max-w-3xl mx-auto px-3 sm:px-4 py-8 sm:py-16 flex flex-col bg-white text-black">
        {/* Header - Responsive text size */}
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-8 sm:mb-16 text-black text-left leading-tight">
          {writingType ? (
            <>
              {writingType.prompt.split(' ').map((word, index) => (
                <span key={index} className={
                  index === writingType.prompt.split(' ').length - 1
                  ? "text-emerald-500" 
                  : "text-black"
                }>
                  {word}{' '}
                </span>
              ))}
            </>
          ) : (
            'loading...'
          )}
        </h1>
  
        {/* Badges - Responsive spacing */}
        <div className="flex justify-between sm:justify-start sm:gap-20 mb-8 sm:mb-12 px-2">
          {badges.map(badge => (
            <div key={badge.id} className="flex flex-col items-center gap-2 sm:gap-3">
              <div className="relative">
                {/* Base circle - Smaller on mobile */}
                <div 
                  className={`
                    w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 flex items-center justify-center bg-white
                    ${badge.earned === 2 ? 'border-yellow-400' : 'border-gray-300'}
                    transition-colors duration-300
                    ${animatingBadges.has(badge.id) ? 'animate-[bounce_1s_ease-in-out]' : ''}
                  `}
                >
                  {badge.earned === 2 ? (
                    <span className="text-2xl sm:text-3xl relative z-10">{badge.icon}</span>
                  ) : (
                    <span className="text-3xl sm:text-4xl text-gray-400 relative z-10">?</span>
                  )}
                </div>

                {/* Half-earned overlay */}
                {badge.earned === 1 && (
                  <>
                    <div 
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
                      }}
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500 opacity-75" />
                    </div>
                    
                    {/* Hover text - Adjusted positioning */}
                    <div className="absolute inset-0 group">
                      <div className="
                        invisible group-hover:visible
                        absolute left-1/2 -translate-x-1/2 -bottom-12 sm:-bottom-16
                        bg-black text-white text-xs sm:text-sm rounded-lg py-1 sm:py-2 px-2 sm:px-3
                        whitespace-nowrap
                        opacity-0 group-hover:opacity-100
                        transition-opacity duration-200
                        max-w-[200px] sm:max-w-none text-center
                      ">
                        Something about your last submission half-earned this badge... 🤔
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm sm:text-base font-medium text-center text-black">
                  {badge.name}
                </span>
                {discoveredCriteria.has(badge.id) && (
                  <ExpandableBadgeCriteria text={badge.criteria} />
                )}
              </div>
            </div>
          ))}
        </div>
  
        {/* Writing Area */}
        <div className="flex-1 mb-8 sm:mb-12">
          <textarea
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            className="w-full h-full text-xl sm:text-2xl focus:outline-none resize-none bg-transparent relative text-black leading-normal"
            placeholder="Start writing here..."
            style={{
              caretColor: 'black'
            }}
          />
        </div>
  
        {/* Footer Area - Adjusted for mobile */}
        <div className="relative h-16 sm:h-20">
          {/* Notification Toast */}
          <div
            className={`
              absolute -top-12 left-1/2 -translate-x-1/2
              bg-black text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg
              transition-all duration-300 ease-in-out text-sm sm:text-base
              ${showHintNotification 
                ? 'opacity-100 transform translate-y-0' 
                : 'opacity-0 transform translate-y-4 pointer-events-none'
              }
            `}
          >
            New hint unlocked! 🎉
          </div>
  
          <div className="flex items-center justify-between">
            {/* Hints - Smaller on mobile */}
            <div className="flex gap-2 sm:gap-4">
              {[...Array(2)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => useHint(index)}
                  className={`
                    w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-all duration-300
                    ${hints[index] 
                      ? hints[index].isUsed
                        ? 'bg-gray-200 cursor-not-allowed opacity-50'
                        : 'bg-yellow-100 hover:bg-yellow-200 cursor-pointer'
                      : 'bg-gray-200 opacity-30 cursor-not-allowed'
                    }
                  `}
                  disabled={!hints[index] || hints[index].isUsed || isEvaluating}
                >
                  {isEvaluating ? (
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                  ) : (
                    '💡'
                  )}
                </button>
              ))}
            </div>

            {/* Submit Button - Smaller on mobile */}
            <button 
              onClick={handleSubmit}
              disabled={isEvaluating}
              className="absolute bottom-4 sm:bottom-6 right-0 sm:right-4 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white border-2 border-black flex items-center justify-center transition-opacity duration-200"
            >
              {isEvaluating ? (
                <Loader2 className="h-8 w-8 animate-spin text-black" />
              ) : (
                <ArrowRight className="h-8 w-8 sm:h-10 sm:w-10 text-black stroke-[1.5]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Messages - Adjusted for mobile */}
      <div
        className={`
          fixed bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2
          bg-black text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full
          transition-all duration-300 ease-in-out
          flex items-center gap-2 max-w-[90%] sm:max-w-none
          ${showClueToast 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
      >
        <span className="text-lg sm:text-xl mr-1 sm:mr-2">💡</span>
        <span className="text-sm sm:text-base">
          Try this: {badges.find(b => !b.earned)?.clue}
        </span>
      </div>

      {/* Keep trying toast */}
      <div
        className={`
          fixed bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2
          bg-black text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full
          transition-all duration-300 ease-in-out
          flex items-center gap-2 max-w-[90%] sm:max-w-none
          ${showNoBadgesToast && !showClueToast
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
      >
        <span className="text-sm sm:text-base">
          Keep going! Try adding more detail or creativity to earn badges.
        </span>
      </div>

      {/* Celebration Modal - Added mobile padding */}
      {isCelebrating && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg text-center max-w-md w-full mx-4">
            <h2 className="text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6">Congratulations!</h2>
            
            <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
              <div className="text-left space-y-2">
                {badges.map(badge => (
                  <div key={badge.id} className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl">{badge.icon}</span>
                    <span className="text-sm sm:text-base text-black">
                      <span className="font-medium">{badge.name}:</span> {badge.criteria}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-gray-600 text-sm sm:text-base">
                Completed in {attemptCount} {attemptCount === 1 ? 'attempt' : 'attempts'}
              </p>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setIsCelebrating(false)}
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 text-sm sm:text-base"
              >
                Keep Editing
              </button>
              <button
                onClick={handlePlayAgain}
                className="flex-1 px-3 sm:px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-500 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
              >
                <RefreshCw className="h-4 w-4" />
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WritingApp;