import React from 'react';
import Link from 'next/link'; // Import Link for navigation
import Image from 'next/image'; // Import Image for logo
import { Check, Mic, Sparkles, Brain, Search, CloudLightning, Keyboard, FolderSearch, CopySlash, Users, Zap } from 'lucide-react'; // Added Zap
import type { Metadata } from 'next'; // Import Metadata type

// Add Metadata export for the page title
export const metadata: Metadata = {
  title: 'VibeKeep | Powering organized vibes',
  // You can add other metadata fields here if needed, like description
  // description: 'Capture thoughts at the speed of voice. Let AI handle the processing.',
};

const HomePage: React.FC = () => {
  const logoUrl = "https://s3.ca-central-1.amazonaws.com/logojoy/logos/218272791/noBgBlack.png?865367";

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased font-sans">
      {/* Navigation Bar (Sticky) */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/home">
                <Image 
                  src={logoUrl}
                  alt="VibeKeep Logo"
                  width={140} 
                  height={32} 
                  priority 
                  className="h-8 w-auto" 
                />
              </Link>
            </div>
            {/* Sign In / Sign Up Buttons */}
            <div className="flex items-center space-x-3">
              <Link 
                href="/signin" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150"
              >
                Sign In
              </Link>
              <Link 
                href="/signup" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* --- PUNCHY NARRATIVE FOR HIGH PERFORMERS --- */}

      {/* 1. Hero: Eliminate Friction. Amplify Output. */}
      <section id="hero" className="bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 py-24 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-indigo-700 to-blue-800 mb-6">
            Eliminate Friction. Amplify Output.
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto mb-10">
            Capture thoughts at the speed of voice. Let AI handle the processing. Stay focused on high-impact work.
          </p>
          <Link
            href="/signup"
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white py-3 px-8 rounded-lg text-lg font-semibold transition-all duration-150 hover:from-indigo-700 hover:to-blue-800 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md"
          >
            <Zap className="w-5 h-5" />
            Start Now (Free)
          </Link>
        </div>
      </section>

      {/* 2. The Situation: Your Cognitive Load is Maxed Out */}
      <section id="situation" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="text-6xl mb-6 text-gray-400"><CloudLightning /></div>
            <h2 className="text-4xl font-semibold text-gray-900 mb-6">
                Your Cognitive Load is Maxed Out
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
                Constant context switching between capturing ideas, managing tasks, and finding information kills momentum. Your fragmented system creates drag, stealing focus from strategic thinking and deep work.
            </p>
        </div>
      </section>

      {/* 3. The Pains: The High Cost of Inefficiency */}
      <section id="pains" className="py-20 bg-gray-50 border-t border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-semibold text-center text-gray-900 mb-16">
             The High Cost of Inefficiency
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
            {/* Pain Card 1: Input Bottleneck */}
            <div className="bg-white p-8 rounded-lg border shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Keyboard className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-800">Input Bottleneck</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Typing is slow. Voice memos become dead ends. Valuable thoughts – ideas, follow-ups, insights – evaporate before being captured effectively. This isn't just annoying, it's lost potential.
              </p>
            </div>
            
            {/* Pain Card 2: Organizational Tax */}
            <div className="bg-white p-8 rounded-lg border shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-red-100 rounded-lg">
                  <FolderSearch className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-800">Organizational Tax</h3>
              </div>
              <ul className="text-gray-600 space-y-3 list-inside">
                <li className="flex items-start gap-2">
                  <CopySlash className="w-5 h-5 text-red-500 mt-1 flex-shrink-0"/>
                  <span>Wasting time hunting for information across silos kills flow state instantly.</span>
                </li>
                <li className="flex items-start gap-2">
                   <Users className="w-5 h-5 text-red-500 mt-1 flex-shrink-0"/>
                   <span>Context is fragmented across work, personal, and side projects, hindering holistic thinking.</span>
                </li>
                 <li className="flex items-start gap-2">
                    <span className="font-bold text-red-500 text-lg mr-1">!</span> 
                    <span>Manual duplication and linking drains energy better spent on execution.</span>
                </li>
              </ul>
            </div>
          </div>
          <p className="text-center text-lg text-gray-700 mt-12 max-w-3xl mx-auto font-medium">
             This isn't just clutter – it's a direct drag on your performance.
          </p>
        </div>
      </section>

      {/* 4. The Solution: AI-Powered Workflow Acceleration */}
      <section id="solution" className="py-20 bg-gradient-to-r from-indigo-700 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold mb-6">
            VibeKeep: AI-Powered Workflow Acceleration ⚡
          </h2>
          <p className="text-xl max-w-3xl mx-auto">
            Recapture lost time and focus. VibeKeep uses AI to instantly transcribe, structure, and connect your thoughts. Move from idea to action faster, without the manual overhead.
          </p>
        </div>
      </section>
      
      {/* 5. How it Works: Capture -> Synthesize -> Retrieve */}
      <section id="workflow" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-semibold text-center text-gray-900 mb-16">
            Capture → Synthesize → Retrieve
          </h2>
          <div className="space-y-16">
            {/* Step 1: Instant Capture */} 
            <div className="md:flex md:items-center md:space-x-8">
              <div className="md:w-1/3 text-center md:text-left mb-4 md:mb-0">
                 <div className="inline-block bg-indigo-100 text-indigo-700 rounded-full p-3 mb-3">
                   <Mic className="w-8 h-8" />
                 </div>
                 <h3 className="text-2xl font-semibold text-gray-900">1. Instant Capture</h3>
              </div>
              <div className="md:w-2/3">
                 <p className="text-lg text-gray-600 leading-relaxed">
                   Hit record, speak your mind. Capture ideas, tasks, notes <strong className="font-medium text-indigo-700">at the speed of thought</strong>. Zero typing friction.
                 </p>
              </div>
            </div>
             {/* Step 2: Automated Synthesis */}
            <div className="md:flex md:items-center md:space-x-8">
              <div className="md:w-1/3 text-center md:text-left mb-4 md:mb-0">
                 <div className="inline-block bg-purple-100 text-purple-700 rounded-full p-3 mb-3">
                   <Sparkles className="w-8 h-8" />
                 </div>
                 <h3 className="text-2xl font-semibold text-gray-900">2. Automated Synthesis</h3>
              </div>
              <div className="md:w-2/3">
                 <p className="text-lg text-gray-600 leading-relaxed">
                    AI gets to work instantly: transcribing, <strong className="font-medium text-purple-700">auto-tagging</strong> context (#idea, #projectX, #urgent), summarizing, and extracting actionable items. You focus, AI processes.
                 </p>
              </div>
            </div>
             {/* Step 3: Rapid Retrieval */}
            <div className="md:flex md:items-center md:space-x-8">
              <div className="md:w-1/3 text-center md:text-left mb-4 md:mb-0">
                 <div className="inline-block bg-pink-100 text-pink-700 rounded-full p-3 mb-3">
                   <Search className="w-8 h-8" />
                 </div>
                 <h3 className="text-2xl font-semibold text-gray-900">3. Rapid Retrieval</h3>
              </div>
              <div className="md:w-2/3">
                 <p className="text-lg text-gray-600 leading-relaxed">
                    Need it later? <strong className="font-medium text-pink-700">Instantly surface related notes</strong> via smart search or tag filtering. Connect ideas across contexts without the hunt.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Built for Performance: Secure & Reliable */}
      <section id="tech-trust" className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
           <h2 className="text-4xl font-semibold text-center text-gray-900 mb-16">
            Built for Performance: Secure & Reliable 🛠️🔒
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Tech Stack */}
            <div>
               <h3 className="text-2xl font-semibold text-gray-800 mb-6 text-center lg:text-left">Core Tech</h3>
               <ul className="space-y-4 text-gray-600">
                  <li className="flex items-start gap-3">
                     <strong className="font-medium text-indigo-700">Fast UI:</strong> 
                     <span>Next.js/React on Vercel for low-latency interaction.</span>
                  </li>
                   <li className="flex items-start gap-3">
                     <strong className="font-medium text-purple-700">Secure Backend:</strong> 
                     <span>Supabase (Postgres) with Row Level Security. Your data is isolated.</span>
                  </li>
                  <li className="flex items-start gap-3">
                     <strong className="font-medium text-pink-700">Reliable AI:</strong> 
                     <span>Secure OpenAI API integration for transcription & analysis.</span>
                  </li>
                   <li className="flex items-start gap-3">
                     <strong className="font-medium text-gray-700">Clean Interface:</strong> 
                     <span>Tailwind CSS & Shadcn UI for a focused, uncluttered experience.</span>
                  </li>
               </ul>
            </div>
            {/* Security Focus */}
            <div>
               <h3 className="text-2xl font-semibold text-gray-800 mb-6 text-center lg:text-left">Your Data Security</h3>
               <div className="space-y-5 bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-sm">
                 <div>
                   <h4 className="font-semibold text-gray-700 mb-1">Data Isolation?</h4>
                   <p className="text-gray-600">Absolutely. RLS ensures only you access your entries.</p>
                 </div>
                 <div>
                   <h4 className="font-semibold text-gray-700 mb-1">AI Processing?</h4>
                   <p className="text-gray-600">Secure, ephemeral processing via trusted APIs (e.g., OpenAI). Your data isn't used for training.</p>
                 </div>
                 <div>
                   <h4 className="font-semibold text-gray-700 mb-1">Encryption?</h4>
                   <p className="text-gray-600">Yes. HTTPS/TLS in transit, standard database encryption at rest.</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

       {/* 7. Trusted by Operators */}
       <section id="testimonials" className="py-20 bg-white">
         <div className="max-w-5xl mx-auto px-6">
           <h2 className="text-4xl font-semibold text-center text-gray-900 mb-12">
             Trusted by Operators
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             {/* Placeholder Testimonials - Need punchier versions */} 
             <blockquote className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
               <p className="text-gray-700 italic mb-4">"Voice capture + AI synthesis saves me hours weekly. I move from meetings to action items much faster."
               </p>
               <footer className="text-gray-600">— Founder, SaaS Startup</footer>
             </blockquote>
             <blockquote className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
               <p className="text-gray-700 italic mb-4">"Finally, a way to capture fleeting ideas without breaking focus during deep work sessions. Essential tool."
               </p>
               <footer className="text-gray-600">— Senior Engineer</footer>
             </blockquote>
           </div>
         </div>
       </section>

      {/* 8. Unlock Peak Performance - Free */}
      <section id="get-started-cta" className="py-20 bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold text-gray-900 mb-6">
            Unlock Your Peak Performance
          </h2>
          <p className="text-xl text-gray-700 mb-8">
            Stop the drag. Start amplifying your output. Access VibeKeep free.
          </p>
          <Link
            href="/signup" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white py-3 px-8 rounded-lg text-lg font-semibold transition-all duration-150 hover:from-indigo-700 hover:to-blue-800 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md" 
          >
            <Zap className="w-5 h-5" />
            Get Started Now - Free
          </Link>
        </div>
      </section>

      {/* Footer (Minimal) */}
      <footer className="py-10 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm">
          <p className="text-gray-500 mb-2"> 
            &copy; {new Date().getFullYear()} VibeKeep. Amplify your output.
          </p>
          <div className="space-x-4">
            <Link href="/terms-of-service" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-indigo-600 transition"
            >
              Terms
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/privacy-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-indigo-600 transition"
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage; 