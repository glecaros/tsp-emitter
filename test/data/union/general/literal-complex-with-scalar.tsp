namespace generalunion;

union Metal {
  string,
  "iron",
  "silver",
  Alloy,
}

model Alloy {
  name: string;
  percentage: float;
}
