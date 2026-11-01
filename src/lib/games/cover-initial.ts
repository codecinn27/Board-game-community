/** The first whole character of a game name, uppercased (`三国杀` gives `三`). */
export function coverInitial(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase("en") ?? "";
}
