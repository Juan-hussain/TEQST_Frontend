# TEQST_Frontend
### This repository contains the frontend code of [TEQST](https://github.com/TEQST/TEQST)

**Note**: This is a full server deployment setup. Both frontend and backend run on the production server at `116.202.96.11`.

## Server Deployment

### Prerequisites
- **Server Access**: SSH access to your server at `116.202.96.11`
- **Node.js**: Node.js 14+ on the server
- **npm**: npm package manager on the server
- **Web Server**: nginx for serving the frontend

### Quick Deployment

#### Option 1: Automated Deployment
Use the main deployment script from the project root:
```bash
cd /opt/TEQST
./deploy.sh
```

#### Option 2: Manual Setup

### 1. Server Setup
```bash
# Connect to your server
ssh user@116.202.96.11

# Install Node.js and npm if not already installed
sudo apt update
sudo apt install nodejs npm
```

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd TEQST_Frontend

# Install global dependencies
npm install -g @ionic/cli
npm install -g @angular/cli

# Install project dependencies
npm install

# Build for production
ionic build --prod
```

### 3. nginx Configuration
The frontend is served by nginx. The deployment script automatically configures nginx to:
- Serve the frontend from `/` (root)
- Proxy API requests to `/api/` to the backend
- Handle static files and media

### 4. Configuration

#### Current Configuration (`src/app/constants.ts`)
The frontend is configured to connect to the server:
```typescript
export class Constants {
  public static SERVER_URL = 'http://116.202.96.11';  // Server URL (no port needed with nginx)
  public static REQUEST_TIMEOUT = 30000;
  public static DISABLE_NO_INTERNET_ALERT = false;
}
```

**Important**: The SERVER_URL is set to the server IP without a port because nginx handles the routing.

## Access Points

Once deployed, your application will be accessible at:

- **Frontend**: `http://116.202.96.11/`
- **Backend API**: `http://116.202.96.11/api/`
- **Admin Interface**: `http://116.202.96.11/admin/`

## Development Workflow

### File Structure
- `src/app/` - Main application code
- `src/app/services/` - API services and business logic
- `src/app/tabs/` - Main tab navigation
- `src/app/speak/` - Recording functionality for speakers
- `src/app/listen/` - Audio playback for listeners
- `src/app/manage/` - Content management
- `src/app/auth/` - Authentication system
- `src/app/help/` - Documentation and help

### Key Services
- `authentication.service.ts` - User authentication
- `usermgmt.service.ts` - User management
- `text-state.service.ts` - Text content state
- `recording-upload.service.ts` - Audio recording uploads
- `language.service.ts` - Internationalization

## Maintenance

### Update Frontend
```bash
# Navigate to frontend directory
cd TEQST_Frontend

# Pull latest changes
git pull origin main

# Install/update dependencies
npm install

# Rebuild for production
ionic build --prod

# The nginx configuration will automatically serve the new build
```

### Check Frontend Status
```bash
# Check if nginx is running
sudo systemctl status nginx

# Check nginx configuration
sudo nginx -t

# View nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Troubleshooting

### Common Issues

1. **Frontend not loading**
   - Check nginx status: `sudo systemctl status nginx`
   - Verify nginx configuration: `sudo nginx -t`
   - Check if frontend build exists: `ls -la www/`
   - View nginx error logs: `sudo tail -f /var/log/nginx/error.log`

2. **API connection issues**
   - Verify backend is running: `pm2 status` or `sudo systemctl status teqst-backend`
   - Check nginx proxy configuration
   - Verify `constants.ts` SERVER_URL is correct

3. **Build errors**
   - Check Node.js version: `node --version`
   - Clear cache: `rm -rf node_modules package-lock.json`
   - Reinstall dependencies: `npm install`
   - Check for errors in build output: `ionic build --prod --verbose`

### Development Tips
- The frontend is served by nginx, not by the Ionic development server
- All API requests are proxied through nginx to the backend
- Static files are served directly by nginx for better performance
- Use the deployment script for consistent setup across environments

## API Connection

### Server Deployment Mode (Current)
- Frontend served by nginx at `http://116.202.96.11/`
- Backend runs on the same server at `127.0.0.1:8000`
- nginx proxies `/api/*` requests to the backend
- No CORS issues since both are served from the same domain

### nginx Configuration
The nginx configuration automatically handles:
- Frontend routing (SPA support)
- API proxying to backend
- Static file serving
- Media file serving

## Developer Guide
The [developer guide](https://github.com/TEQST/TEQST_Frontend/wiki/Guide-for-Developers) contains more information for Frontend Development of TEQST.
