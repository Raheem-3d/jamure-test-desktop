"use client"

import React from "react"

declare global {
  interface Window {
    Razorpay?: any
  }
}

async function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return
  if (window.Razorpay) return
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay"))
    document.body.appendChild(script)
  })
}

export function RazorpayButton({ label = "Renew / Pay", amountInPaise }: { label?: string; amountInPaise?: number }) {
  const onClick = async () => {
    await loadRazorpay()
    const res = await fetch("/api/payments/razorpay/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountInPaise }),
    })
    const data = await res.json()
    const { order, keyId } = data

    const options = {
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      name: "JamureChat Subscription",
      description: "1-year subscription",
      order_id: order.id,
      handler: function () {
        // Webhook will finalize activation; we can show a local toast
        alert("Payment initiated. You will receive a confirmation shortly.")
      },
      prefill: {},
      theme: { color: "#2563eb" },
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  return (
    <button onClick={onClick} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
      {label}
    </button>
  )
}
