'use client';

import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagicBento, BentoCard } from '@/components/MagicBento';
import { FuturisticButton } from '@/components/FuturisticButton';
import { DecryptedText } from '@/components/DecryptedText';

// Mode descriptions for the UI
const MODE_DESCRIPTIONS = {
  'question-research': 'Optimized for research queries, fact-finding, and evidence-based analysis with source attribution.',
  'report-writing': 'Structured document creation with executive summaries, methodology sections, and change tracking.',
  'coding-agent': 'Technical implementation with modular code generation, testing, and deployment guides.',
  'multi-tool-agent': 'Complex workflow orchestration with tool chaining, error recovery, and audit logging.',
  'document-rewriting': 'Professional document transformation - converts informal text into polished, grammatically correct content with improved structure and sequential order.',
  'content-generation': 'Creative content creation including articles, blogs, marketing copy, and storytelling.',
  'framework-optimization': 'Advanced prompt engineering using established frameworks (RACE, CRISP, Chain-of-Thought) for maximum clarity and effectiveness.',
  'context-engineering': 'Advanced context optimization and information orchestration with sophisticated context analysis, compression, and strategic positioning for maximum AI effectiveness.',
  'ultimate-mode': 'The pinnacle of prompt engineering - combines structured 6-part framework methodology with advanced context engineering principles for maximum sophistication and effectiveness.'
};

// Optimized Particle background component with reduced particles
const ParticleBackground = React.memo(function ParticleBackground() {
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);

  const generateParticles = useCallback(() => {
    return Array.from({ length: 8 }, (_, i) => ({ // Reduced from 20 to 8
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 4 // Reduced delay range
    }));
  }, []);

  useEffect(() => {
    setParticles(generateParticles());
  }, [generateParticles]);

  return (
    <div className="particles">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: '#00B4B4', // Subdued cyan
          }}
          animate={{
            y: [0, -15, 0], // Reduced movement
            opacity: [0.2, 0.5, 0.2], // Reduced opacity
            scale: [1, 1.1, 1], // Reduced scale change
          }}
          transition={{
            duration: 4, // Reduced from 6
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
});

export default function Home() {
  const [userPrompt, setUserPrompt] = useState('');
  const [rewrittenPrompt, setRewrittenPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState('question-research');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [enableWebAccess, setEnableWebAccess] = useState(false);
  const [webSources, setWebSources] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [animationTrigger, setAnimationTrigger] = useState(0);
  
  // New state for auto theme switching
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('dark');
  const [autoThemeActive, setAutoThemeActive] = useState(false);

  // Spell check state
  const [spellCheckResults, setSpellCheckResults] = useState<string[]>([]);
  const [showSpellCheck, setShowSpellCheck] = useState(false);

  // Memoize content mode calculation
  const isContentMode = useMemo(() =>
    selectedMode === 'content-generation' || selectedMode === 'document-rewriting',
    [selectedMode]
  );

  // Enhanced spell check function that actually corrects the text
  const performSpellCheck = useCallback(() => {
    if (!userPrompt.trim()) {
      setSpellCheckResults(['No text to check']);
      setShowSpellCheck(true);
      return;
    }

    // Comprehensive spell check using common misspellings
    const commonMisspellings: { [key: string]: string } = {
      // Common letter swaps and typos
      'teh': 'the',
      'hte': 'the',
      'adn': 'and',
      'si': 'is',
      'fo': 'of',
      'ot': 'to',
      'taht': 'that',
      'thsi': 'this',
      'jsut': 'just',
      'cna': 'can',
      'woudl': 'would',
      'shoudl': 'should',
      'coudl': 'could',
      'whcih': 'which',
      'wich': 'which',
      'waht': 'what',
      'wnat': 'want',
      'dont': "don't",
      'wont': "won't",
      'cant': "can't",
      'isnt': "isn't",
      'wasnt': "wasn't",
      'werent': "weren't",
      'didnt': "didn't",
      'doesnt': "doesn't",
      'hasnt': "hasn't",
      'havent': "haven't",
      'shouldnt': "shouldn't",
      'wouldnt': "wouldn't",
      'couldnt': "couldn't",

      // Common spelling mistakes
      'recieve': 'receive',
      'seperate': 'separate',
      'definately': 'definitely',
      'occured': 'occurred',
      'neccessary': 'necessary',
      'accomodate': 'accommodate',
      'beleive': 'believe',
      'acheive': 'achieve',
      'wierd': 'weird',
      'freind': 'friend',
      'thier': 'their',
      'youre': "you're",
      'its': "it's",
      'loose': 'lose',
      'affect': 'effect',
      'then': 'than',
      'alot': 'a lot',
      'allot': 'a lot',
      'becuase': 'because',
      'becasue': 'because',
      'beacuse': 'because',
      'begining': 'beginning',
      'comming': 'coming',
      'goverment': 'government',
      'enviroment': 'environment',
      'managment': 'management',
      'developement': 'development',
      'arguement': 'argument',
      'judgement': 'judgment',
      'occassion': 'occasion',
      'embarass': 'embarrass',
      'harrass': 'harass',
      'mispell': 'misspell',
      'untill': 'until',
      'sucessful': 'successful',
      'sucessfully': 'successfully',
      'tommorow': 'tomorrow',
      'tommorrow': 'tomorrow'
    };

    let correctedText = userPrompt;
    let correctionsCount = 0;
    const corrections: string[] = [];

    // Process each word and apply corrections using safer string replacement
    Object.entries(commonMisspellings).forEach(([misspelled, correct]) => {
      // Use case-insensitive replacement with word boundaries
      const regex = new RegExp(`\\b${misspelled.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const beforeReplace = correctedText;
      correctedText = correctedText.replace(regex, correct);

      // Check if any replacements were made
      if (beforeReplace !== correctedText) {
        corrections.push(`"${misspelled}" → "${correct}"`);
        correctionsCount++;
      }
    });

    // Update the user prompt with corrected text
    if (correctionsCount > 0) {
      setUserPrompt(correctedText);
      setSpellCheckResults([
        `✅ Applied ${correctionsCount} correction(s):`,
        ...corrections,
        '',
        '📝 Text has been updated in the input field!'
      ]);
    } else {
      setSpellCheckResults(['✅ No common spelling errors found!']);
    }
    setShowSpellCheck(true);
  }, [userPrompt]);

  // Memoize mode description
  const currentModeDescription = useMemo(() => 
    MODE_DESCRIPTIONS[selectedMode as keyof typeof MODE_DESCRIPTIONS],
    [selectedMode]
  );

  // Function to determine if it should be dark mode based on time
  const shouldBeDarkMode = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    // Dark mode from 6 PM (18:00) to 6 AM (06:00)
    return hour >= 18 || hour < 6;
  }, []);

  // Function to get the display text for current theme mode
  const getThemeModeDisplay = useCallback(() => {
    switch (themeMode) {
      case 'light':
        return { icon: '☀️', text: 'Light' };
      case 'dark':
        return { icon: '🌙', text: 'Dark' };
      case 'auto':
        const isAutoDark = shouldBeDarkMode();
        return { 
          icon: isAutoDark ? '🌙' : '☀️', 
          text: `Auto (${isAutoDark ? 'Dark' : 'Light'})` 
        };
      default:
        return { icon: '🌙', text: 'Dark' };
    }
  }, [themeMode, shouldBeDarkMode]);

  // Load theme preferences on mount
  useEffect(() => {
    // Load saved theme mode preference
    const savedThemeMode = localStorage.getItem('themeMode') as 'light' | 'dark' | 'auto' | null;
    const savedDarkMode = localStorage.getItem('theme') === 'dark';
    
    if (savedThemeMode) {
      setThemeMode(savedThemeMode);
      
      if (savedThemeMode === 'auto') {
        const shouldBeDark = shouldBeDarkMode();
        setDarkMode(shouldBeDark);
        setAutoThemeActive(true);
      } else {
        setDarkMode(savedThemeMode === 'dark');
        setAutoThemeActive(false);
      }
    } else {
      // Migration: if no themeMode saved but theme exists, set appropriate mode
      setThemeMode(savedDarkMode ? 'dark' : 'light');
      setDarkMode(savedDarkMode);
      setAutoThemeActive(false);
    }
  }, [shouldBeDarkMode]);

  // Auto theme switching effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (themeMode === 'auto') {
      setAutoThemeActive(true);
      
      // Function to update theme based on current time
      const updateAutoTheme = () => {
        const shouldBeDark = shouldBeDarkMode();
        if (darkMode !== shouldBeDark) {
          setDarkMode(shouldBeDark);
          console.log(`🕐 Auto theme switched to ${shouldBeDark ? 'dark' : 'light'} mode`);
        }
      };

      // Initial check
      updateAutoTheme();

      // Check every minute for theme changes
      interval = setInterval(updateAutoTheme, 60000);

      console.log(`🔄 Auto theme mode enabled - checking every minute`);
    } else {
      setAutoThemeActive(false);
    }

    // Cleanup interval on unmount or mode change
    return () => {
      if (interval) {
        clearInterval(interval);
        console.log(`🛑 Auto theme interval cleared`);
      }
    };
  }, [themeMode, darkMode, shouldBeDarkMode]);

  // Apply theme to document and save preferences
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    // Save theme mode preference
    localStorage.setItem('themeMode', themeMode);
  }, [darkMode, themeMode]);

  // Enhanced theme toggle function - cycles through Light → Dark → Auto
  const toggleThemeMode = () => {
    let nextMode: 'light' | 'dark' | 'auto';
    
    switch (themeMode) {
      case 'light':
        nextMode = 'dark';
        setDarkMode(true);
        break;
      case 'dark':
        nextMode = 'auto';
        // When switching to auto, immediately apply the correct theme
        setDarkMode(shouldBeDarkMode());
        break;
      case 'auto':
        nextMode = 'light';
        setDarkMode(false);
        break;
      default:
        nextMode = 'light';
        setDarkMode(false);
    }
    
    setThemeMode(nextMode);
    console.log(`🎨 Theme mode changed to: ${nextMode}`);
  };

  const handleRewrite = useCallback(async () => {
    if (!userPrompt.trim()) {
      setError('Please enter a prompt to rewrite');
      return;
    }

    setIsLoading(true);
    setError('');
    setRewrittenPrompt('');
    setWebSources([]);

    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: userPrompt.trim(),
          mode: selectedMode,
          enableWebAccess: enableWebAccess,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to rewrite prompt');
      }

      setRewrittenPrompt(data.rewrittenPrompt);
      setAnimationTrigger(prev => prev + 1); // This will trigger DecryptedText animation
      
      if (data.webSources && data.webSources.length > 0) {
        setWebSources(data.webSources);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [userPrompt, selectedMode, enableWebAccess]);

  const handleSelfImprove = async () => {
    if (!rewrittenPrompt.trim()) {
      setError('No rewritten prompt available to improve');
      return;
    }

    setIsImproving(true);
    setError('');

    try {
      const response = await fetch('/api/self-improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentOutput: rewrittenPrompt.trim(),
          mode: selectedMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to improve prompt');
      }

      setRewrittenPrompt(data.improvedOutput);
      setAnimationTrigger(prev => prev + 1); // Trigger animation for improved content
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsImproving(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!rewrittenPrompt) return;

    try {
      await navigator.clipboard.writeText(rewrittenPrompt);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      const textArea = document.createElement('textarea');
      textArea.value = rewrittenPrompt;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  // Reset web access when switching away from content-generation mode
  useEffect(() => {
    if (selectedMode !== 'content-generation') {
      setEnableWebAccess(false);
    }
  }, [selectedMode]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParticleBackground />
      
      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Futuristic Header */}
        <motion.header 
          className="text-center mb-12 sticky top-0 z-20 py-6 glass-dark rounded-2xl mb-8"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-between max-w-6xl mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-bold font-['Audiowide'] gradient-text">
              PROMPT REWRITER
            </h1>
            
            <div className="flex items-center gap-6">
              <p className="text-gray-600 dark:text-gray-200 text-sm max-w-md hidden lg:block">
                Transform your prompts into clear, effective instructions using AI-powered analysis and specialized rewriting modes
              </p>
              
              {/* Enhanced Theme Toggle with Auto Mode */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleThemeMode}
                className="relative p-3 rounded-xl glass border border-cyan-600/25 dark:border-cyan-500/25 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-600/20 dark:hover:shadow-cyan-500/20 min-w-[120px]"
                aria-label={`Current theme: ${getThemeModeDisplay().text}. Click to cycle themes.`}
              >
                <div className="flex items-center justify-center gap-2">
                  <motion.div
                    key={themeMode}
                    initial={{ rotate: -180, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="text-xl"
                  >
                    {getThemeModeDisplay().icon}
                  </motion.div>
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-medium">
                      {getThemeModeDisplay().text}
                    </span>
                    {autoThemeActive && (
                      <motion.span 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs opacity-70"
                      >
                        Auto Active
                      </motion.span>
                    )}
                  </div>
                </div>
                
                {/* Auto mode indicator */}
                {autoThemeActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"
                    title="Auto theme is active"
                  />
                )}
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Magic Bento Grid Layout */}
        <MagicBento className="max-w-7xl mx-auto">
          {/* Mode Selection Card */}
          <BentoCard span="col-span-12" delay={0.1} glowColor="purple">
            <div className="p-6">
              <label htmlFor="mode-select" className="block text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                🎯 Select Rewriting Mode
              </label>
              <select
                id="mode-select"
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full p-4 rounded-xl glass border border-purple-600/25 dark:border-purple-500/25 text-gray-800 dark:text-gray-100 text-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:focus:ring-purple-500 focus:border-transparent bg-white/90 dark:bg-black/30 backdrop-blur-xl"
              >
                <option value="question-research">🔍 Question/Research Mode</option>
                <option value="report-writing">📊 Report Writing Mode</option>
                <option value="coding-agent">💻 Coding Agent Mode</option>
                <option value="multi-tool-agent">🔧 Multi-Tool Agent Mode</option>
                <option value="document-rewriting">📝 Document Rewriting Mode</option>
                <option value="content-generation">✍️ Content Generation Mode</option>
                <option value="framework-optimization">🎯 Framework Optimization Mode</option>
                <option value="context-engineering">🧠 Context Engineering Mode</option>
                <option value="ultimate-mode">🚀 Ultimate Mode</option>
              </select>
              
              {/* Mode Description with consistent theming */}
              <motion.div 
                className="mt-4 p-4 rounded-xl bg-white/80 dark:bg-black/40 border border-purple-500/20 text-gray-700 dark:text-gray-200"
                key={selectedMode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-sm leading-relaxed">
                  <strong className="text-purple-600 dark:text-purple-300">
                    Mode Description:
                  </strong> {currentModeDescription}
                </p>
              </motion.div>
            </div>
          </BentoCard>

          {/* Web Access Toggle - Only visible for content-generation mode */}
          {selectedMode === 'content-generation' && (
            <BentoCard span="col-span-12" delay={0.15} glowColor="cyan">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                      🌐 Enable Web Search
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">
                      (Enhances content with current information)
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setEnableWebAccess(!enableWebAccess)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 cursor-pointer ${
                      enableWebAccess
                        ? 'bg-cyan-600 dark:bg-cyan-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <motion.span
                      animate={{
                        x: enableWebAccess ? 20 : 2,
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="inline-block h-4 w-4 transform rounded-full bg-white shadow-lg"
                    />
                  </motion.button>
                </div>
              </div>
            </BentoCard>
          )}

          {/* Input Card with consistent theming */}
          <BentoCard span="col-span-12 lg:col-span-6" delay={0.2} glowColor="cyan">
            <div className="p-6 h-full flex flex-col">
              <label htmlFor="user-prompt" className="block text-lg font-semibold mb-4">
                {isContentMode ? '✍️ Your Content Request' : '📝 Your "Lousy" Prompt'}
              </label>
              <textarea
                id="user-prompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder={isContentMode ?
                  "Enter your content request or text to transform..." :
                  "Enter your prompt that needs improvement..."
                }
                className="flex-1 min-h-[300px] p-4 rounded-xl border border-cyan-500/30 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-600 dark:focus:ring-cyan-500 focus:border-transparent bg-white/90 dark:bg-black/30 backdrop-blur-xl text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />

              {/* Spell Check Section */}
              <div className="mt-4 flex flex-col gap-3">
                <button
                  onClick={performSpellCheck}
                  disabled={!userPrompt.trim()}
                  className="self-start px-4 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-600 dark:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                >
                  🔍 Spell Check
                </button>

                {showSpellCheck && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-700/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300">Spell Check Results</h4>
                      <button
                        onClick={() => setShowSpellCheck(false)}
                        className="text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="space-y-1">
                      {spellCheckResults.map((result, index) => (
                        <div key={index} className="text-sm text-purple-600 dark:text-purple-400">
                          {result}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </BentoCard>

          {/* Mobile Generate Button - Only visible on mobile between input and output */}
          <div className="col-span-12 lg:hidden">
            <div className="flex justify-center py-4">
              <FuturisticButton
                onClick={handleRewrite}
                disabled={isLoading || !userPrompt.trim()}
                variant="primary"
                size="lg"
                className="min-w-[200px] max-w-[300px]"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block mr-2"
                  >
                    ⚡
                  </motion.div>
                ) : null}
                {isLoading ?
                  (isContentMode ? 'Generating...' : 'Rewriting...') :
                  (isContentMode ? '🎨 Generate Content' : '✨ Rewrite Prompt')
                }
              </FuturisticButton>
            </div>
          </div>

          {/* Output Card with consistent theming */}
          <BentoCard span="col-span-12 lg:col-span-6" delay={0.3} glowColor="green">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {isContentMode ? '🎨 Generated Content' :
                   selectedMode === 'context-engineering' ? '🧠 Context-Engineered Prompt' :
                   selectedMode === 'ultimate-mode' ? '🚀 Ultimate Enhanced Prompt' :
                   '✨ Rewritten Prompt'}
                </h2>
                <AnimatePresence>
                  {rewrittenPrompt && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <FuturisticButton
                        onClick={handleCopyToClipboard}
                        variant={copySuccess ? 'success' : 'secondary'}
                        size="sm"
                      >
                        {copySuccess ? '✓ Copied!' : '📋 Copy'}
                      </FuturisticButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex-1 min-h-[300px] p-4 rounded-xl border border-green-500/30 overflow-y-auto bg-white/90 dark:bg-black/30 backdrop-blur-xl">
                <AnimatePresence mode="wait">
                  {rewrittenPrompt ? (
                    <DecryptedText
                      key={`content-${animationTrigger}`}
                      text={rewrittenPrompt}
                      className="text-gray-800 dark:text-gray-100"
                      speed={8}
                      trigger={animationTrigger}
                    />
                  ) : (
                    <motion.p 
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-gray-500 dark:text-gray-400 italic text-center mt-20"
                    >
                      {isContentMode ? '🎨 Generated content will appear here...' :
                       selectedMode === 'context-engineering' ? '🧠 Context-engineered prompt will appear here...' :
                       selectedMode === 'ultimate-mode' ? '🚀 Ultimate enhanced prompt will appear here...' :
                       '✨ Rewritten prompt will appear here...'}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </BentoCard>

          {/* Action Buttons Card - Hidden on mobile, visible on desktop */}
          <BentoCard span="col-span-12 hidden lg:block" delay={0.4} glowColor="pink">
            <div className="p-6">
              <div className="flex gap-4 flex-wrap justify-center">
                <FuturisticButton
                  onClick={handleRewrite}
                  disabled={isLoading || !userPrompt.trim()}
                  variant="primary"
                  size="lg"
                  className="flex-1 min-w-[200px] max-w-[300px]"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block mr-2"
                    >
                      ⚡
                    </motion.div>
                  ) : null}
                  {isLoading ? 
                    (isContentMode ? 'Generating...' : 'Rewriting...') : 
                    (isContentMode ? '🎨 Generate Content' : '✨ Rewrite Prompt')
                  }
                </FuturisticButton>
                
                <AnimatePresence>
                  {rewrittenPrompt && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex-1 min-w-[200px] max-w-[300px]"
                    >
                      <FuturisticButton
                        onClick={handleSelfImprove}
                        disabled={isImproving}
                        variant="secondary"
                        size="lg"
                        className="w-full"
                      >
                        {isImproving ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="inline-block mr-2"
                          >
                            🔄
                          </motion.div>
                        ) : null}
                        {isImproving ? 'Improving...' : '🚀 Self-Improve'}
                      </FuturisticButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </BentoCard>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="col-span-12"
              >
                <BentoCard glowColor="pink" className="border-red-500/30">
                  <div className="p-6">
                    <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-700 dark:text-red-200 p-4 rounded-xl">
                      <strong>⚠️ Error:</strong> {error}
                    </div>
                  </div>
                </BentoCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Web Sources Display */}
          <AnimatePresence>
            {webSources.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="col-span-12"
              >
                <BentoCard glowColor="cyan" className="border-cyan-500/30">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                      🌐 Web Sources Used
                    </h3>
                    <div className="space-y-2">
                      {webSources.map((source, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-3 rounded-lg bg-white/80 dark:bg-black/30 border border-cyan-500/20"
                        >
                          <p className="text-cyan-600 dark:text-cyan-300 text-sm break-all">{source}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </BentoCard>
              </motion.div>
            )}
          </AnimatePresence>
        </MagicBento>

        {/* Educational Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 mb-8"
        >
          <div className="max-w-6xl mx-auto px-6">
            <div className="glass rounded-2xl p-8 border border-cyan-500/20 bg-white/5 dark:bg-black/20 backdrop-blur-xl">
              <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Why Choose Different Modes for Different Tasks?
              </h2>

              <p className="text-gray-700 dark:text-gray-300 text-center mb-8 text-lg leading-relaxed">
                Our 9 specialized modes are designed to match specific AI agent capabilities and task requirements. Here&apos;s why mode selection matters:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="p-4 rounded-xl bg-white/10 dark:bg-black/20 border border-cyan-500/20">
                  <div className="text-2xl mb-2">🔬</div>
                  <h3 className="font-semibold text-cyan-600 dark:text-cyan-400 mb-2">Question/Research Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Optimizes queries for AI research agents that need structured, evidence-based analysis with confidence ratings and source transparency. Use when you need factual investigations.</p>
                </div>

                <div className="p-4 rounded-xl bg-white/10 dark:bg-black/20 border border-green-500/20">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">Report Writing Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Creates instructions for AI report writers that produce professional, structured documents with executive summaries and actionable recommendations. Use for business documentation.</p>
                </div>

                <div className="p-4 rounded-xl bg-white/10 dark:bg-black/20 border border-blue-500/20">
                  <div className="text-2xl mb-2">💻</div>
                  <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Coding Agent Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Generates detailed specifications for AI developers that follow best practices, security protocols, and maintainability standards. Use for software development tasks.</p>
                </div>

                <div className="p-4 rounded-xl bg-white/10 dark:bg-black/20 border border-orange-500/20">
                  <div className="text-2xl mb-2">🔧</div>
                  <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">Multi-Tool Agent Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Provides complete coordination plans for AI agents managing multiple systems, APIs, and workflows simultaneously. Use for complex, multi-step processes.</p>
                </div>

                <div className="p-4 rounded-xl bg-white/10 dark:bg-black/20 border border-purple-500/20">
                  <div className="text-2xl mb-2">📝</div>
                  <h3 className="font-semibold text-purple-600 dark:text-purple-400 mb-2">Document Rewriting Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Delivers directly improved content or creates instructions for AI editors specializing in content transformation and optimization. Use for content enhancement.</p>
                </div>

                <div className="p-4 rounded-xl bg-white/10 dark:bg-black/20 border border-pink-500/20">
                  <div className="text-2xl mb-2">⚡</div>
                  <h3 className="font-semibold text-pink-600 dark:text-pink-400 mb-2">Framework Optimization Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Applies systematic methodologies (RACE, CRISP-DM, Design Thinking) through AI agents trained in structured problem-solving. Use for strategic challenges.</p>
                </div>

                <div className="p-4 rounded-xl bg-white/10 dark:bg-black/20 border border-yellow-500/20">
                  <div className="text-2xl mb-2">🎯</div>
                  <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">Content Generation Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Produces ready-to-publish content through AI content creators specializing in audience engagement and conversion optimization. Use for marketing materials.</p>
                </div>

                <div className="p-4 rounded-xl bg-white/10 dark:bg-black/20 border border-indigo-500/20">
                  <div className="text-2xl mb-2">🧠</div>
                  <h3 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Context Engineering Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Applies advanced information orchestration through AI agents optimizing context windows and multi-source data integration. Use for complex information synthesis.</p>
                </div>

                <div className="p-4 rounded-xl bg-white/10 dark:bg-black/20 border border-red-500/20">
                  <div className="text-2xl mb-2">🚀</div>
                  <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">Ultimate Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Combines framework methodology with context engineering for AI agents handling the most sophisticated and comprehensive tasks. Use for maximum effectiveness.</p>
                </div>
              </div>

              <div className="text-center p-6 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30">
                <h3 className="text-xl font-semibold mb-3 text-cyan-600 dark:text-cyan-400">The Science Behind Mode Selection</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Different AI models excel at different cognitive tasks. By matching your request to the appropriate specialized mode, you ensure the AI agent receives optimally structured instructions that leverage its specific strengths, resulting in higher quality outputs and better task completion rates.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
