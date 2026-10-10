import { hash } from "bcryptjs";

if (!process.stdin.isTTY) {
  process.stderr.write("Run this from an interactive terminal. Password input is hidden.\n");
  process.exit(1);
}
process.stdout.write("New admin password (10–72 UTF-8 bytes): ");
process.stdin.setRawMode(true);
process.stdin.resume();
let password = "";
process.stdin.on("data", async chunk => {
  for (const char of chunk.toString()) {
    if (char === "\u0003") process.exit(1);
    if (char === "\r" || char === "\n") {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (password.length < 10 || Buffer.byteLength(password, "utf8") > 72) {
        process.stderr.write("Password must be 10 characters minimum and no more than 72 bytes.\n");
        process.exit(1);
      }
      const result = await hash(password, 12);
      password = "";
      // Intended local terminal output: paste ONLY into workspace Secrets.
      process.stdout.write(`Set ADMIN_PASSWORD_HASH in Secrets to:\n${result}\n`);
      process.exit(0);
    }
    if (char === "\u007f" || char === "\b") password = password.slice(0, -1);
    else password += char;
  }
});
