import { Command } from "commander";
import { loadAuth, saveAuth, clearAuth, validateToken } from "../lib/auth.ts";

export function makeAuthCommand(): Command {
  const cmd = new Command("auth").description("Manage GitHub authentication");

  cmd
    .command("login")
    .description("Authenticate with a GitHub personal access token")
    .action(async () => {
      console.log("Enter a GitHub Personal Access Token (PAT).");
      console.log("Create one at: https://github.com/settings/tokens");
      console.log('Required scope: "repo"\n');

      const token = prompt("Token: ");
      if (!token) {
        console.error("No token provided.");
        process.exit(1);
      }

      console.log("Validating token...");
      const { valid, username } = await validateToken(token);

      if (!valid) {
        console.error("Invalid token. Check your token and try again.");
        process.exit(1);
      }

      await saveAuth({
        token,
        username,
        created: new Date().toISOString(),
      });

      console.log(`Authenticated as ${username}.`);
    });

  cmd
    .command("status")
    .description("Show current authentication status")
    .action(async () => {
      const auth = await loadAuth();
      if (!auth) {
        console.log('Not authenticated. Run "wiki auth login" to log in.');
        return;
      }
      console.log(`Authenticated as: ${auth.username}`);
      console.log(`Since: ${auth.created}`);
    });

  cmd
    .command("logout")
    .description("Remove saved credentials")
    .action(async () => {
      await clearAuth();
      console.log("Logged out. Credentials removed.");
    });

  return cmd;
}
