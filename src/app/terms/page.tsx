import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | KeyYap',
  description: 'Terms of Service for KeyYap, the social platform.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-primary hover:underline font-medium">
            &larr; Back to Home
          </Link>
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl mb-8">
          Terms of Service
        </h1>
        
        <div className="prose prose-blue max-w-none prose-p:text-gray-600 prose-headings:text-gray-900 text-gray-600">
          <p className="text-sm text-gray-500 mb-8">Last updated: April 15, 2026</p>
          
          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">1. Introduction</h2>
          <p className="mb-4">
            Welcome to KeyYap. By accessing or using our website, services, and applications, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">2. User Accounts</h2>
          <p className="mb-4">
            You must be at least 13 years old to use KeyYap. You are responsible for safeguarding your account, so use a strong password and limit its use to this account. We cannot and will not be liable for any loss or damage arising from your failure to comply with the above requirements.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">3. Content and Conduct</h2>
          <p className="mb-4">
            You retain your rights to any content you submit, post or display on or through KeyYap. What's yours is yours. However, by submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, copy, reproduce, process, adapt, modify, publish, transmit, display and distribute such content.
          </p>
          <p className="mb-4">
            You agree not to post content that is: abusive, threatening, defamatory, obscene, fraudulent, deceptive, or misleading.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">4. Termination</h2>
          <p className="mb-4">
            We may suspend or terminate your account or cease providing you with all or part of the Services at any time for any or no reason, including, but not limited to, if we reasonably believe you have violated these Terms of Service.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">5. Changes to Terms</h2>
          <p className="mb-4">
            We may revise these Terms from time to time. The changes will not be retroactive, and the most current version of the Terms, which will always be at keyyap.com/terms, will govern our relationship with you.
          </p>
        </div>
      </div>
    </div>
  )
}
