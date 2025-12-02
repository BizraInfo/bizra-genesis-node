"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { BizraLogoStatic } from './BizraLogoAnimated';
import { 
  Home, 
  MessageSquare, 
  Calendar, 
  Award, 
  Settings, 
  Activity,
  Database,
  BookOpen,
  Globe,
  Cpu
} from 'lucide-react';
import { useNodeLink } from '@/hooks/use-node-link';

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/agents', icon: Activity, label: 'Agents' },
  { href: '/chat', icon: MessageSquare, label: 'PAT Chat' },
  { href: '/plan', icon: Calendar, label: 'Daily Plan' },
  { href: '/rewards', icon: Award, label: 'Rewards' },
  { href: '/knowledge', icon: BookOpen, label: 'Knowledge' },
  { href: '/nodeo', icon: Database, label: 'Nodeo' },
  { href: '/bizraverse', icon: Globe, label: 'Bizraverse' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function BizraNavbar() {
  const pathname = usePathname();
  const { status } = useNodeLink();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl bg-bizra-black/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <BizraLogoStatic className="w-10 h-10 transition-transform group-hover:scale-110" />
          <div>
            <span className="font-serif text-xl tracking-widest text-gradient-gold">BIZRA</span>
            <span className="hidden md:inline text-xs text-white/40 ml-2 font-mono">NODE0</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.slice(0, 6).map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  className={`
                    px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all
                    ${isActive 
                      ? 'bg-bizra-gold/10 text-bizra-gold border border-bizra-gold/20' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden xl:inline">{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${status.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-red-500/50'}`} />
              <span className={status.online ? 'text-green-400' : 'text-white/40'}>
                {status.online ? 'NODE_ONLINE' : 'NODE_OFFLINE'}
              </span>
            </div>
            {status.online && status.hardware && (
              <>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-1.5 text-xs text-white/60" title={status.hardware.gpu_name}>
                  <Cpu className="w-3 h-3" />
                  <span>{status.hardware.cpu_cores}C</span>
                </div>
              </>
            )}
          </div>
          
          <Link href="/settings">
            <motion.button
              className="p-2 rounded-lg text-white/60 hover:text-bizra-gold hover:bg-white/5 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// Mobile bottom navigation
export function BizraMobileNav() {
  const pathname = usePathname();

  const mobileItems = [
    { href: '/home', icon: Home, label: 'Home' },
    { href: '/agents', icon: Activity, label: 'Agents' },
    { href: '/chat', icon: MessageSquare, label: 'Chat' },
    { href: '/plan', icon: Calendar, label: 'Plan' },
    { href: '/settings', icon: Settings, label: 'More' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden px-2 pb-safe backdrop-blur-xl bg-bizra-black/90 border-t border-white/5">
      <div className="flex items-center justify-around py-2">
        {mobileItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <motion.div
                className={`
                  flex flex-col items-center gap-1 py-2 rounded-xl transition-all
                  ${isActive 
                    ? 'text-bizra-gold' 
                    : 'text-white/40'
                  }
                `}
                whileTap={{ scale: 0.9 }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <motion.div 
                    className="absolute bottom-0 w-8 h-0.5 bg-bizra-gold rounded-full"
                    layoutId="mobileNavIndicator"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
