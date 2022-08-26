#! /bin/bash
exec pm2 start scrape.mjs
exec pm2 start bot.mjs