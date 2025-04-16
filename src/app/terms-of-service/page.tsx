import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// IMPORTANT: This is a TEMPLATE. Review and customize with legal counsel.

const TermsOfServicePage = () => {
  const logoUrl = "https://s3.ca-central-1.amazonaws.com/logojoy/logos/217739981/noBgColor.png?388025.2999999523";

  return (
    <div className="min-h-screen bg-white text-gray-800 antialiased">
      {/* Simple Header with Logo */}
      <header className="bg-gray-50 py-4 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 flex items-center h-10">
          <Link href="/home">
             <Image 
                src={logoUrl}
                alt="ThoughtKeeper Logo"
                width={120}
                height={28}
                priority
                className="h-7 w-auto"
              />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-blue max-w-none">
          <p>
            Welcome to ThoughtKeeper! These Terms of Service ("Terms") govern your access to and use of the ThoughtKeeper application and services (collectively, the "Service") provided by [Your Company Name/Your Name] ("we," "us," or "our").
            Please read these Terms carefully before using the Service. By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
          </p>

          <h2>1. Description of Service</h2>
          <p>
            ThoughtKeeper is an intelligent workspace designed to help users capture, organize, analyze, and act on their thoughts, notes, and voice memos using features including AI-powered transcription, tagging, summarization, and action item extraction (the "Features").
          </p>

          <h2>2. User Accounts</h2>
          <p>
            To access certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for any activities or actions under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>

          <h2>3. User Conduct and Content</h2>
          <p>You are solely responsible for the content you create, upload, or store using the Service ("User Content"). You agree not to use the Service to:</p>
          <ul>
            <li>Upload, post, email, transmit, or otherwise make available any Content that is unlawful, harmful, threatening, abusive, harassing, tortious, defamatory, vulgar, obscene, libelous, invasive of another's privacy, hateful, or racially, ethnically, or otherwise objectionable;</li>
            <li>Impersonate any person or entity or falsely state or otherwise misrepresent your affiliation with a person or entity;</li>
            <li>Upload, post, email, transmit, or otherwise make available any Content that you do not have a right to make available under any law or under contractual or fiduciary relationships;</li>
            <li>Interfere with or disrupt the Service or servers or networks connected to the Service.</li>
          </ul>
          <p>We reserve the right, but are not obligated, to remove or disable access to any User Content for any reason or no reason, including User Content that we believe violates these Terms.</p>

          <h2>4. Intellectual Property</h2>
          <p>
            The Service and its original content (excluding User Content), features, and functionality are and will remain the exclusive property of [Your Company Name/Your Name] and its licensors. The Service is protected by copyright, trademark, and other laws of both [Your Country/Jurisdiction] and foreign countries.
            You retain ownership of your User Content. By using the Service, you grant us a limited license to use, process, store, and display your User Content solely as necessary to provide and improve the Service.
          </p>

          <h2>5. AI Features</h2>
          <p>
            Certain Features of the Service utilize artificial intelligence provided by third-party services (e.g., OpenAI). Your use of these Features is subject to the terms and policies of those third-party providers. While we strive for accuracy, AI-generated output (transcriptions, summaries, tags, actions) may contain errors or inaccuracies. You are responsible for reviewing and verifying any AI-generated content before relying on it.
          </p>
          
          <h2>6. Termination</h2>
          <p>
            We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service or contact us.
          </p>
          
          <h2>7. Disclaimers</h2>
          <p>
            Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
            We do not warrant that a) the Service will function uninterrupted, secure, or available at any particular time or location; b) any errors or defects will be corrected; c) the Service is free of viruses or other harmful components; or d) the results of using the Service will meet your requirements.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            In no event shall [Your Company Name/Your Name], nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use, or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence), or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.
          </p>

          <h2>9. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of [Your State/Province/Country], without regard to its conflict of law provisions.
          </p>

          <h2>10. Changes</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at: [Your Contact Email Address]
          </p>
        </div>
      </main>

       {/* Simple Footer with Links */}
      <footer className="py-6 border-t border-gray-200 mt-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p className="mb-2">&copy; {new Date().getFullYear()} <Link href="/home" className="hover:text-blue-600 transition">ThoughtKeeper</Link>. All rights reserved.</p>
          <div className="space-x-3">
             <Link href="/home" className="hover:text-blue-600 transition">
              Home
            </Link>
             <span className="text-gray-400">|</span>
             {/* Link to self (optional, could also be plain text) */}
            <Link href="/terms-of-service" className="hover:text-blue-600 transition">
              Terms of Service
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/privacy-policy" className="hover:text-blue-600 transition">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfServicePage; 