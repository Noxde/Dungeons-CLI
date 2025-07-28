const path = require("path");
const fs = require("fs");
const { argv: args } = process;
const save = args[2];
const inquirer = require("inquirer").default;
const { search, input } = require("@inquirer/prompts");
const {
  backup,
  checkUpdate,
  getRemote,
  findInventory,
  replaceDungeon,
  getDungeons,
  findName,
  enterToExit,
  getDungeon,
  isEmptyDungeon,
} = require("./utils");
const supabase = require("./supabase/Supabase");
const { startServer, loginPromise, stopServer } = require("./supabase/server");

(async function () {
  const fileExists = fs.existsSync("./dungeons.json");
  let dungeons;

  const allDungeons = await getRemote();

  // Check if the dungeons.json file exists, if it doesn't save the fetched dungeons
  if (fileExists) {
    dungeons = JSON.parse(fs.readFileSync("./dungeons.json"));

    // If fetching the dungeons list did not fail, check for updates.
    if (allDungeons !== null) {
      console.log("Checking for updates...");
      if (!checkUpdate(dungeons, allDungeons)) {
        dungeons = allDungeons;
      }
    } else {
      console.log(
        "Failed to fetch the dungeons list, if you want to check for updates on the dungeons file make sure you have an internet connection."
      );
    }
  } else {
    console.log("dungeons.json not found");
    if (allDungeons === null) {
      return enterToExit(
        "Run this again connected to the internet to download the dungeons.json file or download it manually https://gist.githubusercontent.com/Noxde/a29f699f4175bf315d9bd4baeebefb66/raw/7cc47c2fc2f67eae89594f90907997c826f96fdc/dungeons.json"
      );
    }
    console.log("Saving the fetched dungeons on dungeons.json");
    fs.writeFileSync(
      "./dungeons.json",
      JSON.stringify(allDungeons, null, "\t")
    );
    console.log("dungeons.json saved");
    dungeons = allDungeons;
  }

  // If a path is not provided as an argument, read the directory
  if (!save) {
    // Only show save files with an inventory
    const saves = fs
      .readdirSync("./")
      .filter(
        (x) =>
          x.startsWith("userdata") && !x.includes(".bak") && !x.endsWith("10")
      )
      .filter((x) => {
        const bytes = fs.readFileSync(`./${x}`);
        const inv = findInventory(bytes);
        return !!inv;
      });

    if (!saves.length)
      return enterToExit(
        "No saves found, make sure to put the executable where your characters are located"
      );

    const savesPrompt = inquirer.createPromptModule({
      input: process.stdin,
      output: process.stdout,
    });

    const { saveSlot } = await savesPrompt([
      {
        name: "saveSlot",
        message:
          "What save do you want to edit? (files not shown here don't have a character created)",
        type: "select",
        choices: saves.map((s, i) => ({
          name: s,
          value: i,
        })),
      },
    ]).catch((error) => {
      if (error?.name === "ExitPromptError") process.exit(1); // Ctrl + C

      console.log("Error:", error);
      enterToExit();
    });
    const savePath = `./${saves[saveSlot]}`;
    const bytes = fs.readFileSync(savePath);
    backup(savePath);

    setTimeout(() => main(dungeons, bytes, savePath), 1000);
  } else {
    if (!fs.existsSync(save))
      return enterToExit("Error: The specified file path does not exist.");

    if (!path.basename(save).startsWith("userdata"))
      return enterToExit("You need to provide a save file (userdataXXXX).");

    const bytes = fs.readFileSync(save);
    backup(save);

    setTimeout(() => main(dungeons, bytes, save), 1000);
  }
})();

async function main(dungeons, bytes, savePath) {
  const inventory = findInventory(bytes);

  if (!inventory)
    return enterToExit("This file does not have a character. Exiting");
  const name = findName(bytes, inventory);

  await supabase.getDungeons(); // Get user generated dungeons, stored on supabase.userDungeons
  const allDungeons = Object.keys(dungeons) // Used for the search
    .map((x) => dungeons[x])
    .flat();

  const prompt = inquirer.createPromptModule({
    input: process.stdin,
    output: process.stdout,
  });

  console.log();
  while (true) {
    try {
      console.log(`Character name: ${name}`);
      const { slot } = await prompt([
        {
          name: "slot",
          message:
            "What altar do you want to edit? 1-6 (0 exits; 9 to show current dungeons)",
          type: "number",
          default: 1,
          max: 9,
          min: 0,
          validate: (e) => (e >= 0 && e <= 6) || e === 9,
        },
      ]);

      if (slot === 0) {
        process.exit();
      }

      if (slot === 9) {
        console.clear();
        getDungeons(bytes, inventory, dungeons);
        continue;
      }

      const { dungeonOption } = await prompt([
        {
          name: "dungeonOption",
          message: "What type of dungeons do you want?",
          type: "select",
          choices: [
            {
              name: "Echoes/Materials/Misc dungeons",
              description:
                "Dungeons used to Farm Blood Echoes or Upgrade/Ritual Materials and misc",
              value: "farming",
            },
            {
              name: "Equipment dungeons",
              description:
                "Dungeons where you can find uncanny/lost Weapons, Runes and more",
              value: "equipment",
            },
            {
              name: "Blood Gem dungeons",
              description: "Dungeons used to Farm Blood Gems",
              value: "bloodgems",
            },
            {
              name: "Testing dungeons",
              description:
                "Test Dungeons with Cut Content bosses/enemies and more",
              value: "testing",
            },
            {
              name: "Search for a dungeon",
              description: "Search by description or glyph",
              value: "search",
            },
            {
              name: "Player dungeons",
              description:
                "Show player shared dungeons using the upload option",
              value: "shared",
            },
            {
              name: "Upload selected slot",
              description:
                "This will upload the dungeon on the altar you selected for other people to use",
              value: "upload",
            },
          ],
        },
      ]);

      let choices;

      switch (dungeonOption) {
        case "testing":
          choices = dungeons.testing.map((x) => ({
            name: x.glyph,
            value: x.bytes,
            description: x.desc,
          }));
          break;
        case "farming":
          choices = dungeons.farming.map((x) => ({
            name: x.glyph,
            value: x.bytes,
            description: x.desc,
          }));
          break;
        case "equipment":
          choices = dungeons.equipment.map((x) => ({
            name: x.glyph,
            value: x.bytes,
            description: x.desc,
          }));
          break;
        case "bloodgems":
          choices = dungeons.bloodgems.map((x) => ({
            name: x.glyph,
            value: x.bytes,
            description: x.desc,
          }));
          break;
        case "search":
          const dungeon = await search({
            message: "Search for a dungeon",
            source: async (input) => {
              if (!input) {
                return [];
              }

              const data = allDungeons.filter(
                (x) =>
                  x.desc.toLowerCase().match(input) ||
                  x.glyph.toLowerCase().match(input)
              );

              return data.map((x) => ({
                name: x.glyph,
                value: x.bytes,
                description: x.desc,
              }));
            },
          });

          replaceDungeon(
            bytes,
            slot,
            Buffer.from(dungeon.map((x) => parseInt(x, 16))),
            inventory
          );
          fs.writeFileSync(savePath, bytes);
          console.clear();
          console.log("Dungeon added.");
          continue;
        case "shared":
          if (!supabase.userDungeons) {
            console.log(
              "There are no player dungeons available or there was an error fetching them."
            );
            continue;
          }

          choices = supabase.userDungeons.map((x) => ({
            name: x.id,
            value: x.bytes.split(" "),
            description: `${x.description}\nUploaded by: ${x.discord_username}`,
          }));
          break;
        case "upload":
          const selectedDungeon = getDungeon(bytes, inventory, slot);

          if (isEmptyDungeon(selectedDungeon)) {
            console.log("Cant upload empty dungeons");
            continue;
          }

          console.clear();
          // Only if the user is not logged in
          if (!supabase.user) {
            let error = false;
            console.log("Starting server");
            startServer();
            console.log("Waiting for discord login");

            await loginPromise.catch((e) => {
              console.log(e);
              error = true;
              stopServer(); // Stop the server if new sign ups are closed
            });
            if (error) continue;
          }
          console.log(`Logged in as: ${supabase.user.user_metadata.full_name}`);

          const desc = await input({
            message: "Provide a description for the dungeon",
            default: "",
          });

          const uploaded = await supabase.insertDungeon({
            bytes: selectedDungeon
              .toJSON()
              .data.map((x) => x.toString("16"))
              .join(" "),
            description: desc,
          });
          console.log(uploaded);
          uploaded.discord_username = supabase.user.user_metadata.full_name;
          supabase.userDungeons.push(uploaded);

          if (!supabase.user) stopServer();
          console.log("Dungeon uploaded");
          continue;
      }

      // If something other than search was selected show the options
      const { dungeon } = await prompt([
        {
          name: "dungeon",
          message: "What dungeon do you want?",
          type: "select",
          choices,
        },
      ]);

      replaceDungeon(
        bytes,
        slot,
        Buffer.from(dungeon.map((x) => parseInt(x, 16))),
        inventory
      );
      fs.writeFileSync(savePath, bytes);
      console.clear();
      console.log("Dungeon added.");
    } catch (error) {
      if (error?.name === "ExitPromptError") process.exit(1); // Ctrl + C
      stopServer();
      console.log("Error:", error);
      enterToExit();
    }
  }
}
