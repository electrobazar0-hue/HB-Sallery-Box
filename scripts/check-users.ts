import { db } from '../src/lib/db'

async function checkUsers() {
  try {
    // Count Admins
    const admins = await db.admin.findMany({
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    })

    // Count Employees
    const employees = await db.employee.findMany({
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        email: true,
        designation: true,
        department: true,
        active: true,
        createdAt: true,
      },
    })

    // Organizations count
    const organizations = await db.organization.findMany({
      select: {
        id: true,
        name: true,
        adminId: true,
        createdAt: true,
      },
    })

    console.log('='.repeat(60))
    console.log('DATABASE USER REPORT')
    console.log('='.repeat(60))

    console.log(`\n📊 Organizations: ${organizations.length}`)
    organizations.forEach((org) => {
      console.log(`   - ${org.name} (ID: ${org.id})`)
      console.log(`     Admin ID: ${org.adminId}`)
    })

    console.log(`\n👨‍💼 Admin Users: ${admins.length}`)
    admins.forEach((admin) => {
      console.log(`   - ${admin.name} (${admin.phone})`)
      console.log(`     User ID: ${admin.userId}`)
      console.log(`     Admin ID: ${admin.id}`)
      console.log(`     Email: ${admin.email || 'N/A'}`)
      console.log(`     Created: ${admin.createdAt.toISOString()}`)
    })

    console.log(`\n👥 Employees: ${employees.length}`)
    const activeEmployees = employees.filter((e) => e.active)
    const inactiveEmployees = employees.filter((e) => !e.active)

    console.log(`   Active: ${activeEmployees.length}`)
    console.log(`   Inactive: ${inactiveEmployees.length}`)

    employees.forEach((emp) => {
      const status = emp.active ? '✅ Active' : '❌ Inactive'
      console.log(`   - ${emp.name} (${emp.phone}) - ${status}`)
      console.log(`     User ID: ${emp.userId}`)
      console.log(`     Emp ID: ${emp.id}`)
      console.log(`     Email: ${emp.email || 'N/A'}`)
      console.log(`     Dept: ${emp.department || 'N/A'}`)
      console.log(`     Designation: ${emp.designation || 'N/A'}`)
      console.log(`     Created: ${emp.createdAt.toISOString()}`)
    })

    console.log('\n' + '='.repeat(60))
    console.log('📈 SUMMARY:')
    console.log('='.repeat(60))
    console.log(`Total Organizations: ${organizations.length}`)
    console.log(`Total Admins: ${admins.length}`)
    console.log(`Total Employees: ${employees.length}`)
    console.log(`Active Employees: ${activeEmployees.length}`)
    console.log(`Inactive Employees: ${inactiveEmployees.length}`)
    console.log('='.repeat(60))

    process.exit(0)
  } catch (error) {
    console.error('Error checking users:', error)
    process.exit(1)
  }
}

checkUsers()
