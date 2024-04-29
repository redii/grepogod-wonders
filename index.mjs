import "dotenv/config"
import got from "got"

import sqlite3 from "sqlite3"
import { open } from "sqlite"

import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
await prisma.$connect()

const wonders = [
  {
    name: "great_pyramid_of_giza",
    display: "Die Pyramiden von Gizeh in Ägypten",
  },
  {
    name: "colossus_of_rhodes",
    display: "Der Koloss von Rhodos",
  },
  {
    name: "lighthouse_of_alexandria",
    display: "Der Leuchtturm auf der Insel Pharos vor Alexandria",
  },
  {
    name: "temple_of_artemis_at_ephesus",
    display: "Der Tempel der Artemis in Ephesos",
  },
  {
    name: "hanging_gardens_of_babylon",
    display: "Die hängenden Gärten der Semiramis zu Babylon",
  },
  {
    name: "mausoleum_of_halicarnassus",
    display: "Das Grab des Königs Mausolos II. zu Halikarnassos",
  },
  {
    name: "statue_of_zeus_at_olympia",
    display: "Die Zeusstatue des Phidias von Olympia",
  },
]
let sessionLost = false

async function scrape() {
  console.log("🔍 Scraping data...")
  const response = await got
    .get(process.env.GREPO_URL, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:98.0) Gecko/20100101 Firefox/98.0",
        accept: "text/plain, */*; q=0.01",
        "accept-language": "en-US,en;q=0.5",
        "x-requested-with": "XMLHttpRequest",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        te: "trailers",
        cookie: process.env.GREPO_COOKIE,
      },
    })
    .json()

  if (response.json.redirect) {
    console.log("❌ No Session", Date.now())
    return
  }

  const scrapedData = response.json.models.WondersRanking.data

  scrapedData.ranking.forEach(async (a) => {
    const alliance = await prisma.alliance.findUnique({
      where: { id: a.alliance_id },
    })

    if (alliance) {
      const allianceUpdate = {}
      const notifications = []
      const changes = []

      wonders.forEach(async (wonder) => {
        if (alliance[`${wonder.name}_level`] !== a[wonder.name].level) {
          allianceUpdate[`${wonder.name}_level`] = a[wonder.name].level
          allianceUpdate[`${wonder.name}_island_x`] = a[wonder.name].island_x
          allianceUpdate[`${wonder.name}_island_y`] = a[wonder.name].island_y
          allianceUpdate[`${wonder.name}_island_id`] = a[wonder.name].island_id

          changes = [
            ...changes,
            {
              alliance_id: alliance.id,
              wonder: wonder.name,
              from_level: alliance[`${wonder.name}_level`],
              to_level: a[wonder.name].level,
            },
          ]

          // prettier-ignore
          console.log(`✅ Updated ${alliance.alliance_name} ${wonder.display} Level ${alliance[`${wonder.name}_level`]} > ${a[wonder.name].level}`)
        }
      })

      await prisma.alliance.update({
        where: { id: alliance.id },
        data: allianceUpdate,
      })

      await prisma.changes.createMany({
        data: changes,
      })

      // push notifications to discord channel
    } else {
      await prisma.alliance.create({
        data: {
          alliance_id: ,
          points: ,
          alliance_flag_type: ,
          alliance_name: ,
          wonders_left: ,

        }
      })

      // prettier-ignore
      const insert_data_string = Object.keys(alliance)
                .map((key) => {
                    const attr = alliance[key]
                    if (typeof attr === "object") {
                        return `${attr.level}, ${attr.island_x ? attr.island_x : null}, ${attr.island_y ? attr.island_y : null}, ${attr.island_id ? attr.island_id : null}`
                    } else {
                        switch (typeof attr) {
                            case "string":
                                return `"${attr}"`
                            default:
                                return attr
                        }
                    }
                })
                .join(", ")
      const wonder_fields = wonders
        .map(
          (wonder) => `${wonder}_level, ${wonder}_island_x, ${wonder}_island_y, ${wonder}_island_id`
        )
        .join(", ")

      await db.run(
        `INSERT INTO alliances (alliance_id, points, alliance_flag_type, alliance_name, wonders_left, ${wonder_fields}) VALUES (${insert_data_string})`
      )

      console.log(`🆕 Inserted ${alliance.alliance_name}`)
    }
  })

  setTimeout(scrape, 60000)
}

console.log(`👀 Scraping data for world: ${process.env.GREPO_WORLD}\n`)
scrape()
