# ============================================================
# QuantPitch — Production Docker Image
# ============================================================
# Build-time env vars (REQUIRED — baked into JS bundle by Vite):
#   VITE_SUPABASE_URL       — Supabase project URL
#   VITE_SUPABASE_ANON_KEY  — Supabase anonymous key
#
# Build:
#   docker build \
#     --build-arg VITE_SUPABASE_URL=https://<project>.supabase.co \
#     --build-arg VITE_SUPABASE_ANON_KEY=<anon-key> \
#     -t quantpitch:latest .
#
# Run:
#   docker run -p 80:80 quantpitch:latest
# ============================================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

# Accept build-time env vars (Vite bakes these into the bundle)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Stage 2: Serve ----
FROM nginx:alpine

# Copy built SPA
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Healthcheck
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
