import React, { useState, useEffect, useRef } from 'react';
import { Award, ArrowRight, Loader2, RefreshCw, X } from 'lucide-react';

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
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      // First get the writing type
      const typeResponse = await fetch(`${API_URL}/writing-type`);
      const typeData = await typeResponse.json();
      setWritingType(typeData.writingType);
      
      // Then get badges for this writing type
      const badgesResponse = await fetch(`${API_URL}/generate-badges?writing_type_id=${typeData.writingType.id}`);
      const badgesData = await badgesResponse.json();
      setBadges(badgesData.badges.map(badge => ({
        ...badge,
        earned: false,
        hasGrantedHint: false
      })));
    } catch (error) {
      console.error('Failed to initialize app:', error);
      // ... fallback handling ...
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeApp();
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
      const previouslyEarned = new Set(badges.filter(b => b.earned).map(b => b.id));
      
      const newlyEarnedBadges = badges.map(badge => {
        const isEarned = data.earnedBadges.includes(badge.id);
        const isNewlyEarned = isEarned && !previouslyEarned.has(badge.id);
        
        if (isNewlyEarned) {
          handleBadgeEarned(badge.id);
          if (!badge.hasGrantedHint && hints.length < 2) {
            requestHint();
          }
        }

        return {
          ...badge,
          earned: isEarned,
          hasGrantedHint: badge.hasGrantedHint || (isNewlyEarned && hints.length < 2)
        };
      });

      return newlyEarnedBadges;
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
    
    // Check if any new badges were earned
    const previouslyEarned = new Set(badges.map(b => b.earned ? b.id : null));
    const newlyEarned = evaluatedBadges.filter(badge => 
      badge.earned && !previouslyEarned.has(badge.id)
    );
    
    setBadges(evaluatedBadges);
    
    if (evaluatedBadges.every(badge => badge.earned)) {
      setIsCelebrating(true);
      setNoBadgeAttempts(0); // Reset counter on full completion
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

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white">
      <div className="h-full max-w-3xl mx-auto px-4 py-16 flex flex-col">
        {/* Header */}
        <h1 className="text-8xl font-bold mb-16 text-black text-left">
        {writingType ? (
            <>
              {writingType.prompt.split(' ').map((word, index) => (
                <span key={index} className={
                  index === writingType.prompt.split(' ').length - 1  // last word
                  ? "text-emerald-400" 
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
  
        {/* Badges */}
        <div className="flex gap-20 mb-12 ml-4">
          {badges.map(badge => (
            <div key={badge.id} className="flex flex-col items-center gap-3">
              <div 
                className={`
                  w-20 h-20 rounded-full border-2 flex items-center justify-center bg-white
                  ${badge.earned ? 'border-yellow-400' : 'border-gray-300'}
                  ${animatingBadges.has(badge.id) ? 'animate-[bounce_1s_ease-in-out]' : ''}
                  transition-colors duration-300
                `}
              >
                {badge.earned ? (
                  <span className="text-3xl">{badge.icon}</span>
                ) : (
                  <span className="text-4xl text-gray-400">?</span>
                )}
              </div>
              <span className="text-base font-medium text-center text-black">{badge.name}</span>
            </div>
          ))}
        </div>
  
        {/* Writing Area - Takes remaining space */}
        <div className="flex-1 relative mb-12">
          <textarea
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            className="w-full h-full text-2xl focus:outline-none resize-none bg-transparent relative text-black leading-normal"
            placeholder="Start writing here..."
            style={{
              caretColor: 'black'
            }}
          />
          <button 
            onClick={handleSubmit}
            disabled={isEvaluating}
            className="absolute bottom-6 right-4 h-15 w-15 rounded-full bg-white border-2 border-black flex items-center justify-center transition-opacity duration-200"
          >
            {isEvaluating ? (
              <Loader2 className="h-8 w-8 animate-spin text-black" />
            ) : (
              <ArrowRight className="h-10 w-10 text-black stroke-[1.5]" />
            )}
          </button>
        </div>
  
        {/* Hints */}
        <div className="relative h-20">
          <div
            className={`
              absolute -top-12 left-1/2 -translate-x-1/2
              bg-black text-white px-4 py-2 rounded-lg
              transition-all duration-300 ease-in-out
              ${showHintNotification 
                ? 'opacity-100 transform translate-y-0' 
                : 'opacity-0 transform translate-y-4 pointer-events-none'
              }
            `}
          >
            New hint unlocked! 🎉
          </div>
  
          <div className="flex gap-4 justify-center">
            {[...Array(2)].map((_, index) => (
              <button
                key={index}
                onClick={() => useHint(index)}
                className={`
                  w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300
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
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  '💡'
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clue Toast */}
      <div
        className={`
          fixed bottom-8 left-1/2 transform -translate-x-1/2
          bg-black text-white px-6 py-3 rounded-full
          transition-all duration-300 ease-in-out
          flex items-center gap-2
          ${showClueToast 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
      >
        <span className="text-xl mr-2">💡</span>
        <span className="text-base">
          Try this: {badges.find(b => !b.earned)?.clue}
        </span>
      </div>

      {/* keep trying toast */}
      <div
        className={`
          fixed bottom-8 left-1/2 transform -translate-x-1/2
          bg-black text-white px-6 py-3 rounded-full
          transition-all duration-300 ease-in-out
          flex items-center gap-2
          ${showNoBadgesToast && !showClueToast  // Don't show if clue toast is visible
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
      >
        <span className="text-base">Keep going! Try adding more detail or creativity to earn badges.</span>
      </div>

      {isCelebrating && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg text-center max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-black mb-6">Congratulations!</h2>
            
            <div className="mb-6 space-y-4">
              <div className="text-left space-y-2">
                {badges.map(badge => (
                  <div key={badge.id} className="flex items-center gap-2">
                    <span className="text-xl">{badge.icon}</span>
                    <span className="text-black">
                      <span className="font-medium">{badge.name}:</span> {badge.criteria}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-gray-600">
                Completed in {attemptCount} {attemptCount === 1 ? 'attempt' : 'attempts'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsCelebrating(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Keep Editing
              </button>
              <button
                onClick={handlePlayAgain}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center justify-center gap-2"
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