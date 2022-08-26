FROM node:16.15.1-alpine
ARG DISCORD_CLIENT_TOKEN
ENV DISCORD_CLIENT_TOKEN=$DISCORD_CLIENT_TOKEN
ARG GREPO_COOKIE
ENV GREPO_COOKIE=$GREPO_COOKIE
ARG GREPO_URL
ENV GREPO_URL=$GREPO_URL
ARG GREPO_WORLD
ENV GREPO_WORLD=$GREPO_WORLD
COPY . /opt/app
WORKDIR /opt/app
RUN npm install
CMD ["node", "scrape.mjs", "&", "node", "bot.mjs"]