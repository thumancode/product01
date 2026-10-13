# Mukhallat Al Emirates — Ellens Fragrance promo video

HTML/CSS/JS animation → Playwright frames → FFmpeg → `product-video.mp4` (1080x1920, 30 fps, 61 s).

## কীভাবে চালাবেন
1. GitHub-এ নতুন repository বানিয়ে **সব ফাইল** আপলোড করুন (`.github/workflows/render.yml` ঠিক এই path-এ থাকতে হবে)।
2. **Actions** ট্যাব → **Render product video** → **Run workflow**। (আগে `test_seconds` = `10` দিয়ে ছোট টেস্ট করতে পারেন।)
3. রান শেষ হলে run পেজের **Artifacts** থেকে `product-video` ডাউনলোড করুন।

## ফাইল
index.html, style.css, art.js, scenes.js, lines.js, render.js, package.json, timestamps.txt,
transcript_1_.txt, voiceover.mp3, product.jpg, `.github/workflows/render.yml`

## সময় বা টেক্সট বদলাতে
- `timestamps.txt` এডিট করুন (`start | end | text | tag`, সেকেন্ডে)। `lines.js` রেন্ডারের সময় নিজে তৈরি হয়।
- সাবটাইটেল সরাসরি `timestamps.txt` থেকে আসে। দৃশ্যের চিপ/আইকনের সময় লাইনের শব্দ অনুযায়ী হিসাব হয় (লাইনের ক্রম `scenes.js`-এ index দিয়ে ধরা), তাই লাইন যোগ/বাদ দিলে `scenes.js`-এর `wt(লাইন, শব্দ)` index মিলিয়ে নিন।
- একই start সময়ের দুই লাইন (০:৪৩) থাকলে `render.js` প্রথমটি অন্তত ০.৭ সেকেন্ড দেখায়, পরেরটির সাবটাইটেল সেই পরিমাণ পরে শুরু হয়।
- স্থিরচিত্র দেখতে লোকালি: `node render.js --still 5,30,58`
