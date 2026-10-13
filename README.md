# Mukhallat Al Emirates — Automated Product Video

বাংলা ভয়েসওভার ও প্রোডাক্ট ছবির ভিত্তিতে 9:16 vertical MP4 ভিডিও বানানোর GitHub Actions workflow। লোকালি কিছু ইনস্টল বা রেন্ডার করতে হবে না।

## কীভাবে ব্যবহার করবেন (মোবাইল ব্রাউজার থেকেও)

1. GitHub-এ নতুন **public বা private repository** তৈরি করুন।
2. এই ZIP-এর ভেতরের ফাইলগুলো repository-র root-এ upload/extract করুন। GitHub ওয়েব UI-তে ZIP upload করলে ZIP-টি নিজে থেকে extract হয় না—তাই ZIP-এর ভেতরের ফাইলগুলো upload করুন।
3. `product.jpg`-এ প্রোডাক্ট ছবি, `voiceover.mp3`-এ ভয়েসওভার এবং `subtitles_source.txt`-এ সময়সহ subtitle source রাখুন।
4. ঐচ্ছিক: `music.mp3` নামে background music যোগ করুন। `sfx_hook.wav` এবং `sfx_whoosh.wav` দিলে সেগুলো ব্যবহার হবে; না থাকলে script নিজে lightweight synthetic sound effects বানাবে।
5. GitHub repository-তে **Actions** tab খুলুন, `Render product video` workflow নির্বাচন করে **Run workflow** চাপুন।
6. Workflow শেষ হলে run-এর নিচের **Artifacts** থেকে `mukhallat-product-video` ডাউনলোড করে ZIP খুলুন। MP4 ফাইলটি পাবেন।

## ফাইল ও কাস্টমাইজেশন

- `render.py` — FFmpeg render pipeline.
- `.github/workflows/render.yml` — GitHub-hosted runner-এ render job.
- `subtitles_source.txt` — timestamp-সহ SRT-ধাঁচের subtitle source. এটি `.txt` হলেও SRT timestamp format-এ।
- `subtitles.srt` দিলে সেটি source text-এর বদলে ব্যবহার হবে।
- `brand.json` — brand name, product title, CTA ও রঙ পরিবর্তনের জায়গা।

## গুরুত্বপূর্ণ

- আপনার দেওয়া অডিও প্রায় 60.4 সেকেন্ড, আর timestamp text-এর শেষ সময় 67 সেকেন্ড। রেন্ডারার subtitle timestamp-গুলো অডিওর দৈর্ঘ্যের সঙ্গে স্বয়ংক্রিয়ভাবে scale করে, যাতে শেষের caption অডিওর বাইরে না যায়।
- আউটপুট: 1080×1920, 30 fps, H.264 MP4, AAC audio.
- GitHub Actions-এর free usage/limits account ও repository settings অনুযায়ী বদলাতে পারে।
- ওয়েবসাইটের URL `brand.json`-এ যোগ করলে CTA-তে দেখাবে।
- আপনার পণ্য-সম্পর্কিত দাবিগুলো আপনার দেওয়া narration থেকেই এসেছে; স্ক্রিপ্ট নতুন fragrance claims তৈরি করে না।
