import "dotenv/config"
import { Client, Intents, MessageEmbed } from "discord.js"
import sqlite3 from "sqlite3"
import { open } from "sqlite"

let channelIds = []
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

const db = await open({
  filename: "data/wonders.db",
  driver: sqlite3.Database,
})

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
})

async function check() {
  console.log("Checking for changes...")

  const changes = await db.all(
    "SELECT * FROM changes LEFT JOIN alliances ON alliances.alliance_id = changes.alliance_id WHERE notified = 0"
  )

  changes.forEach(async (change) => {
    const wonder = wonders.find((wonder) => wonder.name === change.wonder)

    channelIds.forEach((id) => {
      const channel = client.channels.cache.get(id)
      const msg = new MessageEmbed()
        .setTitle("🚨 Weltwunder ausgebaut")
        .setDescription(`**${change.alliance_name}**`)
        .setThumbnail(
          `https://${process.env.GREPO_WORLD}.grepolis.com/image.php?alliance_id=${change.alliance_id}`
        )
        .addField(wonder.display, `Level ${change.from_level} > ${change.to_level}`)
        .setTimestamp()
        .setColor("#ff1500")
      channel.send({ embeds: [msg] })
      console.log(`📫 Notification send... ${channel.guild.name} (${channel.name})`)
    })

    if (channelIds.length) {
      const updateSql = "UPDATE changes SET notified = 1 WHERE id = ?"
      await db.run(updateSql, [change.id])
    }
  })

  setTimeout(() => check(), 10000)
}

client.on("ready", () => {
  console.log(`🔓 Logged in as ${client.user.tag}!`)
  client.user.setActivity("Online ✅ /gg help")
  check()
})

client.on("messageCreate", async (message) => {
  if (message.content.startsWith("/dd help")) {
    const msg = new MessageEmbed()
      .setTitle("🛟 Hilfe")
      .addFields(
        {
          name: "/gg start",
          value: "Aktiviert Benachrichtungen in diesem Channel",
        },
        {
          name: "/gg stop",
          value: "Deaktiviert Benachrichtungen in diesem Channel",
        },
        {
          name: "/gg status",
          value: "Zeigt aktuellen Status für Benachrichtigungen in diesem Channel",
        },
        {
          name: "/gg overview",
          value: "Zeigt die ersten drei Allianzen (Sortiert nach Punkten)",
        }
      )
      .setThumbnail(
        "https://wiki.en.grepolis.com/images/thumb/2/2a/FramedZeus.png/150px-FramedZeus.png"
      )
      .setColor("#bdbdbd")
    message.channel.send({ embeds: [msg] })
  }

  if (message.content.startsWith("/gg start")) {
    if (!channelIds.includes(message.channelId)) {
      console.log(`✅ ${message.guild.name} (${message.channel.name}) subscribed`)
      message.channel.send("Benachrichtungen eingeschaltet.")
      channelIds.push(message.channelId)
    } else {
      message.channel.send("Benachrichtungen bereits eingeschaltet.")
    }
  }

  if (message.content.startsWith("/gg stop")) {
    if (channelIds.includes(message.channelId)) {
      console.log(`❌ ${message.guild.name} (${message.channel.name}) unsubscribed`)
      message.channel.send("Benachrichtungen ausgeschaltet.")
      channelIds = channelIds.filter((id) => id !== message.channelId)
    } else {
      message.channel.send("Benachrichtungen bereits ausgeschaltet.")
    }
  }

  if (message.content.startsWith("/gg status")) {
    if (channelIds.includes(message.channelId)) {
      message.channel.send("Benachrichtungen sind **eingeschaltet** in diesem Channel.")
    } else {
      message.channel.send("Benachrichtungen sind **ausgeschaltet** in diesem Channel.")
    }
  }

  if (message.content.startsWith("/gg overview")) {
    const msgs = []
    const alliances = await db.all("SELECT * FROM alliances ORDER BY points DESC LIMIT 3")

    alliances.forEach(async (alliance) => {
      const msg = new MessageEmbed()
        .setTitle(`🛡 ${alliance.alliance_name}`)
        .setThumbnail(
          `https://${process.env.GREPO_WORLD}.grepolis.com/image.php?alliance_id=${alliance.alliance_id}`
        )
        .setColor("#0099ff")

      wonders.forEach((wonder) => {
        msg.addField(wonder.display, String(alliance[`${wonder.name}_level`]))
      })

      msgs.push(msg)
    })
    message.channel.send({ embeds: msgs })
  }
})

client.login(process.env.DISCORD_CLIENT_TOKEN)
