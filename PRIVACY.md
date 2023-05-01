# Group Up's Privacy Policy
## Information relating to Discord Interactions
### Public Bot Information
Publicly available versions of `Group Up#1305` (Discord ID: `847256159123013722`) (herein referred to as _The Bot_ or _Bot_) do not automatically track or collect user information via Discord.

Upon inviting _The Bot_ to a user's guild, _The Bot_ sends the guild name, Discord Guild ID, and current count of guild members to Burn_E99#1062 (herein referred to as _The Developer_) via a private Discord Guild.  The guild name, Discord Guild ID, and current count of guild members are only used to roughly gage how popular _The Bot_ is and to determine if _The Bot_'s hosting solution needs to be improved.  These pieces of information will never be sold or shared with anyone.

_The Bot_ reads every message that it is allowed to, meaning if _The Bot_ is allowed to see a channel in a guild, it reads every new message sent in said channel.  This is for the automated cleanup of designated Event Channels.

_The Bot_ does not read any user messages sent in the past, but does read its own past messages.  This is to limit the amount of data that _The Bot_ needs to store outside of Discord, giving users better control of their own data.

* Messages that do not begin with _The Bot_'s command prefix are not saved or stored anywhere.  Messages that do not begin with _The Bot_'s command prefix that are sent outside of a designated Event Channel are ignored and not processed.
* Slash Commands sent to _The Bot_ do not automatically log user data, and most commands to not log any data.  The commands that log data are the report command (in Discord, this command is known as `/report [message]`), the Event Channel setup command (known as `/setup`), and the Create New Event command (known as `/create-event` or the `Create New Event` button).
  * The report command only stores the text placed within the message that is directly after the command (herein referred to as _The Report Text_).  This command is entirely optional, meaning users never need to run this command under normal usage of _The Bot_.  This command is only intended to be used to report roll commands that did not output what was expected.  This command will accept any value for _The Report Text_, thus it is up to the user to remove any sensitive information before sending the command.  _The Report Text_ is stored in a private Discord Guild in a channel that only _The Developer_ can see.  _The Report Text_ is solely used to improve _The Bot_, either by providing a feature suggestions or alerting _The Developer_ to bugs that need patched.
  * The Event Channel setup command only stores Discord IDs.  The setup command will always store the Discord Channel ID and Discord Guild ID from where it was run.
    * If the Event Channel setup command was run with the `with-manager-role` option, the submitted Discord Role ID and Discord Channel ID for the desired Manager Role and Log Channel will also be stored.
  * The Create New Event command stores the following data for every event that is created:
    * The Discord Message ID, Discord Channel ID, and Discord Guild ID of the event that the user created.  These IDs are stored so that _The Bot_ can locate the event for future use, including but not limited to: editing or deleting the event, and notifying the members of the event.
    * The Discord User ID of the creator.  This ID is stored so that _The Bot_ knows who created the event to control who can edit or delete the event.  This ID is also used when _The Bot_ fails to find an event so that the event creator is aware that _The Bot_ was unable to notify the event members.
    * The full Date and Time of the event.  The Date and Time of the event are stored so that _The Bot_ can send notifications to members of events when the event starts.
  * If a Custom Activity is created during the Create New Event command, the following additional data is stored:
    * The Activity Title, Subtitle, and Max Members entered by the event creator.  These are stored so that _The Developer_ can determine if a new activity preset is necessary to improve user experience while using _The Bot_.
    * The Discord Guild ID that the Custom Activity was created in.  This ID is stored so that _The Bot_ can delete the Custom Activity from its database if _The Bot_ is removed from the Guild.

All commands contribute to a global counter to track the number of times a command is used.  These counters do not keep track of where commands were run, only counting the number of times the command has been called.  These counters have no way of being tracked back to the individual commands run by the users.

If the Discord interaction is not explicitly mentioned above, it does not collect any data at all.

### Private Bot Information
Privately hosted versions of Group Up (in other words, bots running Group Up's source code, but not running under the publicly available _Bot_, `Group Up#1305`) (herein referred to as _Rehosts_ or _Rehost_) may exist.  _The Developer_ is not responsible for _Rehosts_, thus _Rehosts_ of _The Bot_ are not recommended to be used.

All policies described in **Public Bot Information** apply to _Rehosts_.

Due to the nature of open source code, _Rehosts_ may not use the same codebase that is available in this repository.  _The Developer_ does not moderate what other developers do to this codebase.  This means that if you are not using the publicly available _Bot_ and instead using a _Rehost_, this _Rehost_ could collect any information it desires.

# Deleting Your Data
## Event Deletion
If you wish to remove all data that _The Bot_ has on your Guild, simply remove _The Bot_ from your Guild.  Upon removal, _The Bot_ deletes all data on Event Channel, all data on Events created in the Guild, and all Custom Activities created in the Guild.

## User Data Deletion
If you would like to ensure that all of your submitted reports are removed from _The Bot_'s private development server, please contact _The Developer_ via Discord (by sending a direct message to `Burn_E99#1062`) or via email (<ean@milligan.dev>) with a message along the lines of `"Please remove all of my submitted reports from your development server."`.  Submitted reports are deleted from the server as they are processed, which happens roughly once a week, but this can be accelerated if requested.
