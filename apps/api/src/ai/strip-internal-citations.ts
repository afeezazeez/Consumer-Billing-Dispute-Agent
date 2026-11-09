export function stripInternalCitations(text: string): string {
  return text.replace(/\uE200cite(?:\uE202[^\uE200\uE201\r\n]+)+\uE201/gu, "");
}
