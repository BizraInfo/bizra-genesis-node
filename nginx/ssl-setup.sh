#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - SSL CERTIFICATE SETUP SCRIPT                       ║
# ║  Automated Let's Encrypt certificate generation                          ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

# Configuration
DOMAIN="${DOMAIN:-console.bizra.ai}"
EMAIL="${SSL_EMAIL:-admin@bizra.ai}"
STAGING="${STAGING:-0}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  BIZRA Genesis Node - SSL Certificate Setup                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Staging: $([ "$STAGING" -eq 1 ] && echo 'Yes (Test Mode)' || echo 'No (Production)')"
echo ""

# Check if certificates already exist
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "✅ Certificates already exist for $DOMAIN"
    echo "   Location: /etc/letsencrypt/live/$DOMAIN"
    echo ""
    echo "Certificate Details:"
    openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -dates
    echo ""
    echo "To renew certificates, run: /usr/local/bin/renew-certs.sh"
    exit 0
fi

# Determine certbot flags
CERTBOT_FLAGS="--webroot -w /var/www/certbot --email $EMAIL --agree-tos --no-eff-email"

if [ "$STAGING" -eq 1 ]; then
    CERTBOT_FLAGS="$CERTBOT_FLAGS --staging"
    echo "⚠️  Running in STAGING mode (test certificates)"
else
    echo "🔒 Running in PRODUCTION mode (real certificates)"
fi

# Request certificate
echo ""
echo "📝 Requesting SSL certificate from Let's Encrypt..."
echo ""

certbot certonly \
    $CERTBOT_FLAGS \
    -d "$DOMAIN" \
    --non-interactive \
    --keep-until-expiring \
    --expand

# Check if successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL certificate successfully obtained!"
    echo ""
    echo "Certificate Details:"
    openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -dates
    echo ""
    echo "Certificate Files:"
    echo "  - Full Chain: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo "  - Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
    echo "  - Certificate: /etc/letsencrypt/live/$DOMAIN/cert.pem"
    echo "  - Chain: /etc/letsencrypt/live/$DOMAIN/chain.pem"
    echo ""
    echo "🔄 Reloading nginx configuration..."
    nginx -s reload
    echo "✅ Nginx reloaded successfully"
    echo ""
    echo "🎉 SSL setup complete! HTTPS is now enabled."
    echo ""
    echo "Next Steps:"
    echo "  1. Test HTTPS: https://$DOMAIN/health"
    echo "  2. Check SSL rating: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    echo "  3. Set up auto-renewal: Add cron job for /usr/local/bin/renew-certs.sh"
else
    echo ""
    echo "❌ Failed to obtain SSL certificate"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify DNS is correctly configured for $DOMAIN"
    echo "  2. Ensure port 80 is accessible from the internet"
    echo "  3. Check certbot logs: /var/log/letsencrypt/letsencrypt.log"
    echo "  4. Try staging mode first: STAGING=1 $0"
    exit 1
fi
