"use client"

import React, { useEffect, useState } from "react"

export default function AnnouncementsPage() {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [items, setItems] = useState<any[]>([])

  const load = async () => {
    const res = await fetch("/api/announcements")
    const data = await res.json()
    setItems(data?.announcements || [])
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message }),
    })
    if (res.ok) {
      setTitle("")
      setMessage("")
      load()
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Announcements</h1>
      <div className="space-y-2 mb-6">
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" />
        <textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} className="w-full border rounded px-3 py-2" />
        <button onClick={create} className="px-4 py-2 bg-blue-600 text-white rounded">Publish</button>
      </div>
      <ul className="space-y-2">
        {items.map((a, i) => (
          <li key={a.id || i} className="border rounded p-3">
            <div className="font-semibold">{a.title}</div>
            <div className="text-sm text-gray-600">{a.message}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
