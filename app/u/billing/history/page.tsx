import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function BillingHistoryPage() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.id) return null

  const payments = await db.payment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Payment history</h1>
      <div className="rounded-lg border divide-y">
        {payments.length === 0 && <div className="p-4 text-sm text-gray-600">No payments yet.</div>}
  {payments.map((p: any) => (
          <div key={p.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">Order {p.orderId}</div>
              <div className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">₹{(p.amount / 100).toFixed(2)}</div>
              <div className={`text-xs ${p.status === "PAID" ? "text-emerald-600" : p.status === "FAILED" ? "text-red-600" : "text-gray-600"}`}>{p.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
