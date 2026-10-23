INSANE website: SETUP (about 5 minutes). Firebase config is already filled in.

1. Realtime Database (you already have one in your Firebase project)
   - Firebase console > Build > Realtime Database. If it asks, click Create Database.
   - Open the Rules tab, delete everything, paste ALL of database.rules.json, click Publish.

2. Admin login
   - Build > Authentication > Get started > Sign-in method > enable Google.
   - Settings > Authorized domains: add your website domain once it is live.
   - Admin is himanshu.yadav01241@gmail.com. To change it, edit ADMIN_EMAIL in
     firebase-config.js AND the email inside database.rules.json (4 places).

3. First run
   - Open yoursite/admin.html and sign in with Google.
   - Starter prices, projects and your WhatsApp number are added automatically.
   - Prices tab: edit and Save. The website updates instantly, even for people who have it open.
   - Enquiries tab: every form message appears live. Press "Send test enquiry" to check.

4. Hosting (free)
   - Netlify: drag this folder onto app.netlify.com/drop. Or GitHub Pages / Vercel.
   - Google sign-in does not work from file:// . To test locally run "python -m http.server"
     in this folder and open http://localhost:8000/admin.html
   - After hosting, change og:image in index.html to your full address, e.g.
     https://yourdomain.com/og.jpg so link previews show your logo.

Logo files: logo.png (header/footer), icon.png (favicon), og.jpg (link preview).
