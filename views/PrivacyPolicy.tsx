import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="mb-8">
          <a href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4">
            <ArrowLeft size={16} className="mr-1" /> Back to Home
          </a>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="text-green-600" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          <p className="text-gray-500 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-green max-w-none space-y-6 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Welcome to the Mae Chaem Tree Database ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Account Information:</strong> When you sign in with Google, we collect your name, email address, and profile picture to create and manage your account.</li>
              <li><strong>Usage Data:</strong> We collect information about how you interact with our application, such as the pages you visit and the actions you take.</li>
              <li><strong>Tree Data:</strong> Any data you input regarding tree surveys, including locations, measurements, and photos, is stored in our database.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>To provide and maintain our service.</li>
              <li>To authenticate your identity and manage your account access.</li>
              <li>To analyze usage patterns and improve our application.</li>
              <li>To communicate with you regarding updates or support.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Sharing and Disclosure</h2>
            <p>
              We do not sell or rent your personal information to third parties. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>With Service Providers:</strong> We may share data with trusted third-party service providers who assist us in operating our application (e.g., hosting, database management).</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal information. If you wish to exercise these rights, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at support@maechaem-tree-db.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
