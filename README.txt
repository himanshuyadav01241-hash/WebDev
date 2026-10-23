SETUP (about 10 minutes)

1. Firebase project (config is ALREADY pasted in firebase-config.js, skip to step 2)
   - Go to console.firebase.google.com > Add project.
   - Project settings > Your apps > Web (</>) > register app > copy the config.
   - Paste it into firebase-config.js (replace the PASTE_ values).

2. Database
   - Build > Firestore Database > Create database (production mode).
   - Rules tab > paste everything from firestore.rules > Publish.

3. Admin login
   - Build > Authentication > Get started > Sign-in method > enable Google.
   - Settings > Authorized domains: add your website domain once it is live.
   - Admin is himanshu.yadav01241@gmail.com. To change it, edit ADMIN_EMAIL in
     firebase-config.js AND the email in firestore.rules.

4. First run
   - Host the folder (see 5). Open yoursite/admin.html and sign in with Google.
   - Settings tab > set your WhatsApp number (with country code, e.g. 919876543210)
     > Save, then press "Load starter content".
   - Prices tab: change plan names, prices and features. Projects tab: your work.
   - Enquiries tab: every form submission appears here live. Change status, reply on
     WhatsApp or email, delete, or download as CSV.

5. Hosting (free)
   - Netlify: drag this folder onto app.netlify.com/drop.
   - Or GitHub Pages / Vercel / Firebase Hosting.
   - Google sign-in does not work when you open admin.html directly from your computer
     (file://). To test locally run "python -m http.server" in this folder and open
     http://localhost:8000/admin.html.

Until Firebase is set up, the website still works and shows the starter prices and projects.
Admin login is only available once Firebase is set up.
