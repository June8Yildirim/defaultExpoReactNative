# Firebase Auth emulator for local development. Not for production.
FROM node:22-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
  && rm -rf /var/lib/apt/lists/*
ARG FIREBASE_TOOLS_VERSION=15.37.0
RUN npm install -g firebase-tools@${FIREBASE_TOOLS_VERSION} && npm cache clean --force
WORKDIR /firebase
COPY firebase.json .firebaserc ./
EXPOSE 9099 4500
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:9099').then(()=>process.exit(0),()=>process.exit(1))"
# --project keeps it on a demo- project id, so it never touches real Firebase services.
CMD ["firebase", "emulators:start", "--only", "auth", "--project", "demo-invitationcardapp"]
