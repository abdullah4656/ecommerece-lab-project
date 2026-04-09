# MongoDB Connection Guide

## Current Configuration

Your application is already configured to connect to MongoDB at:
- **Connection String**: `mongodb://localhost:27017/scoopcraft-store`
- **Database Name**: `scoopcraft-store`
- **Default Port**: `27017`

## Step 1: Start MongoDB Service

### Option A: MongoDB installed as Windows Service
1. Open PowerShell as Administrator
2. Check if MongoDB service exists:
   ```powershell
   Get-Service -Name *mongo*
   ```
3. Start MongoDB service:
   ```powershell
   Start-Service MongoDB
   ```

### Option B: MongoDB installed manually
1. Navigate to your MongoDB installation directory (usually `C:\Program Files\MongoDB\Server\<version>\bin`)
2. Run MongoDB:
   ```powershell
   .\mongod.exe
   ```

### Option C: Using MongoDB Compass (GUI)
- If you installed MongoDB Compass, MongoDB service should start automatically
- Check if it's running in Task Manager

## Step 2: Verify MongoDB is Running

Run this command in PowerShell:
```powershell
Test-NetConnection -ComputerName localhost -Port 27017
```

If successful, you'll see `TcpTestSucceeded : True`

## Step 3: Install Dependencies (if not done)

```powershell
cd "C:\Users\choud\OneDrive - Higher Education Commission\Desktop\WBE TECH SEM 6 - safeCopy\WEB\lab-final-b"
npm install
```

## Step 4: Seed the Database (Optional)

Populate the database with sample products:
```powershell
npm run seed
```

You should see:
```
Connected to MongoDB
Cleared existing products
Seeded X products
Database seeding completed
```

## Step 5: Start Your Application

```powershell
npm start
```

Or for development with auto-reload:
```powershell
npm run dev
```

You should see in the console:
```
Connected to MongoDB
ScoopCraft Pints running at http://localhost:3004
```

## Troubleshooting

### Error: "MongoDB connection error"

1. **Check if MongoDB is running:**
   ```powershell
   Test-NetConnection localhost -Port 27017
   ```

2. **Start MongoDB service:**
   ```powershell
   # Check service name first
   Get-Service | Where-Object {$_.DisplayName -like "*Mongo*"}
   
   # Then start it (replace SERVICE_NAME with actual name)
   Start-Service SERVICE_NAME
   ```

3. **Check MongoDB logs:**
   - Default log location: `C:\Program Files\MongoDB\Server\<version>\log\mongod.log`

4. **Verify MongoDB is installed:**
   ```powershell
   mongod --version
   ```

### If MongoDB is not installed:

Download and install MongoDB Community Server:
- Visit: https://www.mongodb.com/try/download/community
- Choose Windows x64 installer
- During installation, select "Install MongoDB as a Service"

### Alternative: Use MongoDB Atlas (Cloud)

If you prefer using MongoDB Atlas (cloud database):

1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster and get your connection string
3. Update `server.js`:
   ```javascript
   const MONGODB_URI = process.env.MONGODB_URI || 'your-atlas-connection-string';
   ```
4. Or set environment variable:
   ```powershell
   $env:MONGODB_URI="your-atlas-connection-string"
   ```

## Connection String Format

- **Local MongoDB**: `mongodb://localhost:27017/scoopcraft-store`
- **With Authentication**: `mongodb://username:password@localhost:27017/scoopcraft-store`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/scoopcraft-store`

## Environment Variable (Optional)

You can also set the MongoDB URI as an environment variable instead of hardcoding:

```powershell
$env:MONGODB_URI="mongodb://localhost:27017/scoopcraft-store"
npm start
```


