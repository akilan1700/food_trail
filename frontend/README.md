This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## PWA production verification

FoodTrail is installable as a Progressive Web App. The service worker registers only in **production** builds (not during `npm run dev`).

After deploying the static export over **HTTPS**:

1. Chrome DevTools → Application → Manifest: no errors; 192 and 512 icons load.
2. Application → Service Workers: `/sw.js` active with scope `/`.
3. Lighthouse → Progressive Web App: installable / offline checks pass.
4. Phone: Install to home screen; open in standalone; enable airplane mode and open cached routes (`/`, `/trails/`, `/trip/`).
5. Settings → App & offline data: installed mode and sync state look correct.

Local production smoke (static export):

```bash
npm run build
npx --yes serve out
```

Then open the served URL and confirm `/manifest.json`, `/sw.js`, and `/icons/icon-192.png` return 200. Full install prompts still need a real HTTPS host.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
