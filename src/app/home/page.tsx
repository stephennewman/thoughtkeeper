import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
// Icons for sections (adjust as needed based on new content)
import {
  Zap, // General Action, AI
  Box, // Centralize/Solution/Product
  ListChecks, // Organize/How it Works/Actions
  Search, // Prioritize/How it Works/Search
  Mic, // Voice Feature
  Type, // Text Feature
  Tags, // Tagging Feature
  CheckSquare, // Action Items / Benefits
  BarChart, // Visualizations/Roadmap
  Smartphone, // Mobile/Where it Works
  Cpu, // Tech Transparency / AI Dev
  ShieldCheck, // Security / Tech / Privacy
  Github, // Version Control / Tech
  Server, // Backend / Hosting / Tech
  TerminalSquare, // Framework / Frontend / Tech
  Lock, // Pricing / Free Access
  MessageSquareQuote, // Social Proof / Testimonials
  Lightbulb, // Ideas / Problem
  ArrowRight, // CTA links
  Check, // Feature benefit prefix
  Briefcase, // Roadmap / Integrations
  BrainCircuit, // Ridiculous Idea 1
  CloudMoon, // Ridiculous Idea 2
  ExternalLink, // New Tab / External Link Icon
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VibeKeep | Capture Instantly. Organize Intelligently. Prioritize Smarter.',
  description: 'VibeKeep: The single, AI-powered space to capture everything — and organize it without thinking.',
};

const HomePage: React.FC = () => {
  const logoUrl = "https://s3.ca-central-1.amazonaws.com/logojoy/logos/218272791/noBgBlack.png?865367"; // Keep existing logo URL

  // Reusable component for Feature items (adjust styling if needed)
  const FeatureBenefitItem = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div className="bg-white p-6 rounded-lg border shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-green-100 rounded-lg inline-block mt-1"> {/* Changed color */}
          <Icon className="w-5 h-5 text-green-600" /> {/* Adjusted size */}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-1">{title}</h3>
          <p className="text-gray-600 leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );

  // Reusable component for Roadmap items
  const RoadmapItem = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
     <div className="bg-white p-6 rounded-lg border text-center">
        <Icon className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
        <h3 className="font-semibold text-lg mb-1 text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500">{children}</p>
    </div>
  );

  // Reusable component for Tech Transparency items
  const TechItem = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-md">
      <div className="flex-shrink-0 mt-1">
         <Icon className="w-6 h-6 text-indigo-600" />
      </div>
      <div>
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <p className="text-sm text-gray-600">{children}</p>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased font-sans">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/"> {/* Link to root for home */}
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
            {/* Sign In / Sign Up */}
            <div className="flex items-center space-x-3">
              <Link
                href="/signin"
                target="_blank" // Keep target blank if you want them to open in new tab
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                target="_blank" // Keep target blank if you want them to open in new tab
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
              >
                Sign Up <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 1. Hero Section */}
      <section id="hero" className="bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-24 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
            Capture Instantly.
            <br className="hidden md:block" />
            Organize Intelligently.
            <br className="hidden md:block" />
            <span className="text-indigo-600">Prioritize Smarter.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-8">
             Your mind isn't cluttered — <strong>your tools are.</strong>
             <br />Ideas, todos, insights: they're scattered across too many apps, stuck in half-finished notes, or lost in fleeting voice memos.
          </p>
          <p className="text-xl md:text-2xl text-gray-800 font-medium max-w-3xl mx-auto mb-10">
            VibeKeep is the single, AI-powered space to capture everything — and organize it <span className="italic">without thinking.</span>
          </p>
          <Link
            href="/signup"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white py-3 px-8 rounded-lg text-lg font-semibold transition-all duration-150 hover:from-indigo-700 hover:to-blue-800 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md"
          >
            Get Started <ExternalLink className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* 2. The Problem */}
      <section id="problem" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-semibold text-center text-gray-900 mb-4">
              The Problem: You Have Too Much Going On,
            </h2>
             <p className="text-xl text-center text-indigo-600 font-medium mb-16">In Too Many Places.</p>

            {/* Grid for Problem Chunks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
                {/* Problem Chunk 1: Too much noise */}
                <div>
                    <div className="text-5xl mb-4">🤯</div> {/* Emoji */}
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Too much noise</h3>
                    <p className="text-gray-600 leading-relaxed">
                        Brilliant ideas get buried across endless notes, files, and apps — before you can act.
                    </p>
                </div>
                {/* Problem Chunk 2: Too many trackers */}
                <div>
                     <div className="text-5xl mb-4">😵‍💫</div> {/* Emoji */}
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Too many trackers</h3>
                    <p className="text-gray-600 leading-relaxed">
                        To-dos in one place. Notes in another. Docs in another. Things inevitably fall through the cracks.
                    </p>
                </div>
                {/* Problem Chunk 3: Too many dead ends */}
                <div>
                     <div className="text-5xl mb-4">🕳️</div> {/* Emoji */}
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Too many dead ends</h3>
                    <p className="text-gray-600 leading-relaxed">
                        Voice notes stay untranscribed. Good ideas stay forgotten. Knowledge stays trapped.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* 3. The Solution */}
      <section id="solution" className="py-20 bg-gradient-to-b from-gray-50 to-white border-t">
        <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="inline-block bg-indigo-100 text-indigo-600 rounded-full p-4 mb-5 shadow-sm">
              <Box className="w-10 h-10" />
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6">
              The Solution: Centralize Every Idea, To Do, and Note in One Location
            </h2>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                Move away from multiple, disconnected places to track your work, life, and side hustles to a single, unified solution.
            </p>
        </div>
      </section>

      {/* NEW Showcase Section */}
      <section id="showcase-main" className="py-16 bg-white border-t">
        <div className="max-w-6xl mx-auto px-6 flex justify-center">
            {/* Moved and Restyled Image Container */}
            <div className="rounded-lg overflow-hidden border max-w-4xl"> {/* Removed shadow-xl, added max-w-4xl for control within flex */}
                 <Image
                    src="/vibekeep-os.png"
                    alt="VibeKeep app interface on desktop and mobile"
                    width={1000}
                    height={667}
                    layout="responsive"
                    className="object-cover"
                 />
             </div>
        </div>
      </section>

      {/* 4. The Product */}
      <section id="product" className="py-20 bg-white border-t">
         <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-1 items-center"> {/* Changed to single column as image is removed */}
            {/* Text Content (Now centered or adjusted as needed) */}
             <div className="text-center max-w-3xl mx-auto"> {/* Removed md:text-left, kept text-center and max-width */}
                 {/* Using Zap icon for 'lightning-fast' */}
                 <div className="inline-block bg-purple-100 text-purple-600 rounded-full p-3 mb-4">
                    <Zap className="w-8 h-8" />
                 </div>
                 <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6">
                   The Product: Keep Your Vibes, and Much More, in VibeKeep
                 </h2>
                 <p className="text-lg text-gray-600 leading-relaxed mb-4">
                     VibeKeep gives you a single, lightning-fast input for text or voice — and organizes everything automatically with AI.
                 </p>
                 <p className="text-lg text-gray-600 leading-relaxed font-medium">
                     No more wondering where to save something. No more chaos. Capture now. Prioritize later.
                 </p>
             </div>
              {/* Visual Showcase (Removed from here) */}
            {/* Removed Image div block that was previously here */}
         </div>
       </section>


      {/* 5. How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50 border-t border-b">
        <div className="max-w-5xl mx-auto px-6">
           <h2 className="text-3xl md:text-4xl font-semibold text-center text-gray-900 mb-16">
             How It Works: Turning Mental Clutter into <span className="text-purple-600">Magical Clarity</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1: Capture */}
            <div className="text-center border p-6 rounded-lg bg-white shadow-sm">
               <div className="mb-4 inline-block p-3 bg-blue-100 rounded-full">
                 <Mic className="w-7 h-7 text-blue-600 inline-block mr-1" />
                 <Type className="w-7 h-7 text-blue-600 inline-block ml-1" />
               </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2"><span className="text-blue-600 font-bold mr-2">1.</span>Capture Instantly</h3>
              <p className="text-gray-600 leading-relaxed">
                Speak or type into your VibeKeep input. No friction, no fiddling.
              </p>
            </div>

            {/* Step 2: AI Organizes */}
            <div className="text-center border p-6 rounded-lg bg-white shadow-sm">
              <div className="mb-4 inline-block p-3 bg-purple-100 rounded-full">
                 <Tags className="w-7 h-7 text-purple-600 inline-block mr-1" />
                 <ListChecks className="w-7 h-7 text-purple-600 inline-block ml-1" />
               </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2"><span className="text-purple-600 font-bold mr-2">2.</span>AI Organizes Automatically</h3>
               <p className="text-gray-600 leading-relaxed">
                 Transcribes voice, suggests tags (#project, #idea, #urgent), and extracts actions.
               </p>
            </div>

            {/* Step 3: You Prioritize */}
             <div className="text-center border p-6 rounded-lg bg-white shadow-sm">
              <div className="mb-4 inline-block p-3 bg-pink-100 rounded-full">
                 <Search className="w-7 h-7 text-pink-600" />
               </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2"><span className="text-pink-600 font-bold mr-2">3.</span>You Prioritize Clearly</h3>
               <p className="text-gray-600 leading-relaxed">
                 Filter, search, and focus — with a structured feed of your thoughts, tasks, and insights.
               </p>
            </div>
          </div>
          {/* Added Centered CTA Button */}
          <div className="mt-12 text-center">
            <Link
              href="/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-md text-base font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
            >
              Give It a Try <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

       {/* 6. Where It Works */}
       <section id="where-it-works" className="py-20 bg-white">
         <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="md:pr-8">
                <div className="inline-block bg-teal-100 text-teal-600 rounded-full p-3 mb-4">
                    <Smartphone className="w-8 h-8" />
                 </div>
                <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6">
                    Where It Works: Browser First, Mobile Ready.
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-4">
                    No clunky apps to install. VibeKeep runs beautifully in your browser.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    Want a mobile shortcut? Just <strong>"Add to Home Screen"</strong> for an app-like experience.
                </p>
                <p className="text-base text-gray-500 italic">
                    (Bonus: We're developing a native iOS app — sign up to get early access.)
                </p>
            </div>
             {/* Visual Showcase (Macbook image) */}
             <div className="rounded-lg overflow-hidden shadow-xl border">
               <Image
                 src="/vibekeep-mac.png" // Use the macbook image here
                 alt="VibeKeep app running on a Macbook browser"
                 width={1000}
                 height={667}
                 layout="responsive"
                 className="object-cover"
               />
             </div>
         </div>
       </section>

      {/* 7. Features & Benefits */}
      <section id="features" className="py-20 bg-gray-50 border-t border-b">
        <div className="max-w-5xl mx-auto px-6">
           <h2 className="text-3xl md:text-4xl font-semibold text-center text-gray-900 mb-16">
            Features & Benefits: Unlock <span className="text-green-600">Life Improving Superpowers</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Using CheckSquare as a generic benefit icon */}
              <FeatureBenefitItem icon={Mic} title="Effortless Voice Capture">
                  With effortless voice capture, you can instantly speak your thoughts — so that you never lose a fleeting idea again.
              </FeatureBenefitItem>
              <FeatureBenefitItem icon={Tags} title="AI-Powered Tagging">
                  With AI-powered tagging, VibeKeep automatically organizes and applies tags — so that you spend less time sorting and more time doing.
              </FeatureBenefitItem>
              <FeatureBenefitItem icon={ListChecks} title="Action Item Extraction & Aggregation">
                   With action item extraction, you can instantly see your actions and then aggregate them into an organized action list.
              </FeatureBenefitItem>
              <FeatureBenefitItem icon={Search} title="Unified Search & Smart Filtering">
                   With unified search and smart filtering, you can find any thought or task in seconds — so that you stay focused instead of hunting through scattered files.
              </FeatureBenefitItem>
          </div>
           {/* Added Centered CTA Button */}
          <div className="mt-12 text-center">
            <Link
              href="/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-md text-base font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
            >
              Access Now <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

       {/* 8. Social Proof */}
       <section id="social-proof" className="py-20 bg-white border-b">
         <div className="max-w-5xl mx-auto px-6">
           <div className="text-center mb-12">
             <MessageSquareQuote className="w-10 h-10 text-gray-400 mx-auto mb-4" />
             <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
               Read Our Fake Reviews
             </h2>
             <p className="text-lg text-gray-600">(Until We Can Get Real Ones)</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Review 1 */}
             <blockquote className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
               <p className="text-gray-700 italic mb-4">"My brain used to be 100 tabs open. Now it's VibeKeep. Still chaotic, but searchable chaos."</p>
               <footer className="text-sm text-gray-500">— Recovering Engineer <span className="text-gray-400">(ex-Google)</span></footer>
             </blockquote>
              {/* Review 2 */}
             <blockquote className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
               <p className="text-gray-700 italic mb-4">"Accidentally dictated my magnum opus into VibeKeep during a 'quick thought'. Whoops."</p>
               <footer className="text-sm text-gray-500">— PM Turned Accidental Novelist <span className="text-gray-400">(ex-Blockbuster Product Strategy)</span></footer>
             </blockquote>
              {/* Review 3 */}
             <blockquote className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
               <p className="text-gray-700 italic mb-4">"Failed faster, learned quicker. Typed, spoke, shipped… then pivoted. VibeKeep logged the whole glorious mess."</p>
               <footer className="text-sm text-gray-500">— Serial Strategist <span className="text-gray-400">(ex-VC-backed founder)</span></footer>
             </blockquote>
              {/* Review 4 */}
             <blockquote className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
               <p className="text-gray-700 italic mb-4">"Proof that even my terrible shower ideas deserve to be recorded for posterity."</p>
               <footer className="text-sm text-gray-500">— Former Visionary <span className="text-gray-400">(ex-WeWork Dreamer)</span></footer>
             </blockquote>
           </div>
         </div>
       </section>

      {/* 9. Tech Transparency */}
      <section id="tech-transparency" className="py-20 bg-gradient-to-b from-gray-50 to-white border-b">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
             <ShieldCheck className="w-10 h-10 text-indigo-600 mx-auto mb-4" />
             <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
               Tech Transparency: Built Fast, Secure, From the Ground Up
             </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <TechItem icon={Cpu} title="AI-Assisted Development">
                 Coded with the help of Gemini 2.5 Pro inside Cursor, speeding up iteration, organization, and quality from the start.
              </TechItem>
              <TechItem icon={TerminalSquare} title="Frontend">
                 Crafted with React and TailwindCSS for a fast, clean, responsive experience across desktop and mobile.
              </TechItem>
               <TechItem icon={Server} title="Framework & Hosting">
                 Built on Next.js and deployed via Vercel for lightning-fast performance and seamless scalability.
              </TechItem>
              <TechItem icon={ShieldCheck} title="Backend">
                  Powered by Supabase, with Row Level Security and full encryption to keep your data safe.
              </TechItem>
              <TechItem icon={Zap} title="AI Features">
                  Real-time transcription, tagging, and action extraction powered by browser tools and OpenAI's API, delivering intelligence without compromising privacy.
              </TechItem>
              <TechItem icon={Github} title="Version Control">
                  All development managed with GitHub for transparency, iteration, and collaboration.
              </TechItem>
          </div>
           <div className="mt-10 text-center p-6 bg-indigo-50 border border-indigo-200 rounded-lg">
                <h3 className="text-xl font-semibold text-indigo-800 mb-2">Privacy First Commitment</h3>
                <p className="text-indigo-700 max-w-2xl mx-auto">
                    Your data is encrypted, securely stored, and <strong>never used for AI training</strong> — not by us, not by OpenAI.
                    <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="ml-2 font-medium underline hover:text-indigo-900">Learn more</Link>.
                </p>
            </div>
        </div>
      </section>

      {/* 10. Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
           <div className="inline-block bg-green-100 text-green-600 rounded-full p-4 mb-5 shadow-sm">
              <Lock className="w-10 h-10" /> {/* Using Lock icon */}
            </div>
           <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6">
             Pricing: Free (For Now)
          </h2>
           <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
              VibeKeep is 100% free for early adopters as we grow and refine the platform.
              <br />No credit card. No trial limits. No sneaky fees.
           </p>
           <p className="text-lg md:text-xl text-gray-700 font-medium max-w-3xl mx-auto mb-8">
               Lock in free access now — and help shape the future of organized thinking.
           </p>
           <Link
                href="/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-md text-base font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
              >
                Start for Free <ExternalLink className="w-5 h-5" />
            </Link>
        </div>
      </section>

      {/* 11. What's Coming (Roadmap) */}
      <section id="roadmap" className="py-20 bg-gray-50 border-t border-b">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-semibold text-center text-gray-900 mb-12">
             What's Coming: Future Development
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <RoadmapItem icon={Briefcase} title="Smarter Integrations">
                  Sync thoughts to your calendars, project boards, and task managers.
              </RoadmapItem>
              <RoadmapItem icon={BarChart} title="Insightful Visualizations">
                  See patterns in your thoughts you didn't even know existed.
              </RoadmapItem>
               <RoadmapItem icon={Zap} title="Even Smarter AI">
                  Smarter summarization. Smarter prioritization. Smarter you.
              </RoadmapItem>
               {/* Adding the iOS App item here */}
                <RoadmapItem icon={Smartphone} title="iOS App Incoming">
                   Capture ideas on the go, effortlessly.
               </RoadmapItem>
               {/* Ridiculous Idea 1 */}
               <RoadmapItem icon={BrainCircuit} title="Neural Lace Direct Input">
                  Just *think* your thoughts directly into VibeKeep. Effortless!
               </RoadmapItem>
               {/* Ridiculous Idea 2 */}
               <RoadmapItem icon={CloudMoon} title="Dream Capture & Analysis">
                  Log and analyze dreams for subconscious productivity insights.
               </RoadmapItem>
          </div>
        </div>
      </section>

      {/* 12. Final Call to Action */}
      <section id="get-started-cta" className="py-24 bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
             Get Your Early Adopter Vibes On
          </h2>
           <p className="text-lg md:text-xl text-indigo-100 mb-4">
              No Commitments Necessary.
            </p>
          <p className="text-xl md:text-2xl text-indigo-50 mb-10">
            Start capturing, organizing, and prioritizing smarter — today. It's fast, free, and built for thinkers. Feedback welcome!
          </p>
          <Link
            href="/signup"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-indigo-700 py-3 px-8 rounded-lg text-lg font-semibold transition-all duration-150 hover:bg-gray-100 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-700 focus:ring-white shadow-md"
          >
            Try VibeKeep Now <ExternalLink className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-gray-100 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm">
          <p className="text-gray-700 font-semibold mb-3 text-base">
            VibeKeep: Centralize. Organize. Prioritize.
          </p>
          <div className="space-x-4 mb-4">
            <Link href="/terms-of-service" // Assuming these pages exist or will be created
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-indigo-600 transition"
            >
              Terms
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/privacy-policy" // Assuming these pages exist or will be created
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-indigo-600 transition"
            >
              Privacy
            </Link>
          </div>
           <p className="text-gray-500">
             &copy; 2025 VibeKeep. {/* Updated Year */}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;