# CONTRIBUTING TO GROUP UP
## Things to check before committing a change
- Formatting and linting
  - Run `deno fmt` to set all formatting correct
  - Run `deno lint` to check for any issues that need fixed
- Are you making a change that will be updating the version number?
  - Update the version number in `README.md` and `config.example.ts`, and update the date in `README.md`
  - Create a tag on your commit marking this version (name it Vx.x.x)
## Things to check after committing a change
- Check in on Sonar to see if your commit caused new issues to appear.  If it did, please fix them
