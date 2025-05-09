import React, { useState, useEffect, useRef } from 'react';
import { Award, ArrowRight, Loader2, RefreshCw, X } from 'lucide-react';
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  RedditShareButton,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
  RedditIcon,
} from 'react-share';

const FeedbackPanel = ({ feedback, isVisible, onDismiss }) => {
  if (!feedback) return null;

  return (
    <div className={`
      fixed left-1/2 bottom-8 transform -translate-x-1/2
      transition-all duration-500 ease-in-out
      z-40 w-full max-w-xl px-4
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}
    `}>
      <div className="
        bg-white rounded-xl shadow-xl
        border border-gray-200
        p-4 sm:p-6
      ">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 text-base sm:text-lg text-gray-700 leading-relaxed">
            {feedback}
          </div>
          
          <button 
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Dismiss feedback"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

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
          flex items-center justify-center gap-1.5
          ${isExpanded ? 'opacity-0' : 'opacity-100'}
        `}
      >
        <Award className="h-4 w-4" />
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
  const [hints, setHints] = useState([{ text: '', isUsed: false }]); // Initialize with one hint
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [animatingBadges, setAnimatingBadges] = useState(new Set());
  const [showHintNotification, setShowHintNotification] = useState(false);
  const [showNoBadgesToast, setShowNoBadgesToast] = useState(false);
  const [noBadgeAttempts, setNoBadgeAttempts] = useState(0);
  const [showClueToast, setShowClueToast] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [discoveredCriteria, setDiscoveredCriteria] = useState(new Set());
  const [feedback, setFeedback] = useState('');
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
  const [showAssistHint, setShowAssistHint] = useState(false);
  const [clickedAssist, setClickedAssist] = useState(null);
  const inactivityTimerRef = useRef(null);
  const [pendingAssistCount, setPendingAssistCount] = useState(0);  // Track newly earned assists
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [shareCardUrl, setShareCardUrl] = useState('');
  const [hasGeneratedCard, setHasGeneratedCard] = useState(false);
  const [showCriteriaDetails, setShowCriteriaDetails] = useState(false);
  const [shareFallback, setShareFallback] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (!initializationPromise) {
          initializationPromise = (async () => {
            const typeResponse = await fetch(`${API_URL}/writing-type`);
            const typeData = await typeResponse.json();
            
            const badgesResponse = await fetch(`${API_URL}/generate-badges?writing_type_id=${typeData.writingType.id}`);
            const badgesData = await badgesResponse.json();
            
            // Get initial hint for the free assist
            const hintResponse = await fetch(`${API_URL}/get-hint`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                submission: '',
                writingType: typeData.writingType,
                badges: badgesData.badges
              })
            });
            const hintData = await hintResponse.json();
            
            return {
              writingType: typeData.writingType,
              badges: badgesData.badges.map(badge => ({
                ...badge,
                earned: false,
                hasGrantedHint: false
              })),
              initialHint: hintData.hint
            };
          })();
        }

        const data = await initializationPromise;
        setWritingType(data.writingType);
        setBadges(data.badges);
        // Initialize with one unused hint
        setHints([{ 
          text: data.initialHint, 
          isUsed: false,
          targetBadge: data.badges[Math.floor(Math.random() * data.badges.length)]
        }]);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
    
    return () => {
      initializationPromise = null;
    };
  }, []);

  useEffect(() => {
    const startInactivityTimer = () => {
      // Clear any existing timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      // Set new timer - show hint after 8 seconds of inactivity
      inactivityTimerRef.current = setTimeout(() => {
        // Only show hint if no text has been entered and first assist hasn't been used
        if (!submission.trim() && hints[0] && !hints[0].isUsed) {
          setShowAssistHint(true);
        }
      }, 8000);
    };

    // Start timer on mount
    startInactivityTimer();

    // Reset timer when user types or uses assist
    const resetTimer = () => {
      setShowAssistHint(false);
      startInactivityTimer();
    };

    // Add event listeners for user activity
    document.addEventListener('keypress', resetTimer);
    document.addEventListener('mousedown', resetTimer);

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      document.removeEventListener('keypress', resetTimer);
      document.removeEventListener('mousedown', resetTimer);
    };
  }, [submission, hints]);

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
    if (hints.length >= 3 || isRequestingHint) return;
    
    setIsRequestingHint(true);
    try {
      const unearnedBadges = badges.filter(badge => !badge.earned);
      const randomBadge = unearnedBadges[Math.floor(Math.random() * unearnedBadges.length)];
      
      setHints(prev => [...prev, { 
        text: '', 
        isUsed: false,
        targetBadge: randomBadge
      }]);
      // Note: We no longer set showHintNotification here
    } catch (error) {
      console.error('Failed to get hint:', error);
    } finally {
      setIsRequestingHint(false);
    }
  };

  const useHint = async (index) => {
    if (!hints[index] || hints[index].isUsed) return;
    
    setClickedAssist(index);
    
    try {
      const hint = hints[index];
      
      const response = await fetch(`${API_URL}/get-hint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission: submission,
          writingType: writingType,
          badges: [
            {
              id: hint.targetBadge.id,
              name: hint.targetBadge.name,
              criteria: hint.targetBadge.criteria
            }
          ]
        })
      });

      const data = await response.json();
      const newLine = data.hint;
      
      setSubmission(prev => {
        const needsNewline = prev.trim().length > 0 && !prev.endsWith('\n');
        return `${prev}${needsNewline ? '\n' : ''}${newLine}`;
      });
      
      setHints(prev => prev.map((hint, i) => 
        i === index ? { ...hint, text: newLine, isUsed: true } : hint
      ));

      setShowAssistHint(false);

    } catch (error) {
      console.error('Failed to get hint:', error);
      alert('Failed to get hint. Please try again.');
    } finally {
      setClickedAssist(null);
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

    if (data.final_feedback) {
      setFeedback(data.final_feedback);
      setIsFeedbackVisible(true);
    }
    
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
    
    try {
      const evaluationResult = await evaluateSubmission(submission);
      
      const previouslyEarned = new Set(badges.map(b => b.earned === 2 ? b.id : null));
      const newlyEarned = evaluationResult.filter(badge => 
        badge.earned === 2 && !previouslyEarned.has(badge.id)
      );

      evaluationResult.filter(badge => badge.earned === 2)
        .forEach(badge => handleBadgeEarned(badge.id));

      setBadges(evaluationResult);

      const allBadgesEarned = evaluationResult.every(badge => badge.earned === 2);

      if (allBadgesEarned) {
        setIsCelebrating(true);
        setNoBadgeAttempts(0);
        setIsFeedbackVisible(false);
      } else {
        if (evaluationResult.final_feedback) {
          setFeedback(evaluationResult.final_feedback);
          setIsFeedbackVisible(true);
        }

        if (newlyEarned.length > 0) {
          // Update discovered criteria
          setDiscoveredCriteria(prev => {
            const newSet = new Set(prev);
            newlyEarned.forEach(badge => newSet.add(badge.id));
            return newSet;
          });
          
          const newAssists = Math.min(3 - hints.length, newlyEarned.length);
          if (newAssists > 0) {
            setPendingAssistCount(newAssists);
            // Request the hints but don't show notification yet
            for (let i = 0; i < newAssists; i++) {
              await requestHint();
            }
          }
        } else {
          const newAttemptCount = noBadgeAttempts + 1;
          setNoBadgeAttempts(newAttemptCount);
          
          if (newAttemptCount >= 3) {
            const unearnedBadges = evaluationResult.filter(badge => !badge.earned);
            if (unearnedBadges.length > 0) {
              const randomBadge = unearnedBadges[Math.floor(Math.random() * unearnedBadges.length)];
              setShowClueToast(true);
              setTimeout(() => setShowClueToast(false), 5000);
            }
            setNoBadgeAttempts(0);
          } else {
            setShowNoBadgesToast(true);
            setTimeout(() => setShowNoBadgesToast(false), 3000);
          }
        }
      }
    } catch (error) {
      console.error('Error during submission:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleFeedbackDismiss = () => {
    setIsFeedbackVisible(false);
    
    // Show notification about new assists after feedback is dismissed
    if (pendingAssistCount > 0) {
      setShowHintNotification(true);
      setTimeout(() => {
        setShowHintNotification(false);
        setPendingAssistCount(0);
      }, 2000);
    }
  };

  const handlePlayAgain = async () => {
    // Reset game state
    setIsLoading(true);
    setIsCelebrating(false);
    setSubmission('');
    setAttemptCount(0);
    setNoBadgeAttempts(0);
    setDiscoveredCriteria(new Set());
    setAnimatingBadges(new Set());
    setFeedback('');
    setIsFeedbackVisible(false);
    setPendingAssistCount(0);
    setShowHintNotification(false);
    setShowNoBadgesToast(false);
    setShowClueToast(false);
    setShowAssistHint(false);
    
    try {
      // Reset the initialization promise so we get fresh data
      initializationPromise = null;
      
      // Get new writing type
      const typeResponse = await fetch(`${API_URL}/writing-type`);
      const typeData = await typeResponse.json();
      setWritingType(typeData.writingType);
      
      // Get new badges
      const badgesResponse = await fetch(`${API_URL}/generate-badges?writing_type_id=${typeData.writingType.id}`);
      const badgesData = await badgesResponse.json();
      setBadges(badgesData.badges.map(badge => ({
        ...badge,
        earned: false,
        hasGrantedHint: false
      })));
      
      // Get initial hint
      const hintResponse = await fetch(`${API_URL}/get-hint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission: '',
          writingType: typeData.writingType,
          badges: badgesData.badges
        })
      });
      const hintData = await hintResponse.json();
      
      // Reset hints with one initial hint
      setHints([{ 
        text: hintData.hint, 
        isUsed: false,
        targetBadge: badgesData.badges[Math.floor(Math.random() * badgesData.badges.length)]
      }]);
      
    } catch (error) {
      console.error('Failed to restart game:', error);
      alert('Failed to start new game. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    setShareMessage('');
    setShareCardUrl('');
    setHasGeneratedCard(false);
    setShareFallback('');

    try {
      const response = await fetch(`${API_URL}/share-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission: submission,
          writingType: writingType,
          badges: badges.map(b => ({ icon: b.icon, name: b.name})),
          attempts: attemptCount,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.url) {
        setShareCardUrl(data.url);
        setHasGeneratedCard(true);
      }
      if (data.fallback) {
        setShareFallback(data.fallback);
      }

      if (navigator.share && data.url) {
        // Fetch the image as a blob to share it as a file
        const imageResponse = await fetch(data.url);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch share image: ${imageResponse.status}`);
        }
        const blob = await imageResponse.blob();
        const file = new File([blob], "writing_badges_recap.png", { type: blob.type });

        await navigator.share({
          title: 'I wrote something!',
          text: shareFallback || `I earned all badges for "${writingType.prompt}" in ${attemptCount} attempts! Check out my submission. write.actually-useful.xyz`,
          files: [file],
        });
        setShareMessage('Shared successfully!');
      } else if (data.fallback) {
        await navigator.clipboard.writeText(data.fallback);
        setShareMessage('Fallback text copied to clipboard!');
      } else {
        setShareMessage('Sharing not available or failed.');
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      setShareMessage(`Sharing failed: ${error.message}`);
    } finally {
      setIsSharing(false);
      setTimeout(() => setShareMessage(''), 3000);
    }
  };

  // Compute absolute URL for the card image
  const absoluteUrl = shareCardUrl
    ? shareCardUrl.startsWith('http')
      ? shareCardUrl
      : API_URL.replace(/\/$/, '') + shareCardUrl
    : '';

  // Modified handleDownload to use absoluteUrl
  const handleDownload = async () => {
    if (!absoluteUrl) return;
    try {
      const response = await fetch(absoluteUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'writing_badges_card.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      // Fallback: open in new tab
      window.open(absoluteUrl, '_blank');
    }
  };

  // Modified handleCopyLink to use fallback text
  const handleCopyLink = async () => {
    if (!shareFallback) return;
    await navigator.clipboard.writeText(shareFallback);
    setShareMessage('Copied to clipboard!');
    setTimeout(() => setShareMessage(''), 2000);
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
              <p>3. Earning badges gets you <span className="font-bold">help!</span> ✏️ </p>
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
                {/* Base circle */}
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

                {/* Half-earned overlay & hover text */}
                {badge.earned === 1 ? (
                  <>
                    <div 
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
                      }}
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500 opacity-75" />
                    </div>
                    
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
                ) : !badge.earned && !discoveredCriteria.has(badge.id) && (
                  // New hover text for unearned badges
                  <div className="absolute inset-0 group">
                    <div className="
                      invisible group-hover:visible
                      absolute left-1/2 -translate-x-1/2 -bottom-12 sm:-bottom-16
                      bg-black text-white text-xs sm:text-sm rounded-lg py-1 sm:py-2 px-2 sm:px-3
                      whitespace-nowrap
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-200
                      max-w-[200px] sm:max-w-none text-center z-1000
                    ">
                      Write something and submit it to try to figure out what this badge is about!
                    </div>
                  </div>
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
          <div className={`
            absolute -top-12 left-1/2 -translate-x-1/2
            bg-black text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg
            transition-all duration-300 ease-in-out text-sm sm:text-base
            ${showHintNotification 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-4 pointer-events-none'
            }
          `}>
            ✏️ {pendingAssistCount} new {pendingAssistCount === 1 ? 'assist' : 'assists'} unlocked! ✏️
          </div>
  
          <div className="flex items-center justify-between">
            {/* Hints - Smaller on mobile */}
            <div className="relative">
              {/* Message absolutely positioned above assists */}
              {showAssistHint && (
                <div className="
                  absolute bottom-full mb-2 left-0 right-0
                  text-sm text-gray-600 
                  animate-fade-in 
                  transition-opacity duration-300
                  text-center
                ">
                  Having trouble getting started? Use an assist! ✏️
                </div>
              )}
              
              {/* Assist buttons in fixed position */}
              <div className="flex gap-2 sm:gap-4">
                {[...Array(3)].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => useHint(index)}
                    className={`
                      w-10 h-10 sm:w-12 sm:h-12 rounded-lg 
                      flex items-center justify-center 
                      transition-all duration-300
                      ${clickedAssist === index ? 'scale-90 ' : ''}
                      ${hints[index] 
                        ? hints[index].isUsed
                          ? 'bg-gray-200 cursor-not-allowed opacity-50'
                          : 'bg-yellow-100 hover:bg-yellow-200 cursor-pointer'
                        : 'bg-gray-200 opacity-30 cursor-not-allowed'
                      }
                    `}
                    disabled={!hints[index] || hints[index].isUsed || isEvaluating}
                  >
                    {isEvaluating || clickedAssist === index ? (
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                    ) : (
                      '✏️'
                    )}
                  </button>
                ))}
              </div>
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

      {/* Celebration Modal - Added mobile padding */}
      {isCelebrating && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 p-4 z-[9999]">
          <div className={`bg-white p-6 sm:p-8 rounded-lg text-center w-full mx-4 relative transition-all duration-300 ${hasGeneratedCard ? 'max-w-2xl' : 'max-w-md'}`}>
            <h2 className="text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6">Nice work! You Got All the Badges!</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">That submission got earned all the badges at once! 🎉 Go ahead -- share your work with your friends!</p>
            {/* Generate Card Button (only if not generated yet) */}
            {!hasGeneratedCard && (
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 text-base disabled:opacity-50 w-full"
              >
                {isSharing ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Share My Work
              </button>
            )}
            {/* Share Card Preview */}
            {hasGeneratedCard && absoluteUrl && (
              <div className="mb-4 flex flex-col items-center">
                <img src={absoluteUrl} alt="Share Card Preview" className="rounded-lg border border-gray-200 max-w-xs w-full" />
                <div className="text-xs text-gray-500 mt-1">Right-click to save, or use the buttons below!</div>
              </div>
            )}
            {/* Social Share Buttons */}
            {hasGeneratedCard && absoluteUrl && (
              <div className="mb-4 flex flex-wrap gap-3 justify-center items-center">
                <FacebookShareButton url={'https://write.actually-useful.xyz'} quote={shareFallback}>
                  <FacebookIcon size={40} round />
                </FacebookShareButton>
                <TwitterShareButton url={'https://write.actually-useful.xyz'} title={shareFallback}>
                  <TwitterIcon size={40} round />
                </TwitterShareButton>
                <LinkedinShareButton url={'https://write.actually-useful.xyz'} title={shareFallback} summary={shareFallback}>
                  <LinkedinIcon size={40} round />
                </LinkedinShareButton>
              </div>
            )}
            {/* Download/Copy Buttons */}
            {hasGeneratedCard && absoluteUrl && (
              <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center">
                <button
                  onClick={handleDownload}
                  className="flex-1 px-3 sm:px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  Download Image
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex-1 px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
            {/* Badge Criteria Section */}
            <div className={`mb-4 sm:mb-6 ${hasGeneratedCard ? 'space-y-2' : 'space-y-3 sm:space-y-4'}`}>
              {hasGeneratedCard ? (
                <>
                  <div className="flex flex-wrap justify-center gap-4 mb-2">
                    {badges.map(badge => (
                      <div key={badge.id} className="flex flex-col items-center gap-1 min-w-[80px]">
                        <span className="text-2xl">{badge.icon}</span>
                        <span className="text-xs font-medium text-black text-center">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="text-xs text-emerald-600 underline mb-2"
                    onClick={() => setShowCriteriaDetails(v => !v)}
                  >
                    {showCriteriaDetails ? 'Hide Details' : 'Show Details'}
                  </button>
                  {showCriteriaDetails && (
                    <div className="text-left space-y-2 max-w-2xl mx-auto">
                      {badges.map(badge => (
                        <div key={badge.id} className="flex items-start gap-2">
                          <span className="text-lg mt-0.5">{badge.icon}</span>
                          <span className="text-sm text-black">
                            <span className="font-medium">{badge.name}:</span> {badge.criteria}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
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
              )}
              <p className="text-gray-600 text-sm sm:text-base mt-2">
                Completed in {attemptCount} {attemptCount === 1 ? 'attempt' : 'attempts'}
              </p>
            </div>
            {shareMessage && (
                <p className="text-sm text-gray-700 mb-3">{shareMessage}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
              <button
                onClick={() => setIsCelebrating(false)}
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 text-sm sm:text-base"
              >
                Keep Editing
              </button>
              <button
                onClick={handlePlayAgain}
                className="flex-1 px-3 sm:px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
              >
                <RefreshCw className="h-4 w-4" />
                Play Again
              </button>
            </div>
          </div>
        </div>
      )} 
      {/* Feedback Panel */}
      <FeedbackPanel 
        feedback={feedback}
        isVisible={isFeedbackVisible}
        onDismiss={handleFeedbackDismiss}
      />
    </div>
  );
};

export default WritingApp;