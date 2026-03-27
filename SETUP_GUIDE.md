# 🚀 FixMind - Setup & Implementation Guide

## What's New

Sistemul FixMind a fost actualizat cu un **sistem complet de autentificare și management de clase**:

✅ **Autentificare** - Register/Login cu email + parolă  
✅ **Role-based** - Conturi separate pentru Profesori și Elevi  
✅ **Database** - MySQL cu scheme complete  
✅ **Dashboard Profesor** - Creare clase, invitații, vizualizare elevi  
✅ **Dashboard Elev** - Alăturare clase cu cod, vizualizare progres  
✅ **Security** - JWT tokens, bcrypt passwords, CORS enabled  

---

## 📋 Setup Instructions

### 1. **Install Dependencies**

```bash
npm install
```

Noi pachete adăugate:
- `mysql2` - Database connection
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `passport` - OAuth support (future)
- `validator` - Input validation

### 2. **Database Setup**

#### Opțiunea A: MySQL Local

```bash
# Deschide MySQL
mysql -u root -p

# Creează baza de date
source database.sql
```

#### Opțiunea B: MySQL Online (Render, Heroku, etc.)

- Creează o bază de date MySQL
- Rulează `database.sql` schema
- Actualizează `.env` cu credențialele

### 3. **Configure Environment Variables**

Edit `.env`:

```env
# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=fixmind

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server
PORT=3000
NODE_ENV=development
```

### 4. **Replace server.js**

```bash
# Backup old file
mv server.js server-old.js

# Use new file
mv server-new.js server.js
```

### 5. **Start Server**

```bash
npm start
# or for development
npm run dev
```

Server va rula pe: `http://localhost:3000`

---

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with email/password

### Profesor
- `POST /api/profesor/clase` - Create class
- `GET /api/profesor/clase` - Get all professor's classes

### Elev
- `POST /api/elev/join-class` - Join class with invitation code

### AI
- `POST /api/chat` - Chat with AI (existing)
- `GET /api/health` - Health check

---

## 📱 User Flow

### Profesor
1. **Register** (`auth.html`) → Create account as "profesor"
2. **Dashboard** (`profesor-dashboard.html`) → Create classes
3. **Share Code** → Give invitation code to students
4. **View Students** → See enrolled students and their progress

### Elev
1. **Register** (`auth.html`) → Create account as "elev"
2. **Dashboard** (`elev-dashboard.html`) → Join class with code
3. **Complete Tests** → Take tests assigned by professor
4. **View Progress** → See personal progress and grades

---

## 📁 File Structure

```
project/
├── auth.html                    # Login/Register page
├── pages/
│   ├── profesor-dashboard.html  # Professor dashboard
│   ├── elev-dashboard.html      # Student dashboard
│   └── asistent.html            # AI Chat (existing)
├── css/
│   └── style.css                # Styling
├── database.sql                 # MySQL schema
├── server.js                    # Main backend (NEW!)
├── .env                         # Configuration
└── package.json                 # Dependencies
```

---

## 🔐 Security Notes

⚠️ **Important:**
1. Change `JWT_SECRET` in production
2. Never commit `.env` to git
3. Use HTTPS in production
4. Validate all inputs
5. Use environment variables for sensitive data

---

## 🌐 Deployment (Render)

### Steps:
1. Push code to GitHub
2. Connect repository to Render
3. Add Environment Variables in Render Dashboard:
   - `OPENAI_API_KEY`
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `JWT_SECRET`
4. Set Publish Directory: `.`
5. Deploy

### MySQL on Render:
- Use Render's MySQL service OR
- Use external MySQL provider (JawsDB, ClearDB, etc.)

---

## 🧪 Testing

### 1. Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "profesor@test.com",
    "password": "password123",
    "first_name": "Ion",
    "last_name": "Popescu",
    "type": "profesor",
    "materia": "Psihologie"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "profesor@test.com",
    "password": "password123"
  }'
```

### 3. Create Class (Use token from login)
```bash
curl -X POST http://localhost:3000/api/profesor/clase \
  -H "Authorization: Bearer TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "nume": "Clasa IX A",
    "descriere": "Psihologie avansată"
  }'
```

---

## ❌ Troubleshooting

### "Cannot find module 'mysql2'"
```bash
npm install mysql2
```

### "API Key not configured"
- Check `.env` file has `OPENAI_API_KEY`
- Restart server

### "Database connection error"
- Verify MySQL is running: `mysql -u root`
- Check `DB_HOST`, `DB_USER`, `DB_PASSWORD`
- Ensure database exists: `CREATE DATABASE fixmind;`

### "CORS error in browser"
- CORS is enabled in server
- Check API_URL in frontend matches server URL

### "Token invalid/expired"
- Clear localStorage: `localStorage.clear()`
- Re-login

---

## 📊 Database Schema

### Key Tables:
- **users** - All users (professors + students)
- **profesori** - Professor-specific info
- **clase** - Classes created by professors
- **inscrisuri** - Student enrollment in classes
- **teste** - Tests created by professors
- **rezultate** - Test scores and results
- **raspunsuri_elev** - Individual student answers

---

## 🚀 Next Features to Build

1. ✅ Auth & Dashboard (DONE)
2. ⏳ Tests CRUD - Create/Edit/Delete tests
3. ⏳ Test Submissions - Students take tests
4. ⏳ Grading - Auto-grade multiple choice, manual essay
5. ⏳ Reports - Progress charts and analytics
6. ⏳ OAuth - Google/Facebook login
7. ⏳ Email Notifications
8. ⏳ Mobile App

---

## 📞 Support

For issues:
1. Check logs in terminal
2. Check browser console (F12)
3. Verify `.env` configuration
4. Check database connection

Good luck! 🎓
