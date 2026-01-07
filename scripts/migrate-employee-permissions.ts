/**
 * Migration Script: Update Default Employee Permissions
 * 
 * This script removes TASK_CREATE from all EMPLOYEE users who haven't been
 * explicitly granted permissions by an admin.
 * 
 * Run this script ONCE after deploying the RBAC changes.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting RBAC migration...\n')
  
  // Find all EMPLOYEE users
  const employees = await prisma.user.findMany({
    where: {
      role: 'EMPLOYEE'
    },
    select: {
      id: true,
      email: true,
      name: true,
      permissions: true
    }
  })
  
  console.log(`📊 Found ${employees.length} employees\n`)
  
  let updated = 0
  let skipped = 0
  let errors = 0
  
  for (const employee of employees) {
    try {
      // Parse current permissions
      let currentPerms: string[] = []
      try {
        const parsed = JSON.parse(String(employee.permissions || '[]'))
        currentPerms = Array.isArray(parsed) ? parsed : []
      } catch {
        currentPerms = []
      }
      
      // Check if permissions array is empty (default)
      if (currentPerms.length === 0) {
        // Update to ensure it's an empty JSON array
        await prisma.user.update({
          where: { id: employee.id },
          data: {
            permissions: '[]'
          }
        })
        console.log(`✅ Updated ${employee.email} - set empty permissions array`)
        updated++
      } else {
        // User has explicit permissions granted by admin - DO NOT TOUCH
        console.log(`⏭️  Skipped ${employee.email} - has explicit permissions: ${currentPerms.join(', ')}`)
        skipped++
      }
    } catch (error) {
      console.error(`❌ Error updating ${employee.email}:`, error)
      errors++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📈 Migration Summary:')
  console.log(`   Updated: ${updated}`)
  console.log(`   Skipped: ${skipped} (already have explicit permissions)`)
  console.log(`   Errors: ${errors}`)
  console.log('='.repeat(60) + '\n')
  
  if (errors === 0) {
    console.log('✅ Migration completed successfully!')
  } else {
    console.log('⚠️  Migration completed with errors. Please review.')
  }
}

main()
  .catch((e) => {
    console.error('💥 Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
