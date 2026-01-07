const { execSync } = require("child_process")

// Log the start of the build process
console.log("Starting build process...")

try {
  // Run Prisma generate
  console.log("Running prisma generate...")
  execSync("npx prisma generate", { stdio: "inherit" })

  // Run Next.js build
  console.log("Running next build...")
  execSync("next build", { stdio: "inherit" })

  console.log("Build completed successfully!")
} catch (error) {
  console.error("Build failed:", error)
  process.exit(1)
}
