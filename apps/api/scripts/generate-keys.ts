import { generateKeyPairSync } from "node:crypto";

// Só imprime no stdout; nunca grava arquivos. Copie os valores para o .env / Render.
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const now = new Date();
const keyId = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

console.log(`JWT_PRIVATE_KEY=${Buffer.from(privateKey).toString("base64")}`);
console.log(`JWT_KEY_ID=${keyId}`);
