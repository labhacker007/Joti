# TypeScript + shadcn/ui Migration Setup Script
# Run this in PowerShell: .\setup-migration.ps1

Write-Host "Installing TypeScript and dependencies..." -ForegroundColor Cyan

# TypeScript
npm install --save-dev typescript @types/react @types/react-dom @types/node

# shadcn/ui Core
npm install class-variance-authority clsx tailwind-merge

# Radix UI Primitives
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-popover @radix-ui/react-avatar

# Form Handling
npm install react-hook-form @hookform/resolvers zod

# Table
npm install @tanstack/react-table

# Date Utilities
npm install date-fns react-day-picker

Write-Host "Dependencies installed!" -ForegroundColor Green
Write-Host ""
Write-Host "Initializing shadcn/ui..." -ForegroundColor Cyan
Write-Host "Please answer the prompts with these values:" -ForegroundColor Yellow
Write-Host "  - Style: default" -ForegroundColor White
Write-Host "  - Base color: slate" -ForegroundColor White
Write-Host "  - CSS variables: yes" -ForegroundColor White
Write-Host "  - TypeScript: yes" -ForegroundColor White

npx shadcn-ui@latest init

Write-Host ""
Write-Host "Installing shadcn/ui components..." -ForegroundColor Cyan

npx shadcn-ui@latest add button card input label select dialog dropdown-menu table tabs badge alert sheet calendar popover avatar toast form switch checkbox textarea separator

Write-Host ""
Write-Host "Setup complete! Ready to start migration." -ForegroundColor Green
