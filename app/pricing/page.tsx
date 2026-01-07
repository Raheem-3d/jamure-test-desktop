import Link from "next/link"

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Simple, transparent pricing</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Starter</h2>
          <p className="text-gray-600 mb-4">Great for individuals</p>
          <p className="text-3xl font-bold mb-4">Free</p>
          <ul className="text-sm space-y-2 mb-6">
            <li>• 14-day free trial</li>
            <li>• Core chat and tasks</li>
            <li>• Email reminders</li>
          </ul>
          <Link className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white" href="/register">Get started</Link>
        </div>
        <div className="rounded-xl border p-6 ring-2 ring-blue-600">
          <h2 className="text-xl font-semibold">Pro</h2>
          <p className="text-gray-600 mb-4">Teams that need more</p>
          <p className="text-3xl font-bold mb-1">₹999</p>
          <p className="text-xs text-gray-500 mb-4">per year, per user</p>
          <ul className="text-sm space-y-2 mb-6">
            <li>• Everything in Starter</li>
            <li>• Unlimited channels</li>
            <li>• Priority reminders</li>
            <li>• Admin console</li>
          </ul>
          <Link className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white" href="/u/billing">Start free trial</Link>
        </div>
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Enterprise</h2>
          <p className="text-gray-600 mb-4">Advanced needs & support</p>
          <p className="text-3xl font-bold mb-4">Custom</p>
          <ul className="text-sm space-y-2 mb-6">
            <li>• SSO & RBAC</li>
            <li>• Priority support</li>
            <li>• Custom SLAs</li>
          </ul>
          <a className="inline-flex items-center px-4 py-2 rounded-md border" href="mailto:sales@example.com">Contact sales</a>
        </div>
      </div>
    </div>
  )
}
