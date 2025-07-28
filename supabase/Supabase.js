const DiscordOauth2 = require("discord-oauth2");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

require("dotenv").config({
  quiet: true,
  path: path.join(process.cwd(), ".env"),
});
const { CLIENT_ID, CLIENT_SECRET, REDIRECT, SUPABASE_URL, SUPABASE_KEY } =
  process.env;

class DbManager {
  constructor() {
    this.user = null;
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.oauth = new DiscordOauth2({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT,
    });
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

  async getUser(token) {
    return this.oauth.getUser(token);
  }

  async getDungeons() {
    const { data: dungeons, error } = await this.supabase
      .from("dungeon_upload")
      .select("*");
    this.userDungeons = dungeons;

    return dungeons;
  }

  updateSession(code, user) {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${code}`,
        },
      },
    });
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
