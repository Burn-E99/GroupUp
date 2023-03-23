# TZ Data
Since the JS/TS Date implementation does not handle shorthand timezones, we must implement our own solution.

## Data Source
https://en.wikipedia.org/wiki/List_of_tz_database_time_zones?useskin=vector

## How to use this submodule
Simply point Excel to the link above and tell it to rip the `List` data table.  Then, pull the four columns listed below into a separate table and save as a CSV without headers.

- UTC offset STD
- UTC offset DST
- Time Zone abbreviation STD
- Time Zone abbreviation DST

Drop that CSV into this directory under the name `tzTable.csv` and run `deno run --allow-read=./tzTable.csv ./generateUpdatedTZList.ts`

## Why not have this built directly into Group Up?
This is implemented as a submodule so that there is some manual screening required to verify things do not get parsed wrong due to a bad Excel/Wikipedia export.  This also may require tweaks if any formats change in Wikipedia.

## Current quirks
- Most, if not all, `-` signs copied out as `?`.  Don't ask me how or why, it just happened.  The script fixes this.
- Due to doubled TZ abbrs, there is an overrides section.  This should be cleared out when `tzTable.csv` is updated.
