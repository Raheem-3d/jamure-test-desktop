import React from "react"
import CompanyRegistrationForm from "../../components/company-registration-form"

export default function FreeTrialPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Start Your Free Trial</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Create your organization workspace. You'll get 14 days of full access.</p>
        <CompanyRegistrationForm />
      </div>
    </div>
  )
}
