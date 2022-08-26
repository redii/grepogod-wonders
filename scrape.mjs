import "dotenv/config"
import got from "got"
import sqlite3 from "sqlite3"
import { open } from "sqlite"

const wonders = [
	"great_pyramid_of_giza",
	"hanging_gardens_of_babylon",
	"statue_of_zeus_at_olympia",
	"temple_of_artemis_at_ephesus",
	"mausoleum_of_halicarnassus",
	"colossus_of_rhodes",
	"lighthouse_of_alexandria",
]

const db = await open({
	filename: "data/wonders.db",
	driver: sqlite3.Database,
})

async function setup() {
	// Alliances table
	try {
		let alliances_model_query =
			"CREATE TABLE alliances (alliance_id INTEGER, points INTEGER, alliance_flag_type TEXT, alliance_name TEXT, wonders_left INTEGER, updated_at TEXT"

		wonders.forEach(async (wonder, index) => {
			alliances_model_query += `, ${wonder}_level INTEGER, ${wonder}_island_x INTEGER, ${wonder}_island_y INTEGER, ${wonder}_island_id INTEGER`
			if (index === wonders.length - 1) alliances_model_query += ")"
		})

		await db.exec(alliances_model_query)
		console.log("Alliances table created")
	} catch (err) {}

	// Changes table
	try {
		const changes_model_query =
			"CREATE TABLE changes (id INTEGER PRIMARY KEY AUTOINCREMENT, alliance_id INTEGER, wonder TEXT, from_level INTEGER, to_level INTEGER, timestamp TEXT, notified INTEGER)"
		await db.exec(changes_model_query)
		console.log("Changes table created")
	} catch (err) {}
}

async function update() {
	console.log("🔍 Scraping data...")
	const response = await got
		.get(process.env.GREPO_URL, {
			headers: {
				"user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:98.0) Gecko/20100101 Firefox/98.0",
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

	const data = response.json.models.WondersRanking.data
	const timestamp = Date.now()

	data.ranking.forEach(async (alliance) => {
		const current = await db.get("SELECT * FROM alliances WHERE alliance_id = :id", { ":id": alliance.alliance_id })

		if (current) {
			wonders.forEach(async (wonder) => {
				if (current[`${wonder}_level`] !== alliance[wonder].level) {
					const updateSql = `UPDATE alliances SET ${`${wonder}_level`} = ?, ${`${wonder}_island_x`} = ?, ${`${wonder}_island_y`} = ?, ${`${wonder}_island_id`} = ?, updated_at = ? WHERE alliance_id = ?`
					await db.run(
						updateSql,
						[
							alliance[wonder].level,
							alliance[wonder].island_x,
							alliance[wonder].island_y,
							alliance[wonder].island_id,
							timestamp,
							alliance.alliance_id,
						],
						(err) => console.log(err)
					)

					const changeSql = `INSERT INTO changes (alliance_id, wonder, from_level, to_level, timestamp, notified) VALUES (?, ?, ?, ?, ?, ?)`
					await db.run(changeSql, [
						alliance.alliance_id,
						wonder,
						current[`${wonder}_level`],
						alliance[wonder].level,
						timestamp,
						0,
					])

					// prettier-ignore
					console.log(`✅ Updated ${alliance.alliance_name} ${wonder} Level ${current[`${wonder}_level`]} > ${alliance[wonder].level}`)
				}
			})
		} else {
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
				.map((wonder) => `${wonder}_level, ${wonder}_island_x, ${wonder}_island_y, ${wonder}_island_id`)
				.join(", ")

			await db.run(
				`INSERT INTO alliances (alliance_id, points, alliance_flag_type, alliance_name, wonders_left, ${wonder_fields}) VALUES (${insert_data_string})`
			)

			console.log(`🆕 Inserted ${alliance.alliance_name}`)
		}
	})

	setTimeout(update, 60000)
}

console.log(`Scraping data for world: ${process.env.GREPO_WORLD}\n`)
setup()
update()
