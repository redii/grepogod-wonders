#! /bin/bash
pm2 start scrape.mjs
pm2 start bot.mjs

pm2 attach 0