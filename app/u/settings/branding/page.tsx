"use client"

import React, { useState } from "react"

export default function BrandingSettingsPage() {
  const [logoUrl, setLogoUrl] = useState("")
  const [themeColor, setThemeColor] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const save = async () => {
    setMessage(null)
    const res = await fetch("/api/organization/settings/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl, themeColor }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data?.message || "Failed to save")
    } else {
      setMessage("Saved")
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">Branding</h1>
      {message && <div className="mb-3 text-sm">{message}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Logo URL</label>
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Theme Color</label>
          <input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="#2563eb" />
        </div>
        <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
      </div>
    </div>
  )
}
