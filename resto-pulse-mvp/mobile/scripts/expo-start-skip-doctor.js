const path = require("path");
const { spawn } = require("child_process");

// Skip Expo dependency validation API call (can fail on some networks/SSL setups).
process.env.EXPO_NO_DEPENDENCY_VALIDATION = "1";

// Use system cert store on Windows/Node 22+ for better TLS compatibility.
if (!process.env.NODE_OPTIONS || !process.env.NODE_OPTIONS.includes("--use-system-ca")) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--use-system-ca"].filter(Boolean).join(" ");
}

const projectRoot = path.join(__dirname, "..");
const expoCli = path.join(projectRoot, "node_modules", "expo", "bin", "cli");
const extra = process.argv.slice(2);

const child = spawn(process.execPath, [expoCli, "start", ...extra], {
  stdio: "inherit",
  shell: false,
  cwd: projectRoot,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code == null ? 0 : code);
});
