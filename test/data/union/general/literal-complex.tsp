namespace generalunion;

union Locale {
  "en-US",
  "en-GB",
  LocaleDefinition,
}

model LocaleDefinition {
  language: string;
  culture: string;
}
