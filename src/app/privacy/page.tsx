import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | KeyYap',
  description: 'Privacy Policy for KeyYap, explaining how we collect and use your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-primary hover:underline font-medium">
            &larr; Back to Home
          </Link>
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl mb-8">
          Privacy Policy
        </h1>
        
        <div className="prose prose-blue max-w-none text-gray-600">
          <p className="text-sm text-gray-500 mb-8">Last updated: April 15, 2026</p>
          
          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">1. Information We Collect</h2>
          <p className="mb-4">
            We collect the content, communications and other information you provide when you use our Products, including when you sign up for an account, create or share content, and message or communicate with others.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">2. How We Use Information</h2>
          <p className="mb-4">
            We use the information we have (subject to choices you make) as described below and to provide and support the KeyYap platform and related services.
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-2">
            <li>Provide, personalize and improve our Products.</li>
            <li>Provide measurement, analytics, and other business services.</li>
            <li>Promote safety, integrity and security.</li>
            <li>Communicate with you.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">3. Sharing Information</h2>
          <p className="mb-4">
            Your information is shared with others in the following ways:
            People and accounts you share and communicate with. Public information can be seen by anyone, on or off our Products.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">4. Your Data Rights</h2>
          <p className="mb-4">
            You have the right to access, rectify, port and erase your data. You can access and delete your data directly from your KeyYap account settings.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">5. Contact Us</h2>
          <p className="mb-4">
            If you have questions about this policy, you can contact us securely through our privacy center.
          </p>
        </div>
      </div>
    </div>
  )
}
