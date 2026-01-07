/**
 * Migration Script: ADMIN to ORG_ADMIN
 * 
 * This script updates all existing users with role "ADMIN" to "ORG_ADMIN"
 * Run this BEFORE deploying the code changes that remove the ADMIN role
 * 
 * Usage: npx tsx scripts/migrate-admin-to-org-admin.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔄 Starting migration: ADMIN -> ORG_ADMIN")
  console.log("=" .repeat(60))

  try {
    // Count existing ADMIN users
    const adminCount = await prisma.user.count({
      where: {
        role: "ADMIN"
      }
    })

    console.log(`\n📊 Found ${adminCount} users with role "ADMIN"`)

    if (adminCount === 0) {
      console.log("✅ No users to migrate. All done!")
      return
    }

    // Update all ADMIN users to ORG_ADMIN
    const result = await prisma.user.updateMany({
      where: {
        role: "ADMIN"
      },
      data: {
        role: "ORG_ADMIN"
      }
    })

    console.log(`\n✅ Successfully migrated ${result.count} users from ADMIN to ORG_ADMIN`)

    // Verify the migration
    const remainingAdmins = await prisma.user.count({
      where: {
        role: "ADMIN"
      }
    })

    const newOrgAdmins = await prisma.user.count({
      where: {
        role: "ORG_ADMIN"
      }
    })

    console.log("\n📈 Migration Summary:")
    console.log(`   - Remaining ADMIN users: ${remainingAdmins}`)
    console.log(`   - Total ORG_ADMIN users: ${newOrgAdmins}`)

    if (remainingAdmins === 0) {
      console.log("\n🎉 Migration completed successfully!")
    } else {
      console.warn("\n⚠️  Warning: Some ADMIN users still exist. Please investigate.")
    }

  } catch (error) {
    console.error("\n❌ Migration failed:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
