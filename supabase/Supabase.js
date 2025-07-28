const { createClient } = require("@supabase/supabase-js");
const path = require("path");

require("dotenv").config({
  quiet: true,
  path: path.join(process.cwd(), ".env"),
});

class DbManager {
  constructor() {
    this.user = null;
    this.supabase = createClient(
      "https://ztuqejypgetbjnlyogod.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dXFlanlwZ2V0YmpubHlvZ29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTIwMzQsImV4cCI6MjA2ODQ2ODAzNH0.a3P0Iainc6v5ROxL_qOfXgTr_IPyjY7mai01L-AnqZY"
    );
  }

  async getAuthUrl() {
    const {
      data: { url },
    } = await this.supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        scopes: "identify",
        redirectTo: "http://localhost:5173/auth",
      },
    });

    return url;
  }

  async getDungeons() {
    const { data: dungeons, error } = await this.supabase
      .from("dungeon_upload")
      .select("*");
    this.userDungeons = dungeons;

    return dungeons;
  }

  updateSession(code, user) {
    this.supabase = createClient(
      "https://ztuqejypgetbjnlyogod.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dXFlanlwZ2V0YmpubHlvZ29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTIwMzQsImV4cCI6MjA2ODQ2ODAzNH0.a3P0Iainc6v5ROxL_qOfXgTr_IPyjY7mai01L-AnqZY",
      {
        global: {
          headers: {
            Authorization: `Bearer ${code}`,
          },
        },
      }
    );
    this.user = user;
  }

  async insertDungeon(dungeon) {
    const {
      data: [d],
    } = await this.supabase
      .from("dungeons")
      .upsert({
        description: dungeon.description,
        bytes: dungeon.bytes,
        discord_user: dungeon.discord_user,
      })
      .select("*");

    return d;
  }
}

module.exports = new DbManager();
