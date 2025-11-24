# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BIZRA GENESIS NODE - NGINX DOCKERFILE                                   ║
# ║  Production-grade nginx with security modules                            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

FROM nginx:1.25-alpine

# Install additional packages
RUN apk add --no-cache \
    openssl \
    certbot \
    certbot-nginx \
    bash

# Create directories
RUN mkdir -p /etc/nginx/ssl \
    && mkdir -p /var/www/certbot \
    && mkdir -p /etc/letsencrypt

# Generate DH parameters for perfect forward secrecy (2048-bit)
# Note: This takes ~2 minutes on first build. For production, pre-generate and copy.
RUN openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy SSL setup script
COPY ssl-setup.sh /usr/local/bin/ssl-setup.sh
RUN chmod +x /usr/local/bin/ssl-setup.sh

# Copy certificate renewal script
COPY renew-certs.sh /usr/local/bin/renew-certs.sh
RUN chmod +x /usr/local/bin/renew-certs.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
