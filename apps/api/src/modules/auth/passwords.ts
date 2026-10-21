import argon2 from "argon2";

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false; // hash malformado
  }
}

let dummyHash: Promise<string> | undefined;

/** Gasta o mesmo tempo de uma verificação real (usuário inexistente), mantendo o tempo de resposta constante. */
export async function verifyDummy(): Promise<void> {
  dummyHash ??= hashPassword("dummy-password-nao-usada");
  await verifyPassword(await dummyHash, "outra-senha");
}
