'use client';

/**
 * BIZRA Premium Navigation Dock
 * Glass morphism floating navigation component
 * Adapted from award-winner-design
 * 
 * Features:
 * - Glass morphism styling
 * - Scroll-aware active states
 * - Smooth animations
 * - Responsive design
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface NavItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Target section ID or URL */
  href: string;
  /** Optional icon component */
  icon?: React.ReactNode;
}

interface NavDockProps {
  /** Navigation items to display */
  items: NavItem[];
  /** Currently active item ID */
  activeItem?: string;
  /** Callback when an item is clicked */
  onItemClick?: (item: NavItem) => void;
  /** Position on screen */
  position?: 'bottom' | 'top';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Premium floating navigation dock with glass morphism
 */
export function NavDock({
  items,
  activeItem: controlledActiveItem,
  onItemClick,
  position = 'bottom',
  className = '',
}: NavDockProps) {
  const [activeItem, setActiveItem] = useState(controlledActiveItem || items[0]?.id);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Update active item when controlled prop changes
  useEffect(() => {
    if (controlledActiveItem !== undefined) {
      setActiveItem(controlledActiveItem);
    }
  }, [controlledActiveItem]);

  // Scroll visibility handling
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show/hide based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);

      // Update active section based on scroll position (for anchor links)
      const sections = items
        .filter(item => item.href.startsWith('#'))
        .map(item => document.getElementById(item.href.slice(1)))
        .filter(Boolean) as HTMLElement[];

      if (sections.length > 0) {
        const viewportMiddle = currentScrollY + window.innerHeight / 2;
        
        for (let i = sections.length - 1; i >= 0; i--) {
          const section = sections[i];
          if (section && section.offsetTop <= viewportMiddle) {
            const item = items.find(item => item.href === `#${section.id}`);
            if (item && controlledActiveItem === undefined) {
              setActiveItem(item.id);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, items, controlledActiveItem]);

  const handleItemClick = useCallback((item: NavItem, e: React.MouseEvent) => {
    // Handle anchor links
    if (item.href.startsWith('#')) {
      e.preventDefault();
      const target = document.getElementById(item.href.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }

    setActiveItem(item.id);
    onItemClick?.(item);
  }, [onItemClick]);

  const positionClasses = position === 'bottom'
    ? 'bottom-4'
    : 'top-4';

  return (
    <motion.nav
      className={`fixed left-1/2 -translate-x-1/2 z-50 ${positionClasses} ${className}`}
      initial={{ y: position === 'bottom' ? 100 : -100, opacity: 0 }}
      animate={{ 
        y: isVisible ? 0 : (position === 'bottom' ? 100 : -100), 
        opacity: isVisible ? 1 : 0 
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="nav-dock">
        {items.map((item, index) => (
          <NavDockItem
            key={item.id}
            item={item}
            isActive={activeItem === item.id}
            onClick={handleItemClick}
            index={index}
          />
        ))}
      </div>
    </motion.nav>
  );
}

interface NavDockItemProps {
  item: NavItem;
  isActive: boolean;
  onClick: (item: NavItem, e: React.MouseEvent) => void;
  index: number;
}

function NavDockItem({ item, isActive, onClick, index }: NavDockItemProps) {
  return (
    <motion.a
      href={item.href}
      className={`nav-dock-item relative ${isActive ? 'active' : ''}`}
      onClick={(e) => onClick(item, e)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {item.icon && (
        <span className="mr-2">{item.icon}</span>
      )}
      <span className="font-medium">{item.label}</span>
      
      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'rgba(212, 175, 55, 0.15)',
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)',
          }}
          layoutId="navDockActiveIndicator"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </motion.a>
  );
}

/**
 * Simplified inline dock for quick use cases
 */
export function SimpleNavDock({ className = '' }: { className?: string }) {
  const defaultItems: NavItem[] = [
    { id: 'home', label: 'Home', href: '#home' },
    { id: 'dashboard', label: 'Dashboard', href: '#dashboard' },
    { id: 'metrics', label: 'Metrics', href: '#metrics' },
    { id: 'settings', label: 'Settings', href: '#settings' },
  ];

  return <NavDock items={defaultItems} className={className} />;
}

/**
 * BIZRA-branded dock with preset sections
 */
export function BizraNavDock({ className = '' }: { className?: string }) {
  const bizraItems: NavItem[] = [
    { id: 'citadel', label: 'Citadel', href: '#citadel' },
    { id: 'poi', label: 'POI', href: '#poi' },
    { id: 'agents', label: 'Agents', href: '#agents' },
    { id: 'genesis', label: 'Genesis', href: '#genesis' },
    { id: 'evidence', label: 'Evidence', href: '#evidence' },
  ];

  return <NavDock items={bizraItems} className={className} />;
}

export default NavDock;
