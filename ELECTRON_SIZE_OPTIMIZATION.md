# Electron App Size Optimization Guide

## Problem
Your Electron app is ~1 GB because:
- **Electron runtime** (293 MB)
- **Build tools** bundled into final package (207 MB from app-builder-bin, 21.8 MB TypeScript, etc.)
- **Development dependencies** included in production build
- **Next.js dev dependencies** (@next, TypeScript, ESBuild, etc.)

## Current Analysis

### Largest Modules in node_modules:
```
electron                    293.12 MB  ← Chromium + Node.js
app-builder-bin            206.81 MB  ← Can be removed from package
@next                      141.61 MB  ← Dev only
next                       106.07 MB  ← Build time only
@prisma                     94.76 MB  ← Runtime needed
.cache                      38.19 MB  ← Cache, remove before build
prisma                      36.91 MB  ← Runtime needed
electron-winstaller        30.68 MB  ← Can be removed
typescript                  21.81 MB  ← Dev only
tailwindcss                  7.57 MB  ← Build time only
```

---

## Solutions Implemented

### 1. **Optimized package.json Build Config**
- Removed `out/**/*` from build files (not needed)
- Added `asarUnpack` for binary modules
- Configured NSIS installer with `differentialPackage: true` for smaller updates

### 2. **Created optimize-build.js Script**
This script removes:
- **Entirely unnecessary modules**: `@esbuild`, `typescript`, `@types`, `eslint`, `prettier`, `7zip-bin`, `app-builder-bin`, etc.
- **Test/doc files**: `tests/`, `docs/`, `*.md`, `*.map` files
- **Build artifacts**: Previously generated `.dist`, `.build` folders

### 3. **Updated npm Scripts**
New workflow:
```bash
npm run optimize-build  # Cleans up node_modules
npm run build           # Builds Next.js app
npm run dist            # Builds Electron app (now much smaller)
```

Or one command:
```bash
npm run dist            # Now calls optimize-build first
```

---

## How to Use

### Quick Start (Automatic Cleanup)
```bash
# Just run dist normally - optimization happens automatically now
npm run dist

# Or for Windows only
npm run dist:win
```

### Manual Cleanup (Optional)
If you want to see what gets removed:
```bash
npm run optimize-build
```

---

## Expected Size Reduction

**Before optimization:**
- node_modules: ~1.2 GB
- app-builder-bin: 206.81 MB (removed)
- typescript: 21.81 MB (removed)
- @esbuild: 9.46 MB (removed)
- Build artifacts: ~38 MB (removed)

**After optimization:**
- node_modules: ~850 MB (30% reduction)
- Final installer: ~300-400 MB (depending on platform)

---

## Additional Optimizations (Optional)

### 1. **Use Prebuilt Electron Binaries**
Add to package.json:
```json
{
  "build": {
    "download": {
      "all": false
    }
  }
}
```

### 2. **Remove Unused Dependencies**
Review these modules - you might not need all:

- **`@mantine/core` (12.41 MB)**: If you use Shadcn UI instead
- **`recharts` (2-3 MB)**: If you don't use charts
- **`react-date-range` + `react-day-picker`**: Choose one date picker
- **`emoji-picker-react`**: Only needed if emoji reactions are used

### 3. **Enable ASAR Packing**
Already configured in updated package.json - this compresses the app resources.

### 4. **Lazy Load Heavy Modules**
In your components, use dynamic imports:
```typescript
// Instead of:
import EmojiPicker from 'emoji-picker-react';

// Use:
const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  loading: () => <div>Loading...</div>
});
```

### 5. **Remove Console Logs in Production**
Add to `next.config.mjs`:
```javascript
webpack: (config, { isServer }) => {
  if (!isServer) {
    config.module.rules.push({
      test: /\.[jt]sx?$/,
      loader: 'string-replace-loader',
      options: {
        search: 'console\\.log\\(',
        replace: '() => null //',
        flags: 'g'
      }
    });
  }
  return config;
}
```

---

## Before/After Checklist

- [x] Updated package.json build config
- [x] Created optimize-build.js script
- [x] Updated npm scripts to call optimize-build
- [x] Configured NSIS for differential packages
- [ ] Review and remove unused dependencies from your package.json
- [ ] Test the build process
- [ ] Verify app still works after optimization

---

## Build Troubleshooting

If something breaks after optimization:

1. **Electron won't start**: Ensure `main.js`, `preload.js`, `.next/` are in the build
2. **Modules not found**: Check if a needed module was accidentally removed
3. **Build fails**: Run `npm install` to restore node_modules and try again

To see what's being included in the final build:
```bash
npx asar list dist/win-unpacked/resources/app.asar | head -50
```

---

## Monitoring Size Over Time

Before building, check module sizes:
```bash
node -e "const fs=require('fs');const p=require('path');const nm='node_modules';const dirs=fs.readdirSync(nm).filter(d=>fs.statSync(p.join(nm,d)).isDirectory());const sizes=dirs.map(d=>{let sz=0;const w=(p)=>{try{fs.readdirSync(p).forEach(f=>{const fp=p.join(p,f);const st=fs.statSync(fp);if(st.isDirectory())w(fp);else sz+=st.size});}catch(e){}};w(p.join(nm,d));return{name:d,mb:(sz/(1024*1024)).toFixed(2)}}).sort((a,b)=>parseFloat(b.mb)-parseFloat(a.mb)).slice(0,20);sizes.forEach(s=>console.log(s.name.padEnd(40),s.mb+' MB'))"
```

---

## Next Steps

1. **Run the optimization**:
   ```bash
   npm run optimize-build
   npm run build
   npm run dist:win
   ```

2. **Test on a fresh machine** to ensure everything works

3. **Monitor future builds** - if size creeps up, re-run optimize-build

4. **Consider removing unused UI libraries** if you find them in the analysis

---

## Reference Links

- [Electron Builder Docs](https://www.electron.build/cli/cli)
- [Next.js Build Optimization](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
