import React from 'react';
import Link from 'next/link'; // Import Link for navigation
import Image from 'next/image'; // Import Image for logo
import { Check } from 'lucide-react'; // Import Check icon

const HomePage: React.FC = () => {
  const logoUrl = "https://s3.ca-central-1.amazonaws.com/logojoy/logos/218272791/noBgBlack.png?865367";

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/home">
                <Image 
                  src={logoUrl}
                  alt="VibeKeep Logo"
                  width={140} // Placeholder width
                  height={32} // Placeholder height
                  priority // Optional: Prioritize loading the logo
                  className="h-8 w-auto" // Removed lowercase class
                />
              </Link>
            </div>
            {/* Sign In / Sign Up Buttons */}
            <div className="flex items-center space-x-3">
              <Link 
                href="/signin" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150"
              >
                Sign In
              </Link>
              <Link 
                href="/signup" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* --- NEW NARRATIVE STRUCTURE START --- */}

      {/* 1. Hero: Augment Your Cognitive Workflow ✨ */}
      <section id="hero" className="bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 py-24 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-purple-600 to-indigo-800 mb-6">
            Harmorize your work / life balance with intelligence ✨
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto mb-10">
            Capture your thoughts, ideas, and actions with ease, and make it useful.
          </p>
          <Link
            href="/signup"
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 px-8 rounded-lg text-lg font-semibold transition-all duration-150 hover:from-blue-700 hover:to-indigo-800 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md"
          >
            Get started
          </Link>
        </div>
      </section>

      {/* 2. The Invisible Friction Hindering Peak Performance - Expanded & Painful */}
      <section id="friction" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-semibold text-center text-gray-900 mb-16">
             Disorganized and disconnected trackers hold you back 😩
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
             {/* Expanded Problem 1 */}
            <div className="text-center">
              <div className="text-5xl mb-4">🗣️⌨️</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Too many inputs</h3>
              <p className="text-gray-600 mb-4">Switching between text, voice, and other inputs breaks flow. Transient thoughts evaporate before being logged. Critical details from calls or quick insights get lost in the shuffle.</p>
               <ul className="text-left text-sm text-red-700 space-y-1 list-disc list-inside">
                 <li>Missed Opportunities: Brilliant ideas vanish before capture.</li>
                 <li>Incomplete Context: Key details from conversations are lost.</li>
                 <li>Wasted Momentum: Flow state is constantly interrupted.</li>
              </ul>
            </div>
             {/* Expanded Problem 2 */}
            <div className="text-center">
              <div className="text-5xl mb-4">🤯⏳</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Manual analysis</h3>
              <p className="text-gray-600 mb-4">Your valuable cognitive energy is spent on low-level tasks: manually connecting concepts, summarizing notes after the fact, and trying to extract action items from dense text.</p>
               <ul className="text-left text-sm text-red-700 space-y-1 list-disc list-inside">
                 <li>Drained Energy: Mental resources wasted on repetitive organizing.</li>
                 <li>Delayed Insights: Connections remain hidden until manually uncovered.</li>
                 <li>Slowed Execution: Actionable steps aren't surfaced quickly enough.</li>
              </ul>
            </div>
             {/* Expanded Problem 3 */}
            <div className="text-center">
               <div className="text-5xl mb-4">💾❓</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Fragmented access</h3>
              <p className="text-gray-600 mb-4">Searching across fragmented notes, project docs, and email relies on faulty memory or basic keyword matching, delaying access to critical context when you need it instantly.</p>
              <ul className="text-left text-sm text-red-700 space-y-1 list-disc list-inside">
                 <li>Broken Flow: Time wasted hunting for information disrupts focus.</li>
                 <li>Incomplete Decisions: Acting without the full context readily available.</li>
                 <li>Stalled Progress: Waiting for information retrieval blocks next steps.</li>
              </ul>
            </div>
          </div>
           <p className="text-center text-lg text-gray-700 mt-16 max-w-3xl mx-auto italic">
             These micro-frictions compound, creating drag on your cognitive system and preventing you from operating at true peak capacity.
          </p>
        </div>
      </section>

      {/* 3. The Solution: Intelligent Workflow Acceleration ⚡ */}
      <section id="solution" className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold mb-6">
            Unlock augmented intelligence with VibeKeep ⚡
          </h2>
          <p className="text-xl max-w-3xl mx-auto">
            Eliminate these friction points. VibeKeep integrates intelligent automation directly into your capture-to-execution loop, augmenting your capabilities and preserving cognitive resources for strategic work.
          </p>
        </div>
      </section>
      
      {/* 4. The workflow, transformed: From capture to completion */}
      <section id="workflow" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-semibold text-center text-gray-900 mb-16">
            Your workflow, transformed
          </h2>
          <div className="space-y-16">
            {/* Step 1: Seamless Capture */}
            <div className="md:flex md:items-start md:space-x-8">
              <div className="md:w-1/3 text-center md:text-right mb-4 md:mb-0">
                 <div className="inline-block bg-blue-100 text-blue-700 rounded-full h-12 w-12 flex items-center justify-center font-bold text-xl mx-auto md:mr-0 md:ml-auto mb-3">1</div>
                 <h3 className="text-2xl font-semibold text-gray-900">Capture at the Speed of Thought ✍️🗣️</h3>
              </div>
              <div className="md:w-2/3">
                 <p className="text-lg text-gray-600 leading-relaxed">
                   Stop context switching. Whether it's a fleeting voice memo during a commute or detailed typed notes from a meeting, ingest everything into a single, unified stream. VibeKeep's <strong className="font-medium">real-time voice transcription</strong> ensures verbal input is immediately processed and searchable alongside your text, eliminating capture friction.
                 </p>
              </div>
            </div>
             {/* Step 2: Automated Synthesis */}
            <div className="md:flex md:items-start md:space-x-8">
              <div className="md:w-1/3 text-center md:text-right mb-4 md:mb-0">
                 <div className="inline-block bg-purple-100 text-purple-700 rounded-full h-12 w-12 flex items-center justify-center font-bold text-xl mx-auto md:mr-0 md:ml-auto mb-3">2</div>
                 <h3 className="text-2xl font-semibold text-gray-900">AI Synthesizes, You Strategize 🧠</h3>
              </div>
              <div className="md:w-2/3">
                 <p className="text-lg text-gray-600 leading-relaxed">
                    Focus on higher-level thinking while AI handles the initial processing. Leveraging advanced models, VibeKeep automatically performs <strong className="font-medium">multi-dimensional tagging</strong> (Meta, Intent, Content), generates concise <strong className="font-medium">AI summaries</strong>, and extracts potential <strong className="font-medium">action items</strong>. This automated synthesis reduces manual structuring time and surfaces key information proactively.
                 </p>
              </div>
            </div>
             {/* Step 3: Contextual Interaction & Refinement */}
            <div className="md:flex md:items-start md:space-x-8">
              <div className="md:w-1/3 text-center md:text-right mb-4 md:mb-0">
                 <div className="inline-block bg-indigo-100 text-indigo-700 rounded-full h-12 w-12 flex items-center justify-center font-bold text-xl mx-auto md:mr-0 md:ml-auto mb-3">3</div>
                 <h3 className="text-2xl font-semibold text-gray-900">Interact Intelligently 🖱️</h3>
              </div>
              <div className="md:w-2/3">
                 <p className="text-lg text-gray-600 leading-relaxed">
                    Review information efficiently through <strong className="font-medium">contextual tabbed views</strong>, instantly switching between original notes, AI summaries, and action lists. Augment AI outputs directly using <strong className="font-medium">frictionless inline editing</strong> – add crucial details, correct nuances, or delete irrelevant points to ensure the structured data accurately reflects your intent.
                 </p>
              </div>
            </div>
              {/* Step 4: High-Speed Retrieval & Connection */}
             <div className="md:flex md:items-start md:space-x-8">
              <div className="md:w-1/3 text-center md:text-right mb-4 md:mb-0">
                 <div className="inline-block bg-green-100 text-green-700 rounded-full h-12 w-12 flex items-center justify-center font-bold text-xl mx-auto md:mr-0 md:ml-auto mb-3">4</div>
                 <h3 className="text-2xl font-semibold text-gray-900">Connect & Retrieve Instantly 🔗🔍</h3>
              </div>
              <div className="md:w-2/3">
                 <p className="text-lg text-gray-600 leading-relaxed">
                    Eliminate retrieval latency. Use <strong className="font-medium">dynamic tag filtering</strong> – click any AI-generated tag to immediately surface all related entries across your knowledge base. Leverage <strong className="font-medium">optimized server-side search</strong> for rapid access to specific information, transforming your notes from a static archive into a dynamic, interconnected knowledge asset.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Built for Operators: Technology & Security Transparency */}
      <section id="transparency" className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
           <h2 className="text-4xl font-semibold text-center text-gray-900 mb-16">
            Built for operators: Secure, reliable, useable
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Tech Stack */}
            <div>
               <h3 className="text-2xl font-semibold text-gray-800 mb-6 text-center lg:text-left">Core Technology Rationale ⚙️</h3>
               <ul className="space-y-4">
                  <li className="flex items-start">
                     <strong className="font-medium w-28 flex-shrink-0 text-right mr-3">Next.js:</strong> 
                     <span className="text-gray-600">Performance-focused React framework enabling fast interfaces and efficient server communication.</span>
                  </li>
                   <li className="flex items-start">
                     <strong className="font-medium w-28 flex-shrink-0 text-right mr-3">Vercel:</strong> 
                     <span className="text-gray-600">Global deployment platform for low-latency access and scalable serverless API functions.</span>
                  </li>
                   <li className="flex items-start">
                     <strong className="font-medium w-28 flex-shrink-0 text-right mr-3">Supabase:</strong> 
                     <span className="text-gray-600">Managed PostgreSQL with integrated Auth and enforced Row Level Security for data isolation and privacy.</span>
                  </li>
                  <li className="flex items-start">
                     <strong className="font-medium w-28 flex-shrink-0 text-right mr-3">OpenAI API:</strong> 
                     <span className="text-gray-600">Secure access to state-of-the-art language models for reliable AI features (transcription, analysis).</span>
                  </li>
                   <li className="flex items-start">
                     <strong className="font-medium w-28 flex-shrink-0 text-right mr-3">Tailwind/Shadcn:</strong> 
                     <span className="text-gray-600">Efficient utility-first styling and composable UI components for a clean, maintainable interface.</span>
                  </li>
               </ul>
            </div>
            {/* Security & FAQ */}
            <div>
               <h3 className="text-2xl font-semibold text-gray-800 mb-6 text-center lg:text-left">Security & Data Handling 🔒</h3>
               <div className="space-y-6 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                 <div>
                   <h4 className="font-semibold text-gray-700 mb-1">Data Isolation?</h4>
                   <p className="text-gray-600 text-sm">Yes. Supabase Row Level Security ensures only you can access your created content. No cross-user data access is possible.</p>
                 </div>
                 <div>
                   <h4 className="font-semibold text-gray-700 mb-1">AI Processing Privacy?</h4>
                   <p className="text-gray-600 text-sm">AI tasks utilize secure API calls (e.g., OpenAI). Data is processed ephemerally for analysis and not retained or used for model training by the providers per their standard terms.</p>
                 </div>
                 <div>
                   <h4 className="font-semibold text-gray-700 mb-1">Encryption?</h4>
                   <p className="text-gray-600 text-sm">All data transmission uses industry-standard HTTPS/TLS encryption. Data at rest leverages Supabase's underlying database encryption.</p>
                 </div>
                  <div>
                   <h4 className="font-semibold text-gray-700 mb-1">Data Export?</h4>
                   <p className="text-gray-600 text-sm">Functionality for user data export is on the near-term roadmap.</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

       {/* 6. Proof: Trusted by High Performers 👍 */}
       <section id="testimonials" className="py-20 bg-white">
         <div className="max-w-5xl mx-auto px-6">
           <h2 className="text-4xl font-semibold text-center text-gray-900 mb-12">
             Trusted by high performers
           </h2>
           {/* Placeholder - Replace with actual testimonials */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <blockquote className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
               <p className="text-gray-700 italic mb-4">"VibeKeep drastically reduced the time I spend processing meeting notes. The AI action items integrate directly into my workflow."
               </p>
               <footer className="text-gray-600">— Ex-Google, Ex-Spotify, Ex-AirBnB founder</footer>
             </blockquote>
             <blockquote className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
               <p className="text-gray-700 italic mb-4">"The seamless voice capture and immediate synthesis allow me to capture and connect ideas without breaking vibes. Indispensable."
               </p>
               <footer className="text-gray-600">— Ex-Blackberry, Ex-Blockbuster, Ex-Toys-R-Us strategist</footer>
             </blockquote>
           </div>
         </div>
       </section>

      {/* 7. Access & Evolution: Pricing & Roadmap 📈 */}
      <section id="access-evolution" className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
           <h2 className="text-4xl font-semibold text-center text-gray-900 mb-12">
            Access & evolution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start justify-items-center">
            {/* Free Tier Card */}
            <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 rounded-lg border border-gray-200 shadow-lg w-full max-w-md">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Free Tier Access</h3>
              <p className="text-gray-600 mb-6">
                Utilize the core intelligent processing features with generous limits suitable for individual high-performance use.
              </p>
              <ul className="text-left text-gray-600 space-y-2 mb-8">
                 <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" /> Core AI Processing Features ✅</li>
                 <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" /> Secure Data Storage & Sync ☁️</li>
                 <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" /> Standard Usage Limits 📊</li>
              </ul>
              <Link
                href="/signup"
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full block bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-center py-3 px-8 rounded-lg text-lg font-semibold transition-all duration-150 hover:from-blue-700 hover:to-indigo-800 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md"
              >
                Get Started (Free)
              </Link>
            </div>
            {/* Premium Tier / Roadmap Block */}
            <div className="bg-white p-8 rounded-lg border border-gray-200 w-full max-w-md shadow-sm">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Premium & Roadmap</h3>
               <p className="text-gray-600 mb-6">
                 A Premium Tier with advanced AI models, higher limits, and priority support is planned. We also offer bespoke customizations now.
               </p>
               <h4 className="font-semibold text-gray-800 mb-2">Near-Term Roadmap:</h4>
                <ul className="text-left text-gray-600 space-y-2 mb-8">
                 <li className="flex items-start"><Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" /> Enhanced Semantic Analysis ✨</li>
                 <li className="flex items-start"><Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" /> Task Prioritization Models 📊</li>
                 <li className="flex items-start"><Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" /> Robust Data Export 📤</li>
                 <li className="flex items-start"><Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" /> Potential Workflow Integrations 🔌</li>
               </ul>
               <a href="mailto:[Your Contact Email Address]?subject=VibeKeep Premium/Custom Inquiry" 
                  className="w-full block border border-gray-400 text-gray-700 text-center py-3 px-8 rounded-lg text-lg font-semibold transition-colors duration-150 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
               >
                 Inquire About Premium/Custom
               </a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Final Call to Action 🚀 */}
      <section id="signup" className="py-20 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold text-gray-900 mb-6">
            Ready to operate at your peak?
          </h2>
          <p className="text-xl text-gray-700 mb-8">
            Integrate intelligent augmentation into your cognitive workflow. Access VibeKeep free today.
          </p>
          <Link
            href="/signup" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 px-8 rounded-lg text-lg font-semibold transition-all duration-150 hover:from-blue-700 hover:to-indigo-800 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md" 
          >
            Access VibeKeep - Free
          </Link>
        </div>
      </section>

      {/* --- NARRATIVE STRUCTURE END --- */}

      {/* Footer */}
      <footer className="py-10 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm">
          <p className="text-gray-500 mb-2"> 
            &copy; {new Date().getFullYear()} VibeKeep. All rights reserved.
          </p>
          <div className="space-x-4">
            <Link href="/terms-of-service" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-blue-600 transition"
            >
              Terms of Service
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/privacy-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-blue-600 transition"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage; 