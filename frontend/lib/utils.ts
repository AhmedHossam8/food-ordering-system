const arabicDigits: Record<string, string> = {
  "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤",
  "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩",
};

export function toArabicDigits(str: string): string {
  return str.replace(/[0-9]/g, (d) => arabicDigits[d]);
}

export function formatPrice(price: string | number, lang = "en"): string {
  const formatted = `$${Number(price).toFixed(2)}`;
  return lang === "ar" ? toArabicDigits(formatted) : formatted;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
