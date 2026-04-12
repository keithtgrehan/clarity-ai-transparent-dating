const enumLabels: Record<string, string> = {
  adhd: "ADHD",
  audhd: "AuDHD",
  autism: "Autism",
  neurotypical_ally: "Neurotypical ally",
  prefer_not_to_say: "Prefer not to say"
};

export function humanizeEnum(value: string) {
  if (enumLabels[value]) {
    return enumLabels[value];
  }

  return titleCase(value.replaceAll("_", " "));
}

export function titleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function joinNaturalLanguage(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

export function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const ellipsis = "...";
  const targetLength = Math.max(1, maxLength - ellipsis.length);
  const sliced = value.slice(0, targetLength + 1);
  const breakpoint = Math.max(sliced.lastIndexOf(" "), sliced.lastIndexOf(","));
  const safeSlice =
    breakpoint > Math.floor(targetLength * 0.6)
      ? sliced.slice(0, breakpoint)
      : value.slice(0, targetLength);

  return safeSlice.replace(/[,\s]+$/g, "").concat(ellipsis);
}
