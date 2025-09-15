# ====================
# Build Stage
# ====================
FROM oven/bun:latest AS builder

# Set the working directory
WORKDIR /app

# Build arguments for passing env variables at build time
ARG VITE_API_URL
ARG NGINX_SERVER_NAME
# Cooldowns / limits
ARG PERSONALITY_ANALYSIS_COOLDOWN_DAYS
ARG PERSONALITY_ANALYSIS_MAX_COUNT
ARG INSTITUTION_ANALYSIS_COOLDOWN_DAYS
ARG INSTITUTION_ANALYSIS_MAX_COUNT
ARG CAREER_ANALYSIS_COOLDOWN_DAYS
ARG CAREER_ANALYSIS_MAX_COUNT
ARG ORGANIZATIONS_GOOGLE_FORM_LINK
ARG CONTACT_PHONE


# Copy only package files first for better caching
COPY package*.json bun.lock ./

# Install dependencies using bun
RUN bun install

# Copy the rest of the project files
COPY . .
COPY src/core/locales /app/src/core/locales


# Inject environment variables for Vite build
ENV VITE_API_URL=${VITE_API_URL}
ENV NGINX_SERVER_NAME=${NGINX_SERVER_NAME}
ENV VITE_PERSONALITY_ANALYSIS_COOLDOWN_DAYS=${PERSONALITY_ANALYSIS_COOLDOWN_DAYS}
ENV VITE_PERSONALITY_ANALYSIS_MAX_COUNT=${PERSONALITY_ANALYSIS_MAX_COUNT}
ENV VITE_INSTITUTION_ANALYSIS_COOLDOWN_DAYS=${INSTITUTION_ANALYSIS_COOLDOWN_DAYS}
ENV VITE_INSTITUTION_ANALYSIS_MAX_COUNT=${INSTITUTION_ANALYSIS_MAX_COUNT}
ENV VITE_CAREER_ANALYSIS_COOLDOWN_DAYS=${CAREER_ANALYSIS_COOLDOWN_DAYS}
ENV VITE_CAREER_ANALYSIS_MAX_COUNT=${CAREER_ANALYSIS_MAX_COUNT}
ENV VITE_ORGANIZATIONS_GOOGLE_FORM_LINK=${ORGANIZATIONS_GOOGLE_FORM_LINK}
ENV VITE_CONTACT_PHONE=${CONTACT_PHONE}

# Build the production files
RUN bun run build

# ====================
# Final Stage (Nginx)
# ====================
FROM nginx:alpine AS final

# Remove default config and copy template
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.template.conf /etc/nginx/nginx.template.conf

# Copy static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Add custom entrypoint script
COPY scripts/envsubst_nginx.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port and set entrypoint
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]