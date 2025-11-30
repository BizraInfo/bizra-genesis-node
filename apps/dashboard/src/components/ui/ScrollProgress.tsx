/**
 * Scroll Progress Indicator Component
 * Shows reading progress and allows quick navigation to sections
 */

import React, { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { BRAND } from '../../constants/brand';

interface Section {
  id: string;
  title: string;
  element: HTMLElement;
}

interface ScrollProgressProps {
  sections?: Section[];
  showNavigation?: boolean;
}

export const ScrollProgress: React.FC<ScrollProgressProps> = ({
  sections = [],
  showNavigation = true,
}) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [activeSection, setActiveSection] = useState<string>('');
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up');
      lastScrollY = scrollY;
    };

    const updateActiveSection = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      for (const section of sections) {
        const rect = section.element.getBoundingClientRect();
        const sectionTop = rect.top + scrollY;
        const sectionBottom = sectionTop + rect.height;

        if (scrollY >= sectionTop - windowHeight / 2 && scrollY < sectionBottom - windowHeight / 2) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    const handleScroll = () => {
      updateScrollDirection();
      updateActiveSection();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  return (
    <>
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-500 to-teal-500 transform-origin-left z-40"
        style={{ scaleX }}
      />

      {/* Section Navigation */}
      {showNavigation && sections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 }}
          className="fixed right-6 top-1/2 transform -translate-y-1/2 z-30"
        >
          <div className="flex flex-col gap-2">
            {sections.map((section) => (
              <motion.button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`group relative flex items-center justify-end`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Active indicator */}
                <motion.div
                  className={`w-1 h-8 rounded-full mr-3 ${
                    activeSection === section.id
                      ? 'bg-gold-400'
                      : 'bg-white/20 group-hover:bg-white/40'
                  }`}
                  layoutId="activeSection"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />

                {/* Tooltip */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="absolute right-8 px-3 py-1 bg-navy-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  {section.title}
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-navy-800 border-t-2 border-t-transparent border-b-2 border-b-transparent" />
                </motion.div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Scroll Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="fixed bottom-6 right-6 z-30 flex flex-col gap-2"
      >
        <motion.button
          onClick={scrollToTop}
          className="w-10 h-10 bg-navy-800/80 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-navy-700/80 transition-all duration-200"
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Scroll to top"
        >
          <ChevronUp size={16} />
        </motion.button>

        <motion.button
          onClick={scrollToBottom}
          className="w-10 h-10 bg-navy-800/80 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-navy-700/80 transition-all duration-200"
          whileHover={{ scale: 1.1, y: 2 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={16} />
        </motion.button>
      </motion.div>

      {/* Reading Progress Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
        className="fixed bottom-6 left-6 z-30"
      >
        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-3">
          <div className="text-xs text-white/60">Reading Progress</div>
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-gold-400 to-teal-400 rounded-full"
              style={{ scaleX, transformOrigin: 'left' }}
            />
          </div>
          <div className="text-xs text-gold-400 font-mono">
            {Math.round(scrollYProgress.get() * 100)}%
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default ScrollProgress;