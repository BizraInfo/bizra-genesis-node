import { Github, Twitter, Globe } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-primary-gold/20 bg-deep-navy/80 backdrop-blur-xl pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold text-gradient-gold">BIZRA</h3>
            <p className="text-soft-white/60 text-sm leading-relaxed">
              The architectural foundation for all future AGI systems requiring mathematical consciousness bounds and ethical enforcement.
            </p>
          </div>
          
          <div>
            <h4 className="text-primary-gold text-sm uppercase tracking-widest mb-6">System</h4>
            <ul className="space-y-4 text-soft-white/70 text-sm">
              <li className="hover:text-primary-gold transition-colors cursor-pointer">TMP v0.1 Status</li>
              <li className="hover:text-primary-gold transition-colors cursor-pointer">Safety Gates</li>
              <li className="hover:text-primary-gold transition-colors cursor-pointer">Ihsan Mathematics</li>
              <li className="hover:text-primary-gold transition-colors cursor-pointer">Documentation</li>
            </ul>
          </div>

          <div>
            <h4 className="text-primary-gold text-sm uppercase tracking-widest mb-6">Genesis</h4>
            <ul className="space-y-4 text-soft-white/70 text-sm">
              <li className="hover:text-primary-gold transition-colors cursor-pointer">The Message</li>
              <li className="hover:text-primary-gold transition-colors cursor-pointer">The Seed</li>
              <li className="hover:text-primary-gold transition-colors cursor-pointer">The Commitment</li>
              <li className="hover:text-primary-gold transition-colors cursor-pointer">Epilogue</li>
            </ul>
          </div>

          <div>
            <h4 className="text-primary-gold text-sm uppercase tracking-widest mb-6">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full border border-primary-gold/30 flex items-center justify-center text-primary-gold hover:bg-primary-gold hover:text-deep-navy transition-all">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-primary-gold/30 flex items-center justify-center text-primary-gold hover:bg-primary-gold hover:text-deep-navy transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-primary-gold/30 flex items-center justify-center text-primary-gold hover:bg-primary-gold hover:text-deep-navy transition-all">
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-primary-gold/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-soft-white/40">
          <p>© 2025 BIZRA Systems. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Designed with</span>
            <span className="text-primary-gold">الإحسان</span>
            <span>for Humanity</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
