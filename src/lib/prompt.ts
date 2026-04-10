import { createInterface } from "node:readline";

export function promptUser(message: string): Promise<string | null> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer || null);
    });
  });
}
