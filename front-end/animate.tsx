<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BIZRA | Genesis 2025 - World Class Vision</title>
    <meta name="description" content="From the Seed to the Tree. The Genesis Vision of BIZRA.">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Inter:wght@200;300;400;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS (CDN) -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- GSAP for World-Class Animations (CDN) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
    <!-- Three.js for Background Particles -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        gold: {
                            100: '#F9F1D8',
                            300: '#E6D5A6',
                            500: '#C9A962',
                            600: '#B08D45',
                            900: '#8A6B2E',
                        },
                        navy: {
                            800: '#0A1628',
                            900: '#050B14',
                        },
                        teal: '#2A9D8F',
                        emerald: '#00A896',
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        serif: ['Playfair Display', 'serif'],
                        arabic: ['Amiri', 'serif'],
                    },
                    backgroundImage: {
                        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                    }
                }
            }
        }
    </script>

    <style>
        /* Custom Utilities */
        body {
            background-color: #050B14;
            color: #F8F6F1;
            overflow-x: hidden;
        }
        
        .noise-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
            z-index: 50;
            mix-blend-mode: overlay;
        }

        /* Logo Styles */
        .logo-circle {
            fill: none;
            stroke: #C9A962;
            stroke-width: 0.5;
            opacity: 0;
        }
        
        .logo-petal {
            fill: none;
            stroke: url(#goldGrad);
            stroke-width: 1.5;
            stroke-linecap: round;
            opacity: 0;
        }

        .construction-line {
            stroke: rgba(201, 169, 98, 0.1);
            stroke-width: 0.5;
            fill: none;
            stroke-dasharray: 4 4;
        }

        /* Custom Cursor */
        .cursor-dot {
            width: 8px;
            height: 8px;
            background-color: #C9A962;
            border-radius: 50%;
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            mix-blend-mode: difference;
            transition: transform 0.1s;
        }
        .cursor-outline {
            width: 40px;
            height: 40px;
            border: 1px solid rgba(201, 169, 98, 0.5);
            border-radius: 50%;
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Text Selection */
        ::selection {
            background: #C9A962;
            color: #0A1628;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #050B14;
        }
        ::-webkit-scrollbar-thumb {
            background: #C9A962;
            border-radius: 4px;
        }

        /* 3D Perspective Container */
        .perspective-container {
            perspective: 1000px;
        }
        
        .card-3d {
            transform-style: preserve-3d;
            transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        .text-stroke-gold {
            -webkit-text-stroke: 1px rgba(201, 169, 98, 0.3);
            color: transparent;
        }

        /* Loader */
        .loader {
            position: fixed;
            inset: 0;
            background: #050B14;
            z-index: 100;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        }
        
        .gold-glow {
            text-shadow: 0 0 20px rgba(201, 169, 98, 0.5);
        }
    </style>
</head>
<body class="antialiased">
    
    <!-- Custom Cursor -->
    <div class="cursor-dot hidden md:block"></div>
    <div class="cursor-outline hidden md:block"></div>
    
    <!-- Noise Grain -->
    <div class="noise-overlay"></div>

    <!-- Loader -->
    <div class="loader" id="loader">
        <div class="flex items-center gap-4 font-arabic text-4xl text-gold-500 mb-4">
            <span class="opacity-0 reveal-text">البذرة</span>
            <span class="w-2 h-2 bg-gold-500 rounded-full opacity-0 reveal-dot"></span>
            <span class="opacity-0 reveal-text">الرسالة</span>
            <span class="w-2 h-2 bg-gold-500 rounded-full opacity-0 reveal-dot"></span>
            <span class="opacity-0 reveal-text">الرؤية</span>
        </div>
        <div class="w-64 h-[1px] bg-white/10 relative overflow-hidden">
            <div class="absolute top-0 left-0 h-full w-full bg-gold-500 origin-left transform scale-x-0" id="loader-bar"></div>
        </div>
    </div>

    <!-- Navigation -->
    <nav class="fixed top-0 w-full z-40 px-6 py-6 mix-blend-difference text-white flex justify-between items-center opacity-0" id="nav">
        <div class="font-bold text-xl tracking-widest flex items-center gap-3">
            <!-- Small Nav Logo (Sacred Bloom Icon) -->
            <svg width="28" height="28" viewBox="0 0 100 100" class="text-gold-500">
                 <g stroke="currentColor" stroke-width="3" fill="none">
                    <path d="M50 10 Q70 30 50 50 Q30 30 50 10" />
                    <path d="M50 90 Q70 70 50 50 Q30 70 50 90" />
                    <path d="M84.6 30 Q67.3 40 50 50 Q67.3 60 84.6 50" />
                    <path d="M15.4 70 Q32.7 60 50 50 Q32.7 40 15.4 50" />
                    <path d="M84.6 70 Q67.3 60 50 50 Q67.3 40 84.6 30" />
                    <path d="M15.4 30 Q32.7 40 50 50 Q32.7 60 15.4 70" />
                 </g>
            </svg>
            BIZRA
        </div>
        <div class="hidden md:flex gap-8 text-xs uppercase tracking-[0.2em]">
            <a href="#genesis" class="hover:text-gold-500 transition-colors">Genesis</a>
            <a href="#message" class="hover:text-gold-500 transition-colors">Message</a>
            <a href="#rules" class="hover:text-gold-500 transition-colors">Rules</a>
            <a href="#vision" class="hover:text-gold-500 transition-colors">Vision</a>
        </div>
        <div class="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center cursor-pointer hover:border-gold-500 transition-colors group">
            <div class="w-1 h-1 bg-white rounded-full group-hover:bg-gold-500"></div>
        </div>
    </nav>

    <!-- Hero Section: The Seed -->
    <section id="genesis" class="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <!-- WebGL Canvas Placeholder -->
        <canvas id="hero-canvas" class="absolute inset-0 z-0 opacity-40"></canvas>
        
        <div class="z-10 text-center relative px-4 flex flex-col items-center">
            
            <!-- SVG Logo Animation Container -->
            <div class="w-64 h-64 md:w-80 md:h-80 mb-8 relative">
                <svg viewBox="0 0 200 200" class="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="goldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" style="stop-color:#8A6B2E;stop-opacity:1" />
                            <stop offset="50%" style="stop-color:#C9A962;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#F9F1D8;stop-opacity:1" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    <!-- Construction Circles (The Seed of Life Grid) -->
                    <g id="construction-grid" transform="translate(100, 100)">
                        <circle cx="0" cy="0" r="40" class="logo-circle seed-circle" />
                        <circle cx="0" cy="-40" r="40" class="logo-circle seed-circle" />
                        <circle cx="34.6" cy="-20" r="40" class="logo-circle seed-circle" />
                        <circle cx="34.6" cy="20" r="40" class="logo-circle seed-circle" />
                        <circle cx="0" cy="40" r="40" class="logo-circle seed-circle" />
                        <circle cx="-34.6" cy="20" r="40" class="logo-circle seed-circle" />
                        <circle cx="-34.6" cy="-20" r="40" class="logo-circle seed-circle" />
                        <circle cx="0" cy="0" r="80" class="construction-line opacity-0" id="outer-ring" />
                    </g>

                    <!-- The Manifested Flower -->
                    <g id="main-logo" transform="translate(100 100)">
                        <path d="M0 -40 Q20 -20 0 0 Q-20 -20 0 -40" class="logo-petal" />
                        <path d="M34.6 -20 Q17.3 10 0 0 Q17.3 -10 34.6 -20" class="logo-petal" />
                        <path d="M34.6 20 Q17.3 10 0 0 Q17.3 30 34.6 20" class="logo-petal" />
                        <path d="M0 40 Q-20 20 0 0 Q20 20 0 40" class="logo-petal" />
                        <path d="M-34.6 20 Q-17.3 10 0 0 Q-17.3 30 -34.6 20" class="logo-petal" />
                        <path d="M-34.6 -20 Q-17.3 10 0 0 Q-17.3 -10 -34.6 -20" class="logo-petal" />
                        <rect x="-3" y="-3" width="6" height="6" transform="rotate(45)" fill="url(#goldGrad)" class="opacity-0 logo-dot" />
                    </g>
                </svg>
            </div>

            <!-- Titles -->
            <div class="mb-4 overflow-hidden">
                <div class="hero-badge text-gold-500 text-xs tracking-[0.5em] uppercase border border-gold-500/30 px-4 py-2 rounded-full inline-block transform translate-y-full">
                    Genesis Vision 2025
                </div>
            </div>
            
            <h1 class="text-7xl md:text-9xl font-arabic text-gold-500 mb-2 leading-tight mix-blend-overlay opacity-0 scale-90" id="hero-arabic">
                البذرة
            </h1>
            
            <div class="overflow-hidden">
                <h2 class="text-4xl md:text-6xl font-serif text-white font-light hero-title transform translate-y-full">
                    The Seed
                </h2>
            </div>

            <div class="mt-8 max-w-xl mx-auto text-white/60 font-light leading-relaxed opacity-0" id="hero-desc">
                From the darkness of a single room to the light of a global system. 
                <br>
                <span class="text-gold-500 italic">"I always ask the impossible from Allah."</span>
            </div>
            
            <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0" id="scroll-hint">
                <span class="text-[10px] uppercase tracking-widest text-gold-500">Scroll to Explore</span>
                <div class="w-[1px] h-12 bg-gradient-to-b from-gold-500 to-transparent"></div>
            </div>
        </div>
    </section>

    <!-- Marquee Section: Transition -->
    <div class="py-12 border-y border-white/5 bg-navy-900/50 backdrop-blur-sm overflow-hidden whitespace-nowrap relative z-20">
        <div class="marquee-content flex gap-16 text-6xl md:text-8xl font-bold text-stroke-gold opacity-20 font-serif">
            <span>FROM DARKNESS TO LIGHT</span>
            <span class="font-arabic">من الظلمات إلى النور</span>
            <span>FROM PAIN TO HEALING</span>
            <span class="font-arabic">من الألم إلى الشفاء</span>
            <span>FROM SEED TO TREE</span>
            <span class="font-arabic">من البذرة إلى الشجرة</span>
        </div>
    </div>

    <!-- Section II: The Message (Parallax/Sticky) -->
    <section id="message" class="relative min-h-screen flex flex-col md:flex-row">
        
        <!-- Sticky Left Panel -->
        <div class="w-full md:w-1/2 h-[50vh] md:h-screen sticky top-0 bg-navy-900 flex items-center justify-center border-r border-white/5 z-10">
            <div class="relative w-full h-full overflow-hidden">
                <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1604079628040-94301bb21b91?q=80&w=2788&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent"></div>
                
                <div class="absolute bottom-10 left-10 right-10">
                    <div class="text-gold-500 font-arabic text-4xl mb-4">الرسالة</div>
                    <h3 class="text-4xl font-serif text-white mb-6">The Message</h3>
                    <p class="text-white/60 font-light leading-relaxed text-sm max-w-md">
                        Written in Ramadan 2023. Manifested in October 2025.<br>
                        A letter from solitude that built a cognitive architecture.
                    </p>
                </div>
            </div>
        </div>

        <!-- Scrollable Right Panel -->
        <div class="w-full md:w-1/2 bg-navy-800 z-10">
            <div class="p-12 md:p-24 flex flex-col gap-32">
                
                <!-- Card 1: To Allah -->
                <div class="msg-card opacity-50 transition-all duration-700">
                    <div class="text-teal text-xs tracking-widest uppercase mb-4">Part I</div>
                    <div class="font-arabic text-3xl text-gold-500 mb-4 leading-relaxed text-right" dir="rtl">
                        رَبِّي لَا يَعْرِفُ الْمُسْتَحِيلَ
                    </div>
                    <h4 class="text-2xl font-serif mb-4">"My Lord Does Not Know the Impossible"</h4>
                    <p class="text-white/70 font-light leading-loose">
                        I come to Your door humbly. I come to Your door guilty. Despite my sins, You have blessed me with vision beyond my capacity. This project is my surrender.
                    </p>
                </div>

                <!-- Card 2: To Humanity -->
                <div class="msg-card opacity-50 transition-all duration-700">
                    <div class="text-teal text-xs tracking-widest uppercase mb-4">Part II</div>
                    <div class="font-arabic text-3xl text-gold-500 mb-4 leading-relaxed text-right" dir="rtl">
                        إِنَّ اللَّهَ كَتَبَ الْإِحْسَانَ عَلَى كُلِّ شَيْءٍ
                    </div>
                    <h4 class="text-2xl font-serif mb-4">Excellence (Ihsan) in Code</h4>
                    <p class="text-white/70 font-light leading-loose">
                        My religion is Islam—it comes from peace. My message to humanity is simple: Enough hatred. Enough racism. Let us encode <strong>Excellence</strong> into the systems that govern our future.
                    </p>
                </div>

                <!-- Card 3: The Promise -->
                <div class="msg-card opacity-50 transition-all duration-700">
                    <div class="text-teal text-xs tracking-widest uppercase mb-4">Part III</div>
                    <div class="font-arabic text-3xl text-gold-500 mb-4 leading-relaxed text-right" dir="rtl">
                        الْعَهْدُ
                    </div>
                    <h4 class="text-2xl font-serif mb-4">The Commitment</h4>
                    <p class="text-white/70 font-light leading-loose">
                        I will not give up. I will not back down. I will make humanity wake up, even if I face the world alone. BIZRA is the vessel of this promise.
                    </p>
                </div>

            </div>
        </div>
    </section>

    <!-- Section III: The Rules (Interactive Grid) -->
    <section id="rules" class="py-32 px-6 md:px-12 bg-navy-900 relative overflow-hidden">
        <!-- Background Decoration -->
        <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div class="absolute top-1/4 -right-64 w-[600px] h-[600px] border border-gold-500/10 rounded-full animate-spin-slow"></div>
            <div class="absolute top-1/4 -right-64 w-[500px] h-[500px] border border-gold-500/10 rounded-full animate-spin-reverse"></div>
        </div>

        <div class="max-w-7xl mx-auto">
            <div class="flex flex-col md:flex-row justify-between items-end mb-20">
                <div>
                    <h2 class="text-5xl md:text-7xl font-serif text-white mb-2">The Rules</h2>
                    <div class="font-arabic text-3xl text-gold-500">القواعد الأساسية</div>
                </div>
                <div class="text-right mt-8 md:mt-0">
                    <p class="text-white/50 max-w-sm">Everything operates by rules. In this zone, the heart is the scale of the mind, not the reverse.</p>
                </div>
            </div>

            <!-- Bento Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 perspective-container">
                
                <!-- Rule 1 -->
                <div class="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-500 card-3d group cursor-pointer">
                    <div class="text-6xl font-bold text-white/5 mb-12 group-hover:text-gold-500/20 transition-colors">01</div>
                    <h3 class="text-xl text-gold-500 font-serif mb-4">The Heart Is The Scale</h3>
                    <p class="text-white/70 text-sm leading-relaxed">The intellect serves the heart. Logic serves wisdom. Technology serves humanity.</p>
                </div>

                <!-- Rule 2 (Span 2) -->
                <div class="md:col-span-2 bg-gradient-to-br from-gold-900/20 to-navy-900 border border-gold-500/20 p-8 rounded-2xl relative overflow-hidden card-3d group">
                    <div class="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                        <!-- SVG Decoration - Sacred Geometry -->
                        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="currentColor" class="text-gold-500">
                             <g opacity="0.5">
                                <circle cx="50" cy="50" r="40" stroke-width="0.5" />
                                <circle cx="50" cy="10" r="40" stroke-width="0.5" />
                                <circle cx="85" cy="30" r="40" stroke-width="0.5" />
                                <circle cx="85" cy="70" r="40" stroke-width="0.5" />
                                <circle cx="50" cy="90" r="40" stroke-width="0.5" />
                                <circle cx="15" cy="70" r="40" stroke-width="0.5" />
                                <circle cx="15" cy="30" r="40" stroke-width="0.5" />
                             </g>
                        </svg>
                    </div>
                    <div class="relative z-10 h-full flex flex-col justify-between">
                        <div class="text-teal uppercase tracking-widest text-xs">Core Principle</div>
                        <div>
                            <h3 class="text-3xl font-arabic text-white mb-2">التوحيد</h3>
                            <h4 class="text-2xl text-gold-500 font-serif">Oneness of Purpose</h4>
                            <p class="text-white/70 mt-4 max-w-lg">We build systems that recognize the unity of humanity. No silos. No exploitation. A universal resource pool for 8 billion sovereigns.</p>
                        </div>
                    </div>
                </div>

                <!-- Rule 3 -->
                <div class="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-500 card-3d group">
                    <div class="text-6xl font-bold text-white/5 mb-12 group-hover:text-gold-500/20 transition-colors">03</div>
                    <h3 class="text-xl text-gold-500 font-serif mb-4">Transparency</h3>
                    <p class="text-white/70 text-sm leading-relaxed">No false promises. No hidden layers. What you see is what governs. "I could not share everything, but I shared what matters."</p>
                </div>

                <!-- Rule 4 -->
                <div class="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-500 card-3d group">
                    <div class="text-6xl font-bold text-white/5 mb-12 group-hover:text-gold-500/20 transition-colors">04</div>
                    <h3 class="text-xl text-gold-500 font-serif mb-4">For Humanity</h3>
                    <p class="text-white/70 text-sm leading-relaxed">This is not an individual project. This is the Ummah's project. Humanity's project. The Seed belongs to the soil.</p>
                </div>

                 <!-- Rule 5 -->
                 <div class="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-500 card-3d group flex flex-col justify-center items-center text-center">
                    <div class="w-16 h-16 rounded-full border border-gold-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <span class="text-2xl">⚖️</span>
                    </div>
                    <h3 class="text-xl text-gold-500 font-serif">Proof of Impact</h3>
                    <p class="text-white/50 text-xs mt-2 uppercase tracking-widest">Not Proof of Work</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Section IV: The Tree (Vision Stats) -->
    <section id="vision" class="py-32 bg-black text-white relative">
        <div class="max-w-6xl mx-auto px-6">
            <div class="text-center mb-24">
                <span class="text-emerald text-sm tracking-[0.3em] uppercase block mb-4">31 Months Later</span>
                <h2 class="text-5xl md:text-8xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-gold-300 to-gold-600 pb-4">
                    BIZRA
                </h2>
                <p class="text-xl font-light text-white/60">The Seed became a Tree.</p>
            </div>

            <!-- Stats Display -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-12 border-t border-white/10 pt-12">
                <div class="stat-item text-center group">
                    <div class="text-4xl md:text-6xl font-bold text-white mb-2 group-hover:text-gold-500 transition-colors counter" data-target="7">0</div>
                    <div class="text-xs uppercase tracking-widest text-white/40">Billion Agents</div>
                </div>
                <div class="stat-item text-center group">
                    <div class="text-4xl md:text-6xl font-bold text-white mb-2 group-hover:text-gold-500 transition-colors counter" data-target="130">0</div>
                    <div class="text-xs uppercase tracking-widest text-white/40">K TPS Vision</div>
                </div>
                <div class="stat-item text-center group">
                    <div class="text-4xl md:text-6xl font-bold text-white mb-2 group-hover:text-gold-500 transition-colors counter" data-target="118">0</div>
                    <div class="text-xs uppercase tracking-widest text-white/40">K+ Words Spec</div>
                </div>
                <div class="stat-item text-center group">
                    <div class="text-4xl md:text-6xl font-bold text-white mb-2 group-hover:text-gold-500 transition-colors counter" data-target="1">0</div>
                    <div class="text-xs uppercase tracking-widest text-white/40">Universal Truth</div>
                </div>
            </div>

            <!-- Final Call -->
            <div class="mt-32 text-center">
                <button class="group relative px-12 py-4 bg-transparent overflow-hidden rounded-full border border-gold-500/50 hover:border-gold-500 transition-all duration-300">
                    <div class="absolute inset-0 w-full h-full bg-gold-500/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                    <span class="relative z-10 font-serif text-xl text-gold-100 group-hover:text-white flex items-center gap-4">
                        Explore the Architecture <span class="group-hover:translate-x-2 transition-transform">→</span>
                    </span>
                </button>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-navy-900 border-t border-white/5 py-20 px-6">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-12">
            <div class="text-center md:text-left">
                <div class="text-2xl font-bold tracking-widest mb-4">BIZRA</div>
                <p class="text-white/40 text-sm max-w-xs">
                    Built on the foundation of "The Seed".<br>
                    Serving 8 billion humans with dignity.
                </p>
            </div>
            
            <div class="flex flex-col items-center md:items-end gap-4">
                <div class="font-arabic text-xl text-gold-500" dir="rtl">
                    الْحَمْدُ لِلَّهِ الَّذِي هَدَانَا لِهَٰذَا
                </div>
                <p class="text-white/30 text-xs italic">
                    "All praise to Allah who guided us to this."
                </p>
                <div class="text-white/20 text-[10px] mt-8 tracking-widest uppercase">
                    © 2025 BIZRA Foundation. Genesis Document.
                </div>
            </div>
        </div>
    </footer>

    <!-- Scripts -->
    <script>
        // === CUSTOM CURSOR ===
        const cursorDot = document.querySelector('.cursor-dot');
        const cursorOutline = document.querySelector('.cursor-outline');

        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;

            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;
            
            // Outline follows with delay
            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 500, fill: "forwards" });
        });

        // === LOADER & HERO SEQUENCE ===
        window.addEventListener('load', () => {
            const tl = gsap.timeline();
            
            // 1. Loader Sequence
            tl.to('.reveal-text', {
                y: 0,
                opacity: 1,
                stagger: 0.2,
                duration: 0.8,
                ease: "power3.out"
            })
            .to('.reveal-dot', {
                opacity: 1,
                stagger: 0.2,
                duration: 0.5
            }, "-=0.5")
            .to('#loader-bar', {
                scaleX: 1,
                duration: 1.5,
                ease: "expo.inOut"
            })
            .to('#loader', {
                yPercent: -100,
                duration: 1,
                ease: "power4.inOut",
                delay: 0.5
            })
            
            // 2. Navigation Reveal
            .to('#nav', {
                opacity: 1,
                y: 0,
                duration: 1
            }, "-=0.5")
            
            // 3. Logo Construction (The Seed of Life)
            .to('.seed-circle', {
                opacity: 1,
                stagger: 0.1,
                duration: 1,
                ease: "power2.out"
            }, "-=0.2")
            .from('.seed-circle', {
                strokeDashoffset: 300,
                strokeDasharray: 300,
                duration: 1.5,
                stagger: 0.1,
                ease: "power2.inOut"
            }, "<")
            .to('#outer-ring', {
                opacity: 0.5,
                duration: 1
            }, "-=0.5")
            
            // 4. Flower Bloom (The Overlap)
            .to('.logo-petal', {
                opacity: 1,
                duration: 1,
                stagger: 0.1
            })
            .from('.logo-petal', {
                strokeDashoffset: 100,
                strokeDasharray: 100,
                duration: 1.5,
                stagger: 0.1,
                ease: "power2.out"
            }, "-=1")
            
            // 5. Final Touches (Fade lines, Pulse Dot)
            .to('.seed-circle', {
                opacity: 0.2,
                strokeWidth: 0.25,
                duration: 1
            }, "-=0.5")
            .to('.logo-dot', {
                opacity: 1,
                scale: 1,
                duration: 0.5,
                transformOrigin: "center"
            })
            
            // 6. Text Reveals
            .to('#hero-arabic', {
                opacity: 0.2,
                scale: 1,
                duration: 2,
                ease: "power3.out"
            }, "-=1")
            .to('.hero-title', {
                y: 0,
                duration: 1.2,
                ease: "power3.out"
            }, "-=1.5")
            .to('.hero-badge', {
                y: 0,
                duration: 1,
                ease: "power3.out"
            }, "-=1.2")
            .to('#hero-desc', {
                opacity: 1,
                y: 0,
                duration: 1
            }, "-=0.8")
            .to('#scroll-hint', {
                opacity: 1,
                y: 0,
                duration: 1
            }, "-=0.5");
        });

        // === GSAP SCROLL TRIGGER ===
        gsap.registerPlugin(ScrollTrigger);

        // Marquee Effect
        gsap.to('.marquee-content', {
            xPercent: -50,
            ease: "none",
            scrollTrigger: {
                trigger: ".marquee-content",
                start: "top bottom",
                end: "bottom top",
                scrub: 1
            } 
        });

        // Message Cards Fade In
        const cards = document.querySelectorAll('.msg-card');
        cards.forEach((card, i) => {
            ScrollTrigger.create({
                trigger: card,
                start: "top 80%",
                end: "top 20%",
                onEnter: () => {
                    gsap.to(card, { opacity: 1, scale: 1, duration: 0.5 });
                    card.classList.add('gold-glow');
                },
                onLeaveBack: () => {
                    gsap.to(card, { opacity: 0.5, scale: 0.95, duration: 0.5 });
                    card.classList.remove('gold-glow');
                }
            });
        });

        // 3D Cards Tilt Effect
        const tiltCards = document.querySelectorAll('.card-3d');
        tiltCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg
                const rotateY = ((x - centerX) / centerX) * 10;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
            });
        });

        // Number Counters
        const counters = document.querySelectorAll('.counter');
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            
            ScrollTrigger.create({
                trigger: counter,
                start: "top 85%",
                once: true,
                onEnter: () => {
                    gsap.to(counter, {
                        innerHTML: target,
                        duration: 2,
                        snap: { innerHTML: 1 },
                        modifiers: {
                            innerHTML: function(value) {
                                if(target > 100) return Math.round(value) + "K";
                                if(target > 5) return Math.round(value) + "B";
                                return Math.round(value);
                            }
                        }
                    });
                }
            });
        });

        // === THREE.JS BACKGROUND (Simple Golden Particles) ===
        const canvas = document.getElementById('hero-canvas');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Particles
        const geometry = new THREE.BufferGeometry();
        const particlesCount = 700;
        const posArray = new Float32Array(particlesCount * 3);

        for(let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 15; // Spread
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const material = new THREE.PointsMaterial({
            size: 0.02,
            color: 0xC9A962,
            transparent: true,
            opacity: 0.8,
        });

        const particlesMesh = new THREE.Points(geometry, material);
        scene.add(particlesMesh);

        camera.position.z = 3;

        // Mouse interaction
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;

        document.addEventListener('mousemove', (event) => {
            mouseX = (event.clientX - windowHalfX);
            mouseY = (event.clientY - windowHalfY);
        });

        const clock = new THREE.Clock();

        function animate() {
            targetX = mouseX * 0.001;
            targetY = mouseY * 0.001;

            const elapsedTime = clock.getElapsedTime();

            particlesMesh.rotation.y = .2 * elapsedTime;
            particlesMesh.rotation.x += 0.05 * (targetY - particlesMesh.rotation.x);
            particlesMesh.rotation.y += 0.05 * (targetX - particlesMesh.rotation.y);

            // Gentle wave
            particlesMesh.position.y = Math.sin(elapsedTime * 0.5) * 0.2;

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }

        animate();

        // Resize handler
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

    </script>
</body>
</html>