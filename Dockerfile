FROM node:18

LABEL maintainer="Nikola Kostic i Lazar Sevic"
LABEL version="1.0"
LABEL description="Igrica za crtanje i pogdjanje"

ENV PORT=3000
ENV REACT_APP_API_URL="https://pictionary-b38c4-default-rtdb.europe-west1.firebasedatabase.app"

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

RUN chown -R node:node /app

USER node


EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD curl -f http://localhost:3000 || exit 1

CMD ["/bin/sh", "-c", "cd client && npm start"]