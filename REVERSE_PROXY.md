# Reverse Proxy Configuration Guide

## Nginx Proxy Manager Setup

When using Nginx Proxy Manager (or any reverse proxy), you need to configure it correctly to avoid white page issues.

### Quick Setup (Recommended)

1. **In Nginx Proxy Manager:**
   - **Domain Names**: Your domain (e.g., `canvas.example.com`)
   - **Forward Hostname/IP**: Your server's IP or hostname where canvas is running (e.g., `192.168.1.100`)
   - **Forward Port**: `8000`
   - **Forward Scheme**: `http`
   - **Cache Assets**: Disabled (or enabled, but clear cache if issues occur)
   - **Block Common Exploits**: Enabled
   - **Websockets Support**: Enabled
   - **Access List**: Configure as needed

2. **That's it!** The default configuration should work. The app is designed to work behind a reverse proxy.

### If You Still See a White Page

If the default configuration doesn't work, add custom Nginx configuration:

1. Go to **Advanced** tab in Nginx Proxy Manager
2. Add this to **Custom Nginx Configuration**:

   ```nginx
   # Ensure all requests are proxied correctly
   location / {
       proxy_pass http://127.0.0.1:8000;
       proxy_http_version 1.1;
       
       # Headers for proper proxy support
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header X-Forwarded-Host $host;
       proxy_set_header X-Forwarded-Port $server_port;
       
       # WebSocket support (for future use)
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       
       # Timeouts
       proxy_connect_timeout 60s;
       proxy_send_timeout 60s;
       proxy_read_timeout 60s;
   }
   ```

### Important Notes

- **Don't use a subpath** (like `/canvas`) - serve from root (`/`)
- The app automatically handles:
  - `/api/*` → Backend API
  - `/assets/*` → Static assets (JS, CSS)
  - `/*` → React app (index.html)
- All requests should be forwarded to port `8000`

### Troubleshooting

**1. Check Browser Console (F12)**
   - Look for JavaScript errors
   - Check Network tab for failed requests (404s, CORS errors)

**2. Verify Asset Loading**
   - Open Network tab in browser
   - Reload page
   - Check if `/assets/*` files are loading (should be 200 OK)
   - Check if `/api/config` returns data

**3. Test Direct Access**
   - Try accessing `http://your-server-ip:8000` directly
   - If it works directly but not through proxy, it's a proxy configuration issue

**4. Check Proxy Logs**
   - In Nginx Proxy Manager, check the logs for errors
   - Look for 502, 503, or connection refused errors

### Common Issues and Solutions

**Issue**: White page, console shows 404 for `/assets/index-*.js`
- **Cause**: Assets not being served correctly
- **Solution**: Make sure proxy forwards all requests to port 8000, not just `/api`

**Issue**: White page, console shows CORS errors
- **Cause**: Proxy not forwarding headers correctly
- **Solution**: Add the custom Nginx configuration above

**Issue**: Works on `http://ip:8000` but not through proxy
- **Cause**: Proxy configuration issue
- **Solution**: 
  1. Verify Forward Port is `8000`
  2. Verify Forward Scheme is `http` (not `https` unless using SSL termination)
  3. Enable Websockets Support
  4. Add custom Nginx config if needed

**Issue**: API calls return 404
- **Cause**: Proxy might be rewriting paths
- **Solution**: Make sure proxy doesn't rewrite `/api` paths. Use `proxy_pass http://127.0.0.1:8000;` without trailing slash

### Testing

After configuration:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Open browser console (F12)
3. Navigate to your domain
4. Check:
   - No console errors
   - Network tab shows assets loading (200 OK)
   - API calls work (check `/api/config`)

If everything loads but you still see a white page, check the browser console for JavaScript errors - there might be a runtime error preventing React from rendering.

