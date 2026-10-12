/** Render legacy notifications using current site wording without rewriting stored history. */
export function publicNotificationText(value: string): string {
  const replacements: Record<string, string> = {
    alumno: "usuario", alumnos: "usuarios",
    alumna: "usuaria", alumnas: "usuarias",
  };
  return value
    .replace(/\b(alumnos|alumnas|alumno|alumna)\b/gi, (found) => {
      const next = replacements[found.toLowerCase()];
      if (found === found.toUpperCase()) return next.toUpperCase();
      return found[0] === found[0].toUpperCase()
        ? next[0].toUpperCase() + next.slice(1) : next;
    })
    .replace(/\bacceso institucional\b/gi, (found) =>
      found[0] === found[0].toUpperCase() ? "Acceso" : "acceso");
}
