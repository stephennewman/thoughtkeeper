import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next'; // Import Metadata type

// IMPORTANT: This is a TEMPLATE. Review and customize with legal counsel.

// Add Metadata for the page title
export const metadata: Metadata = {
  title: 'Privacy Policy',
};

const logoUrl = "https://s3.ca-central-1.amazonaws.com/logojoy/logos/218272791/noBgBlack.png?865367";

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 antialiased">
      {/* Simple Header with Logo */}
      <header className="bg-gray-50 py-4 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 flex items-center h-10">
          <Link href="/home">
             <Image 
                src={logoUrl}
                alt="VibeKeep Logo"
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-blue max-w-none">
          <p>
            Welcome to VibeKeep ("we," "us," or "our"). We are committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application (the "Service").
            Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the service.
          </p>

          <h2>1. Information We Collect</h2>
          <p>We may collect information about you in a variety of ways. The information we may collect via the Service includes:</p>
          <ul>
            <li>
              <strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, that you voluntarily give to us when choosing to register with the Service. You are under no obligation to provide us with personal information of any kind, however your refusal to do so may prevent you from using certain features of the Service.
            </li>
            <li>
              <strong>Derivative Data:</strong> Information our servers automatically collect when you access the Service, such as your IP address, browser type, operating system, access times, and the pages you have viewed directly before and after accessing the Service.
            </li>
            <li>
              <strong>Data from Third Parties:</strong> We use Supabase for authentication and database services. We may collect information from third parties, such as Supabase Auth, if you connect your account to the third party and grant the Service permission to access this information.
            </li>
            <li>
              <strong>User Content:</strong> The text notes, voice recordings (and their transcriptions), tags, summaries, action items, and any other content you create or upload to the Service.
            </li>
          </ul>

          <h2>2. Use of Your Information</h2>
          <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Service to:</p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Provide the core functionality of the Service, including storing and organizing your notes.</li>
            <li>Utilize AI services (e.g., from providers like OpenAI) to process your User Content for features such as voice transcription, tagging, summarization, and action item extraction. Data sent for AI processing is handled according to the provider's privacy terms and is typically processed ephemerally.</li>
            <li>Improve the operation and functionality of the Service.</li>
            <li>Monitor and analyze usage and trends to improve your experience with the Service.</li>
            <li>Respond to user inquiries and support requests.</li>
          </ul>

          <h2>3. Disclosure of Your Information</h2>
          <p>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
          <ul>
            <li>
              <strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.
            </li>
            <li>
              <strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including data storage (Supabase), authentication (Supabase Auth), AI processing (e.g., OpenAI), data analysis, and customer service. These third parties are obligated to protect your information.
            </li>
            <li>
              <strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.
            </li>
          </ul>
          <p>We do not sell your personal information.</p>

          <h2>4. Security of Your Information</h2>
          <p>
            We use administrative, technical, and physical security measures to help protect your personal information. We leverage Supabase's security features, including Row Level Security (RLS) to ensure that only you can access your User Content within the database. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
          </p>

          <h2>5. Policy for Children</h2>
          <p>We do not knowingly solicit information from or market to children under the age of 13 (or higher age as required by applicable law). If you become aware of any data we have collected from children under the relevant age, please contact us using the contact information provided below.</p>

          <h2>6. Your Privacy Rights (Example - Needs Customization)</h2>
          <p>
            Depending on your location (e.g., EEA, California), you may have certain rights regarding your personal information, such as the right to access, correct, delete, or restrict processing of your data. Please contact us to exercise these rights.
          </p>

          <h2>7. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
          </p>

          <h2>8. Contact Us</h2>
          <p>
            If you have questions or comments about this Privacy Policy, please contact us at: [Your Contact Email Address]
          </p>
        </div>
      </main>

       {/* Simple Footer with Links */}
      <footer className="py-6 border-t border-gray-200 mt-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p className="mb-2">&copy; {new Date().getFullYear()} <Link href="/home" className="hover:text-blue-600 transition">VibeKeep</Link>. All rights reserved.</p>
          <div className="space-x-3">
             <Link href="/home" className="hover:text-blue-600 transition">
              Home
            </Link>
             <span className="text-gray-400">|</span>
            <Link href="/terms-of-service" className="hover:text-blue-600 transition">
              Terms of Service
            </Link>
            <span className="text-gray-400">|</span>
            {/* Link to self (optional, could also be plain text) */}
            <Link href="/privacy-policy" className="hover:text-blue-600 transition">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage; 