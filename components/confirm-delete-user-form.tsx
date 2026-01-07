"use client"

import React from "react"

export default function ConfirmDeleteUserForm({ actionUrl }: { actionUrl: string }) {
  return (
    <form action={actionUrl} method="post" onSubmit={(e) => { if (!confirm('Delete user?')) e.preventDefault() }}>
      <input type="hidden" name="_method" value="DELETE" />
      <button className="text-xs text-red-600" type="submit">Delete</button>
    </form>
  )
}
