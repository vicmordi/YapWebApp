# Yap

This repository contains the Yap MVP web application. The project is split into a vanilla JS frontend and a Node.js/Express backend API.

```
yap/
  frontend/
    index.html
    styles.css
    app.js
    components/
      auth.js
      profile.js
      match.js
      chat.js
      utils.js
  backend/
    src/
      server.js
      routes/
        auth.js
        profile.js
        match.js
        chat.js
        media.js
      models/
        User.js
        Yap.js
        Message.js
      middleware/
        auth.js
        rateLimit.js
        error.js
      services/
        mongo.js
        azure.js
        matchmaker.js
    .env.example
    package.json
    README.md
```

Refer to `yap/backend/README.md` for setup instructions covering MongoDB Atlas and Azure Blob Storage. Serve the `yap/frontend` directory with any static server during development (e.g. `npx serve`).
