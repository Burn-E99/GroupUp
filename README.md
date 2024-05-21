# Group Up - An Event Scheduling Discord Bot | V1.1.2 - 2024/05/21
[![SonarCloud](https://sonarcloud.io/images/project_badges/sonarcloud-orange.svg)](https://sonarcloud.io/summary/new_code?id=GroupUp)  
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=GroupUp&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=GroupUp) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=GroupUp&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=GroupUp) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=GroupUp&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=GroupUp) [![Bugs](https://sonarcloud.io/api/project_badges/measure?project=GroupUp&metric=bugs)](https://sonarcloud.io/summary/new_code?id=GroupUp) [![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=GroupUp&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=GroupUp) [![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=GroupUp&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=GroupUp)  

Group Up is a Discord bot built for scheduling events in your Guild.  The bot utilizes user-friendly Buttons, Slash Commands, and Forms to create events.  Currently, Group Up has built in support for Destiny 2 and Among Us, but any event can be created for any game using the Create Custom Activity button.

This bot was originally designed to replace the less reliable event scheduling provided by the Destiny 2 bot, Charlemagne, utilizing new Discord features many months before Charlemagne did.

## Using Group Up
I am hosting this bot for public use and you may find its invite link below.  If you would like to host this bot yourself, details of how to do so are found at the end of this README, but I do not recommend this unless you are experienced with running Discord bots.

After inviting the bot, if you want to create a dedicated event channel, simply run `/setup` in the desired channel and follow the on-screen prompts.  If you don't want a dedicated channel, just run `/create-event` anywhere.

Note: The `MANAGE_GUILD`, `MANAGE_CHANNELS`, and `MANAGE_ROLES` permissions are only necessary for the `/setup` command.  Once you create all of the event channels that you need, you may remove these permissions from the bot without causing any issues.

[Bot Invite Link](https://discord.com/api/oauth2/authorize?client_id=847256159123013722&permissions=268527664&scope=bot%20applications.commands)

[Support Server Invite Link](https://discord.gg/peHASXMZYv)

---

## Available Commands
* `/help`
  * Provides a message to help users get Group Up set up in their guild.
* `/info`
  * Outputs some information and links relating to the bot including the Privacy Policy and Terms of Service.
* `/report [issue, feature request]`
  * People aren't perfect, but this bot is trying to be.
  * If you encounter a command that errors out or returns something unexpected, please use this command to alert the developers of the problem.
  * Additionally, if you have a feature request, this is one of the ways to request one
* `/create-event`
  * Starts the event creation process.
* `/setup [options]` **ONLY Available to Guild Members with the `ADMINISTRATOR` permission**
  * Designates the current channel as a Event Channel.  After the command successfully runs, Group Up will be in control of the channel for running events.
* `/delete-lfg-channel` **ONLY Available to Guild Members with the `ADMINISTRATOR` permission**
  * Removes the Event Channel designation from the current channel
* `/event [options]` **ONLY Available to Guild Members with a Group Up Manager role in a managed Event Channel**
  * Allows Group Up Managers to Join/Leave/Alternate members to events

## Problems?  Feature requests?
If you run into any errors or problems with the bot, or think you have a good idea to add to the bot, please submit a new GitHub issue detailing it.  If you don't have a GitHub account, a report command (detailed above) is provided for use in Discord.

---

## Self Hosting Group Up
Group Up is built on [Deno](https://deno.land/) `v1.33.1` using [Discordeno](https://discordeno.mod.land/) `v17.0.1`.  If you choose to run this yourself, you will need to rename `config.example.ts` to `config.ts` and edit some values.  You will need to create a new [Discord Application](https://discord.com/developers/applications) and copy the newly generated token into the `"token"` field.  If you want to utilize some of the bots dev features, you will need to fill in the keys `"logChannel"` and `"reportChannel"` with text channel IDs and `"devServer"` with a guild ID.

You will also need to install and setup a MySQL database with a user for the bot to use to add/modify the database.  This user must have the `"DB Manager"` admin rights and `"REFERENCES"` Global Privileges.  Once the DB is installed and a user is setup, run the provided `db\initialize.ts` to create the schema and tables.  After this, run `db\populateDefaults.ts` to insert some needed values into the tables.

Once everything is set up, starting the bot can simply be done with `deno run --allow-write=./logs --allow-net .\mod.ts`.

---

## Privacy Policy and Terms of Service
Group Up has a Privacy Policy and Terms of Service to detail expectations of what user data is stored and how users should use Group Up.  The following Privacy Policy and Terms of Service only apply to the officially hosted version of Group Up (`Group Up#1305`, Discord ID: `847256159123013722`).

Privacy Policy TL;DR: Group Up stores data relating to events, event channels, and text from the `/report` command.  For more detailed information, please check out the full [PRIVACY POLICY](https://github.com/Burn-E99/GroupUp/blob/master/PRIVACY.md).

Terms of Service TL;DR: Don't abuse or attempt to hack/damage Group Up.  If you do, you may be banned from use.  For more detailed information, please check out the full [TERMS OF SERVICE](https://github.com/Burn-E99/GroupUp/blob/master/TERMS.md).
