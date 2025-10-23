# Study Planner - Deployment Checklist

## Fresh Installation (New Server)

### Prerequisites
- [ ] Node.js v14+ installed
- [ ] npm installed
- [ ] Git installed (optional)

### Setup Steps

1. **Clone or copy the repository**
   ```bash
   git clone <repository-url>
   cd study-planner
   ```

2. **Run the automated setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   This script will:
   - Install backend dependencies
   - Install frontend dependencies
   - Create `.env` file from `.env.example`
   - Set up SQLite database with complete schema
   - Create demo user account

3. **Start the application**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   npm run dev
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   
   Demo credentials:
   - Email: demo@studyplanner.com
   - Password: password123

### Environment Configuration

Edit `backend/.env` if needed:
```env
PORT=5000
NODE_ENV=development
DB_PATH=./database/study_planner.db
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

⚠️ **IMPORTANT:** Change `JWT_SECRET` before deploying to production!

---

## Upgrading Existing Installation

### If pulling new code with schema changes:

1. **Pull latest code**
   ```bash
   git pull
   ```

2. **Update dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Run database migration** (preserves existing data)
   ```bash
   cd backend
   npm run migrate-db
   ```

4. **Restart servers**
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend (in another terminal)
   cd frontend
   npm start
   ```

---

## Database Management Commands

### Available Scripts

```bash
cd backend

# Initial setup (new installations)
npm run setup-db

# Migrate existing database (safe, preserves data)
npm run migrate-db

# Reset database (DESTRUCTIVE - deletes all data)
npm run reset-db
```

### When to Use Each

| Scenario | Command | Safe? |
|----------|---------|-------|
| First installation | `npm run setup-db` | ✅ |
| Upgrading version | `npm run migrate-db` | ✅ |
| Development reset | `npm run reset-db` | ⚠️ Deletes data |
| Schema corruption | `npm run reset-db` | ⚠️ Deletes data |

---

## Production Deployment

### Pre-deployment Checklist

- [ ] Change `JWT_SECRET` in `.env` to a strong, unique value
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Build frontend for production: `cd frontend && npm run build`
- [ ] Configure reverse proxy (nginx/Apache) if needed
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up process manager (PM2, systemd)

### Production Build

1. **Build frontend**
   ```bash
   cd frontend
   npm run build
   ```
   
   This creates optimized files in `frontend/build/`

2. **Serve static files** (option 1: from backend)
   
   Update `backend/server.js` to serve static files:
   ```javascript
   app.use(express.static(path.join(__dirname, '../frontend/build')));
   ```

3. **Serve with nginx** (option 2: recommended)
   
   Example nginx config:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           root /path/to/study-planner/frontend/build;
           try_files $uri /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Use process manager**
   
   With PM2:
   ```bash
   npm install -g pm2
   cd backend
   pm2 start server.js --name study-planner-api
   pm2 save
   pm2 startup
   ```

### Database Backups (Production)

**Before any migration:**
```bash
cd backend/database
cp study_planner.db "backup-$(date +%Y%m%d-%H%M%S).db"
```

**Automated daily backups:**
```bash
# Add to crontab
0 2 * * * cp /path/to/study-planner/backend/database/study_planner.db /path/to/backups/study_planner-$(date +\%Y\%m\%d).db
```

---

## Troubleshooting

### "Port already in use"
```bash
# Find and kill process on port 5000
lsof -i :5000
kill -9 <PID>
```

### "Cannot find module"
```bash
# Reinstall dependencies
cd backend && npm install
cd ../frontend && npm install
```

### "Database locked"
```bash
# Stop all node processes
pkill node
# Restart backend
cd backend && npm run dev
```

### "CORS errors"
Check `backend/.env`:
```env
FRONTEND_URL=http://localhost:3000
```

### "No such column" errors
```bash
cd backend
npm run migrate-db
```

---

## File Structure Reference

```
study-planner/
├── setup.sh                    # Automated setup script
├── README.md                   # Full documentation
├── DATABASE_GUIDE.md          # Database management guide
├── API_DOCUMENTATION.md       # API reference
├── DEPLOYMENT_CHECKLIST.md    # This file
│
├── backend/
│   ├── server.js              # Main server file
│   ├── package.json           # Backend dependencies & scripts
│   ├── .env.example           # Environment template
│   ├── .env                   # Environment config (create this)
│   │
│   ├── config/
│   │   └── database.js        # Database connection wrapper
│   │
│   ├── database/
│   │   ├── schema.sql         # Database schema (master)
│   │   └── study_planner.db   # SQLite database (auto-created)
│   │
│   ├── scripts/
│   │   ├── setupDatabase.js   # Initial setup script
│   │   ├── migrateDatabase.js # Migration script
│   │   └── resetDatabase.js   # Reset script (DESTRUCTIVE)
│   │
│   ├── routes/                # API endpoints
│   └── middleware/            # Auth & validation
│
└── frontend/
    ├── package.json           # Frontend dependencies
    ├── src/                   # React source code
    ├── public/                # Static assets
    └── build/                 # Production build (created by npm run build)
```

---

## Quick Command Reference

### Development
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm start

# Both (in separate terminals)
```

### Production
```bash
# Build frontend
cd frontend && npm run build

# Start backend (with PM2)
cd backend && pm2 start server.js --name study-planner

# Or without PM2
cd backend && npm start
```

### Database
```bash
cd backend

# New installation
npm run setup-db

# Migrate existing
npm run migrate-db

# Reset (careful!)
npm run reset-db
```

---

## Support

For detailed information, see:
- `README.md` - Complete application documentation
- `DATABASE_GUIDE.md` - Database management guide
- `API_DOCUMENTATION.md` - API endpoint reference

---

## Security Notes

### Before Production:
1. ✅ Change `JWT_SECRET` to a cryptographically strong random string
2. ✅ Enable HTTPS/SSL
3. ✅ Set `NODE_ENV=production`
4. ✅ Review and adjust rate limiting settings
5. ✅ Set up proper firewall rules
6. ✅ Don't commit `.env` or `.db` files to version control

### Password Requirements:
- Default demo password is `password123` - change immediately!
- Implement strong password policy in production
- Consider adding 2FA for sensitive accounts

---

**Last Updated:** October 2025
**Version:** 1.0
