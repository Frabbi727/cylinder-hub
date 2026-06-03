# Deployment Commands

## Daily Deploy (after pushing new code)
```bash
cd ~/cylinder-hub.techrealify.com
git pull origin production
php artisan migrate --force
php artisan optimize
```

## One-liner Deploy
```bash
cd ~/cylinder-hub.techrealify.com && git pull origin production && php artisan migrate --force && php artisan optimize
```

## After Changing .env
```bash
php artisan config:clear
php artisan config:cache
```

## Clear All Cache (when something looks broken)
```bash
php artisan optimize:clear
```

## Full Reset
```bash
php artisan optimize:clear
php artisan optimize
```

## Individual Cache Commands
```bash
php artisan cache:clear      # Clear app cache
php artisan config:clear     # Clear config cache
php artisan route:clear      # Clear route cache
php artisan view:clear       # Clear view cache
php artisan config:cache     # Cache config
php artisan route:cache      # Cache routes
php artisan view:cache       # Cache views
```
