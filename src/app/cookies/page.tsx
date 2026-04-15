import Link from 'next/link'

export const metadata = {
  title: 'Cookie Policy | KeyYap',
  description: 'Information about how KeyYap uses cookies and similar technologies.',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-primary hover:underline font-medium">
            &larr; Back to Home
          </Link>
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl mb-8">
          Cookie Policy
        </h1>
        
        <div className="prose prose-blue max-w-none text-gray-600">
          <p className="text-sm text-gray-500 mb-8">Last updated: April 15, 2026</p>
          
          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">1. What are Cookies?</h2>
          <p className="mb-4">
            Cookies are small pieces of text sent to your browser by a website you visit. They help that website remember information about your visit, which can both make it easier to visit the site again and make the site more useful to you.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">2. How KeyYap Uses Cookies</h2>
          <p className="mb-4">
            We use cookies and similar technologies for several purposes, including:
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-2">
            <li><strong>Authentication:</strong> We use cookies to verify your account and determine when you're logged in.</li>
            <li><strong>Security:</strong> We use cookies to help us keep your account, data and the KeyYap platform safe and secure.</li>
            <li><strong>Preferences:</strong> We use cookies to remember your settings and preferences.</li>
            <li><strong>Performance:</strong> We use cookies to provide you with the best experience possible.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">3. Third-Party Cookies</h2>
          <p className="mb-4">
            We may also allow certain business partners to place these technologies on KeyYap. These partners use these technologies to help us analyze how you use KeyYap.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">4. Your Choices</h2>
          <p className="mb-4">
            Your browser or device may offer settings that allow you to choose whether browser cookies are set and to delete them. For more information about these controls, visit your browser or device's help material.
          </p>
        </div>
      </div>
    </div>
  )
}
