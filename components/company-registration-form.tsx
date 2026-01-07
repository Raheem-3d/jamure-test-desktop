"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Button } from "./ui/button"
import { ArrowLeft } from "lucide-react"

export default function CompanyRegistrationForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    employees: "",
    primaryEmail: "",
    phone: "",
    address: "",
    adminName: "",
    adminEmail: "",
    password: "",
  })

  const update = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/organizations/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          industry: form.industry || null,
          employees: form.employees ? Number(form.employees) : null,
          primaryEmail: form.primaryEmail,
          phone: form.phone || null,
          address: form.address || null,
          adminName: form.adminName,
          adminEmail: form.adminEmail,
          password: form.password,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message || "Registration failed")
      }

      // Auto sign-in the admin and redirect to pretty org URL
      const result = await signIn("credentials", {
        redirect: false,
        email: form.adminEmail,
        password: form.password,
      })

      if (result?.ok) {
        const slug = (data as any)?.slug as string | undefined
        if (slug) {
          router.push(`/${slug}`)
        } else if ((data as any)?.organizationId) {
          router.push(`/org/${(data as any).organizationId}`)
        } else {
          router.push("/dashboard")
        }
      } else {
        router.push("/login")
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company / Organization Name</label>
          <input name="companyName" required value={form.companyName} onChange={update} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Industry / Business Type</label>
          <input name="industry" value={form.industry} onChange={update} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Employees</label>
          <input name="employees" type="number" min={1} value={form.employees} onChange={update} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Email (Primary Contact)</label>
          <input name="primaryEmail" type="email" required value={form.primaryEmail} onChange={update} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Phone Number</label>
          <input name="phone" value={form.phone} onChange={update} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
          <input name="address" value={form.address} onChange={update} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Name</label>
          <input name="adminName" required value={form.adminName} onChange={update} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Email</label>
          <input name="adminEmail" type="email" required value={form.adminEmail} onChange={update} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
        <input name="password" type="password" required value={form.password} onChange={update} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2" />
      </div>

      <button disabled={loading} className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60">
        {loading ? "Creating..." : "Create Organization & Start Trial"}
      </button>

      <Link href="/login">
                <Button
                  type="button" 
                  variant="outline" 
                  className="w-full border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900 mt-5"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
    </form>
  )
}
