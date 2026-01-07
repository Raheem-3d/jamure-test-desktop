import { db } from "@/lib/db"

// Limited scoped helper for organization-aware queries
export function getScopedDb(organizationId: string) {
  if (!organizationId) throw new Error("organizationId required for scoped db")

  return {
    user: {
      findMany: (args: any = {}) => db.user.findMany({ ...args, where: { ...(args.where || {}), organizationId } }),
      findFirst: (args: any = {}) => db.user.findFirst({ ...args, where: { ...(args.where || {}), organizationId } }),
      updateMany: (args: any = {}) => db.user.updateMany({ ...args, where: { ...(args.where || {}), organizationId } }),
    },
    announcement: {
      findMany: (args: any = {}) => db.announcement.findMany({ ...args, where: { ...(args.where || {}), organizationId } }),
      create: (args: any = {}) => db.announcement.create({ ...args, data: { ...(args.data || {}), organizationId, scope: "ORG" } }),
    },
    activityLog: {
      findMany: (args: any = {}) => db.activityLog.findMany({ ...args, where: { ...(args.where || {}), organizationId } }),
      create: (args: any = {}) => db.activityLog.create({ ...args, data: { ...(args.data || {}), organizationId } }),
    },
    subscription: {
      findUnique: () => db.subscription.findUnique({ where: { organizationId } }),
      update: (args: any = {}) => db.subscription.update({ where: { organizationId }, data: { ...(args.data || {}) } }),
    },
    payment: {
      findMany: (args: any = {}) => db.payment.findMany({ ...args, where: { ...(args.where || {}), organizationId } }),
      create: (args: any = {}) => db.payment.create({ ...args, data: { ...(args.data || {}), organizationId } }),
    },
    orgInvite: {
      findMany: (args: any = {}) => db.orgInvite.findMany({ ...args, where: { ...(args.where || {}), organizationId } }),
      create: (args: any = {}) => db.orgInvite.create({ ...args, data: { ...(args.data || {}), organizationId } }),
    },
  }
}
