FROM nodered/node-red:5.0.7-24

# Palette node + libraries used inside function nodes (exposed via functionGlobalContext in settings.js).
# Installed next to Node-RED, not in /data, so the bind-mounted user dir stays clean.
RUN npm install --no-audit --no-fund --omit=dev \
      node-red-node-mysql@3.0.4 \
      bcryptjs@3.0.3 \
      jsonwebtoken@9.0.3 \
      google-auth-library@11.1.0

# Lets /data/settings.js require() the modules installed above
ENV NODE_PATH=/usr/src/node-red/node_modules
