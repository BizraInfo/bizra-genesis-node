#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - SSL CERTIFICATE RENEWAL SCRIPT                     ║
# ║  Automated Let's Encrypt certificate renewal (cron job)                  ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

# Configuration
DOMAIN="${DOMAIN:-console.bizra.ai}"
LOG_FILE="/var/log/cert-renewal.log"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "╔════════════════════════════════════════════════════════════════╗"
log "║  BIZRA Genesis Node - Certificate Renewal Check               ║"
log "╚════════════════════════════════════════════════════════════════╝"
log ""
log "Domain: $DOMAIN"
log ""

# Check if certificates exist
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    log "❌ No certificates found for $DOMAIN"
    log "   Run /usr/local/bin/ssl-setup.sh first"
    exit 1
fi

# Display current certificate expiration
log "Current Certificate:"
CERT_EXPIRES=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -enddate | cut -d= -f2)
log "  Expires: $CERT_EXPIRES"

# Calculate days until expiration
EXPIRY_EPOCH=$(date -d "$CERT_EXPIRES" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

log "  Days until expiry: $DAYS_UNTIL_EXPIRY"
log ""

# Renew if less than 30 days remaining
if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    log "🔄 Certificate expires in $DAYS_UNTIL_EXPIRY days. Renewing..."

    # Attempt renewal
    if certbot renew --webroot -w /var/www/certbot --quiet --no-self-upgrade; then
        log "✅ Certificate renewed successfully!"

        # Reload nginx to pick up new certificate
        log "🔄 Reloading nginx..."
        if nginx -s reload; then
            log "✅ Nginx reloaded successfully"

            # Display new expiration
            NEW_CERT_EXPIRES=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -enddate | cut -d= -f2)
            log ""
            log "New Certificate:"
            log "  Expires: $NEW_CERT_EXPIRES"

            # Send success notification (if webhook configured)
            if [ -n "$RENEWAL_WEBHOOK_URL" ]; then
                curl -X POST "$RENEWAL_WEBHOOK_URL" \
                    -H "Content-Type: application/json" \
                    -d "{\"status\":\"success\",\"domain\":\"$DOMAIN\",\"expires\":\"$NEW_CERT_EXPIRES\"}" \
                    --silent --output /dev/null
            fi
        else
            log "❌ Failed to reload nginx"
            exit 1
        fi
    else
        log "❌ Certificate renewal failed"
        log "   Check certbot logs: /var/log/letsencrypt/letsencrypt.log"

        # Send failure notification (if webhook configured)
        if [ -n "$RENEWAL_WEBHOOK_URL" ]; then
            curl -X POST "$RENEWAL_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{\"status\":\"failure\",\"domain\":\"$DOMAIN\",\"days_until_expiry\":$DAYS_UNTIL_EXPIRY}" \
                --silent --output /dev/null
        fi

        exit 1
    fi
else
    log "✅ Certificate is still valid for $DAYS_UNTIL_EXPIRY days. No renewal needed."
fi

log ""
log "Certificate renewal check complete."
