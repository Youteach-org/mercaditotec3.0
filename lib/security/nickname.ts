export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 24;

export function normalizeNickname(value: string): string {
  return value.trim().toLowerCase();
}

export function validateNicknameSyntax(value: string):
  | { valid: true; nickname: string }
  | { valid: false; reason: string } {
  const nickname = normalizeNickname(value);

  if (nickname.length < NICKNAME_MIN_LENGTH || nickname.length > NICKNAME_MAX_LENGTH) {
    return {
      valid: false,
      reason: `El nickname debe tener entre ${NICKNAME_MIN_LENGTH} y ${NICKNAME_MAX_LENGTH} caracteres.`,
    };
  }

  if (!/^[a-z0-9][a-z0-9_]*$/.test(nickname)) {
    return {
      valid: false,
      reason: "El nickname solo puede usar letras, números y guion bajo, y debe empezar con letra o número.",
    };
  }

  return { valid: true, nickname };
}
