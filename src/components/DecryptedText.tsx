'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DecryptedTextProps {
  text: string;
  className?: string;
  speed?: number;
  trigger?: number; // Changed to number for better trigger detection
}

export function DecryptedText({ 
  text, 
  className = '', 
  speed = 15, 
  trigger = 0 
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    if (!text) return;

    setIsDecrypting(true);
    setDisplayText('');

    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const finalText = text;
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex >= finalText.length) {
        setIsDecrypting(false);
        clearInterval(interval);
        return;
      }

      let scrambled = '';
      for (let i = 0; i < finalText.length; i++) {
        if (i < currentIndex) {
          scrambled += finalText[i];
        } else if (i < currentIndex + 3) {
          scrambled += chars[Math.floor(Math.random() * chars.length)];
        } else {
          scrambled += ' ';
        }
      }

      setDisplayText(scrambled);
      currentIndex++;
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, trigger]);

  // Format text for better readability
  const formatText = (text: string) => {
    // Handle framework mode formatting
    if (text.includes('Role:') && text.includes('Context:') && text.includes('Task:')) {
      return text
        .split('\n')
        .map((line, index) => {
          const trimmedLine = line.trim();
          
          // Check if line starts with a framework component
          if (trimmedLine.match(/^(Role|Context|Task|Format|Rules|Examples):/)) {
            return (
              <div key={index} className="mt-4 first:mt-0">
                <div className="font-semibold text-cyan-600 dark:text-cyan-300 mb-1">
                  {trimmedLine}
                </div>
              </div>
            );
          }
          
          // Regular content line
          if (trimmedLine) {
            return (
              <div key={index} className="ml-2 mb-2 leading-relaxed">
                {trimmedLine}
              </div>
            );
          }
          
          // Empty line for spacing
          return <div key={index} className="h-2" />;
        });
    }
    
    // Handle report writing mode formatting
    if (text.includes('Executive Summary') || text.includes('Methodology') || text.includes('Analysis')) {
      return text
        .split('\n')
        .map((line, index) => {
          const trimmedLine = line.trim();
          
          // Check for report sections
          const reportSections = [
            'Executive Summary', 'Methodology', 'Background', 'Analysis', 
            'Findings', 'Recommendations', 'Conclusion', 'Appendices',
            'References', 'Data Sources', 'Research Approach', 'Target Audience',
            'Deliverables', 'Timeline', 'Success Metrics', 'Quality Assurance'
          ];
          
          const isSection = reportSections.some(section => 
            trimmedLine.toLowerCase().includes(section.toLowerCase())
          );
          
          if (isSection) {
            return (
              <div key={index} className="mt-4 first:mt-0">
                <div className="font-semibold text-green-600 dark:text-green-300 mb-2">
                  {trimmedLine}
                </div>
              </div>
            );
          }
          
          // Regular content line
          if (trimmedLine) {
            return (
              <div key={index} className="mb-2 leading-relaxed">
                {trimmedLine}
              </div>
            );
          }
          
          // Empty line for spacing
          return <div key={index} className="h-2" />;
        });
    }
    
    // Default formatting for other modes
    return text.split('\n').map((line, index) => (
      <div key={index} className={line.trim() ? "mb-2 leading-relaxed" : "h-2"}>
        {line}
      </div>
    ));
  };

  return (
    <motion.div 
      className={`font-mono text-sm ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`transition-colors duration-300 ${
        isDecrypting 
          ? 'text-cyan-600 dark:text-cyan-300' 
          : 'text-gray-800 dark:text-gray-100'
      }`}>
        {isDecrypting ? (
          <span className="whitespace-pre-wrap">{displayText}</span>
        ) : (
          <div className="whitespace-pre-wrap">
            {formatText(displayText)}
          </div>
        )}
      </div>
      {isDecrypting && (
        <motion.span
          className="inline-block w-2 h-5 bg-cyan-600 dark:bg-cyan-300 ml-1"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.3, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}
