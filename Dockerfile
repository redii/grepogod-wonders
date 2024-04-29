FROM node:16.15.1-alpine

ARG GREPO_COOKIE
ENV GREPO_COOKIE=$GREPO_COOKIE
ARG GREPO_URL
ENV GREPO_URL=$GREPO_URL
ARG GREPO_WORLD
ENV GREPO_WORLD=$GREPO_WORLD

COPY . /app
WORKDIR /app
RUN npm install
CMD ["npm", "start"]